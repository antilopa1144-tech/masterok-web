import type { ConstructorRoom, FloorTileCalculation, FloorTileSpec } from "./model";
import { calculateWallTiles, createWallTileSpec, estimateWallTileCells, validateWallTileSpec } from "./tiling";

export function createFloorTileSpec(): FloorTileSpec {
  return { ...createWallTileSpec(), materialKey: "Напольная плитка", decor: "graphite", tileHeightMm: 600, tilesPerPack: 4, edgeGapMm: 5 };
}

export function validateFloorTileSpec(spec: FloorTileSpec): string[] {
  const errors = validateWallTileSpec(spec, "Плиточный пол");
  if (!spec || !Number.isFinite(spec.edgeGapMm) || spec.edgeGapMm < 0 || spec.edgeGapMm > 100) errors.push("Плиточный пол: зазор у стен должен быть от 0 до 100 мм.");
  return errors;
}

/** Та же прямая сетка, что на стенах; оси X/Y соответствуют ширине/длине пола. */
function floorSurface(room: ConstructorRoom): ConstructorRoom {
  const spec = room.floor.tile!;
  return { ...room, widthMm: room.widthMm - 2 * spec.edgeGapMm, heightMm: room.lengthMm - 2 * spec.edgeGapMm,
    openings: [], continuousWallTiles: false, wallTiles: [spec, null, null, null] };
}

export function estimateFloorTileCells(room: ConstructorRoom): number {
  if (!room.floor.tile || validateFloorTileSpec(room.floor.tile).length) return 0;
  return estimateWallTileCells(floorSurface(room), 0);
}

export function calculateFloorTiles(room: ConstructorRoom): FloorTileCalculation {
  const spec = room.floor.tile!;
  const errors = validateFloorTileSpec(spec);
  if (errors.length) throw new Error(errors.join(" "));
  const calculation = calculateWallTiles(floorSurface(room), 0)!;
  const { wall: _wall, ...floor } = calculation;
  const offset = spec.edgeGapMm;
  return { ...floor, cells: floor.cells.map((cell) => ({ ...cell, id: cell.id.replace("-wall-0-", "-floor-"),
    xMm: cell.xMm + offset, yMm: cell.yMm + offset,
    fragments: cell.fragments.map((part) => ({ ...part, xMm: part.xMm + offset, yMm: part.yMm + offset })) })),
    warnings: ["Прямая раскладка: одна исходная плитка на занятую ячейку; обрезки не используются повторно. Минимальный расход не гарантируется.",
      "Площадь самой плитки показана без швов; неуложенная часть включает остатки и потери при резке. Мебель и техника из площади пола не вычитаются.",
      "Шов и зазор у стен заданы в проекте. Проверьте требования выбранного товара; пороги, уклоны и трапы в этой схеме не рассчитаны."] };
}
