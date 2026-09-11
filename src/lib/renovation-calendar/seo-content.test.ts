import { describe, expect, it } from "vitest";
import { CALENDAR_FAQ, ORDER_RULES, getScenarioSummaries } from "./seo-content";
import { RENOVATION_SCENARIOS } from "./scenarios";
import { getToolConfig } from "@/lib/tools/config";

describe("справочный контент календаря ремонта", () => {
  it("собирает этапы из сценариев, а не из собственного списка", () => {
    const summaries = getScenarioSummaries();
    expect(summaries).toHaveLength(4);
    for (const summary of summaries) {
      const source = RENOVATION_SCENARIOS[summary.id];
      expect(summary.title).toBe(source.title);
      expect(summary.durationLabel).toBe(source.durationLabel);
      expect(summary.rows.map((row) => row.title)).toEqual(source.stages.map((stage) => stage.title));
    }
  });

  it("у каждого этапа есть период в днях от старта", () => {
    for (const summary of getScenarioSummaries()) {
      for (const row of summary.rows) {
        expect(row.period).toMatch(/^День \d+$|^Дни \d+–\d+$/);
        expect(row.summary.length).toBeGreaterThan(20);
      }
    }
  });

  it("объясняет очерёдность работ, а не только перечисляет этапы", () => {
    expect(ORDER_RULES.length).toBeGreaterThanOrEqual(4);
    const titles = ORDER_RULES.map((rule) => rule.title);
    expect(new Set(titles).size).toBe(titles.length);
    for (const rule of ORDER_RULES) {
      expect(rule.text.length).toBeGreaterThan(120);
    }
  });

  it("задаёт вопросы в вопросительной форме и даёт развёрнутые ответы", () => {
    expect(CALENDAR_FAQ.length).toBeGreaterThanOrEqual(5);
    for (const item of CALENDAR_FAQ) {
      expect(item.question.trim().endsWith("?")).toBe(true);
      expect(item.answer.length).toBeGreaterThanOrEqual(120);
    }
  });

  it("не дублирует вопросы из конфига инструмента", () => {
    const base = getToolConfig("kalendar-remonta")?.faq ?? [];
    const baseQuestions = new Set(base.map((item) => item.question.toLowerCase().trim()));
    for (const item of CALENDAR_FAQ) {
      expect(baseQuestions.has(item.question.toLowerCase().trim())).toBe(false);
    }
  });
});
