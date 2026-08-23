import tileCanonicalSpec from "../../../configs/calculators/tile-canonical.v1.json";
import { clampLayoutInput } from "./tile-layout";

export const MIN_TILE_PACK_AREA_M2 = 0.1;
export const MAX_TILE_PACK_AREA_M2 = 20;
export const DEFAULT_TILE_PACK_AREA_M2 = tileCanonicalSpec.packaging_rules.tile_package_area_m2;
export const MIN_TILE_TILES_PER_BOX = 1;
export const MAX_TILE_TILES_PER_BOX = 500;
export const DEFAULT_TILE_TILES_PER_BOX = Math.round(DEFAULT_TILE_PACK_AREA_M2 / (0.6 * 0.3));

export type TilePackagingSource = "label" | "estimated";

export interface TilePackagingInput {
  /** Целое количество плиток в коробке — основной упаковочный параметр. */
  tilesPerBox: number;
  /** Необязательная площадь с этикетки; используется для пояснения и сверки. */
  packAreaM2?: number;
  /** label — подтверждено пользователем, estimated — выведено из площади. */
  source: TilePackagingSource;
}

export interface TilePackagingResult {
  /** Потребность с практическим запасом, но до округления упаковки. */
  requiredTiles: number;
  /** Площадь с этикетки, если пользователь её указал. */
  requestedPackAreaM2: number | null;
  /** Целое количество плиток в одной коробке. */
  tilesPerBox: number;
  packagingSource: TilePackagingSource;
  /** Фактическая площадь коробки по целому количеству плиток. */
  boxAreaM2: number;
  boxesToBuy: number;
  /** Фактическое количество плиток после покупки полных коробок. */
  purchasedTiles: number;
  /** Остаток относительно потребности с запасом. */
  leftoverTiles: number;
  purchasedAreaM2: number;
}

function round6(value: number): number {
  return Math.round(value * 1_000_000) / 1_000_000;
}

export function isValidTilePackArea(value: number): boolean {
  return Number.isFinite(value)
    && value >= MIN_TILE_PACK_AREA_M2
    && value <= MAX_TILE_PACK_AREA_M2;
}

export function isValidTilesPerBox(value: number): boolean {
  return Number.isInteger(value)
    && value >= MIN_TILE_TILES_PER_BOX
    && value <= MAX_TILE_TILES_PER_BOX;
}

/**
 * Даёт только оценку фасовки по площади коробки. Результат нельзя выдавать за
 * данные конкретной коллекции без подтверждения по этикетке.
 */
export function estimateTilesPerBoxFromArea(
  tileW: number,
  tileH: number,
  packAreaM2: number,
): number {
  if (!isValidTilePackArea(packAreaM2)) return DEFAULT_TILE_TILES_PER_BOX;
  const normalizedTileW = clampLayoutInput(tileW, "tile");
  const normalizedTileH = clampLayoutInput(tileH, "tile");
  const tileAreaM2 = (normalizedTileW * normalizedTileH) / 1_000_000;
  return Math.max(
    MIN_TILE_TILES_PER_BOX,
    Math.min(MAX_TILE_TILES_PER_BOX, Math.round(packAreaM2 / tileAreaM2)),
  );
}

/**
 * Применяет только упаковочный этап к уже рассчитанной потребности с запасом.
 * Запас здесь повторно не добавляется.
 */
export function calculateTilePackaging(
  requiredTiles: number,
  tileW: number,
  tileH: number,
  input: TilePackagingInput,
): TilePackagingResult {
  if (!isValidTilesPerBox(input.tilesPerBox)) {
    throw new RangeError(`Количество плиток в коробке должно быть целым числом от ${MIN_TILE_TILES_PER_BOX} до ${MAX_TILE_TILES_PER_BOX}`);
  }
  if (input.packAreaM2 != null && !isValidTilePackArea(input.packAreaM2)) {
    throw new RangeError(`Площадь коробки должна быть от ${MIN_TILE_PACK_AREA_M2} до ${MAX_TILE_PACK_AREA_M2} м²`);
  }
  const normalizedRequiredTiles = Number.isFinite(requiredTiles)
    ? Math.max(0, Math.ceil(requiredTiles))
    : 0;
  const normalizedTileW = clampLayoutInput(tileW, "tile");
  const normalizedTileH = clampLayoutInput(tileH, "tile");
  const tileAreaM2 = (normalizedTileW * normalizedTileH) / 1_000_000;
  const tilesPerBox = input.tilesPerBox;
  const boxAreaM2 = round6(tilesPerBox * tileAreaM2);
  const boxesToBuy = normalizedRequiredTiles > 0
    ? Math.ceil(normalizedRequiredTiles / tilesPerBox)
    : 0;
  const purchasedTiles = boxesToBuy * tilesPerBox;

  return {
    requiredTiles: normalizedRequiredTiles,
    requestedPackAreaM2: input.packAreaM2 == null ? null : round6(input.packAreaM2),
    tilesPerBox,
    packagingSource: input.source,
    boxAreaM2,
    boxesToBuy,
    purchasedTiles,
    leftoverTiles: purchasedTiles - normalizedRequiredTiles,
    purchasedAreaM2: round6(purchasedTiles * tileAreaM2),
  };
}
