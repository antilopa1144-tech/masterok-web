import { calculateProject, validateProject, type ConstructorProject, type ProjectCalculation, type Wall, type WallTileSpec } from "./core";
import { summarizeFinish } from "./comparison";
import { reviewWallCuts } from "./wall-cuts";

export interface WallLayoutDraft {
  orientation: WallTileSpec["orientation"];
  alignment: WallTileSpec["alignment"];
  continuous: boolean;
}

/** Applies the existing inspector contract to a separate, immutable preview. */
export function wallLayoutProject(project: ConstructorProject, roomId: string, wall: Wall, draft: WallLayoutDraft): ConstructorProject {
  const room = project.rooms.find((item) => item.id === roomId);
  const source = room?.wallTiles[wall];
  if (!room || !source) throw new Error("Выберите стену с плиткой, чтобы настроить раскладку.");
  // Opening or resetting the preview must preserve even differing prices/packs
  // that are valid with a shared geometric grid.
  if (draft.orientation === source.orientation && draft.alignment === source.alignment && draft.continuous === room.continuousWallTiles) return project;
  const spec = { ...source, orientation: draft.orientation, alignment: draft.alignment };
  const wallTiles = room.wallTiles.map((item) => item ? { ...item } : null) as typeof room.wallTiles;
  if (draft.continuous) wallTiles.forEach((_, index) => { wallTiles[index] = { ...spec }; });
  else wallTiles[wall] = spec;
  const changed = { ...room, wallTiles, continuousWallTiles: draft.continuous };
  return { ...project, rooms: project.rooms.map((item) => item.id === roomId ? changed : item) };
}

export function previewWallLayout(project: ConstructorProject, roomId: string, wall: Wall, draft: WallLayoutDraft): { project: ConstructorProject; calculation: ProjectCalculation | null; error: string } {
  let preview = project;
  try {
    preview = wallLayoutProject(project, roomId, wall, draft);
    const errors = validateProject(preview);
    if (errors.length) return { project: preview, calculation: null, error: errors.join(" ") };
    return { project: preview, calculation: calculateProject(preview), error: "" };
  } catch (error) {
    return { project: preview, calculation: null, error: error instanceof Error ? error.message : "Не удалось построить раскладку. Верните предыдущие настройки." };
  }
}

/** Wall geometry and the whole project's grouped purchases have different scopes. */
export function summarizeWallLayout(project: ConstructorProject, calculation: ProjectCalculation, roomId: string, wall: Wall) {
  const value = calculation.rooms.find((room) => room.roomId === roomId)?.walls.find((item) => item.wall === wall);
  const whole = summarizeFinish(project, calculation);
  return {
    sourceTiles: value?.baseTiles ?? 0,
    cutTiles: value?.cutTiles ?? 0,
    smallestCut: value ? reviewWallCuts([value])[0] : undefined,
    packs: whole.tiles.packs,
    purchasedTiles: whole.tiles.purchasedTiles,
    cost: whole.cost,
  };
}
