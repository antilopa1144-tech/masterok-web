import { createHmac, randomBytes, randomInt, randomUUID, timingSafeEqual } from "node:crypto";
import { database, type Sql } from "./db";
import { commerceMode } from "./config";
import { CommerceError, type CommerceUser } from "./types";

export const SESSION_COOKIE = "masterok_account";
const SESSION_LIFETIME = 30 * 86400000;

function digest(value: string): string {
  const secret = process.env.COMMERCE_AUTH_SECRET ?? (commerceMode() === "local" ? "local-simulation-only-no-production" : "");
  if (secret.length < 24) throw new CommerceError(503, "Вход пока не подключён");
  return createHmac("sha256", secret).update(value).digest("hex");
}

export async function consumeLimit(key: string, maximum: number, windowMs: number, sql?: Sql): Promise<void> {
  const operation = async (tx: Sql) => {
    const now = Date.now();
    const id = digest(key);
    const { rows } = await tx.query<{ count: number; reset_at: string }>("SELECT count, reset_at FROM commerce_limits WHERE id=$1", [id]);
    const previous = rows[0];
    const count = previous && Number(previous.reset_at) > now ? previous.count + 1 : 1;
    if (count > maximum) throw new CommerceError(429, "Слишком много попыток. Подождите несколько минут и повторите.");
    await tx.query("INSERT INTO commerce_limits(id,count,reset_at) VALUES($1,$2,$3) ON CONFLICT(id) DO UPDATE SET count=$2,reset_at=$3", [id, count, previous && Number(previous.reset_at) > now ? Number(previous.reset_at) : now + windowMs]);
  };
  if (sql) await operation(sql); else await (await database()).transaction(operation);
}

export function assertSameOrigin(request: Request): void {
  const expected = process.env.COMMERCE_ORIGIN ?? (commerceMode() === "local" ? "http://localhost:3460" : "https://getmasterok.ru");
  if (commerceMode() === "local") {
    const origin = request.headers.get("origin");
    if (origin === `http://127.0.0.1:${new URL(expected).port}` || origin === `http://localhost:${new URL(expected).port}`) return;
  }
  if (request.headers.get("origin") !== new URL(expected).origin) throw new CommerceError(403, "Запрос должен быть отправлен со страницы Мастерка");
}

export async function readJson(request: Request): Promise<Record<string, unknown>> {
  if (!request.headers.get("content-type")?.startsWith("application/json")) throw new CommerceError(415, "Ожидается JSON");
  const reader = request.body?.getReader();
  if (!reader) throw new CommerceError(400, "Нет данных запроса");
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const chunk = await reader.read();
    if (chunk.done) break;
    size += chunk.value.byteLength;
    if (size > 3_000_000) { await reader.cancel(); throw new CommerceError(413, "Проект слишком большой: максимум 3 МБ"); }
    chunks.push(chunk.value);
  }
  let value: unknown;
  try { value = JSON.parse(Buffer.concat(chunks).toString("utf8")); } catch { throw new CommerceError(400, "Не удалось прочитать данные"); }
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new CommerceError(400, "Некорректные данные");
  return value as Record<string, unknown>;
}

export async function requestLogin(emailInput: unknown, ip: string): Promise<{ challenge: string; localCode?: string }> {
  if (typeof emailInput !== "string" || emailInput.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailInput.trim())) throw new CommerceError(400, "Укажите корректную электронную почту");
  const email = emailInput.trim().toLowerCase();
  if (commerceMode() !== "local" && (!process.env.COMMERCE_MAIL_FROM || (!process.env.RESEND_API_KEY && !process.env.COMMERCE_SMTP_URL))) throw new CommerceError(503, "Отправка кода ещё не подключена");
  const code = String(randomInt(100000, 1000000));
  const id = randomUUID();
  await (await database()).transaction(async (tx) => {
    await consumeLimit(`login-email:${email}`, 4, 15 * 60000, tx);
    await consumeLimit(`login-ip:${ip}`, 20, 15 * 60000, tx);
    await tx.query("UPDATE commerce_codes SET consumed=true WHERE email=$1", [email]);
    await tx.query("INSERT INTO commerce_codes(id,email,code_hash,expires_at) VALUES($1,$2,$3,$4)", [id, email, digest(`${id}:${code}`), Date.now() + 10 * 60000]);
  });
  if (commerceMode() === "local") return { challenge: id, localCode: code };
  const subject = "Код входа в Мастерок";
  const message = `Ваш код: ${code}. Действует 10 минут. Если вы не запрашивали вход, не сообщайте код никому.`;
  if (process.env.RESEND_API_KEY) {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: process.env.COMMERCE_MAIL_FROM, to: [email], subject, text: message }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) throw new CommerceError(503, "Не удалось отправить код. Попробуйте позже.");
  } else {
    const nodemailer = await import("nodemailer");
    await nodemailer.createTransport(process.env.COMMERCE_SMTP_URL!).sendMail({
      from: process.env.COMMERCE_MAIL_FROM, to: email, subject, text: message,
    });
  }
  return { challenge: id };
}

export async function verifyLogin(challenge: unknown, code: unknown): Promise<{ token: string; user: CommerceUser }> {
  if (typeof challenge !== "string" || typeof code !== "string" || !/^\d{6}$/.test(code)) throw new CommerceError(400, "Введите шестизначный код");
  const result = await (await database()).transaction(async (tx) => {
    const row = (await tx.query<{ email: string; code_hash: string; expires_at: string; attempts: number; consumed: boolean }>("SELECT * FROM commerce_codes WHERE id=$1", [challenge])).rows[0];
    if (!row || row.consumed || row.attempts >= 5 || Number(row.expires_at) <= Date.now()) return null;
    await tx.query("UPDATE commerce_codes SET attempts=attempts+1 WHERE id=$1", [challenge]);
    if (!timingSafeEqual(Buffer.from(row.code_hash, "hex"), Buffer.from(digest(`${challenge}:${code}`), "hex"))) return null;
    await tx.query("UPDATE commerce_codes SET consumed=true WHERE id=$1", [challenge]);
    await tx.query("INSERT INTO commerce_users(id,email,created_at) VALUES($1,$2,$3) ON CONFLICT(email) DO NOTHING", [randomUUID(), row.email, Date.now()]);
    const user = (await tx.query<{ id: string; email: string }>("SELECT id,email FROM commerce_users WHERE email=$1", [row.email])).rows[0];
    const token = randomBytes(32).toString("base64url");
    await tx.query("INSERT INTO commerce_sessions(token_hash,user_id,expires_at) VALUES($1,$2,$3)", [digest(token), user.id, Date.now() + SESSION_LIFETIME]);
    return { token, user: { ...user, admin: isAdminEmail(user.email) } };
  });
  if (!result) throw new CommerceError(400, "Код неверный или истёк. Проверьте код либо запросите новый.");
  return result;
}

function isAdminEmail(email: string): boolean {
  return (process.env.COMMERCE_ADMIN_EMAILS ?? "").toLowerCase().split(",").map((v) => v.trim()).includes(email);
}

function tokenFromRequest(request: Request): string | undefined {
  return request.headers.get("cookie")?.split(";").map((v) => v.trim()).find((v) => v.startsWith(`${SESSION_COOKIE}=`))?.slice(SESSION_COOKIE.length + 1);
}

export async function currentUser(request: Request): Promise<CommerceUser | null> {
  if (commerceMode() === "off") return null;
  const token = tokenFromRequest(request);
  if (!token || token.length > 100) return null;
  const row = (await (await database()).query<{ id: string; email: string }>("SELECT u.id,u.email FROM commerce_sessions s JOIN commerce_users u ON u.id=s.user_id WHERE s.token_hash=$1 AND s.expires_at>$2", [digest(token), Date.now()])).rows[0];
  return row ? { ...row, admin: isAdminEmail(row.email) } : null;
}

export async function requireUser(request: Request, admin = false): Promise<CommerceUser> {
  const user = await currentUser(request);
  if (!user) throw new CommerceError(401, "Войдите, чтобы сохранить оплаченный доступ");
  if (admin && !user.admin) throw new CommerceError(403, "Нет доступа к управлению");
  return user;
}

export async function logout(request: Request): Promise<void> {
  const token = tokenFromRequest(request);
  if (token) await (await database()).query("DELETE FROM commerce_sessions WHERE token_hash=$1", [digest(token)]);
}
