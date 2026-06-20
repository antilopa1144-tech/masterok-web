import { NextRequest, NextResponse } from "next/server";
import type { FeedbackPayload } from "@/lib/feedback/telegram";
import { deliverFeedback } from "@/lib/feedback/deliver";
import { isEmailConfigured } from "@/lib/feedback/email";

// Простой in-memory rate-limit (на инстанс). Защита от спама формой.
const RATE = new Map<string, number[]>();
const MAX_PER_WINDOW = 5;
const WINDOW_MS = 60_000;
const PRUNE_AT = 500;

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  if (RATE.size > PRUNE_AT) {
    for (const [k, ts] of RATE) if (ts.every((t) => now - t >= WINDOW_MS)) RATE.delete(k);
  }
  const ts = (RATE.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  if (ts.length >= MAX_PER_WINDOW) return true;
  ts.push(now);
  RATE.set(ip, ts);
  return false;
}

const MAX_MESSAGE = 2000;
const MAX_CONTACT = 200;
const MAX_META = 300;

function clean(v: unknown, max: number): string | undefined {
  if (typeof v !== "string") return undefined;
  const s = v.trim().slice(0, max);
  return s.length > 0 ? s : undefined;
}

// Безопасная диагностика доставки (без значений секретов): какой канал
// настроен и доступен ли он с прод-сервера. Помогает отладить delivered:false.
export async function GET() {
  const resendKey = process.env.RESEND_API_KEY ?? "";
  const emailTo = process.env.FEEDBACK_EMAIL_TO ?? "";
  const emailFrom = process.env.FEEDBACK_EMAIL_FROM ?? "";

  // Живая проверка достижимости Resend с сервера (список доменов — без отправки писем).
  let resend: Record<string, unknown> = { checked: false };
  if (resendKey) {
    const started = Date.now();
    try {
      const res = await fetch("https://api.resend.com/domains", {
        headers: { Authorization: `Bearer ${resendKey}` },
        signal: AbortSignal.timeout(8000),
      });
      // 200 — ключ валиден; 401 — ключ неверный, но сеть доступна (тоже reachable).
      resend = { checked: true, reachable: true, httpStatus: res.status, keyValid: res.status === 200, ms: Date.now() - started };
    } catch (err) {
      resend = {
        checked: true,
        reachable: false,
        error: err instanceof Error ? `${err.name}: ${err.message}`.slice(0, 200) : "unknown",
        ms: Date.now() - started,
      };
    }
  }

  return NextResponse.json({
    channel: isEmailConfigured() ? "email" : process.env.TELEGRAM_BOT_TOKEN ? "telegram" : "none",
    email: {
      configured: isEmailConfigured(),
      apiKey: { present: resendKey.length > 0, length: resendKey.length },
      to: { present: emailTo.length > 0 },
      from: emailFrom || "default (onboarding@resend.dev)",
    },
    nodeEnv: process.env.NODE_ENV ?? null,
    resend,
  });
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (isRateLimited(ip)) {
    return NextResponse.json({ ok: false, error: "Слишком много отзывов подряд. Попробуйте через минуту." }, { status: 429 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Некорректный запрос" }, { status: 400 });
  }

  // Honeypot: скрытое поле, которое заполняют только боты.
  if (clean(body.company, 100)) {
    // Тихо «успех» — не подсказываем боту, что попался.
    return NextResponse.json({ ok: true });
  }

  const message = clean(body.message, MAX_MESSAGE);
  if (!message || message.length < 2) {
    return NextResponse.json({ ok: false, error: "Напишите пару слов — что улучшить?" }, { status: 400 });
  }

  const sentiment = ((): FeedbackPayload["sentiment"] => {
    const s = body.sentiment;
    return s === "like" || s === "neutral" || s === "dislike" ? s : undefined;
  })();

  const payload: FeedbackPayload = {
    sentiment,
    message,
    contact: clean(body.contact, MAX_CONTACT),
    pageUrl: clean(body.pageUrl, MAX_META),
    pageTitle: clean(body.pageTitle, MAX_META),
    viewport: clean(body.viewport, 40),
    theme: clean(body.theme, 40),
  };

  const result = await deliverFeedback(payload);
  // Пользователю всегда «спасибо», если отзыв валиден: свою часть он сделал.
  // Проблемы доставки видны в логах сервера. channel/reason — временно
  // в ответе для отладки доставки на проде.
  return NextResponse.json({ ok: true, delivered: result.delivered, channel: result.channel, reason: result.reason });
}
