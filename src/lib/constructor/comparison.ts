import { tileSupplyArea, type ConstructorProject, type ProjectCalculation } from "./core";

export interface FinishComparison {
  roomCount: number;
  floorAreaM2: number;
  tileWallCount: number;
  tileWallAreaM2: number;
  tileFloorCount: number;
  tileFloorAreaM2: number;
  laminate: { sourceBoards: number; packs: number; purchasedBoards: number; surplusBoards: number; wasteAreaM2: number };
  tiles: { sourceTiles: number; cutTiles: number; packs: number; purchasedTiles: number; surplusTiles: number; wasteAreaM2: number };
  cost: { knownRub: number; missingLines: number; estimated: boolean; complete: boolean; hasPrices: boolean; unconfiguredMixtures: number };
  scope: string;
}

/** Only geometry and the included work, not material choices or room names. */
function workScope(project: ConstructorProject): string {
  return JSON.stringify(project.rooms.map((room) => ({
    id: room.id,
    size: [room.widthMm, room.lengthMm, room.heightMm],
    openings: room.openings.map((opening) => [opening.type, opening.wall, opening.offsetMm, opening.widthMm, opening.heightMm, opening.sillMm]).sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b))),
    walls: room.wallTiles.map((spec) => !!spec),
    underlay: room.floor.kind !== "tile" && room.floor.includeUnderlay,
    plinth: room.floor.kind !== "tile" && room.floor.includePlinth,
    mixtures: [!!room.tileSupplies?.adhesive, !!room.tileSupplies?.grout],
  })).sort((a, b) => a.id.localeCompare(b.id)));
}

/** Read the engine's final purchase lines; never round or package per room again. */
export function summarizeFinish(project: ConstructorProject, calculation: ProjectCalculation): FinishComparison {
  const summary: FinishComparison = {
    roomCount: project.rooms.length,
    floorAreaM2: 0, tileWallCount: 0, tileWallAreaM2: 0, tileFloorCount: 0, tileFloorAreaM2: 0,
    laminate: { sourceBoards: 0, packs: 0, purchasedBoards: 0, surplusBoards: 0, wasteAreaM2: 0 },
    tiles: { sourceTiles: 0, cutTiles: 0, packs: 0, purchasedTiles: 0, surplusTiles: 0, wasteAreaM2: 0 },
    cost: { knownRub: calculation.totalCostRub, missingLines: 0, estimated: false, complete: false, hasPrices: false, unconfiguredMixtures: 0 },
    scope: workScope(project),
  };
  for (const room of calculation.rooms) {
    summary.floorAreaM2 += room.areaM2;
    summary.laminate.sourceBoards += room.baseBoards;
    summary.laminate.wasteAreaM2 += room.offcutAreaM2 + room.kerfAreaM2;
    if (room.floorTiles) {
      summary.tileFloorCount++; summary.tileFloorAreaM2 += room.floorTiles.netAreaM2;
      summary.tiles.sourceTiles += room.floorTiles.baseTiles; summary.tiles.cutTiles += room.floorTiles.cutTiles;
      summary.tiles.wasteAreaM2 += room.floorTiles.unlaidAreaM2;
    }
    for (const wall of room.walls) {
      summary.tileWallCount++;
      summary.tileWallAreaM2 += wall.netAreaM2;
      summary.tiles.sourceTiles += wall.baseTiles;
      summary.tiles.cutTiles += wall.cutTiles;
      summary.tiles.wasteAreaM2 += wall.unlaidAreaM2;
    }
  }
  for (const line of calculation.purchases) {
    if (line.unitPriceRub > 0) summary.cost.hasPrices = true;
    else summary.cost.missingLines++;
    if (line.priceNote && line.unitPriceRub > 0) summary.cost.estimated = true;
    if (line.kind === "laminate") {
      summary.laminate.packs += line.quantity;
      summary.laminate.purchasedBoards += line.purchasedBoards ?? 0;
      summary.laminate.surplusBoards += line.packSurplusBoards ?? 0;
    }
    if (line.kind === "wall-tile" || line.kind === "floor-tile") {
      summary.tiles.packs += line.quantity;
      summary.tiles.purchasedTiles += line.purchasedTiles ?? 0;
      summary.tiles.surplusTiles += line.packSurplusTiles ?? 0;
    }
  }
  summary.cost.unconfiguredMixtures = project.rooms.reduce((count, room, index) => count + (tileSupplyArea(calculation.rooms[index]) > 0
    ? [room.tileSupplies?.adhesive, room.tileSupplies?.grout].filter((spec) => spec?.consumptionKgM2 === 0).length : 0), 0);
  summary.cost.complete = calculation.purchases.length > 0 && summary.cost.missingLines === 0 && !summary.cost.estimated && !summary.cost.unconfiguredMixtures;
  return summary;
}

/** A price difference is meaningful only for the same work with fully entered prices. */
export function compareFinish(current: FinishComparison, saved: FinishComparison): { sameScope: boolean; costDifferenceRub: number | null } {
  const sameScope = current.scope === saved.scope;
  return { sameScope, costDifferenceRub: sameScope && current.cost.complete && saved.cost.complete
    ? (Math.round(saved.cost.knownRub * 100) - Math.round(current.cost.knownRub * 100)) / 100
    : null };
}
