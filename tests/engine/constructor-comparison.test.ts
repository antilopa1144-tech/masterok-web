import { describe, expect, it } from "vitest";
import { calculateProject, createRoom } from "../../engine/constructor/calculate";
import { createWallTileSpec } from "../../engine/constructor/tiling";
import { cloneValue, createWorkspace } from "../../src/lib/constructor/workspace";
import { compareFinish, summarizeFinish } from "../../src/lib/constructor/comparison";

const summaryFor = (project: ReturnType<typeof createWorkspace>["project"]) => summarizeFinish(project, calculateProject(project));

describe("Constructor finish comparison", () => {
  it("uses grouped purchases, while keeping reserve and packing surplus out of cutting losses", () => {
    const project = createWorkspace().project;
    const second = createRoom("Вторая комната"); second.floor = cloneValue(project.rooms[0].floor); project.rooms.push(second);
    for (const room of project.rooms) {
      room.floor.packPriceRub = 2345.67;
      room.floor.includeUnderlay = false; room.floor.includePlinth = false;
      const tile = { ...createWallTileSpec(), packPriceRub: 1800 };
      room.wallTiles = [cloneValue(tile), cloneValue(tile), cloneValue(tile), cloneValue(tile)];
    }
    const calculated = calculateProject(project), summary = summarizeFinish(project, calculated);
    const floorLine = calculated.purchases.find((line) => line.kind === "laminate")!;
    const tileLine = calculated.purchases.find((line) => line.kind === "wall-tile")!;
    expect(summary.laminate.packs).toBe(floorLine.quantity);
    expect(summary.tiles.packs).toBe(tileLine.quantity);
    expect(summary.laminate.purchasedBoards).toBe(floorLine.purchasedBoards);
    expect(summary.tiles.surplusTiles).toBe(tileLine.packSurplusTiles);
    expect(summary.laminate.wasteAreaM2).toBe(calculated.rooms.reduce((sum, room) => sum + room.offcutAreaM2 + room.kerfAreaM2, 0));
    expect(summary.tiles.wasteAreaM2).toBe(calculated.rooms.flatMap((room) => room.walls).reduce((sum, wall) => sum + wall.unlaidAreaM2, 0));
    expect(summary.cost.knownRub).toBe(calculated.totalCostRub);
    expect(summary.cost.complete).toBe(true);
  });

  it("compares changed finishes, but refuses cost deltas for changed geometry or included work", () => {
    const original = createWorkspace().project;
    original.rooms[0].floor.includeUnderlay = false; original.rooms[0].floor.includePlinth = false;
    original.rooms[0].floor.packPriceRub = 2000.01;
    const changed = cloneValue(original); changed.rooms[0].floor.packPriceRub = 2200.02;
    changed.rooms[0].floor.decor = "dark";
    const current = summaryFor(original), saved = summaryFor(changed);
    expect(compareFinish(current, saved).costDifferenceRub).toBe((Math.round(saved.cost.knownRub * 100) - Math.round(current.cost.knownRub * 100)) / 100);
    expect(compareFinish(current, saved).sameScope).toBe(true);
    changed.rooms[0].widthMm += 10;
    expect(compareFinish(current, summaryFor(changed))).toEqual({ sameScope: false, costDifferenceRub: null });
    changed.rooms[0].widthMm -= 10; changed.rooms[0].floor.includeUnderlay = true;
    expect(compareFinish(current, summaryFor(changed)).sameScope).toBe(false);
    changed.rooms[0].floor.includeUnderlay = false; changed.rooms[0].wallTiles[0] = createWallTileSpec();
    expect(compareFinish(current, summaryFor(changed)).sameScope).toBe(false);
  });

  it("checks openings even when floor area is unchanged, ignoring order and labels", () => {
    const original = createWorkspace().project;
    original.rooms[0].openings.push({ id: "door", type: "door", wall: 0, offsetMm: 0, widthMm: 900, heightMm: 2100, sillMm: 0 });
    original.rooms[0].openings.push({ id: "window", type: "window", wall: 1, offsetMm: 800, widthMm: 1400, heightMm: 1400, sillMm: 800 });
    const changed = cloneValue(original);
    changed.rooms[0].name = "Другое название";
    changed.rooms[0].openings.reverse();
    expect(compareFinish(summaryFor(original), summaryFor(changed)).sameScope).toBe(true);
    changed.rooms[0].openings.find((opening) => opening.id === "door")!.offsetMm = 100;
    expect(compareFinish(summaryFor(original), summaryFor(changed)).sameScope).toBe(false);
  });

  it("never presents incomplete or mixed prices as a saving", () => {
    const project = createWorkspace().project;
    expect(summaryFor(project).cost.complete).toBe(false);
    expect(summaryFor(project).cost.hasPrices).toBe(false);
    project.rooms[0].floor.packPriceRub = 2000;
    project.rooms[0].floor.includeUnderlay = true; project.rooms[0].floor.underlayRollPriceRub = 0;
    const partial = summaryFor(project);
    expect(partial.cost.missingLines).toBeGreaterThan(0);
    expect(partial.cost.hasPrices).toBe(true);
    expect(compareFinish(partial, partial).costDifferenceRub).toBeNull();
    project.rooms[0].floor.includeUnderlay = false; project.rooms[0].floor.includePlinth = false;
    const second = cloneValue(project.rooms[0]); second.id = "second"; second.floor.packPriceRub = 0; project.rooms.push(second);
    const mixed = summaryFor(project);
    expect(mixed.cost.estimated).toBe(true);
    expect(mixed.cost.complete).toBe(false);
    expect(compareFinish(mixed, mixed).costDifferenceRub).toBeNull();
  });

  it("handles an empty project without suggesting a zero-price option", () => {
    const project = createWorkspace().project; project.rooms = [];
    const empty = summaryFor(project);
    expect(empty.roomCount).toBe(0);
    expect(empty.laminate.packs).toBe(0);
    expect(empty.tiles.packs).toBe(0);
    expect(empty.cost).toEqual({ knownRub: 0, missingLines: 0, estimated: false, complete: false, hasPrices: false, unconfiguredMixtures: 0 });
    expect(compareFinish(empty, empty).costDifferenceRub).toBeNull();
  });
});
