import { createHash, randomUUID } from "node:crypto";
import { currentUser } from "../commerce/auth";
import { accessFor } from "../commerce/billing";
import { commerceMode, getSettings, publicState } from "../commerce/config";
import { database, type Sql } from "../commerce/db";
import { CommerceError } from "../commerce/types";

export interface MikhalychReservation {
  recordUsage(input: number | undefined, output: number | undefined): void;
  finish(): Promise<void>;
}

export function freeWeekPeriod(now: number): { period: string; reset: number } {
  // A single predictable Russian time zone for every user and server.
  const moscowOffset = 3 * 3600000;
  const date = new Date(now + moscowOffset);
  const day = date.getUTCDay();
  const start = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() - ((day + 6) % 7));
  return { period: new Date(start).toISOString().slice(0, 10), reset: start - moscowOffset + 7 * 86400000 };
}

/** One shared counter and budget for both chat routes; reserve before the model runs. */
export async function reserveMikhalychAccess(request: Request, hasPhoto: boolean): Promise<MikhalychReservation | null> {
  if (commerceMode() === "off") {
    if (hasPhoto) throw new CommerceError(503, "Анализ фото пока не подключён");
    return null;
  }
  const settings = await getSettings();
  const state = publicState(settings);
  // Do not reduce free access until the upgraded AI product is actually on sale.
  if (!state.proAvailable || !state.aiAvailable) {
    if (hasPhoto) throw new CommerceError(503, "Анализ фото пока не подключён");
    return null;
  }
  const user = await currentUser(request);
  const paid = Boolean(user && state.aiAvailable && (await accessFor(user.id)).pro);
  if (hasPhoto && (!paid || !state.aiAvailable)) throw new CommerceError(403, "Анализ фото доступен при активном PRO. Войдите в кабинет, чтобы проверить доступ.");
  const now = Date.now();
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const agent = request.headers.get("user-agent")?.slice(0, 160) || "unknown";
  const anonymous = createHash("sha256").update(`${ip}:${agent}`).digest("hex");
  const week = freeWeekPeriod(now);
  const period = paid ? new Date(now).toISOString().slice(0, 7) : week.period;
  const maximum = paid ? settings.proAiRequests : settings.freeAiWeeklyRequests;
  const reset = paid ? Date.UTC(Number(period.slice(0, 4)), Number(period.slice(5, 7)), 1) : week.reset;
  const key = `mikhalych:${paid ? `pro:${user!.id}` : user ? `free-user:${user.id}` : `free:${anonymous}`}:${period}`;
  const db = await database();
  const budgetId = paid ? randomUUID() : null;
  // Conservative preflight: a multi-step agent may call the model repeatedly.
  const reserveCost = 2000;
  await db.transaction(async (tx) => {
    if (paid && budgetId) {
      const spent = (await tx.query<{ cost: string }>("SELECT COALESCE(SUM(COALESCE(cost,reserved)),0) AS cost FROM commerce_ai_usage WHERE user_id=$1 AND period=$2", [user!.id, period])).rows[0];
      if (Number(spent?.cost ?? 0) + reserveCost > settings.proAiBudgetKopecks) throw new CommerceError(429, "Месячный бюджет Михалыча в PRO исчерпан. Остальные функции подписки доступны.");
    }
    await reserveQuota(tx, key, maximum, reset, paid ? `Лимит PRO (${maximum} вопросов в месяц) достигнут. Новый период начнётся в следующем месяце.` : `Бесплатный лимит (${maximum} вопросов в неделю) достигнут. Новый период начнётся в понедельник или откройте PRO.`);
    if (paid && budgetId) await tx.query("INSERT INTO commerce_ai_usage(id,user_id,period,reserved,state,created_at) VALUES($1,$2,$3,$4,'reserved',$5)", [budgetId, user!.id, period, reserveCost, now]);
  });
  if (!budgetId) return null;
  let inputTokens = hasPhoto ? 1200 : 0;
  let outputTokens = hasPhoto ? 650 : 0;
  let measured = false;
  return {
    recordUsage(input, output) {
      if (Number.isInteger(input) && Number.isInteger(output) && input! >= 0 && output! >= 0) {
        inputTokens += input!; outputTokens += output!; measured = true;
      }
    },
    async finish() {
      // Unknown upstream usage keeps the conservative reservation.
      const cost = measured ? Math.max(1, Math.ceil((inputTokens * settings.aiInputKopecksPerMillion + outputTokens * settings.aiOutputKopecksPerMillion) / 1_000_000)) : reserveCost;
      await db.query("UPDATE commerce_ai_usage SET state='complete',cost=$1 WHERE id=$2 AND state='reserved'", [cost, budgetId]);
    },
  };
}

export async function reserveProMikhalychQuota(userId: string, maximum: number, tx: Sql): Promise<void> {
  const period = new Date().toISOString().slice(0, 7);
  await reserveQuota(tx, `mikhalych:pro:${userId}:${period}`, maximum, Date.UTC(Number(period.slice(0, 4)), Number(period.slice(5, 7)), 1), `Лимит PRO (${maximum} вопросов в месяц) достигнут.`);
}

async function reserveQuota(tx: Sql, key: string, maximum: number, reset: number, message: string): Promise<void> {
  const row = (await tx.query<{ count: number }>("SELECT count FROM commerce_limits WHERE id=$1", [key])).rows[0];
  if (Number(row?.count ?? 0) >= maximum) throw new CommerceError(429, message);
  await tx.query("INSERT INTO commerce_limits(id,count,reset_at) VALUES($1,1,$2) ON CONFLICT(id) DO UPDATE SET count=commerce_limits.count+1,reset_at=$2", [key, reset]);
}
