/**
 * Доставка отзывов с сайта в Telegram владельца.
 *
 * Настройка (env на сервере Timeweb):
 *   TELEGRAM_BOT_TOKEN        — токен бота от @BotFather
 *   TELEGRAM_FEEDBACK_CHAT_ID — ваш chat_id (узнать у @userinfobot)
 *
 * Если env не заданы — доставка пропускается (sendFeedbackToTelegram вернёт
 * { delivered: false, reason: "not_configured" }), сайт при этом не падает.
 * На Timeweb Cloud Apps файловая система эфемерна, поэтому Telegram —
 * и есть «хранилище» отзывов: они сразу уходят в личку.
 */

export interface FeedbackPayload {
  /** Тон: like | neutral | dislike (необязательно). */
  sentiment?: "like" | "neutral" | "dislike";
  /** Текст отзыва. */
  message: string;
  /** Необязательный контакт для ответа (email/телеграм/телефон). */
  contact?: string;
  /** Страница, с которой оставлен отзыв. */
  pageUrl?: string;
  /** Заголовок/название страницы (если калькулятор — его title). */
  pageTitle?: string;
  /** Размер экрана, тема — для понимания контекста. */
  viewport?: string;
  theme?: string;
}

const SENTIMENT_EMOJI: Record<NonNullable<FeedbackPayload["sentiment"]>, string> = {
  like: "👍 Нравится",
  neutral: "😐 Нормально",
  dislike: "👎 Не то",
};

export function isTelegramConfigured(): boolean {
  return Boolean(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_FEEDBACK_CHAT_ID);
}

/** Экранирование для Telegram parse_mode=HTML. */
function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function buildFeedbackMessage(p: FeedbackPayload): string {
  const lines: string[] = ["💬 <b>Отзыв с сайта Мастерок</b>"];
  if (p.sentiment) lines.push(SENTIMENT_EMOJI[p.sentiment]);
  lines.push("", escapeHtml(p.message.trim()));
  const meta: string[] = [];
  if (p.contact) meta.push(`📨 Контакт: ${escapeHtml(p.contact.trim())}`);
  if (p.pageTitle || p.pageUrl) {
    meta.push(`🔗 Страница: ${escapeHtml(p.pageTitle || "")} ${escapeHtml(p.pageUrl || "")}`.trim());
  }
  if (p.viewport || p.theme) {
    meta.push(`🖥 ${escapeHtml([p.viewport, p.theme].filter(Boolean).join(" · "))}`);
  }
  if (meta.length) lines.push("", ...meta);
  return lines.join("\n");
}

export interface DeliveryResult {
  delivered: boolean;
  reason?: "not_configured" | "telegram_error" | "exception";
}

export async function sendFeedbackToTelegram(p: FeedbackPayload): Promise<DeliveryResult> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_FEEDBACK_CHAT_ID;
  if (!token || !chatId) {
    // Не настроено — логируем, чтобы отзыв не пропал бесследно в логах сервера.
    console.warn("[feedback] Telegram не настроен (TELEGRAM_BOT_TOKEN / TELEGRAM_FEEDBACK_CHAT_ID). Отзыв:", buildFeedbackMessage(p));
    return { delivered: false, reason: "not_configured" };
  }

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: buildFeedbackMessage(p),
        parse_mode: "HTML",
        disable_web_page_preview: true,
      }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.error("[feedback] Telegram sendMessage failed", res.status, body.slice(0, 300));
      return { delivered: false, reason: "telegram_error" };
    }
    return { delivered: true };
  } catch (err) {
    console.error("[feedback] Telegram exception", err);
    return { delivered: false, reason: "exception" };
  }
}
