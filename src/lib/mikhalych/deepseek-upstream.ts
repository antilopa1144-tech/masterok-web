/**
 * Прокси Михалыча → DeepSeek API.
 * Документация DeepSeek: https://api-docs.deepseek.com/
 *
 * Единственный провайдер. Fallback на OpenRouter убран осознанно: на нём
 * недоступен tool calling, то есть агент там не работает, а поддержка второго
 * пути только маскировала отсутствие ключа.
 */
export const DEEPSEEK_CHAT_URL = "https://api.deepseek.com/chat/completions";

/**
 * Модель чата Михалыча.
 *
 * `deepseek-flash` — это DeepSeek-V4.1-Flash. Так его называет сам API:
 * https://api-docs.deepseek.com/quick_start/pricing/
 * Проверено живым запросом к /chat/completions: `deepseek-flash` и
 * `deepseek-v4-flash` обслуживает одна и та же модель V4.1-Flash.
 *
 * Идентификатора `deepseek-v4.1` в API НЕ существует — запрос с ним падает
 * с 400 «The supported API model names are deepseek-flash, deepseek-v4-pro».
 *
 * `deepseek-v4-pro` (DeepSeek-V4-Pro-0813) выводится из эксплуатации: с
 * 14.09.2026 12:00 по Пекину запросы к нему маршрутизируются в V4.1-Flash.
 * Поэтому дефолт переведён на Flash явно, не дожидаясь молчаливой подмены.
 * Явный MIKHALYCH_MODEL=deepseek-v4-pro по-прежнему уважается.
 */
export const DEFAULT_MIKHALYCH_MODEL = "deepseek-flash";
/**
 * Модель второй проверки (review). Обе переменные указывают на один и тот же
 * V4.1-Flash: после вывода V4-Pro отдельной «pro»-модели в API не осталось,
 * а роли агентов разводятся промптами. Отдельная константа сохранена, чтобы
 * `MIKHALYCH_REVIEW_MODEL` оставался рабочей точкой конфигурации.
 */
export const DEFAULT_MIKHALYCH_REVIEW_MODEL = "deepseek-flash";

/** Провайдер один; тип сохранён, чтобы вызывающий код читался явно. */
export type MikhalychUpstreamProvider = "deepseek";

/**
 * Синонимы, которые принимает DeepSeek API, приведённые к текущему имени модели.
 * `deepseek-v4-pro` здесь намеренно отсутствует: это действующая модель, и
 * пользователь, выбравший её явно, должен получить именно её.
 *
 * Ключи вида `deepseek/deepseek-v4-flash` — это форма OpenRouter, которую можно
 * встретить в старых env. Провайдер убран, но значения продолжают приниматься.
 */
const LEGACY_MODEL_ALIASES: Record<string, string> = {
  "deepseek/deepseek-v4-pro": "deepseek-v4-pro",
  "deepseek/deepseek-v4-flash": DEFAULT_MIKHALYCH_REVIEW_MODEL,
  "deepseek/deepseek-r1": DEFAULT_MIKHALYCH_MODEL,
  "deepseek-v4-flash": DEFAULT_MIKHALYCH_REVIEW_MODEL,
  // Выведенные из эксплуатации имена: DeepSeek обслуживает их моделью V4.1-Flash.
  "deepseek-chat": DEFAULT_MIKHALYCH_MODEL,
  "deepseek-reasoner": DEFAULT_MIKHALYCH_MODEL,
};

export function getDeepSeekApiKey(): string {
  return process.env.DEEPSEEK_API_KEY?.trim() ?? "";
}

/** Настроен ли апстрим. Провайдер только один, поэтому null = нет ключа. */
export function getMikhalychUpstreamProvider(): MikhalychUpstreamProvider | null {
  return getDeepSeekApiKey() ? "deepseek" : null;
}

export function resolveDeepSeekModel(envValue: string | undefined, fallback: string): string {
  const raw = envValue?.trim();
  if (!raw) return fallback;
  return LEGACY_MODEL_ALIASES[raw] ?? raw;
}

export function getMikhalychChatModel(): string {
  return resolveDeepSeekModel(process.env.MIKHALYCH_MODEL, DEFAULT_MIKHALYCH_MODEL);
}

export function getMikhalychReviewModel(): string {
  const envModel = process.env.MIKHALYCH_REVIEW_MODEL ?? process.env.MIKHALYCH_MODEL;
  return resolveDeepSeekModel(envModel, DEFAULT_MIKHALYCH_REVIEW_MODEL);
}

/**
 * Режим «размышлений» DeepSeek. По умолчанию ВЫКЛЮЧЕН: для короткого чата и
 * ревью он только добавляет латентность и токены, а ответ и так уходит в content.
 *
 * Агент вызывает модель с `allowThinking: true` — на многошаговых сценариях
 * (смета по помещениям, сравнение вариантов) скрытые рассуждения помогают
 * выбрать инструмент и не потерять параметры, а в стрим они не попадают:
 * `accumulateStreamChunk` читает только `delta.content`.
 */
export function withThinking(
  body: Record<string, unknown>,
  allowThinking: boolean,
): Record<string, unknown> {
  if (allowThinking) return body;
  return { ...body, thinking: { type: "disabled" } };
}

export interface MikhalychUpstreamRequestOptions {
  /** Метка клиента (`x-client`) — уходит в трейсы Langfuse. */
  clientLabel?: string;
  /** Оригин сайта — используется для ссылок на калькуляторы в контексте. */
  siteOrigin?: string;
  /** Включить скрытые рассуждения модели. По умолчанию выключены. */
  allowThinking?: boolean;
}

export async function mikhalychChatCompletion(
  body: Record<string, unknown>,
  options: MikhalychUpstreamRequestOptions = {},
): Promise<Response> {
  const apiKey = getDeepSeekApiKey();
  if (!apiKey) {
    return new Response(
      JSON.stringify({
        error: "AI not configured: set DEEPSEEK_API_KEY on server",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }

  return fetch(DEEPSEEK_CHAT_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(withThinking(body, options.allowThinking === true)),
  });
}

/** @deprecated используйте mikhalychChatCompletion */
export const deepseekChatCompletion = mikhalychChatCompletion;
