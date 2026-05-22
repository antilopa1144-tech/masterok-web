/** Параметры генерации для прокси /api/mikhalych (дефолты сервера и клиента). */

export const MIKHALYCH_CHAT_GENERATION = {
  temperature: 0.85,
  top_p: 0.92,
  frequency_penalty: 0.04,
  presence_penalty: 0.1,
  max_tokens: 1536,
} as const;

export const MIKHALYCH_REVIEW_GENERATION = {
  temperature: 0.78,
  top_p: 0.9,
  frequency_penalty: 0.08,
  presence_penalty: 0.08,
  max_tokens: 450,
} as const;
