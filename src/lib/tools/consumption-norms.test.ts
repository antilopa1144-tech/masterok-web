import { describe, expect, it } from "vitest";
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
    }
  });

  it("возвращает расход на один слой для многослойной системы", () => {
    const waterproof = getConsumptionNorm("waterproof");

    expect(waterproof.recommended).toBe(3);
    expect(getConsumptionPerAdjustment(waterproof)).toBe(1.5);
  });

  it("формирует согласованные данные для справочника и подсказки", () => {
    const row = consumptionNormRow("self-leveling");
    const norm = getConsumptionNorm("self-leveling");

    expect(row).toMatchObject({
      consumption: "1.5–1.8",
      unit: "кг/м²",
      conditions: "Толщина 1 мм",
    });
    expect(formatConsumptionNormSummary(norm)).toBe(
      "1.5–1.8 кг/м²; Толщина 1 мм",
    );
  });

  it("выводит каждую общую норму в справочнике ровно один раз", () => {
    const sharedIds = CONSUMPTION_NORMS
      .flatMap((category) => category.rows)
      .flatMap((row) => row.normId ? [row.normId] : []);

    expect(sharedIds.sort()).toEqual([...CONSUMPTION_NORM_IDS].sort());
  });
});
