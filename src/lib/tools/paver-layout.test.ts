import { describe, expect, it } from "vitest";
import { calculatePaverLayout } from "./paver-layout";

describe("paver-layout", () => {
  it("строит прямую раскладку и добавляет запас отдельно", () => {
    const result = calculatePaverLayout({ surfaceWidthMm: 3000, surfaceLengthMm: 5000, paverWidthMm: 100, paverLengthMm: 200, jointMm: 3, pattern: "straight", reservePercent: 7 });
    expect(result.rows).toBeGreaterThan(0);
    expect(result.purchasePavers).toBe(result.basePavers + result.reservePavers);
    expect(result.reservePavers).toBe(Math.ceil(result.basePavers * 0.07));
  });

  it("строит ряды со смещением", () => {
    const result = calculatePaverLayout({ surfaceWidthMm: 2400, surfaceLengthMm: 3600, paverWidthMm: 100, paverLengthMm: 200, jointMm: 3, pattern: "offset-half", reservePercent: 5 });
    expect(result.grid[1][0].widthMm).toBeLessThan(100);
    expect(result.cutPieces).toBeGreaterThan(0);
  });

  it("нормализует экстремальные значения", () => {
    const result = calculatePaverLayout({ surfaceWidthMm: -1, surfaceLengthMm: Number.NaN, paverWidthMm: 0, paverLengthMm: 5000, jointMm: 99, pattern: "straight", reservePercent: 99 });
    expect(result.input.surfaceWidthMm).toBe(300);
    expect(result.input.paverWidthMm).toBe(40);
    expect(result.input.paverLengthMm).toBe(1000);
    expect(result.input.jointMm).toBe(10);
    expect(result.input.reservePercent).toBe(30);
  });
});
