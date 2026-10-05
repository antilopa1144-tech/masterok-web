import { describe, expect, it } from "vitest";
import { createWorkspaceFromLayout, getLayoutTransferIssue, type LaminateConstructorInput, type TileConstructorInput } from "../../src/lib/constructor/layout-transfer";
import { calculateProject, validateProject } from "../../src/lib/constructor/core";
import { createWorkspace, parseWorkspace, serializeWorkspace } from "../../src/lib/constructor/workspace";

const laminate: LaminateConstructorInput = { material: "laminate", surfaceW: 3200, surfaceH: 4500, boardW: 1380, boardH: 193, mode: "deck-half", direction: "along-length" };
const tile: TileConstructorInput = { material: "tile", surfaceView: "floor", surfaceW: 2500, surfaceH: 3100, tileW: 800, tileH: 400, groutMm: 1.5, reservePercent: 0, layoutMode: "straight", startMode: "center", tilesPerPack: 6 };

describe("Layout inputs to a separate constructor project", () => {
  it("preserves room axes, the board's long side, half shift and direction", async () => {
    const workspace = await createWorkspaceFromLayout(laminate);
    const room = workspace.project.rooms[0];
    expect([room.widthMm, room.lengthMm]).toEqual([3200, 4500]);
    expect(room.floor).toMatchObject({ boardLengthMm: 1380, boardWidthMm: 193, pattern: "half", direction: "length" });
    expect(room.interior?.items).toEqual([]);
    expect(room.wallTiles).toEqual([null, null, null, null]);
    expect(calculateProject(workspace.project).rooms[0].areaM2).toBe(14.4);
  });
  it("preserves width direction and third shift without rotating room dimensions", async () => {
    const workspace = await createWorkspaceFromLayout({ ...laminate, mode: "deck-third", direction: "along-width" });
    expect(workspace.project.rooms[0].floor).toMatchObject({ direction: "width", pattern: "third" });
    expect(workspace.project.rooms[0].lengthMm).toBe(4500);
  });
  it("keeps a zero reserve, decimal joint and labelled tile pack; adds no tiled walls", async () => {
    const workspace = await createWorkspaceFromLayout(tile);
    const room = workspace.project.rooms[0];
    expect(room.floor).toMatchObject({ kind: "tile", tile: { tileWidthMm: 800, tileHeightMm: 400, jointMm: 1.5, reservePercent: 0, tilesPerPack: 6, alignment: "center" } });
    expect(room.wallTiles.every((wall) => wall === null)).toBe(true);
    const calculated = calculateProject(workspace.project);
    expect(calculated.rooms[0].areaM2).toBe(7.75);
    expect(calculated.purchases).toHaveLength(1);
    expect(calculated.purchases[0].reserveTiles).toBe(0);
  });
  it.each([laminate, tile])("creates independent, valid, exportable projects for $material", async (input) => {
    const existing = createWorkspace();
    const original = serializeWorkspace(existing);
    const first = await createWorkspaceFromLayout(input);
    const second = await createWorkspaceFromLayout(input);
    expect(new Set([existing.project.id, first.project.id, second.project.id]).size).toBe(3);
    expect(serializeWorkspace(existing)).toBe(original);
    expect(validateProject(first.project)).toEqual([]);
    expect(parseWorkspace(JSON.parse(serializeWorkspace(first)))).toEqual(first);
  });
  it.each([
    { ...laminate, mode: "herringbone" as const },
    { ...tile, surfaceView: "wall" as const },
    { ...tile, layoutMode: "diagonal" as const },
    { ...tile, layoutMode: "offset-half" as const },
    { ...tile, startMode: "custom" as const },
  ])("rejects unsupported geometry rather than silently changing it: %j", async (input) => {
    expect(getLayoutTransferIssue(input)).toBeTruthy();
    await expect(createWorkspaceFromLayout(input)).rejects.toThrow();
  });
  it.each([0, NaN, Infinity, 299, 30_001])("rejects an invalid room dimension %s before construction", async (surfaceW) => {
    await expect(createWorkspaceFromLayout({ ...laminate, surfaceW })).rejects.toThrow();
  });
  it("does not clamp unsupported tiles or fractional packs into a different product", async () => {
    await expect(createWorkspaceFromLayout({ ...tile, tileW: 2000 })).rejects.toThrow(/1600/);
    await expect(createWorkspaceFromLayout({ ...tile, tilesPerPack: 2.5 })).rejects.toThrow(/целое/);
  });
  it("uses the existing editable pack default when the source has no labelled pack", async () => {
    const workspace = await createWorkspaceFromLayout({ ...tile, tilesPerPack: undefined, startMode: "edge" });
    expect(workspace.project.rooms[0].floor.tile).toMatchObject({ alignment: "edge", tilesPerPack: 4 });
  });
});
