import { describe, expect, it } from "vitest";
import { getToolConfig } from "./config";
import {
  CONSUMPTION_NORM_IDS,
  consumptionNormRow,
  formatConsumptionNormSummary,
  getConsumptionNorm,
  getConsumptionPerAdjustment,
} from "./consumption-norms";
import { CONSUMPTION_NORMS } from "./norms-data";

describe("общий каталог норм расхода", () => {
  it("хранит диапазон, расчётное значение и источник для каждой нормы", () => {
    for (const id of CONSUMPTION_NORM_IDS) {
      const norm = getConsumptionNorm(id);

      expect(norm.range).not.toBe("");
      expect(norm.recommended).toBeGreaterThan(0);
      expect(norm.conditions).not.toBe("");
      expect(norm.source).not.toBe("");
      expect(norm.sourceUrl).toMatch(/^https:\/\/(www\.)?(ceresit\.ru|knauf\.ru|vetonit\.com)\//);
      expect(norm.verifiedAt).toBe("2026-08-01");
    }
  });

  it("возвращает расход на один слой для многослойной системы", () => {
    const waterproof = getConsumptionNorm("waterproof");

    expect(waterproof.recommended).toBe(1.4);
    expect(getConsumptionPerAdjustment(waterproof)).toBe(0.7);
  });

  it("формирует согласованные данные для справочника и подсказки", () => {
    const row = consumptionNormRow("self-leveling");
    const norm = getConsumptionNorm("self-leveling");

    expect(row).toMatchObject({
      consumption: "1.5",
      unit: "кг/м²",
      conditions: "Толщина 1 мм",
    });
    expect(formatConsumptionNormSummary(norm)).toBe(
      "1.5 кг/м²; Толщина 1 мм",
    );
  });

  it("выводит каждую общую норму в справочнике ровно один раз", () => {
    const sharedIds = CONSUMPTION_NORMS
      .flatMap((category) => category.rows)
      .flatMap((row) => row.normId ? [row.normId] : []);

    expect(sharedIds.sort()).toEqual([...CONSUMPTION_NORM_IDS].sort());
    expect(new Set(CONSUMPTION_NORMS.map((category) => category.id)).size).toBe(
      CONSUMPTION_NORMS.length,
    );
  });

  it("не публикует строк без проверенного официального первоисточника", () => {
    const rows = CONSUMPTION_NORMS.flatMap((category) => category.rows);

    expect(rows).toHaveLength(19);
    for (const row of rows) {
      expect(row.sourceUrl).toMatch(/^https:\/\/(www\.)?(ceresit\.ru|knauf\.ru|vetonit\.com)\//);
      expect(row.verifiedAt).toBe("2026-08-01");
      expect(row.source).not.toMatch(/ГОСТ|СП |СНиП|производител/i);
    }
  });

  it("фиксирует исправленные нормы, которые влияют на обратный расчёт", () => {
    expect(getConsumptionNorm("primer-contact")).toMatchObject({
      range: "0.20",
      recommended: 0.2,
    });
    expect(getConsumptionNorm("putty-finish")).toMatchObject({
      range: "1.2",
      recommended: 1.2,
      basis: { kind: "thickness", referenceThicknessMm: 1 },
    });
    expect(getConsumptionNorm("gasblock-glue")).toMatchObject({
      range: "2.0",
      conditions: "Перегородка 100 мм, блок 600×200 мм, шов 2 мм",
    });
    expect(getConsumptionNorm("waterproof")).toMatchObject({
      material: "Полимерная гидроизоляция Ceresit CL 51",
      range: "1.4",
      basis: { kind: "layers", referenceLayers: 2 },
    });
  });

  it("фиксирует поисковый интент справочника как таблицу на 1 м²", () => {
    const config = getToolConfig("normy-raskhoda");

    expect(config?.seoTitle).toBe("Таблица норм расхода строительных материалов на 1 м²");
    expect(config?.seoIntro).toContain("техническая карта");
  });
});
