import { describe, expect, it } from "vitest";
import {
  calculateReverseCoverage,
  formatCoverageArea,
  getCoverageMaterial,
} from "./reverse-coverage";

describe("инструмент обратного расчёта остатка", () => {
  it("считает площадь по остатку и количеству слоёв", () => {
    const material = getCoverageMaterial("paint-acrylic");
    const result = calculateReverseCoverage({ material, amount: 5, layers: 2 });

    expect(result.consumptionPerM2).toBeCloseTo(0.3, 8);
    expect(result.area).toBeCloseTo(16.667, 3);
    expect(result.roomSide).toBeCloseTo(4.082, 3);
    expect(result.amountInKilograms).toBe(6.5);
  });

  it("учитывает пользовательское число слоёв", () => {
    const material = getCoverageMaterial("waterproof");
    const oneLayer = calculateReverseCoverage({ material, amount: 6, layers: 1 });
    const threeLayers = calculateReverseCoverage({ material, amount: 6, layers: 3 });

    expect(oneLayer.area).toBe(4);
    expect(threeLayers.area).toBeCloseTo(1.333, 3);
  });

  it("возвращает безопасный результат для нулевого и отрицательного остатка", () => {
    const material = getCoverageMaterial("putty-start");

    expect(calculateReverseCoverage({ material, amount: 0, layers: 1 }).area).toBe(0);
    expect(calculateReverseCoverage({ material, amount: -5, layers: 0 }).area).toBe(0);
  });

  it("использует безопасный материал по умолчанию", () => {
    expect(getCoverageMaterial("unknown").id).toBe("paint-acrylic");
  });

  it("форматирует малую площадь в квадратных сантиметрах", () => {
    expect(formatCoverageArea(0.25)).toBe("2500 см²");
    expect(formatCoverageArea(2.345)).toBe("2.3 м²");
  });
});
