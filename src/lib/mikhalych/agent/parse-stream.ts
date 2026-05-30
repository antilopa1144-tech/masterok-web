/** Парсинг SSE DeepSeek / OpenAI chat completions stream. */

export interface StreamedAssistantDelta {
  content: string;
  toolCalls: Array<{
    index: number;
    id?: string;
    name?: string;
    arguments?: string;
  }>;
  finishReason: string | null;
  usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
}

export async function* readChatCompletionStream(
  body: ReadableStream<Uint8Array>,
): AsyncGenerator<Record<string, unknown>> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const parts = buffer.split("\n");
      buffer = parts.pop() ?? "";

      for (const line of parts) {
        const trimmed = line.trim();
        if (!trimmed.startsWith("data:")) continue;
        const data = trimmed.slice(5).trim();
        if (data === "[DONE]") return;
        try {
          yield JSON.parse(data) as Record<string, unknown>;
        } catch {
          /* skip malformed */
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

export function accumulateStreamChunk(
  state: StreamedAssistantDelta,
  chunk: Record<string, unknown>,
): void {
  const choice = (chunk.choices as Array<Record<string, unknown>> | undefined)?.[0];
  if (!choice) return;

  const delta = choice.delta as Record<string, unknown> | undefined;
  if (delta?.content && typeof delta.content === "string") {
    state.content += delta.content;
  }

  const toolDeltas = delta?.tool_calls as Array<Record<string, unknown>> | undefined;
  if (toolDeltas) {
    for (const td of toolDeltas) {
      const index = typeof td.index === "number" ? td.index : 0;
      if (!state.toolCalls[index]) {
        state.toolCalls[index] = { index };
      }
      const slot = state.toolCalls[index];
      if (typeof td.id === "string") slot.id = td.id;
      const fn = td.function as Record<string, unknown> | undefined;
      if (fn?.name && typeof fn.name === "string") slot.name = fn.name;
      if (fn?.arguments && typeof fn.arguments === "string") {
        slot.arguments = (slot.arguments ?? "") + fn.arguments;
      }
    }
  }

  if (typeof choice.finish_reason === "string") {
    state.finishReason = choice.finish_reason;
  }

  const usage = chunk.usage as StreamedAssistantDelta["usage"];
  if (usage) state.usage = usage;
}

export function streamedStateToAssistantMessage(state: StreamedAssistantDelta): {
  role: "assistant";
  content: string | null;
  tool_calls?: Array<{
    id: string;
    type: "function";
    function: { name: string; arguments: string };
  }>;
} {
  const tool_calls = state.toolCalls
    .filter((t) => t.id && t.name)
    .map((t) => ({
      id: t.id!,
      type: "function" as const,
      function: {
        name: t.name!,
        arguments: t.arguments ?? "{}",
      },
    }));

  return {
    role: "assistant",
    content: state.content || null,
    ...(tool_calls.length > 0 ? { tool_calls } : {}),
  };
}
