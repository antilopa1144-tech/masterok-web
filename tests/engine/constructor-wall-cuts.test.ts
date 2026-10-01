import { describe, expect, it } from "vitest";
import { calculateProject, createDefaultProject } from "../../engine/constructor/calculate";
import { createWallTileSpec } from "../../engine/constructor/tiling";
import type { TileRect, WallTileCalculation, WallTileCell } from "../../engine/constructor/model";
import { connectedTileParts, reviewWallCuts } from "../../src/lib/constructor/wall-cuts";

const rect = (xMm: number, yMm: number, widthMm: number, heightMm: number): TileRect => ({ xMm, yMm, widthMm, heightMm });
const cell = (id: string, fragments: TileRect[], isCut = true): WallTileCell => ({ id, row: 0, column: 0, ...rect(0, 0, 600, 300), fragments, isCut });
const wall = (cells: WallTileCell[], number: 0 | 1 = 0): WallTileCalculation => ({ roomId: "room", wall: number, widthMm: 1200, heightMm: 900, netAreaM2: 1, coveredAreaM2: 1, cells, baseTiles: cells.length, cutTiles: cells.filter((tile) => tile.isCut).length, reserveTiles: 0, unlaidAreaM2: 0, warnings: [] });

describe("Review of physical wall tile parts", () => {
  it("joins artificial splits on both axes and reports the rectangle once", () => {
    const parts = connectedTileParts([rect(0, 0, 600, 100), rect(0, 100, 200, 200), rect(200, 100, 400, 200)]);
    expect(parts).toHaveLength(1);
    expect(parts[0].bounds).toEqual(rect(0, 0, 600, 300));
    expect(parts[0].rectangular).toBe(true);
    expect(parts[0].areaM2).toBeCloseTo(.18);
  });

  it("keeps an L cut and a ring around an opening connected, without inventing narrow parts", () => {
    const l = connectedTileParts([rect(0, 0, 600, 20), rect(0, 20, 30, 280)]);
    expect(l).toHaveLength(1); expect(l[0].rectangular).toBe(false);
    expect(l[0].bounds).toEqual(rect(0, 0, 600, 300));
    const ring = connectedTileParts([rect(0, 0, 600, 50), rect(0, 250, 600, 50), rect(0, 50, 100, 200), rect(500, 50, 100, 200)]);
    expect(ring).toHaveLength(1); expect(ring[0].rectangular).toBe(false);
    expect(ring[0].areaM2).toBeCloseTo(.1);
  });

  it("does not connect corners, visible gaps or the two sides of a full-height opening", () => {
    expect(connectedTileParts([rect(0, 0, 20, 20), rect(20, 20, 20, 20)])).toHaveLength(2);
    expect(connectedTileParts([rect(0, 0, 20, 20), rect(20.002, 0, 20, 20)])).toHaveLength(2);
    const entry = reviewWallCuts([wall([cell("two-sides", [rect(0, 0, 20, 300), rect(500, 0, 100, 300)])])])[0];
    expect(entry.parts).toHaveLength(2); expect(entry.minSideMm).toBe(20);
    expect(entry.narrowestPart.bounds.widthMm).toBe(20);
  });

  it("accepts floating-point shared edges, preserves source numbers and sorts across walls", () => {
    expect(connectedTileParts([rect(0, 0, .1 + .2, 100), rect(.3, 0, 10, 100)])).toHaveLength(1);
    const entries = reviewWallCuts([
      wall([cell("full", [rect(0, 0, 600, 300)], false), cell("wide", [rect(0, 0, 90, 300)])]),
      wall([cell("narrow", [rect(0, 0, 4, 300)])], 1),
    ]);
    expect(entries.map((entry) => [entry.wall, entry.tileNumber, entry.minSideMm])).toEqual([[1, 1, 4], [0, 2, 90]]);
    expect(connectedTileParts([])).toEqual([]); expect(reviewWallCuts([])).toEqual([]);
  });

  it("handles the engine's 8000 fragment limit without quadratic pair matching", () => {
    const fragments = Array.from({ length: 8000 }, (_, index) => rect(index % 80, Math.floor(index / 80), 1, 1));
    const part = connectedTileParts(fragments);
    expect(part).toHaveLength(1); expect(part[0].rectangular).toBe(true);
    expect(part[0].bounds).toEqual(rect(0, 0, 80, 100));
    expect(part[0].areaM2).toBeCloseTo(.008);
  });

  it("reviews a continuous room with openings while leaving purchase and geometry untouched", () => {
    const project = createDefaultProject(), room = project.rooms[0];
    room.widthMm = 3000; room.lengthMm = 4000; room.heightMm = 2700;
    room.wallTiles = [0, 1, 2, 3].map(() => createWallTileSpec()) as typeof room.wallTiles;
    room.continuousWallTiles = true;
    room.openings = [
      { id: "window", type: "window", wall: 0, offsetMm: 800, widthMm: 1400, heightMm: 1400, sillMm: 810 },
      { id: "door", type: "door", wall: 3, offsetMm: 1050, widthMm: 900, heightMm: 2100, sillMm: 0 },
    ];
    const result = calculateProject(project), before = JSON.stringify(result);
    const entries = reviewWallCuts(result.rooms[0].walls);
    expect(entries).toHaveLength(result.rooms[0].walls.reduce((total, item) => total + item.cutTiles, 0));
    expect(entries[0].wall).toBe(1); expect(entries[0].minSideMm).toBe(4);
    expect(entries.some((entry) => entry.parts.some((part) => !part.rectangular))).toBe(true);
    expect(result.purchases.find((line) => line.kind === "wall-tile")).toMatchObject({ baseTiles: 239, quantity: 33, purchasedTiles: 264 });
    expect(JSON.stringify(result)).toBe(before);
    room.continuousWallTiles = false;
    expect(reviewWallCuts(calculateProject(project).rooms[0].walls.filter((item) => item.wall === 1))[0].minSideMm).toBe(292);
  });
});
