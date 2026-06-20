import type { FeedbackPayload } from "./telegram";
import { isEmailConfigured, sendFeedbackEmail } from "./email";
import { isTelegramConfigured, sendFeedbackToTelegram } from "./telegram";

export type FeedbackChannel = "email" | "telegram" | "none";

export interface DeliveryOutcome {
  delivered: boolean;
  channel: FeedbackChannel;
  reason?: string;
}

/**
 * Доставляет отзыв доступным каналом.
 *
 * Приоритет — e-mail (Resend): сервер Timeweb не достучивается до Telegram API,
 * а до Resend — да. Telegram оставлен как запасной канал, если когда-нибудь
 * станет доступен (или появится релей). Если ничего не настроено — отзыв
 * пишется в лог сервера и не теряется.
 */
export async function deliverFeedback(payload: FeedbackPayload): Promise<DeliveryOutcome> {
  if (isEmailConfigured()) {
    const r = await sendFeedbackEmail(payload);
    return { delivered: r.delivered, channel: "email", reason: r.reason };
  }
  if (isTelegramConfigured()) {
    const r = await sendFeedbackToTelegram(payload);
    return { delivered: r.delivered, channel: "telegram", reason: r.reason };
  }
  return { delivered: false, channel: "none", reason: "not_configured" };
}
