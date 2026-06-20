import { describe, it, expect } from "vitest";
import { buildFeedbackEmail } from "./email";

describe("buildFeedbackEmail", () => {
  it("тема содержит начало сообщения", () => {
    const { subject } = buildFeedbackEmail({ message: "Калькулятор стяжки топ" });
    expect(subject).toContain("Калькулятор стяжки");
  });

  it("негатив помечается в теме", () => {
    const { subject } = buildFeedbackEmail({ sentiment: "dislike", message: "не работает" });
    expect(subject.startsWith("⚠️")).toBe(true);
  });

  it("html экранирует разметку из текста", () => {
    const { html } = buildFeedbackEmail({ message: "<script>alert(1)</script>" });
    expect(html).not.toContain("<script>alert(1)</script>");
    expect(html).toContain("&lt;script&gt;");
  });

  it("html и text содержат сообщение, контакт и страницу", () => {
    const { html, text } = buildFeedbackEmail({
      message: "Отличный сайт",
      contact: "user@example.com",
      pageUrl: "https://getmasterok.ru/kalkulyatory/poly/styazhka/",
      pageTitle: "Стяжка",
    });
    expect(html).toContain("Отличный сайт");
    expect(html).toContain("user@example.com");
    expect(html).toContain("getmasterok.ru");
    expect(text).toContain("Отличный сайт");
    expect(text).toContain("user@example.com");
  });
});
