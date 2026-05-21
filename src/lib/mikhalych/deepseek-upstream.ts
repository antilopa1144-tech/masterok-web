/**
 * Прокси Михалыча → DeepSeek API (приоритет) или OpenRouter (fallback).
 * Документация DeepSeek: https://api-docs.deepseek.com/
 */
export const DEEPSEEK_CHAT_URL = "https://api.deepseek.com/chat/completions";
const OPENROUTER_CHAT_URL = "https://openrouter.ai/api/v1/chat/completions";

export const DEFAULT_MIKHALYCH_MODEL = "deepseek-v4-pro";
export const DEFAULT_MIKHALYCH_REVIEW_MODEL = "deepseek-v4-flash";
const DEFAULT_OPENROUTER_CHAT_MODEL = "deepseek/deepseek-v4-pro";
const DEFAULT_OPENROUTER_REVIEW_MODEL = "deepseek/deepseek-v4-flash";

export type MikhalychUpstreamProvider = "deepseek" | "openrouter";

const LEGACY_MODEL_ALIASES: Record<string, string> = {
  "deepseek/deepseek-v4-pro": DEFAULT_MIKHALYCH_MODEL,
  "deepseek/deepseek-v4-flash": DEFAULT_MIKHALYCH_REVIEW_MODEL,
  "deepseek/deepseek-r1": DEFAULT_MIKHALYCH_MODEL,
  "deepseek-chat": "deepseek-chat",
  "deepseek-reasoner": "deepseek-reasoner",
};

const OPENROUTER_REASONING_MODELS = new Set<string>([
  "deepseek/deepseek-v4-flash",
  "deepseek/deepseek-v4-pro",
  "deepseek/deepseek-r1",
]);

export function getDeepSeekApiKey(): string {
  return process.env.DEEPSEEK_API_KEY?.trim() ?? "";
}

export function getOpenRouterApiKey(): string {
  return process.env.OPENROUTER_API_KEY?.trim() ?? "";
}

/** Какой провайдер реально будет использован (DeepSeek в приоритете). */
export function getMikhalychUpstreamProvider(): MikhalychUpstreamProvider | null {
  if (getDeepSeekApiKey()) return "deepseek";
  if (getOpenRouterApiKey()) return "openrouter";
  return null;
}

export function resolveDeepSeekModel(envValue: string | undefined, fallback: string): string {
  const raw = envValue?.trim();
  if (!raw) return fallback;
  return LEGACY_MODEL_ALIASES[raw] ?? raw;
}

function resolveOpenRouterModel(envValue: string | undefined, fallback: string): string {
  const raw = envValue?.trim();
  if (!raw) return fallback;
  if (raw === DEFAULT_MIKHALYCH_MODEL) return DEFAULT_OPENROUTER_CHAT_MODEL;
  if (raw === DEFAULT_MIKHALYCH_REVIEW_MODEL) return DEFAULT_OPENROUTER_REVIEW_MODEL;
  return raw;
}

export function getMikhalychChatModel(): string {
  const provider = getMikhalychUpstreamProvider();
  if (provider === "openrouter") {
    return resolveOpenRouterModel(process.env.MIKHALYCH_MODEL, DEFAULT_OPENROUTER_CHAT_MODEL);
  }
  return resolveDeepSeekModel(process.env.MIKHALYCH_MODEL, DEFAULT_MIKHALYCH_MODEL);
}

export function getMikhalychReviewModel(): string {
  const provider = getMikhalychUpstreamProvider();
  const envModel = process.env.MIKHALYCH_REVIEW_MODEL ?? process.env.MIKHALYCH_MODEL;
  if (provider === "openrouter") {
    return resolveOpenRouterModel(envModel, DEFAULT_OPENROUTER_REVIEW_MODEL);
  }
  return resolveDeepSeekModel(envModel, DEFAULT_MIKHALYCH_REVIEW_MODEL);
}

/** Без thinking — быстрый ответ в content (DeepSeek API). */
export function withThinkingDisabled<T extends Record<string, unknown>>(body: T): T & {
  thinking: { type: "disabled" };
} {
  return { ...body, thinking: { type: "disabled" } };
}

function withOpenRouterReasoningDisabled<T extends Record<string, unknown>>(
  body: T,
  model: string,
): T & { reasoning?: { enabled: boolean } } {
  if (!OPENROUTER_REASONING_MODELS.has(model)) return body;
  return { ...body, reasoning: { enabled: false } };
}

export interface MikhalychUpstreamRequestOptions {
  clientLabel?: string;
  siteOrigin?: string;
}

export async function mikhalychChatCompletion(
  body: Record<string, unknown>,
  options: MikhalychUpstreamRequestOptions = {},
): Promise<Response> {
  const provider = getMikhalychUpstreamProvider();
  if (!provider) {
    return new Response(
      JSON.stringify({
        error:
          "AI not configured: set DEEPSEEK_API_KEY (recommended) or OPENROUTER_API_KEY on server",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }

  if (provider === "deepseek") {
    return fetch(DEEPSEEK_CHAT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${getDeepSeekApiKey()}`,
      },
      body: JSON.stringify(withThinkingDisabled(body)),
    });
  }

  const model = typeof body.model === "string" ? body.model : DEFAULT_OPENROUTER_CHAT_MODEL;
  const client = (options.clientLabel ?? "web").slice(0, 40);
  const referer = options.siteOrigin ?? "https://getmasterok.ru";

  return fetch(OPENROUTER_CHAT_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getOpenRouterApiKey()}`,
      "HTTP-Referer": referer,
      "X-Title": `Masterok - ${client}`,
    },
    body: JSON.stringify(withOpenRouterReasoningDisabled(body, model)),
  });
}

/** @deprecated используйте mikhalychChatCompletion */
export const deepseekChatCompletion = mikhalychChatCompletion;
