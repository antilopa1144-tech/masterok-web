import { describe, expect, it } from "vitest";
import { calculateWallSlatLayout } from "./wall-slat-layout";

const base = { wallWidthMm: 3000, wallHeightMm: 2700, slatWidthMm: 30, desiredGapMm: 20, desiredCount: 20, mode: "by-gap" as const, stockLengthMm: 3000, reservePercent: 5 };

describe("wall-slat-layout", () => {
  it("центрирует набор реек и сохраняет заданный зазор", () => {
    const result = calculateWallSlatLayout(base);
    const last = result.placements.at(-1)!;
    expect(result.actualGapMm).toBe(20);
    expect(result.placements[0].xMm).toBeCloseTo(result.edgeGapMm, 1);
    expect(3000 - (last.xMm + last.widthMm)).toBeCloseTo(result.edgeGapMm, 1);
  });

  it("подбирает равные поля и зазоры по количеству", () => {
    const result = calculateWallSlatLayout({ ...base, mode: "by-count", desiredCount: 10 });
    expect(result.slatCount).toBe(10);
    expect(result.edgeGapMm).toBeCloseTo(result.actualGapMm, 1);
  });

  it("отделяет точный метраж от закрытого запаса", () => {
    const result = calculateWallSlatLayout(base);
    expect(result.exactLinearM).toBeCloseTo(result.slatCount * 2.7, 2);
    expect(result.purchasePieces).toBe(result.baseStockPieces + result.reservePieces);
  });
});
