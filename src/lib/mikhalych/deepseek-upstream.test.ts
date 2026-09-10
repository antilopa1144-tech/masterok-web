import { afterEach, describe, expect, it } from "vitest";
import {
  DEFAULT_MIKHALYCH_MODEL,
  DEFAULT_MIKHALYCH_REVIEW_MODEL,
  getMikhalychChatModel,
  getMikhalychReviewModel,
  getMikhalychUpstreamProvider,
  resolveDeepSeekModel,
  withThinking,
} from "./deepseek-upstream";

describe("getMikhalychUpstreamProvider", () => {
  const env = process.env;

  afterEach(() => {
    process.env = { ...env };
  });

  it("возвращает deepseek при наличии ключа", () => {
    process.env.DEEPSEEK_API_KEY = "sk-ds";
    expect(getMikhalychUpstreamProvider()).toBe("deepseek");
  });

  it("возвращает null без ключа", () => {
    delete process.env.DEEPSEEK_API_KEY;
    expect(getMikhalychUpstreamProvider()).toBeNull();
  });

  it("игнорирует OPENROUTER_API_KEY: второго провайдера больше нет", () => {
    delete process.env.DEEPSEEK_API_KEY;
    process.env.OPENROUTER_API_KEY = "sk-or";
    expect(getMikhalychUpstreamProvider()).toBeNull();
  });
});

describe("resolveDeepSeekModel", () => {
  it("принимает исторические id OpenRouter из старых env", () => {
    expect(resolveDeepSeekModel("deepseek/deepseek-v4-pro", "x")).toBe("deepseek-v4-pro");
    expect(resolveDeepSeekModel("deepseek/deepseek-v4-flash", "x")).toBe("deepseek-flash");
  });

  it("мапит устаревшие имена в текущий API-идентификатор", () => {
    expect(resolveDeepSeekModel("deepseek-v4-flash", "x")).toBe("deepseek-flash");
    // Выведенные из эксплуатации имена DeepSeek обслуживает моделью V4.1-Flash.
    expect(resolveDeepSeekModel("deepseek-chat", "x")).toBe("deepseek-flash");
    expect(resolveDeepSeekModel("deepseek-reasoner", "x")).toBe("deepseek-flash");
  });

  it("не мапит deepseek-v4-pro: пользователь выбрал Pro осознанно", () => {
    expect(resolveDeepSeekModel("deepseek-v4-pro", "x")).toBe("deepseek-v4-pro");
  });

  it("возвращает fallback при пустом значении", () => {
    expect(resolveDeepSeekModel(undefined, "deepseek-flash")).toBe("deepseek-flash");
    expect(resolveDeepSeekModel("   ", "deepseek-flash")).toBe("deepseek-flash");
  });
});

describe("дефолты моделей Михалыча", () => {
  it("чат по умолчанию — DeepSeek V4.1-Flash", () => {
    // deepseek-flash = DeepSeek-V4.1-Flash; deepseek-v4-pro выводится из эксплуатации 14.09.2026.
    expect(DEFAULT_MIKHALYCH_MODEL).toBe("deepseek-flash");
  });

  it("review остаётся Flash", () => {
    expect(DEFAULT_MIKHALYCH_REVIEW_MODEL).toBe("deepseek-flash");
  });

  it("на DeepSeek и чат, и review резолвятся в deepseek-flash", () => {
    process.env.DEEPSEEK_API_KEY = "sk-ds";
    delete process.env.MIKHALYCH_MODEL;
    delete process.env.MIKHALYCH_REVIEW_MODEL;
    expect(getMikhalychChatModel()).toBe("deepseek-flash");
    expect(getMikhalychReviewModel()).toBe("deepseek-flash");
  });
});

describe("getMikhalychChatModel", () => {
  const env = process.env;

  afterEach(() => {
    process.env = { ...env };
  });

  it("не зависит от OPENROUTER_API_KEY", () => {
    delete process.env.DEEPSEEK_API_KEY;
    process.env.OPENROUTER_API_KEY = "sk-or";
    delete process.env.MIKHALYCH_MODEL;
    expect(getMikhalychChatModel()).toBe("deepseek-flash");
  });

  it("уважает явный выбор Pro", () => {
    process.env.DEEPSEEK_API_KEY = "sk-ds";
    process.env.MIKHALYCH_MODEL = "deepseek-v4-pro";
    expect(getMikhalychChatModel()).toBe("deepseek-v4-pro");
  });
});

describe("withThinking", () => {
  it("по умолчанию отключает размышления", () => {
    expect(withThinking({ model: "deepseek-flash" }, false)).toEqual({
      model: "deepseek-flash",
      thinking: { type: "disabled" },
    });
  });

  it("не трогает тело, когда размышления разрешены", () => {
    const body = { model: "deepseek-flash", messages: [] };
    expect(withThinking(body, true)).toBe(body);
    expect(withThinking(body, true)).not.toHaveProperty("thinking");
  });
});
