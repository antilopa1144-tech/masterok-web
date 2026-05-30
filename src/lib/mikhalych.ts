/**
 * Общие константы и утилиты для Михалыча (AI-помощник).
 */

export { MIKHALYCH_CHAT_SYSTEM_PROMPT as SYSTEM_PROMPT } from "./mikhalych/prompts/chat";
export { MIKHALYCH_CHAT_GENERATION, MIKHALYCH_REVIEW_GENERATION } from "./mikhalych/params";

import { MIKHALYCH_CHAT_GENERATION } from "./mikhalych/params";

/** @deprecated используйте MIKHALYCH_CHAT_GENERATION.max_tokens */
export const MAX_TOKENS = MIKHALYCH_CHAT_GENERATION.max_tokens;

/**
 * URL для API-запросов Михалыча.
 *
 * Всегда идёт через серверный route `/api/mikhalych`, который хранит
 * DEEPSEEK_API_KEY на сервере.
 */
export const MIKHALYCH_API_URL = "/api/mikhalych";

const MIN_INTERVAL_MS = 3000;
let lastRequestTime = 0;
let requestCount = 0;
const MAX_REQUESTS_PER_SESSION = 50;

export function checkRateLimit(): string | null {
  const now = Date.now();
  if (now - lastRequestTime < MIN_INTERVAL_MS) {
    return "Подождите несколько секунд перед следующим вопросом.";
  }
  if (requestCount >= MAX_REQUESTS_PER_SESSION) {
    return "Достигнут лимит вопросов за сессию. Обновите страницу для продолжения.";
  }
  lastRequestTime = now;
  requestCount++;
  return null;
}

export function getApiHeaders(): Record<string, string> {
  return {
    "Content-Type": "application/json",
  };
}

export { postMikhalychChat, streamMikhalychChat } from "./mikhalych/client";
export type { MikhalychChatRequest, MikhalychChatResponse } from "./mikhalych/client";
