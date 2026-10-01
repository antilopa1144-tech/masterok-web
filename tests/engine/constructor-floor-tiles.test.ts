import { describe, expect, it } from "vitest";
import { calculateProject, createDefaultProject, validateProject } from "../../engine/constructor/calculate";
import { createFloorTileSpec, calculateFloorTiles } from "../../engine/constructor/floor-tiles";
import { createTileSupply } from "../../engine/constructor/tile-supplies";
import { createInteriorRoom } from "../../src/lib/constructor/interiors";
import { cloneValue, createWorkspace, parseWorkspace, serializeWorkspace, importWorkspaceFile } from "../../src/lib/constructor/workspace";
import { planSvg } from "../../src/lib/constructor/presentation";
import { floorExportText } from "../../src/lib/constructor/floor-presentation";
import { summarizeFinish } from "../../src/lib/constructor/comparison";

function project() {
  const value = createDefaultProject(), room = value.rooms[0];
  room.widthMm = 1200; room.lengthMm = 1200; room.heightMm = 1200;
  room.floor.kind = "tile"; room.floor.tile = { ...createFloorTileSpec(), edgeGapMm: 0, jointMm: 0, reservePercent: 0 };
  return value;
}

describe("Constructor tiled floor", () => {
  it("counts actual grid cells and buys whole packs without laminate companions", () => {
    const value = project(); value.rooms[0].floor.includeUnderlay = true; value.rooms[0].floor.includePlinth = true;
    const result = calculateProject(value), floor = result.rooms[0].floorTiles!;
    expect(floor.baseTiles).toBe(4); expect(floor.cutTiles).toBe(0); expect(floor.coveredAreaM2).toBe(1.44);
    expect(result.rooms[0].pieces).toEqual([]); expect(result.rooms[0].baseBoards).toBe(0);
    expect(result.purchases).toHaveLength(1);
    expect(result.purchases[0]).toMatchObject({ kind: "floor-tile", baseTiles: 4, purchasedTiles: 4, quantity: 1, floorRoomIds: [value.rooms[0].id] });
  });
  it("draws the engine's clipped cells and tile numbers rather than saved laminate geometry", () => {
    const value = project(), room = value.rooms[0], calculated = calculateProject(value).rooms[0];
    const cell = calculated.floorTiles!.cells[0];
    const svg = planSvg(room, calculated, { numbers: true, selectedPieceId: cell.id });
    expect(svg).toContain(`data-piece-id="${cell.id}"`); expect(svg).toContain("Плитка пола 1"); expect(svg).not.toContain("Исходная доска");
    expect(svg).toContain('stroke="#f97316"');
  });
  it("exports tile-specific labels and compares floor tile purchases once", () => {
    const value = project(), room = value.rooms[0], result = calculateProject(value);
    const text = floorExportText(room, result.rooms[0]);
    expect(text.parameters).toContain("плитка 600 × 600"); expect(text.summary).toContain("4 исходных плиток"); expect(text.parameters).not.toContain("доска");
    const summary = summarizeFinish(value, result);
    expect(summary.tileFloorCount).toBe(1); expect(summary.tileWallCount).toBe(0); expect(summary.tiles.packs).toBe(1); expect(summary.laminate.packs).toBe(0);
    room.tileSupplies = { adhesive: createTileSupply("adhesive") }; room.floor.tile!.packPriceRub = 100;
    const incomplete = summarizeFinish(value, calculateProject(value));
    expect(incomplete.cost.unconfiguredMixtures).toBe(1); expect(incomplete.cost.complete).toBe(false);
  });
  it.each(["edge", "center"] as const)("clips %s grid to the true floor boundary and preserves tile area balance", (alignment) => {
    const room = project().rooms[0]; room.widthMm = 1333.5; room.lengthMm = 2178.25; room.floor.tile!.alignment = alignment;
    room.floor.tile!.jointMm = 2.5; room.floor.tile!.edgeGapMm = 7.5;
    const result = calculateFloorTiles(room);
    expect(result.cells.every((cell) => cell.fragments.every((p) => p.xMm >= 7.5 && p.yMm >= 7.5 && p.xMm + p.widthMm <= room.widthMm - 7.5 + 1e-6 && p.yMm + p.heightMm <= room.lengthMm - 7.5 + 1e-6))).toBe(true);
    expect(result.coveredAreaM2 + result.unlaidAreaM2).toBeCloseTo(result.baseTiles * .36, 10);
    expect(result.netAreaM2).toBeCloseTo((1333.5 - 15) * (2178.25 - 15) / 1e6, 10);
  });
  it("rotates a rectangular format and excludes wall openings from floor geometry", () => {
    const value = project(), room = value.rooms[0]; room.lengthMm = 1800; room.heightMm = 2700;
    room.floor.tile!.tileHeightMm = 300; room.floor.tile!.orientation = "vertical";
    const before = calculateFloorTiles(room); room.openings.push({ id: "door", type: "door", wall: 0, offsetMm: 100, widthMm: 900, heightMm: 2100, sillMm: 0 });
    expect(calculateFloorTiles(room)).toEqual(before); expect(before.baseTiles).toBe(12);
    expect(before.cells[0]).toMatchObject({ widthMm: 300, heightMm: 600 });
  });
  it("combines the same tile on floor and wall before reserve and packaging", () => {
    const value = project(), room = value.rooms[0]; room.floor.tile!.reservePercent = 10;
    room.wallTiles[0] = { ...room.floor.tile! };
    const line = calculateProject(value).purchases[0];
    expect(line).toMatchObject({ kind: "wall-tile", baseTiles: 8, roundedTiles: 9, purchasedTiles: 12, quantity: 3, reserveTiles: .8 });
    expect(line.surfaces).toEqual([{ roomId: room.id, wall: 0 }]); expect(line.floorRoomIds).toEqual([room.id]);
  });
  it("does not merge different products or pack sizes and flags differing prices", () => {
    const value = project(), second = cloneValue(value.rooms[0]); second.id = "second"; value.rooms.push(second);
    second.floor.tile!.packPriceRub = 1234.56;
    const line = calculateProject(value).purchases[0]; expect(line.quantity).toBe(2); expect(line.totalPriceRub).toBe(2469.12); expect(line.priceNote).toContain("отличаются");
    second.floor.tile!.tilesPerPack = 8; expect(calculateProject(value).purchases).toHaveLength(2);
  });
  it.each([null, { ...createFloorTileSpec(), edgeGapMm: NaN }, { ...createFloorTileSpec(), tileWidthMm: 0 }, { ...createFloorTileSpec(), tilesPerPack: 1.5 }])("rejects malformed tile input: %j", (tile) => {
    const value = project(); value.rooms[0].floor.tile = tile as never;
    expect(validateProject(value).length).toBeGreaterThan(0); expect(() => calculateProject(value)).toThrow();
  });
  it("bounds floor grid allocation before rendering and catches zero usable area", () => {
    const value = project(), room = value.rooms[0]; room.widthMm = 30000; room.lengthMm = 30000;
    room.floor.tile!.tileWidthMm = 50; room.floor.tile!.tileHeightMm = 50;
    expect(validateProject(value).join(" ")).toContain("лимит");
    room.widthMm = 300; room.lengthMm = 300; room.floor.tile!.edgeGapMm = 100;
    expect(calculateProject(value).rooms[0].floorTiles!.netAreaM2).toBe(.01);
    room.widthMm = 100; expect(validateProject(value).join(" ")).toContain("нулевую площадь");
  });
  it("uses a tile floor for newly added bathrooms without changing other room types", () => {
    expect(createInteriorRoom("bathroom", []).floor.kind).toBe("tile");
    expect(createInteriorRoom("living", []).floor.kind).not.toBe("tile");
  });
  it("restores laminate settings exactly after a temporary tiled floor", () => {
    const value = createDefaultProject(), room = value.rooms[0]; const original = calculateProject(value);
    room.floor.tile = createFloorTileSpec(); room.floor.kind = "tile"; calculateProject(value);
    room.floor.kind = "laminate"; expect(calculateProject(value)).toEqual(original);
  });
  it("migrates v2 rooms and variants to v3 while retaining old laminate quantities", () => {
    const workspace = createWorkspace(), original = calculateProject(workspace.project);
    const legacy = { ...workspace, version: 2, project: { ...workspace.project, schemaVersion: 2 } };
    const loaded = parseWorkspace(legacy); expect(loaded.version).toBe(5); expect(loaded.project.schemaVersion).toBe(5);
    expect(calculateProject(loaded.project)).toEqual(original);
    const updated = cloneValue(loaded); updated.project.rooms[0].floor.kind = "tile"; updated.project.rooms[0].floor.tile = createFloorTileSpec();
    updated.variants.push({ id: "old", name: "Ламинат", savedAt: updated.project.updatedAt, rooms: loaded.project.rooms });
    const restored = importWorkspaceFile(serializeWorkspace(updated)); expect(restored.project.rooms).toEqual(updated.project.rooms); expect(restored.variants).toEqual(updated.variants);
  });
  it("rejects newer floor data disguised as a v2 file, including variants", () => {
    const workspace = createWorkspace(); workspace.project.rooms[0].floor.tile = createFloorTileSpec();
    expect(() => parseWorkspace({ ...workspace, version: 2, project: { ...workspace.project, schemaVersion: 2 } })).toThrow("версии 2");
  });
});

describe("Constructor tile supplies", () => {
  it("uses laying area including joints rather than purchased tile area; reserves stay independent", () => {
    const value = project(), room = value.rooms[0]; room.widthMm = 1202; room.lengthMm = 1202; room.floor.tile!.jointMm = 2; room.floor.tile!.reservePercent = 100;
    room.tileSupplies = { adhesive: { ...createTileSupply("adhesive"), consumptionKgM2: 4, reservePercent: 10, packageKg: 5, packagePriceRub: 200 } };
    const line = calculateProject(value).purchases.find((line) => line.kind === "tile-adhesive")!;
    expect(line.exactNeedKg).toBeCloseTo(1.444804 * 4, 10); expect(line.neededKg).toBeCloseTo(1.444804 * 4 * 1.1, 10);
    expect(line.quantity).toBe(2); expect(line.purchasedKg).toBe(10); expect(line.totalPriceRub).toBe(400);
    expect(line.packSurplusKg).toBeCloseTo(10 - 1.444804 * 4 * 1.1, 10); expect(line.basis).toContain("остаток упаковок");
  });
  it("combines different consumption rates and reserves for one product before packaging", () => {
    const value = project(), room = value.rooms[0]; room.widthMm = 1000; room.lengthMm = 1000;
    room.tileSupplies = { grout: { ...createTileSupply("grout"), consumptionKgM2: .3, packageKg: 1 } };
    const second = cloneValue(room); second.id = "second"; second.tileSupplies!.grout!.consumptionKgM2 = .5; second.tileSupplies!.grout!.reservePercent = 10; value.rooms.push(second);
    const line = calculateProject(value).purchases.find((line) => line.kind === "tile-grout")!;
    expect(line.exactNeedKg).toBe(.8); expect(line.reserveKg).toBe(.05); expect(line.neededKg).toBe(.85); expect(line.quantity).toBe(1);
  });
  it("rounds decimal package boundaries correctly and preserves a real tiny reserve", () => {
    const value = project(), room = value.rooms[0]; room.widthMm = 300; room.lengthMm = 1000;
    room.tileSupplies = { grout: { ...createTileSupply("grout"), consumptionKgM2: 1, packageKg: .1 } };
    expect(calculateProject(value).purchases.find((line) => line.kind === "tile-grout")!.quantity).toBe(3);
    expect(calculateProject(value).purchases.find((line) => line.kind === "tile-grout")!.packSurplusKg).toBe(0);
    room.tileSupplies.grout!.reservePercent = 1e-12;
    expect(calculateProject(value).purchases.find((line) => line.kind === "tile-grout")!.quantity).toBe(4);
  });
  it("counts floor and tiled walls once, and ignores furniture and non-tiled surfaces", () => {
    const value = project(), room = value.rooms[0]; room.wallTiles[0] = { ...room.floor.tile! };
    room.tileSupplies = { adhesive: { ...createTileSupply("adhesive"), consumptionKgM2: 1, packageKg: 10 } };
    expect(calculateProject(value).purchases.find((line) => line.kind === "tile-adhesive")!.exactNeedKg).toBe(2.88);
    room.floor.kind = "laminate"; expect(calculateProject(value).purchases.find((line) => line.kind === "tile-adhesive")!.exactNeedKg).toBe(1.44);
    room.wallTiles[0] = null; expect(calculateProject(value).purchases.some((line) => line.kind === "tile-adhesive")).toBe(false);
  });
  it("does not invent consumption when no rate is entered", () => {
    const value = project(); value.rooms[0].tileSupplies = { adhesive: createTileSupply("adhesive") };
    const result = calculateProject(value); expect(result.purchases.some((line) => line.kind === "tile-adhesive")).toBe(false);
    expect(result.rooms[0].warnings.join(" ")).toContain("укажите расход");
  });
  it.each([null, { adhesive: { ...createTileSupply("adhesive"), consumptionKgM2: NaN } }, { grout: { ...createTileSupply("grout"), packageKg: 0 } }])("rejects malformed mixture data: %j", (supplies) => {
    const value = project(); value.rooms[0].tileSupplies = supplies as never; expect(() => calculateProject(value)).toThrow();
  });
});
