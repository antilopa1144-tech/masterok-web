import { describe, expect, it } from "vitest";
import {
  buildRectangleWalls,
  calculateWallpaperLayout,
  type WallpaperLayoutInput,
} from "./wallpaper-layout";

function input(overrides: Partial<WallpaperLayoutInput> = {}): WallpaperLayoutInput {
  return {
    walls: buildRectangleWalls(4, 5),
    wallHeightM: 2.7,
    rollWidthM: 0.53,
    rollLengthM: 10.05,
    matchType: "free",
    rapportCm: 0,
    offsetCm: 0,
    trimAllowanceCm: 10,
    reserveRolls: 1,
    ...overrides,
  };
}

describe("wallpaper-layout", () => {
  it("считает полосы отдельно по четырём стенам и отделяет резерв", () => {
    const result = calculateWallpaperLayout(input());

    expect(result.perimeterM).toBe(18);
    expect(result.stripCount).toBe(36);
    expect(result.baseRolls).toBe(12);
    expect(result.purchaseRolls).toBe(13);
    expect(result.purchaseRolls).toBe(result.baseRolls + result.reserveRolls);
    expect(result.stripsPerRollRange).toEqual({ min: 3, max: 3 });
  });

  it("балансирует крайние полотна и точно покрывает длину каждой стены", () => {
    const result = calculateWallpaperLayout(input());

    for (const wall of result.walls) {
      const totalWidth = wall.strips.reduce((sum, strip) => sum + strip.widthM, 0);
      expect(totalWidth).toBeCloseTo(wall.lengthM, 3);
      expect(wall.strips[0].widthM).toBeCloseTo(wall.strips.at(-1)!.widthM, 4);
    }
  });

  it("учитывает отход на прямое совмещение рисунка между полосами", () => {
    const free = calculateWallpaperLayout(input());
    const straight = calculateWallpaperLayout(input({ matchType: "straight", rapportCm: 64 }));

    expect(straight.patternWasteM).toBeGreaterThan(0);
    expect(straight.rollRemainderM).toBeLessThan(free.rollRemainderM);
    expect(straight.baseRolls).toBeGreaterThanOrEqual(free.baseRolls);
    expect(straight.rolls.every((roll) => roll.usedM <= 10.05)).toBe(true);
  });

  it("чередует фазы при смещённой подгонке 64/32", () => {
    const result = calculateWallpaperLayout(
      input({ matchType: "offset", rapportCm: 64, offsetCm: 32 }),
    );
    const phases = result.walls.flatMap((wall) => wall.strips).slice(0, 6).map((strip) => strip.patternPhaseCm);

    expect(phases).toEqual([0, 32, 0, 32, 0, 32]);
    expect(result.patternWasteM).toBeGreaterThan(0);
  });

  it("назначает каждую полосу ровно одному рулону", () => {
    const result = calculateWallpaperLayout(
      input({ matchType: "offset", rapportCm: 53, offsetCm: 26.5 }),
    );
    const ids = result.rolls.flatMap((roll) => roll.cuts.map((cut) => cut.stripId));

    expect(ids).toHaveLength(result.stripCount);
    expect(new Set(ids).size).toBe(result.stripCount);
  });

  it("отделяет полноценные полосы от коротких остатков для участков", () => {
    const result = calculateWallpaperLayout(input());

    expect(result.reusableRemainderM).toBe(result.fullStripRemainderM + result.patchRemainderM);
    expect(result.rolls.every((roll) => (
      roll.remainderUse === "full-strip"
        ? roll.remainderM >= result.cutLengthM
        : true
    ))).toBe(true);
  });

  it("предупреждает, если перенесённый периметр не разделён на стены", () => {
    const result = calculateWallpaperLayout(input({
      walls: [{ id: "wall-1", name: "Все стены", lengthM: 18 }],
    }));

    expect(result.warnings.some((warning) => warning.includes("разделите его на отдельные стены"))).toBe(true);
  });

  it("не маскирует невозможный раскрой при слишком коротком рулоне", () => {
    const result = calculateWallpaperLayout(input({ wallHeightM: 6, rollLengthM: 5 }));

    expect(result.baseRolls).toBe(0);
    expect(result.purchaseRolls).toBe(0);
    expect(result.reserveRolls).toBe(0);
    expect(result.warnings.some((warning) => warning.includes("нельзя получить целую полосу"))).toBe(true);
  });

  it("нормализует некорректные значения и отключает подгонку при нулевом раппорте", () => {
    const result = calculateWallpaperLayout(input({
      walls: [],
      wallHeightM: Number.NaN,
      rollWidthM: -1,
      matchType: "offset",
      rapportCm: 0,
      reserveRolls: 99,
    }));

    expect(result.input.walls).toHaveLength(1);
    expect(result.input.wallHeightM).toBe(1.5);
    expect(result.input.rollWidthM).toBe(0.4);
    expect(result.input.matchType).toBe("free");
    expect(result.reserveRolls).toBe(10);
  });
});
