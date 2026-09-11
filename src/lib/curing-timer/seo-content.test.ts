import { describe, expect, it } from "vitest";
import { CURING_FAQ, getCuringGroups } from "./seo-content";
import { CURING_PRESETS } from "./presets";
import { getToolConfig } from "@/lib/tools/config";

describe("справочный контент таймера схватывания", () => {
  it("собирает таблицу из пресетов таймера", () => {
    const groups = getCuringGroups();
    const rows = groups.flatMap((group) => group.rows);
    // «Свой таймер» — не справочная строка: у него нет сроков.
    expect(rows).toHaveLength(CURING_PRESETS.length - 1);
    for (const preset of CURING_PRESETS) {
      if (preset.id === "custom") continue;
      const row = rows.find((item) => item.name === preset.name);
      expect(row, `пресет ${preset.id} отсутствует в таблице`).toBeDefined();
      expect(row!.timing).toBe(preset.description);
      expect(row!.tip).toBe(preset.tip);
    }
  });

  it("группирует материалы по категориям без пустых групп", () => {
    const groups = getCuringGroups();
    expect(groups.length).toBeGreaterThanOrEqual(6);
    for (const group of groups) {
      expect(group.rows.length).toBeGreaterThan(0);
      expect(group.category.length).toBeGreaterThan(0);
    }
  });

  it("задаёт вопросы в вопросительной форме и даёт развёрнутые ответы", () => {
    expect(CURING_FAQ.length).toBeGreaterThanOrEqual(5);
    for (const item of CURING_FAQ) {
      expect(item.question.trim().endsWith("?")).toBe(true);
      expect(item.answer.length).toBeGreaterThanOrEqual(120);
    }
  });

  it("не дублирует вопросы из конфига инструмента", () => {
    const base = getToolConfig("tajmer-skhvatyvaniya")?.faq ?? [];
    const baseQuestions = new Set(base.map((item) => item.question.toLowerCase().trim()));
    for (const item of CURING_FAQ) {
      expect(baseQuestions.has(item.question.toLowerCase().trim())).toBe(false);
    }
  });
});
