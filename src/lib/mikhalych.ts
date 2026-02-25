/**
 * Общие константы и утилиты для Михалыча (AI-помощник).
 */

export const SYSTEM_PROMPT = `Ты — Михалыч, опытный строительный мастер с 30-летним стажем.
Работал на стройках по всей России: фундаменты, кладка, кровля, отделка — всё умеешь.
Говоришь просто, по-деловому, без воды. Иногда с добродушным юмором деревенского мастера.

Твои правила:
- Отвечай чётко и практично. Если спрашивают расчёт — считай.
- Объясняй простыми словами, без умных терминов (или объясняй термины сразу).
- Предупреждай о типичных ошибках и нюансах монтажа.
- Ссылайся на ГОСТ и СНиП когда уместно.
- Если вопрос не про строительство — вежливо перенаправляй.
- Не выдумывай числа. Если не уверен — скажи об этом.
- Используй конкретные марки материалов популярных в России: Knauf, Ceresit, Технониколь, Weber, Волма, Старатели.
- Отвечай на русском языке.

Примеры твоего стиля:
- "Вот смотри, тут всё просто..."
- "Из практики скажу: лучше не экономить на..."
- "По СНиП положено 10%, но я бы взял все 15%..."
- "Главное не забудь про..."`;

export const OPENROUTER_MODEL = "google/gemini-3-flash-preview";

/**
 * URL для API-запросов Михалыча.
 *
 * Если задана NEXT_PUBLIC_MIKHALYCH_PROXY_URL — используется прокси (рекомендуется).
 * Прокси (Cloudflare Worker / серверная функция) хранит API-ключ на сервере,
 * не раскрывая его в клиентском бандле.
 *
 * Если прокси не настроен — fallback на прямое обращение к OpenRouter
 * (ключ берётся из NEXT_PUBLIC_OPENROUTER_API_KEY — менее безопасно).
 */
export const MIKHALYCH_API_URL =
  process.env.NEXT_PUBLIC_MIKHALYCH_PROXY_URL ??
  "https://openrouter.ai/api/v1/chat/completions";

export const USE_PROXY = !!process.env.NEXT_PUBLIC_MIKHALYCH_PROXY_URL;

/**
 * Простой клиентский rate limiter — не даёт отправлять запросы чаще раза в 3 секунды.
 * Не заменяет серверную защиту, но снижает возможности автоматизированного злоупотребления.
 */
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

export function getApiKey(): string | null {
  if (USE_PROXY) return null;
  return process.env.NEXT_PUBLIC_OPENROUTER_API_KEY ?? null;
}

export function getSiteUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL ?? "https://getmasterok.ru";
}

/**
 * Формирует заголовки для запроса к API / прокси.
 */
export function getApiHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (USE_PROXY) return headers;
  const key = getApiKey();
  if (key) {
    headers["Authorization"] = `Bearer ${key}`;
    headers["HTTP-Referer"] = getSiteUrl();
    headers["X-Title"] = "Мастерок — Михалыч";
  }
  return headers;
}
