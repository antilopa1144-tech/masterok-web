import type { WallpaperLayoutInput } from "./wallpaper-layout";

export const WALLPAPER_CALCULATOR_PATH = "/kalkulyatory/otdelka/oboi/";
export const WALLPAPER_LAYOUT_PATH = "/instrumenty/raskladka-oboev/";
export const WALLPAPER_LAYOUT_TRANSFER_FROM = "raskladka-oboev";

export interface WallpaperCalculatorTransferValues {
  perimeter: number;
  height: number;
  rollLength: number;
  rollWidth: number;
  rapport: number;
  reserveRolls: number;
}

function round(value: number, digits = 3): number {
  const factor = 10 ** digits;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

export function buildWallpaperCalculatorTransferValues(
  input: WallpaperLayoutInput,
): WallpaperCalculatorTransferValues {
  return {
    perimeter: round(input.walls.reduce((sum, wall) => sum + wall.lengthM, 0)),
    height: round(input.wallHeightM),
    rollLength: round(input.rollLengthM),
    rollWidth: Math.round(input.rollWidthM * 1000),
    rapport: round(input.matchType === "free" ? 0 : input.rapportCm, 1),
    reserveRolls: Math.round(input.reserveRolls),
  };
}

export function buildWallpaperCalculatorHref(
  input: WallpaperLayoutInput,
  rollsHint?: number,
): string {
  const values = buildWallpaperCalculatorTransferValues(input);
  const params = new URLSearchParams();
  params.set("from", WALLPAPER_LAYOUT_TRANSFER_FROM);
  params.set("perimeter", String(values.perimeter));
  params.set("height", String(values.height));
  params.set("rollLength", String(values.rollLength));
  params.set("rollWidth", String(values.rollWidth));
  params.set("rapport", String(values.rapport));
  params.set("reserveRolls", String(values.reserveRolls));
  if (rollsHint != null && rollsHint > 0) params.set("rollsHint", String(Math.round(rollsHint)));
  return `${WALLPAPER_CALCULATOR_PATH}?${params.toString()}`;
}

export function buildWallpaperLayoutHref(values: Partial<WallpaperCalculatorTransferValues>): string {
  const params = new URLSearchParams();
  if (values.perimeter != null && values.perimeter > 0) params.set("perimeter", String(values.perimeter));
  if (values.height != null && values.height > 0) params.set("height", String(values.height));
  if (values.rollLength != null && values.rollLength > 0) params.set("rollLength", String(values.rollLength));
  if (values.rollWidth != null && values.rollWidth > 0) params.set("rollWidth", String(values.rollWidth));
  if (values.rapport != null && values.rapport >= 0) params.set("rapport", String(values.rapport));
  if (values.reserveRolls != null && values.reserveRolls >= 0) params.set("reserveRolls", String(values.reserveRolls));
  const query = params.toString();
  return query ? `${WALLPAPER_LAYOUT_PATH}?${query}` : WALLPAPER_LAYOUT_PATH;
}

export function parseWallpaperLayoutSearchParams(params: URLSearchParams): {
  perimeter?: number;
  height?: number;
  rollLength?: number;
  rollWidthM?: number;
  rapport?: number;
  reserveRolls?: number;
} {
  const readPositive = (key: string): number | undefined => {
    const value = Number(params.get(key));
    return Number.isFinite(value) && value > 0 ? value : undefined;
  };
  const readNonNegative = (key: string): number | undefined => {
    if (!params.has(key)) return undefined;
    const value = Number(params.get(key));
    return Number.isFinite(value) && value >= 0 ? value : undefined;
  };
  const rollWidth = readPositive("rollWidth");

  return {
    perimeter: readPositive("perimeter"),
    height: readPositive("height"),
    rollLength: readPositive("rollLength"),
    rollWidthM: rollWidth == null ? undefined : rollWidth > 10 ? rollWidth / 1000 : rollWidth,
    rapport: readNonNegative("rapport"),
    reserveRolls: readNonNegative("reserveRolls"),
  };
}
