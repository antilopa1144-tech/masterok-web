import { describe, expect, it } from "vitest";
import { CURING_PRESETS } from "./presets";
import { CURING_FAQ } from "./seo-content";

describe("интервалы строительного таймера", () => {
  it("не назначает универсальное время категории материала", () => {
    for (const preset of CURING_PRESETS) {
      expect(preset).not.toHaveProperty("durationMinutes");
    }
  });

  it("не подменяет готовность стяжки календарём", () => {
    const screed = CURING_PRESETS.find((preset) => preset.id === "screed-cement")!;
    const text = `${screed.description} ${screed.tip}`;
    expect(text).toContain("влажност");
    expect(text).toContain("прочност");
    expect(text).not.toMatch(/28 дней|50 дней|1 мм.*1 день/);
    expect(CURING_FAQ.find((faq) => faq.question.includes("свежую стяжку"))!.answer).toContain("влажност");
  });

  it("сохраняет условия справки КНАУФ, а не обещание высыхания за сутки", () => {
    const rotband = CURING_PRESETS.find((preset) => preset.id === "plaster-gypsum")!;
    const text = `${rotband.description} ${rotband.tip}`;
    for (const value of ["10 мм", "20 °C", "60 %", "7 суток"]) expect(text).toContain(value);
    expect(text).not.toContain("— сутки");
  });
});
