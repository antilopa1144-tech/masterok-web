import { describe, expect, it } from "vitest";
import { calculateProject, createDefaultProject, createRoom } from "../../engine/constructor/calculate";
import { createWallTileSpec } from "../../engine/constructor/tiling";
import { previewWallLayout, summarizeWallLayout, wallLayoutProject } from "../../src/lib/constructor/wall-layout";
import { wallSvg } from "../../src/lib/constructor/wall-presentation";

function control() {
  const project = createDefaultProject(), room = project.rooms[0];
  room.widthMm = 3000; room.lengthMm = 4000; room.heightMm = 2700;
  room.wallTiles = [0, 1, 2, 3].map(() => ({ ...createWallTileSpec(), packPriceRub: 1800 })) as typeof room.wallTiles;
  room.continuousWallTiles = true;
  room.openings = [
    { id: "window", type: "window", wall: 0, offsetMm: 800, widthMm: 1400, heightMm: 1400, sillMm: 810 },
    { id: "door", type: "door", wall: 3, offsetMm: 1050, widthMm: 900, heightMm: 2100, sillMm: 0 },
  ];
  return project;
}

describe("Temporary wall layout preview", () => {
  it("shows the original until a setting changes, including valid continuation with different pack prices", () => {
    const project = control(), room = project.rooms[0];
    room.wallTiles[0]!.packPriceRub = 2200;
    room.wallTiles[2]!.tilesPerPack = 6;
    room.wallTiles[3]!.reservePercent = 15;
    const draft = { orientation: "horizontal", alignment: "center", continuous: true } as const;
    const before = calculateProject(project), preview = previewWallLayout(project, room.id, 1, draft);
    expect(preview.error).toBe("");
    expect(preview.project.rooms).toEqual(project.rooms);
    expect(preview.calculation!.purchases).toEqual(before.purchases);
    const changed = previewWallLayout(project, room.id, 1, { ...draft, orientation: "vertical" });
    expect(changed.project.rooms[0].wallTiles.every((spec) => spec?.tilesPerPack === 8 && spec.packPriceRub === 1800 && spec.reservePercent === 10)).toBe(true);
  });

  it("keeps preview clips separate from the live drawing when their tile geometry differs", () => {
    const project = control(), room = project.rooms[0], calculation = calculateProject(project);
    const preview = previewWallLayout(project, room.id, 1, { orientation: "vertical", alignment: "edge", continuous: false });
    const currentSvg = wallSvg(room, 1, calculation.rooms[0].walls[1], { idPrefix: "elevation" });
    const previewSvg = wallSvg(preview.project.rooms[0], 1, preview.calculation!.rooms[0].walls[1], { idPrefix: "layout-preview" });
    const clipIds = (svg: string) => [...svg.matchAll(/<clipPath id="([^"]+)"/g)].map((match) => match[1]);
    const currentIds = new Set(clipIds(currentSvg)), previewIds = clipIds(previewSvg);
    expect(previewIds.length).toBeGreaterThan(0);
    expect(previewIds.some((id) => currentIds.has(id))).toBe(false);
    for (const id of previewIds) expect(previewSvg).toContain(`clip-path="url(#${id})"`);
  });

  it("changes only the selected wall's parameters in independent mode and preserves the source project", () => {
    const project = control(), room = project.rooms[0], before = JSON.stringify(project);
    const preview = wallLayoutProject(project, room.id, 1, { orientation: "vertical", alignment: "edge", continuous: false });
    expect(preview.rooms[0].wallTiles[1]).toMatchObject({ orientation: "vertical", alignment: "edge", packPriceRub: 1800 });
    expect(preview.rooms[0].continuousWallTiles).toBe(false);
    for (const wall of [0, 2, 3]) expect(preview.rooms[0].wallTiles[wall]).toEqual(room.wallTiles[wall]);
    expect(preview.rooms[0].floor).toEqual(room.floor); expect(preview.rooms[0].openings).toEqual(room.openings);
    expect(JSON.stringify(project)).toBe(before);
  });

  it("copies all selected material parameters to four walls when continuing through corners", () => {
    const project = control(), room = project.rooms[0];
    room.continuousWallTiles = false; room.wallTiles[1] = null;
    room.wallTiles[3] = { ...room.wallTiles[3]!, materialKey: "Другой товар", tilesPerPack: 3, packPriceRub: 900 };
    const preview = wallLayoutProject(project, room.id, 0, { orientation: "vertical", alignment: "edge", continuous: true });
    expect(preview.rooms[0].wallTiles.every((spec) => spec?.materialKey === room.wallTiles[0]!.materialKey && spec.tilesPerPack === 8 && spec.packPriceRub === 1800 && spec.orientation === "vertical")).toBe(true);
    expect(preview.rooms[0].wallTiles[0]).not.toBe(preview.rooms[0].wallTiles[1]);
    expect(room.wallTiles[1]).toBeNull(); expect(room.wallTiles[3].materialKey).toBe("Другой товар");
  });

  it("exposes the 4 mm corner strip and recalculates independent centering without altering purchases", () => {
    const project = control(), room = project.rooms[0];
    const before = calculateProject(project);
    expect(summarizeWallLayout(project, before, room.id, 1)).toMatchObject({ sourceTiles: 72, cutTiles: 30, packs: 33, purchasedTiles: 264 });
    expect(summarizeWallLayout(project, before, room.id, 1).smallestCut?.minSideMm).toBe(4);
    const preview = previewWallLayout(project, room.id, 1, { orientation: "horizontal", alignment: "center", continuous: false });
    expect(preview.error).toBe("");
    const after = summarizeWallLayout(preview.project, preview.calculation!, room.id, 1);
    expect(after.sourceTiles).toBe(63); expect(after.smallestCut?.minSideMm).toBe(292);
    expect(after.packs).toBe(preview.calculation!.purchases.filter((line) => line.kind === "wall-tile").reduce((total, line) => total + line.quantity, 0));
    expect(calculateProject(project).purchases).toEqual(before.purchases);
  });

  it("keeps all other rooms in the grouped purchase and flags partial or conflicting prices", () => {
    const project = control(), selected = project.rooms[0], other = createRoom("Другая комната");
    other.wallTiles[0] = { ...createWallTileSpec(), packPriceRub: 2200 };
    project.rooms.push(other);
    const preview = previewWallLayout(project, selected.id, 0, { orientation: "horizontal", alignment: "edge", continuous: true });
    expect(preview.project.rooms[1]).toEqual(other);
    const summary = summarizeWallLayout(preview.project, preview.calculation!, selected.id, 0);
    expect(summary.cost.estimated).toBe(true); expect(summary.cost.complete).toBe(false);
    expect(summary.cost.missingLines).toBeGreaterThan(0);
    expect(summary.cost.knownRub).toBe(preview.calculation!.totalCostRub);
  });

  it("returns an explainable error for a missing surface or invalid settings without changing the source", () => {
    const project = createDefaultProject(), before = JSON.stringify(project);
    const draft = { orientation: "horizontal", alignment: "center", continuous: false } as const;
    expect(previewWallLayout(project, project.rooms[0].id, 0, draft)).toMatchObject({ calculation: null, error: expect.stringContaining("стену с плиткой") });
    expect(JSON.stringify(project)).toBe(before);
    project.rooms[0].wallTiles[0] = { ...createWallTileSpec(), tileWidthMm: 40 };
    expect(previewWallLayout(project, project.rooms[0].id, 0, draft)).toMatchObject({ calculation: null, error: expect.stringContaining("от 50 до 1600") });
  });

  it("blocks a rotated grid exceeding the cell limit while keeping a valid original usable", () => {
    const project = createDefaultProject(), room = project.rooms[0];
    room.widthMm = 30000; room.lengthMm = 3000; room.heightMm = 6000;
    room.wallTiles[0] = { ...createWallTileSpec(), tileWidthMm: 1200, tileHeightMm: 50, jointMm: 0, alignment: "edge" };
    expect(calculateProject(project).rooms[0].walls[0].baseTiles).toBe(3000);
    const before = JSON.stringify(project);
    const preview = previewWallLayout(project, room.id, 0, { orientation: "vertical", alignment: "edge", continuous: false });
    expect(preview.calculation).toBeNull(); expect(preview.error).toContain("лимит 4000");
    expect(JSON.stringify(project)).toBe(before);
  });
});
