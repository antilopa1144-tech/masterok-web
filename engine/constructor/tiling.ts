import type { ConstructorRoom, Opening, TileRect, Wall, WallTileCalculation, WallTileCell, WallTileSpec } from "./model";

const EPSILON = 1e-6;
export const MAX_CELLS_PER_WALL = 4_000;
export const MAX_VISIBLE_FRAGMENTS_PER_WALL = 8_000;
const MAX_PRICE_RUB = 10_000_000;
const MAX_TEXT_LENGTH = 150;

const finite = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value);
const positive = (value: unknown): value is number => finite(value) && value > 0;
const m2 = (areaMm2: number) => areaMm2 / 1_000_000;
const area = (rect: TileRect) => rect.widthMm * rect.heightMm;

export function createWallTileSpec(): WallTileSpec {
  return {
    materialKey: "Плитка", decor: "limestone", tileWidthMm: 600, tileHeightMm: 300,
    orientation: "horizontal", jointMm: 2, alignment: "center", reservePercent: 10,
    tilesPerPack: 8, packPriceRub: 0,
  };
}

/** Runtime-safe validation for imported drafts before a grid is allocated. */
export function validateWallTileSpec(spec: WallTileSpec, label: string): string[] {
  const value = spec as unknown as Record<string, unknown> | null;
  const prefix = label || "Плитка";
  const errors: string[] = [];
  if (!value || typeof value !== "object") return [`${prefix}: параметры плитки отсутствуют.`];
  const materialKey = value.materialKey;
  if (typeof materialKey !== "string" || materialKey.trim().length === 0 || materialKey.length > MAX_TEXT_LENGTH) errors.push(`${prefix}: введите название или артикул до ${MAX_TEXT_LENGTH} символов.`);
  if (!(["limestone", "marble", "graphite", "microcement"] as string[]).includes(value.decor as string)) errors.push(`${prefix}: неизвестный декор.`);
  for (const [field, input] of [["tileWidthMm", value.tileWidthMm], ["tileHeightMm", value.tileHeightMm]] as const) {
    if (!finite(input) || input < 50 || input > 1600) errors.push(`${prefix}: ${field === "tileWidthMm" ? "ширина" : "высота"} плитки должна быть от 50 до 1600 мм.`);
  }
  if (value.orientation !== "horizontal" && value.orientation !== "vertical") errors.push(`${prefix}: неизвестная ориентация.`);
  if (value.alignment !== "edge" && value.alignment !== "center") errors.push(`${prefix}: неизвестное выравнивание.`);
  if (!finite(value.jointMm) || value.jointMm < 0 || value.jointMm > 20) errors.push(`${prefix}: шов должен быть от 0 до 20 мм.`);
  if (!finite(value.reservePercent) || value.reservePercent < 0 || value.reservePercent > 100) errors.push(`${prefix}: запас должен быть от 0 до 100%.`);
  if (!finite(value.tilesPerPack) || !Number.isInteger(value.tilesPerPack) || value.tilesPerPack < 1 || value.tilesPerPack > 1000) errors.push(`${prefix}: количество плиток в упаковке должно быть целым числом от 1 до 1000.`);
  if (!finite(value.packPriceRub) || value.packPriceRub < 0 || value.packPriceRub > MAX_PRICE_RUB) errors.push(`${prefix}: цена упаковки должна быть от 0 до ${MAX_PRICE_RUB} ₽.`);
  return errors;
}

function wallSize(room: ConstructorRoom, wall: Wall): { widthMm: number; heightMm: number } {
  const widthMm = wall === 0 || wall === 2 ? room?.widthMm : room?.lengthMm;
  return { widthMm: positive(widthMm) ? widthMm : 0, heightMm: positive(room?.heightMm) ? room.heightMm : 0 };
}

function specFor(room: ConstructorRoom, wall: Wall): WallTileSpec | null {
  const tiles = room?.wallTiles;
  return Array.isArray(tiles) && tiles.length === 4 ? tiles[wall] ?? null : null;
}

function tileSize(spec: WallTileSpec): { widthMm: number; heightMm: number } {
  return spec.orientation === "horizontal"
    ? { widthMm: spec.tileWidthMm, heightMm: spec.tileHeightMm }
    : { widthMm: spec.tileHeightMm, heightMm: spec.tileWidthMm };
}

function prefixLength(room: ConstructorRoom, wall: Wall): number {
  const lengths = [room.widthMm, room.lengthMm, room.widthMm, room.lengthMm];
  return lengths.slice(0, wall).reduce((sum, length) => sum + (positive(length) ? length : 0), 0);
}

/** Conservative allocation count; it includes cells clipped at both wall edges. */
export function estimateWallTileCells(room: ConstructorRoom, wall: Wall): number {
  if (![0, 1, 2, 3].includes(wall)) return 0;
  const spec = specFor(room, wall);
  if (!spec || validateWallTileSpec(spec, "Плитка").length) return 0;
  const { widthMm, heightMm } = wallSize(room, wall);
  if (!widthMm || !heightMm) return 0;
  const tile = tileSize(spec); const pitchX = tile.widthMm + spec.jointMm; const pitchY = tile.heightMm + spec.jointMm;
  if (!positive(pitchX) || !positive(pitchY)) return 0;
  return (Math.ceil(widthMm / pitchX) + 2) * (Math.ceil(heightMm / pitchY) + 2);
}

function intersect(a: TileRect, b: TileRect): TileRect | null {
  const x = Math.max(a.xMm, b.xMm); const y = Math.max(a.yMm, b.yMm);
  const right = Math.min(a.xMm + a.widthMm, b.xMm + b.widthMm); const top = Math.min(a.yMm + a.heightMm, b.yMm + b.heightMm);
  return right - x > EPSILON && top - y > EPSILON ? { xMm: x, yMm: y, widthMm: right - x, heightMm: top - y } : null;
}

/** Splits a rectangle into non-overlapping remnants after removing a clipped opening. */
function subtract(rect: TileRect, opening: TileRect): TileRect[] {
  const cut = intersect(rect, opening);
  if (!cut) return [rect];
  const result: TileRect[] = [];
  const push = (xMm: number, yMm: number, widthMm: number, heightMm: number) => { if (widthMm > EPSILON && heightMm > EPSILON) result.push({ xMm, yMm, widthMm, heightMm }); };
  push(rect.xMm, rect.yMm, rect.widthMm, cut.yMm - rect.yMm);
  push(rect.xMm, cut.yMm + cut.heightMm, rect.widthMm, rect.yMm + rect.heightMm - (cut.yMm + cut.heightMm));
  push(rect.xMm, cut.yMm, cut.xMm - rect.xMm, cut.heightMm);
  push(cut.xMm + cut.widthMm, cut.yMm, rect.xMm + rect.widthMm - (cut.xMm + cut.widthMm), cut.heightMm);
  return result;
}

function openingsFor(room: ConstructorRoom, wall: Wall, size: { widthMm: number; heightMm: number }): TileRect[] {
  if (!Array.isArray(room?.openings)) return [];
  const boundary: TileRect = { xMm: 0, yMm: 0, widthMm: size.widthMm, heightMm: size.heightMm };
  return room.openings.flatMap((opening: Opening) => {
    if (opening?.wall !== wall || !finite(opening.offsetMm) || !finite(opening.sillMm) || !positive(opening.widthMm) || !positive(opening.heightMm)) return [];
    const clipped = intersect({ xMm: opening.offsetMm, yMm: opening.sillMm, widthMm: opening.widthMm, heightMm: opening.heightMm }, boundary);
    return clipped ? [clipped] : [];
  });
}

function emptyCalculation(room: ConstructorRoom, wall: Wall, warnings: string[]): WallTileCalculation {
  const size = wallSize(room, wall);
  return { roomId: room?.id ?? "", wall, widthMm: size.widthMm, heightMm: size.heightMm, netAreaM2: 0, coveredAreaM2: 0, cells: [], baseTiles: 0, cutTiles: 0, reserveTiles: 0, unlaidAreaM2: 0, warnings };
}

export function calculateWallTiles(room: ConstructorRoom, wall: Wall): WallTileCalculation | null {
  if (![0, 1, 2, 3].includes(wall)) return emptyCalculation(room, wall, ["Неизвестная стена."]);
  const spec = specFor(room, wall);
  if (!spec) return null;
  const errors = validateWallTileSpec(spec, `Стена ${wall + 1}`);
  if (errors.length) return emptyCalculation(room, wall, errors);
  const size = wallSize(room, wall);
  if (!size.widthMm || !size.heightMm) return emptyCalculation(room, wall, ["Размеры стены должны быть положительными числами."]);
  const estimate = estimateWallTileCells(room, wall);
  if (estimate > MAX_CELLS_PER_WALL) return emptyCalculation(room, wall, [`Сетка стены превысит лимит ${MAX_CELLS_PER_WALL} исходных ячеек.`]);

  const tile = tileSize(spec); const pitchX = tile.widthMm + spec.jointMm; const pitchY = tile.heightMm + spec.jointMm;
  const countY = Math.ceil((size.heightMm + spec.jointMm - EPSILON) / pitchY);
  // В непрерывном режиме горизонтальная центрированная сетка принадлежит стене 0.
  // Остальные стены получают лишь фазовый сдвиг по длине контура, без нового центра.
  const phaseWidth = room.continuousWallTiles ? wallSize(room, 0).widthMm : size.widthMm;
  const phaseCountX = Math.ceil((phaseWidth + spec.jointMm - EPSILON) / pitchX);
  const centeredX = (phaseWidth - (phaseCountX * tile.widthMm + Math.max(0, phaseCountX - 1) * spec.jointMm)) / 2;
  const centeredY = (size.heightMm - (countY * tile.heightMm + Math.max(0, countY - 1) * spec.jointMm)) / 2;
  const baseOriginX = spec.alignment === "center" ? centeredX : 0;
  const originX = room.continuousWallTiles ? baseOriginX - (prefixLength(room, wall) % pitchX) : baseOriginX;
  const originY = spec.alignment === "center" ? centeredY : 0;
  const startColumn = Math.floor((0 - originX) / pitchX);
  const endColumn = Math.ceil((size.widthMm - originX) / pitchX) - 1;
  const startRow = Math.floor((0 - originY) / pitchY);
  const endRow = Math.ceil((size.heightMm - originY) / pitchY) - 1;
  if (![startColumn, endColumn, startRow, endRow].every(Number.isFinite)) return emptyCalculation(room, wall, ["Не удалось построить конечную сетку стены."]);
  const potential = Math.max(0, endColumn - startColumn + 1) * Math.max(0, endRow - startRow + 1);
  if (potential > MAX_CELLS_PER_WALL) return emptyCalculation(room, wall, [`Сетка стены превысит лимит ${MAX_CELLS_PER_WALL} исходных ячеек.`]);

  const boundary: TileRect = { xMm: 0, yMm: 0, widthMm: size.widthMm, heightMm: size.heightMm };
  const openings = openingsFor(room, wall, size);
  const cells: WallTileCell[] = [];
  let visibleFragments = 0;
  for (let row = startRow; row <= endRow; row++) for (let column = startColumn; column <= endColumn; column++) {
    const source: TileRect = { xMm: originX + column * pitchX, yMm: originY + row * pitchY, widthMm: tile.widthMm, heightMm: tile.heightMm };
    const clipped = intersect(source, boundary);
    if (!clipped) continue;
    let fragments: TileRect[] = [clipped];
    for (const opening of openings) {
      fragments = fragments.flatMap((fragment) => subtract(fragment, opening));
      if (fragments.length > MAX_VISIBLE_FRAGMENTS_PER_WALL || visibleFragments + fragments.length > MAX_VISIBLE_FRAGMENTS_PER_WALL) {
        throw new Error(`Раскладка стены превысила лимит ${MAX_VISIBLE_FRAGMENTS_PER_WALL} видимых фрагментов.`);
      }
    }
    if (!fragments.length) continue;
    visibleFragments += fragments.length;
    if (visibleFragments > MAX_VISIBLE_FRAGMENTS_PER_WALL) throw new Error(`Раскладка стены превысила лимит ${MAX_VISIBLE_FRAGMENTS_PER_WALL} видимых фрагментов.`);
    const clippedAtWall = Math.abs(clipped.xMm - source.xMm) > EPSILON || Math.abs(clipped.yMm - source.yMm) > EPSILON || Math.abs(clipped.widthMm - source.widthMm) > EPSILON || Math.abs(clipped.heightMm - source.heightMm) > EPSILON;
    const cutAtOpening = fragments.length !== 1 || Math.abs(area(fragments[0]) - area(clipped)) > EPSILON;
    // Cell остаётся исходной плиткой сетки; fragments содержат только то, что
    // действительно видно на стене после обрезки её границей и проёмами.
    cells.push({ id: `${room.id}-wall-${wall}-r${row}-c${column}`, row, column, ...source, fragments, isCut: clippedAtWall || cutAtOpening });
  }
  const coveredAreaMm2 = cells.reduce((sum, cell) => sum + cell.fragments.reduce((cellSum, fragment) => cellSum + area(fragment), 0), 0);
  const openingAreaMm2 = openings.reduce((sum, opening) => sum + area(opening), 0);
  const tileAreaMm2 = tile.widthMm * tile.heightMm;
  const baseTiles = cells.length;
  return {
    roomId: room.id, wall, widthMm: size.widthMm, heightMm: size.heightMm,
    netAreaM2: m2(Math.max(0, size.widthMm * size.heightMm - openingAreaMm2)), coveredAreaM2: m2(coveredAreaMm2), cells,
    baseTiles, cutTiles: cells.filter((cell) => cell.isCut).length, reserveTiles: baseTiles * spec.reservePercent / 100,
    unlaidAreaM2: m2(Math.max(0, baseTiles * tileAreaMm2 - coveredAreaMm2)),
    warnings: [
      "Раскладка не использует обрезки повторно и не является расчётом минимального расхода.",
      "Неуложенная площадь включает остатки и потери при резке; площадь плитки показана без межплиточных швов. Откосы и ниши проёмов не посчитаны.",
      "Шов взят из параметров проекта и не является обязательной нормой для выбранной плитки.",
    ],
  };
}
