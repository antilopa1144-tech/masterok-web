import type { WallpaperLayoutInput } from "./wallpaper-layout";

export const WALLPAPER_CALCULATOR_PATH = "/kalkulyatory/otdelka/oboi/";
export const WALLPAPER_LAYOUT_PATH = "/instrumenty/raskladka-oboev/";
export const WALLPAPER_LAYOUT_TRANSFER_FROM = "raskladka-oboev";

export type WallpaperVisualFinish = "botanical-sage" | "art-deco-greige" | "linen-blue" | "terracotta-arches";

export interface WallpaperLayoutVisualValues {
  presentationMode: "room" | "walls";
  finish: WallpaperVisualFinish;
  compareMode: boolean;
  comparisonFinish: WallpaperVisualFinish;
  textureScale: number;
  activeWallIndex: number;
  showWindow: boolean;
  showDoor: boolean;
  windowWidthM: number;
  windowHeightM: number;
  windowPositionPercent: number;
  doorWidthM: number;
  doorHeightM: number;
  doorPositionPercent: number;
}

export interface WallpaperCalculatorTransferValues {
  perimeter: number;
  height: number;
  rollLength: number;
  rollWidth: number;
  rapport: number;
  reserveRolls: number;
}

export interface WallpaperLayoutShareValues {
  geometryMode: "rectangle" | "walls";
  roomWidth?: number;
  roomLength?: number;
  input: WallpaperLayoutInput;
  visual?: WallpaperLayoutVisualValues;
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

/** Полная ссылка на текущую раскладку, включая отдельные стены и тип совмещения. */
export function buildWallpaperLayoutShareHref(values: WallpaperLayoutShareValues): string {
  const { input } = values;
  const params = new URLSearchParams();
  params.set("mode", values.geometryMode);
  if (values.geometryMode === "rectangle") {
    if (values.roomWidth != null) params.set("roomWidth", String(round(values.roomWidth)));
    if (values.roomLength != null) params.set("roomLength", String(round(values.roomLength)));
  } else {
    params.set("walls", input.walls.map((wall) => `${wall.name}:${round(wall.lengthM)}`).join("|"));
  }
  params.set("height", String(round(input.wallHeightM)));
  params.set("rollWidth", String(round(input.rollWidthM)));
  params.set("rollLength", String(round(input.rollLengthM)));
  params.set("match", input.matchType);
  params.set("rapport", String(round(input.rapportCm, 1)));
  params.set("offset", String(round(input.offsetCm, 1)));
  params.set("trim", String(round(input.trimAllowanceCm, 1)));
  params.set("reserveRolls", String(Math.round(input.reserveRolls)));
  if (values.visual != null) {
    const visual = values.visual;
    params.set("view", visual.presentationMode);
    params.set("finish", visual.finish);
    params.set("compare", visual.compareMode ? "1" : "0");
    params.set("finishB", visual.comparisonFinish);
    params.set("textureScale", String(Math.round(visual.textureScale)));
    params.set("activeWall", String(Math.max(0, Math.round(visual.activeWallIndex))));
    params.set("window", visual.showWindow ? "1" : "0");
    params.set("windowW", String(round(visual.windowWidthM, 2)));
    params.set("windowH", String(round(visual.windowHeightM, 2)));
    params.set("windowPos", String(Math.round(visual.windowPositionPercent)));
    params.set("door", visual.showDoor ? "1" : "0");
    params.set("doorW", String(round(visual.doorWidthM, 2)));
    params.set("doorH", String(round(visual.doorHeightM, 2)));
    params.set("doorPos", String(Math.round(visual.doorPositionPercent)));
  }
  return `${WALLPAPER_LAYOUT_PATH}?${params.toString()}`;
}

export function parseWallpaperLayoutSearchParams(params: URLSearchParams): {
  geometryMode?: "rectangle" | "walls";
  roomWidth?: number;
  roomLength?: number;
  walls?: WallpaperLayoutInput["walls"];
  perimeter?: number;
  height?: number;
  rollLength?: number;
  rollWidthM?: number;
  rapport?: number;
  reserveRolls?: number;
  matchType?: WallpaperLayoutInput["matchType"];
  offset?: number;
  trimAllowance?: number;
  visual?: Partial<WallpaperLayoutVisualValues>;
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
  const readRange = (key: string, min: number, max: number): number | undefined => {
    if (!params.has(key)) return undefined;
    const value = Number(params.get(key));
    return Number.isFinite(value) && value >= min && value <= max ? value : undefined;
  };
  const readBoolean = (key: string): boolean | undefined => {
    if (!params.has(key)) return undefined;
    const value = params.get(key);
    return value === "1" ? true : value === "0" ? false : undefined;
  };
  const rollWidth = readPositive("rollWidth");
  const mode = params.get("mode");
  const walls = params.get("walls")?.split("|").flatMap((entry, index) => {
    const separator = entry.lastIndexOf(":");
    if (separator < 1) return [];
    const name = entry.slice(0, separator).trim();
    const lengthM = Number(entry.slice(separator + 1));
    if (!name || !Number.isFinite(lengthM) || lengthM <= 0) return [];
    return [{ id: `wall-${index + 1}`, name, lengthM }];
  });
  const match = params.get("match");
  const view = params.get("view");
  const finish = params.get("finish");
  const comparisonFinish = params.get("finishB");
  const visualFinishes: WallpaperVisualFinish[] = ["botanical-sage", "art-deco-greige", "linen-blue", "terracotta-arches"];
  const compareMode = readBoolean("compare");
  const textureScale = readRange("textureScale", 60, 180);
  const activeWallIndex = readRange("activeWall", 0, 19);
  const showWindow = readBoolean("window");
  const windowWidthM = readRange("windowW", 0.4, 3);
  const windowHeightM = readRange("windowH", 0.4, 2.4);
  const windowPositionPercent = readRange("windowPos", 15, 70);
  const showDoor = readBoolean("door");
  const doorWidthM = readRange("doorW", 0.6, 2);
  const doorHeightM = readRange("doorH", 1.6, 2.6);
  const doorPositionPercent = readRange("doorPos", 35, 90);
  const visual: Partial<WallpaperLayoutVisualValues> = {
    ...(view === "room" || view === "walls" ? { presentationMode: view } : {}),
    ...(visualFinishes.includes(finish as WallpaperVisualFinish) ? { finish: finish as WallpaperVisualFinish } : {}),
    ...(compareMode != null ? { compareMode } : {}),
    ...(visualFinishes.includes(comparisonFinish as WallpaperVisualFinish) ? { comparisonFinish: comparisonFinish as WallpaperVisualFinish } : {}),
    ...(textureScale != null ? { textureScale } : {}),
    ...(activeWallIndex != null ? { activeWallIndex: Math.round(activeWallIndex) } : {}),
    ...(showWindow != null ? { showWindow } : {}),
    ...(windowWidthM != null ? { windowWidthM } : {}),
    ...(windowHeightM != null ? { windowHeightM } : {}),
    ...(windowPositionPercent != null ? { windowPositionPercent } : {}),
    ...(showDoor != null ? { showDoor } : {}),
    ...(doorWidthM != null ? { doorWidthM } : {}),
    ...(doorHeightM != null ? { doorHeightM } : {}),
    ...(doorPositionPercent != null ? { doorPositionPercent } : {}),
  };

  return {
    geometryMode: mode === "rectangle" || mode === "walls" ? mode : undefined,
    roomWidth: readPositive("roomWidth"),
    roomLength: readPositive("roomLength"),
    walls: walls && walls.length > 0 ? walls : undefined,
    perimeter: readPositive("perimeter"),
    height: readPositive("height"),
    rollLength: readPositive("rollLength"),
    rollWidthM: rollWidth == null ? undefined : rollWidth > 10 ? rollWidth / 1000 : rollWidth,
    rapport: readNonNegative("rapport"),
    reserveRolls: readNonNegative("reserveRolls"),
    matchType: match === "free" || match === "straight" || match === "offset" ? match : undefined,
    offset: readNonNegative("offset"),
    trimAllowance: readNonNegative("trim"),
    visual: Object.keys(visual).length > 0 ? visual : undefined,
  };
}
