import { afterEach, describe, expect, it } from "vitest";
import {
  getMikhalychChatModel,
  getMikhalychUpstreamProvider,
  resolveDeepSeekModel,
} from "./deepseek-upstream";

describe("getMikhalychUpstreamProvider", () => {
  const env = process.env;

  afterEach(() => {
    process.env = { ...env };
  });

  it("prefers deepseek when both keys are set", () => {
    process.env.DEEPSEEK_API_KEY = "sk-ds";
    process.env.OPENROUTER_API_KEY = "sk-or";
    expect(getMikhalychUpstreamProvider()).toBe("deepseek");
  });

  it("falls back to openrouter", () => {
    delete process.env.DEEPSEEK_API_KEY;
    process.env.OPENROUTER_API_KEY = "sk-or";
    expect(getMikhalychUpstreamProvider()).toBe("openrouter");
  });

  it("returns null without keys", () => {
    delete process.env.DEEPSEEK_API_KEY;
    delete process.env.OPENROUTER_API_KEY;
    expect(getMikhalychUpstreamProvider()).toBeNull();
  });
});

describe("resolveDeepSeekModel", () => {
  it("maps openrouter ids to deepseek api ids", () => {
    expect(resolveDeepSeekModel("deepseek/deepseek-v4-pro", "x")).toBe("deepseek-v4-pro");
  });
});

describe("getMikhalychChatModel", () => {
  const env = process.env;

  afterEach(() => {
    process.env = { ...env };
  });

  it("uses openrouter model id when on openrouter", () => {
    delete process.env.DEEPSEEK_API_KEY;
    process.env.OPENROUTER_API_KEY = "sk-or";
    delete process.env.MIKHALYCH_MODEL;
    expect(getMikhalychChatModel()).toBe("deepseek/deepseek-v4-pro");
  });
});
