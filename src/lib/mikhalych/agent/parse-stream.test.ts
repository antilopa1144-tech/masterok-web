import { describe, expect, it } from "vitest";
import {
  accumulateStreamChunk,
  streamedStateToAssistantMessage,
  type StreamedAssistantDelta,
} from "./parse-stream";

function emptyState(): StreamedAssistantDelta {
  return { content: "", reasoningContent: "", toolCalls: [], finishReason: null };
}

function chunk(delta: Record<string, unknown>, finishReason?: string) {
  return { choices: [{ delta, ...(finishReason ? { finish_reason: finishReason } : {}) }] };
}

describe("accumulateStreamChunk", () => {
  it("накапливает reasoning_content отдельно от content", () => {
    const state = emptyState();
    accumulateStreamChunk(state, chunk({ reasoning_content: "думаю " }));
    accumulateStreamChunk(state, chunk({ reasoning_content: "дальше" }));
    accumulateStreamChunk(state, chunk({ content: "Ответ" }));

    expect(state.reasoningContent).toBe("думаю дальше");
    expect(state.content).toBe("Ответ");
  });

  it("не путает типы: строка в content не попадает в reasoning и наоборот", () => {
    const state = emptyState();
    accumulateStreamChunk(state, chunk({ content: "видимый" }));
    expect(state.reasoningContent).toBe("");
  });

  it("игнорирует нестроковые значения deltas", () => {
    const state = emptyState();
    accumulateStreamChunk(state, chunk({ reasoning_content: null, content: 42 }));
    expect(state.reasoningContent).toBe("");
    expect(state.content).toBe("");
  });

  it("запоминает finish_reason", () => {
    const state = emptyState();
    accumulateStreamChunk(state, chunk({}, "length"));
    expect(state.finishReason).toBe("length");
  });
});

/**
 * DeepSeek требует возвращать reasoning_content в API при наличии tools, иначе
 * 400 на следующем ходу. Регрессия на это правило — самая дорогая из возможных.
 */
describe("streamedStateToAssistantMessage", () => {
  it("возвращает reasoning_content в сообщении ассистента", () => {
    const state = emptyState();
    state.reasoningContent = "цепочка рассуждений";
    state.content = "готовый ответ";

    const msg = streamedStateToAssistantMessage(state);
    expect(msg.reasoning_content).toBe("цепочка рассуждений");
    expect(msg.content).toBe("готовый ответ");
  });

  it("передаёт reasoning_content вместе с tool_calls", () => {
    const state = emptyState();
    state.reasoningContent = "выбираю калькулятор";
    state.toolCalls = [{ index: 0, id: "call_1", name: "run_calculator", arguments: "{}" }];

    const msg = streamedStateToAssistantMessage(state);
    expect(msg.reasoning_content).toBe("выбираю калькулятор");
    expect(msg.tool_calls).toHaveLength(1);
    expect(msg.tool_calls?.[0].function.name).toBe("run_calculator");
  });

  it("не добавляет поле, когда рассуждений не было (thinking выключен)", () => {
    const state = emptyState();
    state.content = "просто ответ";

    const msg = streamedStateToAssistantMessage(state);
    expect(msg).not.toHaveProperty("reasoning_content");
  });
});
