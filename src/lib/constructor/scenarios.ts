import { createFloorTileSpec, createWallTileSpec } from "./core";
import { createInteriorRoom } from "./interiors";
import { createWorkspace, type ConstructorWorkspace } from "./workspace";
import type { ConstructorScenario } from "./entry";

/** Examples reuse the editor's presets and always get a new project identity. */
export function createScenarioWorkspace(scenario: ConstructorScenario): ConstructorWorkspace {
  const workspace = createWorkspace();
  const type = scenario === "bathroom" ? "bathroom" : scenario === "laminate" || scenario === "tile" ? "empty" : "living";
  const room = createInteriorRoom(type, []);
  if (scenario === "bathroom") {
    room.wallTiles = [createWallTileSpec(), createWallTileSpec(), createWallTileSpec(), createWallTileSpec()];
    room.continuousWallTiles = true;
  }
  if (scenario === "tile") room.floor = { ...room.floor, kind: "tile", tile: createFloorTileSpec() };
  workspace.project.name = scenario === "bathroom" ? "Моя ванная" : scenario === "laminate" ? "Раскладка ламината" : scenario === "tile" ? "Плитка на полу" : "Моя комната";
  workspace.project.rooms = [room];
  return workspace;
}
