import { describe, expect, it } from "vitest";
import { calculateWallTiles, createWallTileSpec, estimateWallTileCells, validateWallTileSpec } from "../../engine/constructor/tiling";
import type { ConstructorRoom, WallTileSpec } from "../../engine/constructor/model";

function room(widthMm = 1200, lengthMm = 1600, heightMm = 900, spec: WallTileSpec | null = createWallTileSpec()): ConstructorRoom {
  return {
    id: "tile-room", name: "Плитка", widthMm, lengthMm, heightMm, openings: [], continuousWallTiles: false,
    floor: {} as ConstructorRoom["floor"], wallTiles: [spec, null, null, null],
  };
}

describe("constructor wall tiling", () => {
  it("создаёт контрактный дефолт и безопасно валидирует повреждённый импорт", () => {
    expect(createWallTileSpec()).toMatchObject({ materialKey: "Плитка", tileWidthMm: 600, tileHeightMm: 300, jointMm: 2, tilesPerPack: 8 });
    expect(validateWallTileSpec(null as unknown as WallTileSpec, "Стена")).not.toHaveLength(0);
    expect(validateWallTileSpec({ ...createWallTileSpec(), tilesPerPack: 1.5, tileWidthMm: 49 } as WallTileSpec, "Стена").join(" ")).toContain("количество плиток в упаковке");
  });

  it("строит точную сетку без шва и закрывает стену без щелей", () => {
    const r = room(1200, 1600, 600, { ...createWallTileSpec(), jointMm: 0, alignment: "edge", reservePercent: 10 });
    const result = calculateWallTiles(r, 0)!;
    expect(result.cells).toHaveLength(4);
    expect(result.coveredAreaM2).toBeCloseTo(result.netAreaM2, 10);
    expect(result.baseTiles).toBe(4); expect(result.cutTiles).toBe(0); expect(result.reserveTiles).toBe(.4);
  });

  it("центрирует сетку симметрично и учитывает дробный шов", () => {
    const r = room(1000, 1600, 300, { ...createWallTileSpec(), jointMm: 2.5, alignment: "center" });
    const result = calculateWallTiles(r, 0)!;
    const visible = result.cells.flatMap((cell) => cell.fragments);
    const min = Math.min(...visible.map((fragment) => fragment.xMm)); const max = Math.max(...visible.map((fragment) => fragment.xMm + fragment.widthMm));
    expect(min).toBeCloseTo(0, 8); expect(max).toBeCloseTo(1000, 8);
    expect(result.cells.map((cell) => cell.widthMm)).toContain(600);
    expect(visible.map((fragment) => fragment.widthMm)).toContain(498.75);
  });

  it("вырезает дверь и окно, включая несколько фрагментов одной исходной плитки", () => {
    const r = room(600, 1000, 600, { ...createWallTileSpec(), jointMm: 0, alignment: "edge" });
    r.openings = [
      { id: "door", type: "door", wall: 0, offsetMm: 200, widthMm: 200, heightMm: 300, sillMm: 0 },
      { id: "window", type: "window", wall: 0, offsetMm: 250, widthMm: 100, heightMm: 100, sillMm: 350 },
    ];
    const result = calculateWallTiles(r, 0)!;
    expect(result.netAreaM2).toBeCloseTo(.6 * .6 - .2 * .3 - .1 * .1, 10);
    expect(result.cells.some((cell) => cell.fragments.length > 1)).toBe(true);
    const total = result.cells.flatMap((cell) => cell.fragments).reduce((sum, fragment) => sum + fragment.widthMm * fragment.heightMm, 0);
    expect(total / 1_000_000).toBeCloseTo(result.coveredAreaM2, 10);
  });

  it("не считает ячейку, полностью закрытую проёмом", () => {
    const r = room(600, 900, 300, { ...createWallTileSpec(), jointMm: 0, alignment: "edge" });
    r.openings = [{ id: "window", type: "window", wall: 0, offsetMm: 0, widthMm: 600, heightMm: 300, sillMm: 0 }];
    const result = calculateWallTiles(r, 0)!;
    expect(result.cells).toHaveLength(0); expect(result.baseTiles).toBe(0); expect(result.coveredAreaM2).toBe(0);
  });

  it("переносит фазу сетки по стенам и поворачивает формат", () => {
    const spec: WallTileSpec = { ...createWallTileSpec(), alignment: "edge", jointMm: 0 };
    const r = room(1000, 1000, 600, spec); r.wallTiles = [spec, { ...spec }, null, null]; r.continuousWallTiles = true;
    const first = calculateWallTiles(r, 0)!; const second = calculateWallTiles(r, 1)!;
    expect(first.cells.filter((cell) => cell.row === 0).map((cell) => cell.widthMm)).toEqual([600, 600]);
    expect(first.cells.filter((cell) => cell.row === 0).flatMap((cell) => cell.fragments).map((fragment) => fragment.widthMm)).toEqual([600, 400]);
    expect(second.cells.filter((cell) => cell.row === 0).map((cell) => cell.widthMm)).toEqual([600, 600, 600]);
    expect(second.cells.filter((cell) => cell.row === 0).flatMap((cell) => cell.fragments).map((fragment) => fragment.widthMm)).toEqual([200, 600, 200]);
    r.wallTiles[0] = { ...spec, orientation: "vertical" };
    const turned = calculateWallTiles(r, 0)!;
    expect(turned.cells[0].widthMm).toBe(300); expect(turned.cells[0].heightMm).toBe(600);
  });

  it("сохраняет площадь фрагментов и ограничивает неверные или огромные сетки", () => {
    const r = room(1200, 1200, 900); const result = calculateWallTiles(r, 0)!;
    expect(result.unlaidAreaM2).toBeCloseTo(result.baseTiles * .18 - result.coveredAreaM2, 8);
    expect(calculateWallTiles({ ...r, wallTiles: [null, null, null, null] }, 0)).toBeNull();
    const huge = room(30_000, 30_000, 6_000, { ...createWallTileSpec(), tileWidthMm: 50, tileHeightMm: 50, jointMm: 0 });
    expect(estimateWallTileCells(huge, 0)).toBeGreaterThan(4_000);
    expect(calculateWallTiles(huge, 0)!.warnings.join(" ")).toContain("лимит");
    expect(estimateWallTileCells({ ...r, widthMm: Number.NaN }, 0)).toBe(0);
  });

  it("продолжает центрированную фазу от стены 0 и считает все резаные ячейки", () => {
    const spec: WallTileSpec = { ...createWallTileSpec(), alignment: "center", jointMm: 0 };
    const r = room(1300, 1000, 300, spec); r.wallTiles = [spec, { ...spec }, null, null]; r.continuousWallTiles = true;
    const first = calculateWallTiles(r, 0)!; const second = calculateWallTiles(r, 1)!;
    expect(first.cells.filter((cell) => cell.row === 0).map((cell) => cell.xMm)).toEqual([-250, 350, 950]);
    expect(second.cells.filter((cell) => cell.row === 0).map((cell) => cell.xMm)).toEqual([-350, 250, 850]);
    const clipped = room(1200, 1000, 300, { ...createWallTileSpec(), jointMm: 0, alignment: "edge" });
    clipped.openings = [{ id: "opening", type: "window", wall: 0, offsetMm: 550, widthMm: 100, heightMm: 300, sillMm: 0 }];
    expect(calculateWallTiles(clipped, 0)!.cutTiles).toBe(2);
  });

  it("останавливает clipping при 100 проёмах до роста числа фрагментов", () => {
    const r = room(3000, 3000, 3000, { ...createWallTileSpec(), tileWidthMm: 50, tileHeightMm: 50, jointMm: 0, alignment: "edge" });
    r.openings = Array.from({ length: 100 }, (_, index) => ({ id: `opening-${index}`, type: "window" as const, wall: 0 as const, offsetMm: 10 + Math.floor(index / 2) * 50 + index % 2 * 20, widthMm: 10, heightMm: 3000, sillMm: 0 }));
    expect(estimateWallTileCells(r, 0)).toBeLessThanOrEqual(4_000);
    expect(() => calculateWallTiles(r, 0)).toThrow("8000 видимых фрагментов");
  });
});
