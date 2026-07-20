import { describe, expect, it } from "vitest";
import { calculateLightingLayout } from "./lighting-layout";

describe("lighting-layout", () => {
  it("строит равномерную сетку с заданными отступами", () => {
    const result = calculateLightingLayout({ roomWidthMm: 4000, roomLengthMm: 6000, columns: 3, rows: 2, wallOffsetXmm: 500, wallOffsetYmm: 600, pattern: "grid" });
    expect(result.count).toBe(6);
    expect(result.spacingXmm).toBe(1500);
    expect(result.spacingYmm).toBe(4800);
    expect(result.points[0]).toMatchObject({ xMm: 500, yMm: 600 });
    expect(result.points.at(-1)).toMatchObject({ xMm: 3500, yMm: 5400 });
  });

  it("центрирует один светильник по каждой оси", () => {
    const result = calculateLightingLayout({ roomWidthMm: 3200, roomLengthMm: 2400, columns: 1, rows: 1, wallOffsetXmm: 400, wallOffsetYmm: 400, pattern: "grid" });
    expect(result.points[0]).toMatchObject({ xMm: 1600, yMm: 1200 });
  });

  it("смещает чётный ряд шахматной схемы внутрь", () => {
    const result = calculateLightingLayout({ roomWidthMm: 4000, roomLengthMm: 4000, columns: 3, rows: 3, wallOffsetXmm: 400, wallOffsetYmm: 400, pattern: "staggered" });
    const firstRow = result.points.filter((point) => point.row === 1);
    const secondRow = result.points.filter((point) => point.row === 2);
    expect(secondRow[0].xMm).toBeGreaterThan(firstRow[0].xMm);
    expect(secondRow.at(-1)!.xMm).toBeLessThan(firstRow.at(-1)!.xMm);
  });
});
