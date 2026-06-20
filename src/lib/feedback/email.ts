/**
 * Доставка отзывов с сайта на e-mail владельца через Resend.
 *
 * Почему e-mail, а не Telegram: сервер на Timeweb не достучивается до
 * api.telegram.org (блокируется на хостинге), а до зарубежных API типа Resend
 * — да (как до DeepSeek у Михалыча). См. docs/feedback-telegram-setup.md.
 *
 * Настройка (env на сервере Timeweb):
 *   RESEND_API_KEY      — ключ из resend.com (Dashboard → API Keys)
 *   FEEDBACK_EMAIL_TO   — ваша почта, куда складывать отзывы
 *   FEEDBACK_EMAIL_FROM — необязательно. По умолчанию используется
 *                         "Мастерок <onboarding@resend.dev>" — это служебный
 *                         адрес Resend, работает без подтверждения домена,
 *                         но письма доходят только на e-mail аккаунта Resend.
 *                         Подтвердите свой домен в Resend → можно слать с него
 *                         на любой адрес и задать FEEDBACK_EMAIL_FROM.
 */

import type { FeedbackPayload } from "./telegram";

const DEFAULT_FROM = "Мастерок Отзывы <onboarding@resend.dev>";

const SENTIMENT_LABEL: Record<NonNullable<FeedbackPayload["sentiment"]>, string> = {
  like: "👍 Нравится",
  neutral: "😐 Нормально",
  dislike: "👎 Не то",
};

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function isEmailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY && process.env.FEEDBACK_EMAIL_TO);
}

export function buildFeedbackEmail(p: FeedbackPayload): { subject: string; html: string; text: string } {
  const sentiment = p.sentiment ? SENTIMENT_LABEL[p.sentiment] : "";
  const subjectTone = p.sentiment === "dislike" ? "⚠️ " : "";
  const snippet = p.message.trim().replace(/\s+/g, " ").slice(0, 60);
  const subject = `${subjectTone}Отзыв с Мастерок: ${snippet}${snippet.length >= 60 ? "…" : ""}`;

  const rows: [string, string][] = [];
  if (sentiment) rows.push(["Оценка", sentiment]);
  if (p.contact) rows.push(["Контакт для ответа", p.contact.trim()]);
  if (p.pageTitle || p.pageUrl) {
    const page = p.pageUrl
      ? `<a href="${escapeHtml(p.pageUrl)}">${escapeHtml(p.pageTitle || p.pageUrl)}</a>`
      : escapeHtml(p.pageTitle || "");
    rows.push(["Страница", page]);
  }
  if (p.viewport || p.theme) rows.push(["Контекст", escapeHtml([p.viewport, p.theme].filter(Boolean).join(" · "))]);

  const rowsHtml = rows
    .map(
      ([k, v]) =>
        `<tr><td style="padding:4px 12px 4px 0;color:#64748b;white-space:nowrap;vertical-align:top">${k}</td><td style="padding:4px 0;color:#0f172a">${v}</td></tr>`,
    )
    .join("");

  const html = `
  <div style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;max-width:560px;margin:0 auto">
    <div style="font-size:18px;font-weight:700;color:#0f172a;margin-bottom:4px">💬 Новый отзыв с сайта Мастерок</div>
    <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:16px;margin:12px 0">
      <div style="font-size:15px;color:#0f172a;white-space:pre-wrap;line-height:1.5">${escapeHtml(p.message.trim())}</div>
    </div>
    <table style="font-size:13px;border-collapse:collapse">${rowsHtml}</table>
  </div>`.trim();

  const textLines = [
    "Новый отзыв с сайта Мастерок",
    sentiment,
    "",
    p.message.trim(),
    "",
    ...rows.filter(([k]) => k !== "Страница").map(([k, v]) => `${k}: ${v.replace(/<[^>]+>/g, "")}`),
    p.pageUrl ? `Страница: ${p.pageTitle || ""} ${p.pageUrl}`.trim() : "",
  ].filter(Boolean);

  return { subject, html, text: textLines.join("\n") };
}

export interface DeliveryResult {
  delivered: boolean;
  reason?: "not_configured" | "resend_error" | "exception";
}

export async function sendFeedbackEmail(p: FeedbackPayload): Promise<DeliveryResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.FEEDBACK_EMAIL_TO;
  const from = process.env.FEEDBACK_EMAIL_FROM || DEFAULT_FROM;
  if (!apiKey || !to) {
    console.warn("[feedback] Resend не настроен (RESEND_API_KEY / FEEDBACK_EMAIL_TO). Отзыв:", buildFeedbackEmail(p).text);
    return { delivered: false, reason: "not_configured" };
  }

  const { subject, html, text } = buildFeedbackEmail(p);
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from,
        to: [to],
        subject,
        html,
        text,
        // Ответить «Reply» сразу пользователю, если он оставил e-mail.
        ...(p.contact && /@/.test(p.contact) ? { reply_to: p.contact.trim() } : {}),
      }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) {
      const b = await res.text().catch(() => "");
      console.error("[feedback] Resend send failed", res.status, b.slice(0, 300));
      return { delivered: false, reason: "resend_error" };
    }
    return { delivered: true };
  } catch (err) {
    console.error("[feedback] Resend exception", err);
    return { delivered: false, reason: "exception" };
  }
}
