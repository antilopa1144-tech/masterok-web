import { describe, expect, it } from "vitest";
import { calculateSheetLayout, type SheetLayoutInput } from "./sheet-layout";

function input(overrides: Partial<SheetLayoutInput> = {}): SheetLayoutInput {
  return {
    surfaceWidthMm: 5000,
    surfaceHeightMm: 2700,
    sheetWidthMm: 1200,
    sheetLengthMm: 2500,
    material: "drywall",
    surface: "wall",
    orientation: "portrait",
    stagger: "half",
    layers: 1,
    jointGapMm: 0,
    reservePercent: 5,
    ...overrides,
  };
}

describe("sheet-layout", () => {
  it("покрывает поверхность без потери площади и отделяет закрытый запас", () => {
    const result = calculateSheetLayout(input());
    const layoutArea = result.layers.flatMap((layer) => layer.placements)
      .reduce((sum, piece) => sum + piece.widthMm * piece.heightMm / 1_000_000, 0);

    expect(layoutArea).toBeCloseTo(result.coveredAreaM2, 6);
    expect(result.purchaseSheets).toBe(result.baseSheets + result.reserveSheets);
    expect(result.reserveSheets).toBeGreaterThan(0);
  });

  it("не поворачивает детали при повторном использовании обрезков", () => {
    const result = calculateSheetLayout(input());

    for (const sheet of result.stock) {
      for (const cut of sheet.cuts) {
        expect(cut.x + cut.widthMm).toBeLessThanOrEqual(result.orientedSheetWidthMm + 0.01);
        expect(cut.y + cut.heightMm).toBeLessThanOrEqual(result.orientedSheetHeightMm + 0.01);
      }
    }
  });

  it("автоматически выбирает вариант с меньшим числом листов", () => {
    const result = calculateSheetLayout(input({ orientation: "auto" }));
    const minimum = Math.min(...result.comparisons.map((item) => item.baseSheets));

    expect(result.baseSheets).toBe(minimum);
  });

  it("разносит стыки второго слоя", () => {
    const result = calculateSheetLayout(input({ layers: 2 }));
    const first = result.layers[0].placements.map((piece) => `${piece.x}:${piece.y}`);
    const second = result.layers[1].placements.map((piece) => `${piece.x}:${piece.y}`);

    expect(result.coveredAreaM2).toBe(result.surfaceAreaM2 * 2);
    expect(second).not.toEqual(first);
  });

  it("предупреждает о горизонтальном ГКЛ и стыках без разбежки", () => {
    const result = calculateSheetLayout(input({ orientation: "landscape", stagger: "aligned" }));

    expect(result.warnings.some((warning) => warning.includes("перемычкой"))).toBe(true);
    expect(result.warnings.some((warning) => warning.includes("Стыки стоят в одну линию"))).toBe(true);
  });

  it("оставляет заданный межлистовой зазор для ОСП", () => {
    const result = calculateSheetLayout(input({ material: "osb", jointGapMm: 3 }));
    const row = result.layers[0].placements.filter((piece) => piece.row === 1).sort((a, b) => a.x - b.x);

    expect(row[1].x - (row[0].x + row[0].widthMm)).toBeCloseTo(3, 5);
    expect(result.netMaterialAreaM2).toBeLessThan(result.coveredAreaM2);
  });

  it("нормализует опасные и пустые значения", () => {
    const result = calculateSheetLayout(input({
      surfaceWidthMm: Number.NaN,
      surfaceHeightMm: -1,
      sheetWidthMm: 0,
      sheetLengthMm: 99_999,
      reservePercent: 99,
      jointGapMm: 99,
    }));

    expect(result.input.surfaceWidthMm).toBe(300);
    expect(result.input.surfaceHeightMm).toBe(300);
    expect(result.input.sheetWidthMm).toBe(300);
    expect(result.input.sheetLengthMm).toBe(6000);
    expect(result.input.reservePercent).toBe(30);
    expect(result.input.jointGapMm).toBe(20);
  });
});
