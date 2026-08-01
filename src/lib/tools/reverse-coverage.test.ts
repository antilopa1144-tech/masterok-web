import { describe, expect, it } from "vitest";
import {
  COVERAGE_MATERIALS,
  calculateReverseCoverage,
  formatCoverageArea,
  getCoverageMaterial,
  normalizeCoverageAdjustment,
} from "./reverse-coverage";
import {
  getConsumptionNorm,
  getConsumptionPerAdjustment,
} from "./consumption-norms";

describe("инструмент обратного расчёта остатка", () => {
  it("считает площадь по остатку и количеству слоёв", () => {
    const material = getCoverageMaterial("paint-acrylic");
    const result = calculateReverseCoverage({ material, amount: 5, adjustmentValue: 2 });

    expect(result.consumptionPerM2).toBeCloseTo(0.18, 8);
    expect(result.area).toBeCloseTo(27.778, 3);
    expect(result.roomSide).toBeCloseTo(5.27, 3);
    expect(result.adjustmentValue).toBe(2);
    expect(result.amountInKilograms).toBeUndefined();
  });

  it("учитывает пользовательское число слоёв", () => {
    const material = getCoverageMaterial("waterproof");
    const oneLayer = calculateReverseCoverage({ material, amount: 6, adjustmentValue: 1 });
    const threeLayers = calculateReverseCoverage({ material, amount: 6, adjustmentValue: 3 });

    expect(oneLayer.area).toBeCloseTo(8.571, 3);
    expect(threeLayers.area).toBeCloseTo(2.857, 3);
  });

  it("пересчитывает расход смесей по толщине, а не по условным слоям", () => {
    const material = getCoverageMaterial("putty-start");
    const thin = calculateReverseCoverage({ material, amount: 6, adjustmentValue: 0.5 });
    const thick = calculateReverseCoverage({ material, amount: 6, adjustmentValue: 2 });

    expect(thin.consumptionPerM2).toBe(0.45);
    expect(thin.area).toBeCloseTo(13.333, 3);
    expect(thick.consumptionPerM2).toBe(1.8);
    expect(thick.area).toBeCloseTo(3.333, 3);
  });

  it("сохраняет типовой результат наливного пола при толщине 10 мм", () => {
    const material = getCoverageMaterial("self-leveling");
    const result = calculateReverseCoverage({ material, amount: 16 });

    expect(result.adjustmentValue).toBe(10);
    expect(result.consumptionPerM2).toBe(15);
    expect(result.area).toBeCloseTo(1.067, 3);
  });

  it("не применяет слои к расходу по шпателю или шву", () => {
    const material = getCoverageMaterial("tile-adhesive-cm11");
    const result = calculateReverseCoverage({ material, amount: 7, adjustmentValue: 3 });

    expect(result.adjustmentValue).toBe(1);
    expect(result.consumptionPerM2).toBe(3.6);
    expect(result.area).toBeCloseTo(1.944, 3);
  });

  it("возвращает безопасный результат для нулевого и отрицательного остатка", () => {
    const material = getCoverageMaterial("putty-start");

    expect(calculateReverseCoverage({ material, amount: 0, adjustmentValue: 1 }).area).toBe(0);
    expect(calculateReverseCoverage({ material, amount: -5, adjustmentValue: 0 }).area).toBe(0);
    expect(normalizeCoverageAdjustment(material, Number.NaN)).toBe(1);
  });

  it("использует безопасный материал по умолчанию", () => {
    expect(getCoverageMaterial("unknown").id).toBe("paint-acrylic");
  });

  it("получает пересекающиеся нормы из общего каталога", () => {
    expect(COVERAGE_MATERIALS).toHaveLength(16);
    for (const material of COVERAGE_MATERIALS) {
      expect(material.normId).toBeDefined();

      const norm = getConsumptionNorm(material.normId!);
      expect(material.consumptionPerM2).toBe(getConsumptionPerAdjustment(norm));
      expect(material.description).toContain(norm.range);
      expect(material.description).toContain(norm.conditions);
    }
  });

  it("форматирует малую площадь в квадратных сантиметрах", () => {
    expect(formatCoverageArea(0.25)).toBe("2500 см²");
    expect(formatCoverageArea(2.345)).toBe("2.3 м²");
  });
});
