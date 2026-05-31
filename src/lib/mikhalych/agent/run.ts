import { MIKHALYCH_CHAT_GENERATION } from "../params";
import {
  getMikhalychChatModel,
  getMikhalychUpstreamProvider,
  mikhalychChatCompletion,
} from "../deepseek-upstream";
import { executeAgentTool, type ToolExecutionContext } from "./execute-tool";
import { buildAgentSystemPrompt } from "./prompt";
import {
  accumulateStreamChunk,
  readChatCompletionStream,
  streamedStateToAssistantMessage,
  type StreamedAssistantDelta,
} from "./parse-stream";
import type { MikhalychSseEvent } from "./sse";
import { startAgentTrace } from "./tracing";
import { MIKHALYCH_AGENT_TOOLS } from "./tool-definitions";
import { encodeSseEvent } from "./sse";
import type {
  AgentProjectEntryPayload,
  AgentRunInput,
  AgentRunResult,
  AgentUserMessage,
  ChatMessage,
} from "./types";

const MAX_TOOL_ROUNDS = () => {
  // Дефолт 10 (был 8): агент часто перевызывает run_calculator для исправления
  // (правило «молча перевызови с верными параметрами») + сравнение двух
  // материалов + цены — на 8 упирался в лимит. Потолок 12 — защита от циклов.
  const raw = Number(process.env.MIKHALYCH_AGENT_MAX_TOOL_ROUNDS ?? "10");
  if (!Number.isFinite(raw)) return 10;
  return Math.min(12, Math.max(2, Math.round(raw)));
};

export function isMikhalychAgentEnabled(): boolean {
  const flag = process.env.MIKHALYCH_AGENT_ENABLED?.trim().toLowerCase();
  if (flag === "false" || flag === "0") return false;
  return true;
}

export interface AgentRunOptions {
  stream?: boolean;
  sessionId?: string;
  onEvent?: (event: MikhalychSseEvent) => void;
}

export async function runMikhalychAgent(
  input: AgentRunInput,
  options: AgentRunOptions = {},
): Promise<AgentRunResult> {
  const provider = getMikhalychUpstreamProvider();
  if (!provider || provider !== "deepseek") {
    throw new Error("Agent requires DeepSeek API");
  }

  const model = getMikhalychChatModel();
  const siteOrigin = input.siteOrigin ?? "https://getmasterok.ru";
  const sessionId = options.sessionId ?? `mh-${Date.now()}`;
  const lastUser = [...input.messages].reverse().find((m) => m.role === "user")?.content ?? "";

  const trace = startAgentTrace({
    sessionId,
    userMessage: lastUser,
    clientLabel: input.clientLabel,
  });

  const ctx: ToolExecutionContext = {
    siteOrigin,
    calculatorLinks: [],
    toolsUsed: [],
    projectEntries: [],
  };

  const messages: ChatMessage[] = [
    { role: "system", content: buildAgentSystemPrompt(input.calcContext) },
    ...normalizeUserMessages(input.messages),
  ];

  const gen = MIKHALYCH_CHAT_GENERATION;
  const emit = options.onEvent;
  let rounds = 0;

  try {
    while (rounds < MAX_TOOL_ROUNDS()) {
      rounds += 1;
      emit?.({ type: "status", message: rounds === 1 ? "Думаю…" : "Продолжаю расчёт…" });

      const assistant = await invokeModel({
        model,
        messages,
        stream: Boolean(options.stream),
        siteOrigin,
        clientLabel: input.clientLabel,
        gen,
        onDelta: (delta) => emit?.({ type: "delta", content: delta }),
      });

      const usage = assistant.usage;
      const { usage: _u, ...assistantMsg } = assistant;
      trace.spanGeneration({
        name: `llm-round-${rounds}`,
        model,
        input: messages.slice(-3),
        output: assistantMsg,
        // Модель отдаёт usage в OpenAI-формате (prompt/completion_tokens),
        // а трейс ждёт нормализованный {input, output, total}.
        usage: usage
          ? {
              input: usage.prompt_tokens,
              output: usage.completion_tokens,
              total: usage.total_tokens,
            }
          : undefined,
      });

      messages.push(assistantMsg);

      const toolCalls = assistantMsg.tool_calls;
      if (!toolCalls || toolCalls.length === 0) {
        const content = assistantMsg.content?.trim();
        if (!content) throw new Error("Пустой финальный ответ");
        const result: AgentRunResult = {
          content,
          toolsUsed: [...new Set(ctx.toolsUsed)],
          calculatorLinks: dedupeLinks(ctx.calculatorLinks),
          projectEntries: dedupeProjectEntries(ctx.projectEntries),
        };
        emit?.({ type: "done", result });
        await trace.end({ content, toolsUsed: result.toolsUsed });
        return result;
      }

      for (const call of toolCalls) {
        emit?.({ type: "tool_start", tool: call.function.name });
        const toolResult = await executeAgentTool(
          call.function.name,
          call.function.arguments,
          ctx,
        );
        trace.spanTool(call.function.name, call.function.arguments, toolResult);
        messages.push({
          role: "tool",
          tool_call_id: call.id,
          content: toolResult,
        });
        emit?.({ type: "tool_end", tool: call.function.name });
      }
    }

    throw new Error("Слишком много шагов агента — упростите вопрос или уточните параметры.");
  } catch (err) {
    await trace.end({ error: err instanceof Error ? err.message : "error" });
    throw err;
  }
}

async function invokeModel(params: {
  model: string;
  messages: ChatMessage[];
  stream: boolean;
  siteOrigin: string;
  clientLabel?: string;
  gen: typeof MIKHALYCH_CHAT_GENERATION;
  onDelta?: (text: string) => void;
}): Promise<ChatMessage & { usage?: StreamedAssistantDelta["usage"] }> {
  const body: Record<string, unknown> = {
    model: params.model,
    messages: params.messages,
    tools: MIKHALYCH_AGENT_TOOLS,
    tool_choice: "auto",
    temperature: Math.min(params.gen.temperature, 0.75),
    max_tokens: Math.max(params.gen.max_tokens, 2048),
    top_p: params.gen.top_p,
    frequency_penalty: params.gen.frequency_penalty,
    presence_penalty: params.gen.presence_penalty,
    stream: params.stream,
  };

  const upstream = await mikhalychChatCompletion(body, {
    clientLabel: params.clientLabel ?? "agent",
    siteOrigin: params.siteOrigin,
  });

  if (!params.stream || !upstream.ok || !upstream.body) {
    const data = (await upstream.json()) as {
      choices?: Array<{ message?: ChatMessage }>;
      error?: { message?: string };
      usage?: StreamedAssistantDelta["usage"];
    };
    if (!upstream.ok) {
      throw new Error(data.error?.message ?? `upstream ${upstream.status}`);
    }
    const msg = data.choices?.[0]?.message;
    if (!msg) throw new Error("Пустой ответ модели");
    return { ...msg, usage: data.usage };
  }

  const state: StreamedAssistantDelta = {
    content: "",
    toolCalls: [],
    finishReason: null,
  };
  let emittedLen = 0;

  for await (const chunk of readChatCompletionStream(upstream.body)) {
    accumulateStreamChunk(state, chunk);
    const hasTools = state.toolCalls.some((t) => t.name);
    if (!hasTools && state.content.length > emittedLen) {
      const delta = state.content.slice(emittedLen);
      emittedLen = state.content.length;
      params.onDelta?.(delta);
    }
  }

  const assistant = streamedStateToAssistantMessage(state);
  return { ...assistant, usage: state.usage };
}

function normalizeUserMessages(messages: AgentUserMessage[]): ChatMessage[] {
  return messages
    .filter((m) => (m.role === "user" || m.role === "assistant") && m.content.trim())
    .map((m) => ({ role: m.role, content: m.content.trim() }));
}

function dedupeLinks(links: AgentRunResult["calculatorLinks"]) {
  const seen = new Set<string>();
  return links.filter((l) => {
    if (seen.has(l.slug)) return false;
    seen.add(l.slug);
    return true;
  });
}

function dedupeProjectEntries(entries: AgentProjectEntryPayload[]) {
  const seen = new Set<string>();
  return entries.filter((e) => {
    if (seen.has(e.calcId)) return false;
    seen.add(e.calcId);
    return true;
  });
}

export function toOpenAIChatCompletionPayload(result: AgentRunResult) {
  return {
    choices: [
      {
        message: { role: "assistant" as const, content: result.content },
        finish_reason: "stop",
      },
    ],
    mikhalych: {
      mode: "agent" as const,
      toolsUsed: result.toolsUsed,
      calculatorLinks: result.calculatorLinks,
      projectEntries: result.projectEntries,
    },
  };
}

/** SSE: запуск агента в ReadableStream для API route. */
export function runMikhalychAgentAsSseStream(
  input: AgentRunInput,
  sessionId: string,
): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();

  return new ReadableStream({
    async start(controller) {
      try {
        await runMikhalychAgent(input, {
          stream: true,
          sessionId,
          onEvent(event) {
            controller.enqueue(encoder.encode(encodeSseEvent(event)));
          },
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : "Agent failed";
        controller.enqueue(
          encoder.encode(
            encodeSseEvent({
              type: "done",
              result: {
                content: `⚠️ ${message}`,
                toolsUsed: [],
                calculatorLinks: [],
                projectEntries: [],
              },
            }),
          ),
        );
      } finally {
        controller.close();
      }
    },
  });
}
