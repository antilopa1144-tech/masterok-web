import { MIKHALYCH_CHAT_GENERATION } from "./params";
import type { AgentProjectEntryPayload } from "./agent/types";
import type { MikhalychSseEvent } from "./agent/sse";

const MIKHALYCH_API_URL = "/api/mikhalych";

function getApiHeaders(): Record<string, string> {
  return { "Content-Type": "application/json" };
}

export interface MikhalychChatRequest {
  messages: Array<{ role: "user" | "assistant"; content: string }>;
  calcContext?: string;
  /** По умолчанию true — стриминг финального ответа и статусы tools. */
  stream?: boolean;
}

export interface MikhalychChatResponse {
  content: string;
  toolsUsed?: string[];
  calculatorLinks?: Array<{ slug: string; title: string; url: string }>;
  projectEntries?: AgentProjectEntryPayload[];
}

export interface MikhalychStreamHandlers {
  onStatus?: (message: string) => void;
  onToolStart?: (tool: string) => void;
  onToolEnd?: (tool: string) => void;
  onDelta?: (text: string) => void;
}

/**
 * Запрос к Михалычу (агент на сервере).
 */
export async function postMikhalychChat(
  input: MikhalychChatRequest,
  signal?: AbortSignal,
): Promise<MikhalychChatResponse> {
  const response = await fetch(MIKHALYCH_API_URL, {
    method: "POST",
    headers: getApiHeaders(),
    signal,
    body: JSON.stringify({
      messages: input.messages,
      calcContext: input.calcContext,
      stream: false,
      ...MIKHALYCH_CHAT_GENERATION,
    }),
  });

  return parseChatJson(response);
}

/**
 * Стриминг: статусы tools + посимвольная печать финального ответа.
 */
export async function streamMikhalychChat(
  input: MikhalychChatRequest,
  handlers: MikhalychStreamHandlers,
  signal?: AbortSignal,
): Promise<MikhalychChatResponse> {
  const response = await fetch(MIKHALYCH_API_URL, {
    method: "POST",
    headers: getApiHeaders(),
    signal,
    body: JSON.stringify({
      messages: input.messages,
      calcContext: input.calcContext,
      stream: true,
      ...MIKHALYCH_CHAT_GENERATION,
    }),
  });

  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("text/event-stream")) {
    return parseChatJson(response);
  }

  if (!response.ok || !response.body) {
    return parseChatJson(response);
  }

  let result: MikhalychChatResponse = { content: "" };
  const decoder = new TextDecoder();
  let buffer = "";
  const reader = response.body.getReader();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const parts = buffer.split("\n\n");
    buffer = parts.pop() ?? "";

    for (const part of parts) {
      const line = part.split("\n").find((l) => l.startsWith("data:"));
      if (!line) continue;
      const json = line.slice(5).trim();
      if (!json) continue;
      try {
        const event = JSON.parse(json) as MikhalychSseEvent;
        dispatchSseEvent(event, handlers, (r) => {
          result = r;
        });
      } catch {
        /* skip */
      }
    }
  }

  if (!result.content) {
    throw new Error("Пустой ответ от AI");
  }
  return result;
}

function dispatchSseEvent(
  event: MikhalychSseEvent,
  handlers: MikhalychStreamHandlers,
  setResult: (r: MikhalychChatResponse) => void,
) {
  switch (event.type) {
    case "status":
      handlers.onStatus?.(event.message);
      break;
    case "tool_start":
      handlers.onToolStart?.(event.tool);
      break;
    case "tool_end":
      handlers.onToolEnd?.(event.tool);
      break;
    case "delta":
      handlers.onDelta?.(event.content);
      break;
    case "done":
      setResult({
        content: event.result.content,
        toolsUsed: event.result.toolsUsed,
        calculatorLinks: event.result.calculatorLinks,
        projectEntries: event.result.projectEntries,
      });
      break;
  }
}

async function parseChatJson(response: Response): Promise<MikhalychChatResponse> {
  if (!response.ok) {
    let detail = "";
    try {
      const errorBody = await response.json();
      detail = errorBody?.error?.message ?? errorBody?.error ?? errorBody?.message ?? "";
    } catch {
      /* ignore */
    }
    const base = `Ошибка AI-сервиса (${response.status}). Попробуйте позже.`;
    throw new Error(typeof detail === "string" && detail ? `${base} ${detail}` : base);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content || typeof content !== "string") {
    throw new Error("Пустой ответ от AI");
  }

  return {
    content,
    toolsUsed: data.mikhalych?.toolsUsed,
    calculatorLinks: data.mikhalych?.calculatorLinks,
    projectEntries: data.mikhalych?.projectEntries,
  };
}
