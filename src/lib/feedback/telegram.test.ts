import { describe, it, expect } from "vitest";
import { buildFeedbackMessage, isTelegramConfigured } from "./telegram";

describe("buildFeedbackMessage", () => {
  it("содержит тон, текст и контекст", () => {
    const msg = buildFeedbackMessage({
      sentiment: "like",
      message: "Удобный калькулятор плитки",
      contact: "@user",
      pageTitle: "Калькулятор плитки",
      pageUrl: "https://getmasterok.ru/x",
      viewport: "390×844",
      theme: "bronze",
    });
    expect(msg).toContain("👍 Нравится");
    expect(msg).toContain("Удобный калькулятор плитки");
    expect(msg).toContain("@user");
    expect(msg).toContain("Калькулятор плитки");
    expect(msg).toContain("390×844");
  });

  it("экранирует HTML (защита parse_mode=HTML)", () => {
    const msg = buildFeedbackMessage({ message: "<b>хак</b> & <script>" });
    expect(msg).toContain("&lt;b&gt;хак&lt;/b&gt; &amp; &lt;script&gt;");
    expect(msg).not.toContain("<script>");
  });

  it("работает без необязательных полей", () => {
    const msg = buildFeedbackMessage({ message: "просто текст" });
    expect(msg).toContain("просто текст");
    expect(msg).not.toContain("📨");
  });
});

describe("isTelegramConfigured", () => {
  it("false без env (тестовое окружение)", () => {
    expect(isTelegramConfigured()).toBe(false);
  });
});
