import { describe, expect, it } from "vitest";
import { calculateProject, createDefaultProject, createRoom, validateProject } from "../../engine/constructor/calculate";
import { createWallTileSpec } from "../../engine/constructor/tiling";
import { cloneValue, createWorkspace, parseWorkspace, serializeWorkspace } from "../../src/lib/constructor/workspace";
import { wallSvg } from "../../src/lib/constructor/wall-presentation";

describe("Constructor wall purchase and project contract", () => {
  it("unites compatible walls before rounding reserve and packs, regardless of orientation and price", () => {
    const project = createDefaultProject(); const room = project.rooms[0];
    room.widthMm = 1200; room.lengthMm = 1200; room.heightMm = 600;
    room.wallTiles[0] = { ...createWallTileSpec(), jointMm: 0, reservePercent: 10, tilesPerPack: 3, packPriceRub: 1000 };
    room.wallTiles[1] = { ...room.wallTiles[0], orientation: "vertical", packPriceRub: 1500 };
    const result = calculateProject(project), line = result.purchases.find((p) => p.kind === "wall-tile")!;
    expect(result.rooms[0].walls.map((wall) => wall.baseTiles)).toEqual([4, 4]);
    expect(line.baseTiles).toBe(8); expect(line.reserveTiles).toBeCloseTo(.8);
    expect(line.roundedTiles).toBe(9); expect(line.quantity).toBe(3); expect(line.purchasedTiles).toBe(9);
    expect(line.unitPriceRub).toBe(1500); expect(line.totalPriceRub).toBe(4500);
    expect(line.priceNote).toContain("максимальная"); expect(line.surfaces).toHaveLength(2);
    expect(line.purchasedAreaM2).toBeCloseTo(1.62);
  });

  it("rounds even a small positive reserve up only at the final purchase stage", () => {
    const project = createDefaultProject(), room = project.rooms[0];
    room.widthMm = 1200; room.heightMm = 600;
    room.wallTiles[0] = { ...createWallTileSpec(), jointMm: 0, reservePercent: .00001, tilesPerPack: 1 };
    const line = calculateProject(project).purchases.find((p) => p.kind === "wall-tile")!;
    expect(line.baseTiles).toBe(4); expect(line.reserveTiles).toBeGreaterThan(0);
    expect(line.roundedTiles).toBe(5); expect(line.quantity).toBe(5);
  });

  it("does not buy an extra pack from floating-point noise across many walls", () => {
    const project = createDefaultProject();
    project.rooms = Array.from({ length: 20 }, (_, index) => {
      const room = createRoom(`Комната ${index + 1}`);
      room.widthMm = room.lengthMm = room.heightMm = 2400;
      room.wallTiles = [0, 1, 2, 3].map(() => ({ ...createWallTileSpec(), tileWidthMm: 300, tileHeightMm: 300, jointMm: 0, alignment: "edge", reservePercent: 10, tilesPerPack: 8 })) as typeof room.wallTiles;
      room.openings = [0, 1, 2, 3].map((wall) => ({ id: `opening-${index}-${wall}`, type: "window", wall: wall as 0 | 1 | 2 | 3, offsetMm: 0, widthMm: 900, heightMm: 300, sillMm: 0 }));
      return room;
    });
    const line = calculateProject(project).purchases.find((p) => p.kind === "wall-tile")!;
    expect(line.baseTiles).toBe(4880); expect(line.reserveTiles).toBeCloseTo(488);
    expect(line.roundedTiles).toBe(5368); expect(line.quantity).toBe(671);
  });

  it("keeps different products and packaging apart and prices all-zero groups as unknown", () => {
    const project = createDefaultProject(), room = project.rooms[0];
    room.wallTiles[0] = createWallTileSpec();
    room.wallTiles[1] = { ...createWallTileSpec(), materialKey: "Другой товар" };
    room.wallTiles[2] = { ...createWallTileSpec(), tilesPerPack: 10 };
    const lines = calculateProject(project).purchases.filter((line) => line.kind === "wall-tile");
    expect(lines).toHaveLength(3);
    expect(lines.every((line) => Number.isInteger(line.quantity) && line.totalPriceRub === 0)).toBe(true);
    expect(lines.every((line) => line.priceNote?.includes("Цена не задана"))).toBe(true);
  });

  it("discloses unset prices within a common tile order and skips fully open walls", () => {
    const project = createDefaultProject(), room = project.rooms[0];
    room.wallTiles[0] = createWallTileSpec(); room.wallTiles[1] = { ...createWallTileSpec(), packPriceRub: 2000 };
    const line = calculateProject(project).purchases.find((p) => p.kind === "wall-tile")!;
    expect(line.priceNote).toContain("цена не задана"); expect(line.unitPriceRub).toBe(2000);
    room.wallTiles[1] = null;
    room.openings = [{ id: "door", type: "door", wall: 0, offsetMm: 0, widthMm: room.widthMm, heightMm: room.heightMm, sillMm: 0 }];
    expect(calculateProject(project).purchases.filter((p) => p.kind === "wall-tile")).toHaveLength(0);
  });

  it("rejects excessive clipped fragments before import or purchasing", () => {
    const workspace = createWorkspace(), room = workspace.project.rooms[0];
    room.widthMm = room.lengthMm = room.heightMm = 3000;
    room.wallTiles[0] = { ...createWallTileSpec(), tileWidthMm: 50, tileHeightMm: 50, jointMm: 0, alignment: "edge" };
    room.openings = Array.from({ length: 100 }, (_, index) => ({ id: `opening-${index}`, type: "window" as const, wall: 0 as const, offsetMm: 10 + Math.floor(index / 2) * 50 + (index % 2) * 20, widthMm: 10, heightMm: 3000, sillMm: 0 }));
    expect(validateProject(workspace.project).join(" ")).toContain("8000");
    expect(() => calculateProject(workspace.project)).toThrow("Увеличьте формат");
    expect(() => parseWorkspace(workspace)).toThrow("Увеличьте формат");
  });

  it("validates continuation compatibility, damaged wall arrays and heavy layouts", () => {
    const project = createDefaultProject(), room = project.rooms[0];
    room.wallTiles = [createWallTileSpec(), createWallTileSpec(), null, createWallTileSpec()]; room.continuousWallTiles = true;
    expect(validateProject(project).join(" ")).toContain("все четыре");
    room.continuousWallTiles = false; room.wallTiles[0] = { ...createWallTileSpec(), tileWidthMm: 50, tileHeightMm: 50 };
    room.widthMm = 30000; room.heightMm = 6000;
    expect(validateProject(project).join(" ")).toContain("4000 плиток");
    room.wallTiles = [] as unknown as typeof room.wallTiles;
    expect(validateProject(project).join(" ")).toContain("четырёх стен");
  });

  it("migrates version 1 current rooms and variants without assigning tiles or changing the floor", () => {
    const workspace = createWorkspace(); workspace.project.rooms[0].floor.packPriceRub = 2345.67;
    workspace.variants.push({ id: "v", name: "Старый вариант", rooms: cloneValue(workspace.project.rooms), savedAt: workspace.project.createdAt });
    const legacy = JSON.parse(JSON.stringify(workspace)); legacy.version = 1; legacy.project.schemaVersion = 1;
    for (const room of [...legacy.project.rooms, ...legacy.variants[0].rooms]) { delete room.wallTiles; delete room.continuousWallTiles; }
    const before = JSON.stringify(legacy), migrated = parseWorkspace(legacy);
    expect(JSON.stringify(legacy)).toBe(before); expect(migrated.version).toBe(5); expect(migrated.project.schemaVersion).toBe(5);
    expect(migrated.project.rooms[0].floor).toEqual(workspace.project.rooms[0].floor);
    expect(migrated.project.rooms[0].wallTiles).toEqual([null, null, null, null]);
    expect(migrated.variants[0].rooms[0].continuousWallTiles).toBe(false);
    expect(calculateProject(migrated.project)).toEqual(calculateProject(workspace.project));
  });

  it("round trips walls and independent variants, rejecting malformed tiles even inside variants", () => {
    const workspace = createWorkspace(); workspace.project.rooms[0].wallTiles[2] = createWallTileSpec();
    workspace.variants.push({ id: "v", name: "Вариант плитки", rooms: cloneValue(workspace.project.rooms), savedAt: workspace.project.createdAt });
    expect(parseWorkspace(JSON.parse(serializeWorkspace(workspace)))).toEqual(workspace);
    workspace.variants[0].rooms[0].wallTiles[2]!.jointMm = -1;
    expect(() => parseWorkspace(workspace)).toThrow();
  });

  it("escapes names and tile ids while displaying the engine's exact clipped cells", () => {
    const project = createDefaultProject(); const room = createRoom('<img onload="alert(1)">');
    room.id = 'r"><script'; room.wallTiles[0] = createWallTileSpec(); project.rooms = [room];
    const calculation = calculateProject(project).rooms[0].walls[0], svg = wallSvg(room, 0, calculation, { numbers: true });
    expect(svg).not.toContain('<img onload='); expect(svg).not.toContain('<script'); expect(svg).toContain("&lt;img");
    expect((svg.match(/data-tile-id=/g) ?? []).length).toBe(calculation.baseTiles);
  });
});
