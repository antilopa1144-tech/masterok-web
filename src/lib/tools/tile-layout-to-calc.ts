import type { LayoutMode } from "./tile-layout";
import {
  estimateTilesPerBoxFromArea,
  isValidTilePackArea,
  isValidTilesPerBox,
  type TilePackagingSource,
} from "./tile-layout-purchase";

/** Параметры раскладки для передачи в калькулятор плитки. */
export interface TileLayoutTransferInput {
  surfaceW: number;
  surfaceH: number;
  tileW: number;
  tileH: number;
  groutMm: number;
  layoutMode: LayoutMode;
  packAreaM2?: number;
  tilesPerBox?: number;
  packagingSource?: TilePackagingSource;
  reservePercent?: number;
  hasOpening?: boolean;
  openingW?: number;
  openingH?: number;
  openingOffsetLeft?: number;
  transferSource?: "calculator";
  surfaceSource?: "exact" | "area-derived";
}

/** Значения полей калькулятора `plitka` (числовые ключи формы). */
export interface PlitkaTransferValues {
  inputMode: number;
  area: number;
  tileWidth: number;
  tileHeight: number;
  jointWidth: number;
  layingMethod: number;
  packagingMode: number;
  packArea?: number;
  tilesPerPackage?: number;
}

export interface TileCalculatorTransferInput {
  inputMode?: number;
  length?: number;
  width?: number;
  area?: number;
  tileWidth?: number;
  tileHeight?: number;
  jointWidth?: number;
  layingMethod?: number;
  packagingMode?: number;
  packArea?: number;
  tilesPerPackage?: number;
}

interface TileRoomTransferInput {
  length?: number;
  width?: number;
  area: number;
}

export const PLITKA_CALCULATOR_PATH = "/kalkulyatory/poly/plitka/";
export const TILE_ADHESIVE_CALCULATOR_PATH = "/kalkulyatory/poly/klej-dlya-plitki/";
export const TILE_GROUT_CALCULATOR_PATH = "/kalkulyatory/poly/zatirka/";
export const TILE_LAYOUT_TRANSFER_FROM = "raskladka";
export const TILE_ROOM_TRANSFER_FROM = "ploshchad-komnaty";

function roundRoomTransferValue(value: number): number {
  return Math.round((value + Number.EPSILON) * 1000) / 1000;
}

/** Передача геометрии пола из инструмента площади без выдуманных габаритов. */
export function buildPlitkaCalculatorHrefFromRoom(input: TileRoomTransferInput): string {
  const length = Number(input.length);
  const width = Number(input.width);
  const area = Number(input.area);
  const hasSupportedDimensions =
    Number.isFinite(length) &&
    length >= 0.5 &&
    length <= 30 &&
    Number.isFinite(width) &&
    width >= 0.5 &&
    width <= 30;

  const params = new URLSearchParams();
  params.set("from", TILE_ROOM_TRANSFER_FROM);
  if (hasSupportedDimensions) {
    params.set("inputMode", "0");
    params.set("length", String(roundRoomTransferValue(length)));
    params.set("width", String(roundRoomTransferValue(width)));
  } else if (Number.isFinite(area) && area >= 1 && area <= 500) {
    params.set("inputMode", "1");
    params.set("area", String(roundRoomTransferValue(area)));
  } else {
    return PLITKA_CALCULATOR_PATH;
  }

  return `${PLITKA_CALCULATOR_PATH}?${params.toString()}`;
}

/** Способ укладки в калькуляторе: 0 прямая, 1 диагональ, 2 кирпичная. */
export function mapLayoutModeToLayingMethod(mode: LayoutMode): number {
  switch (mode) {
    case "diagonal":
      return 1;
    case "offset-half":
    case "offset-third":
      return 2;
    default:
      return 0;
  }
}

export function buildPlitkaTransferValues(input: TileLayoutTransferInput): PlitkaTransferValues {
  const areaM2 = (input.surfaceW * input.surfaceH) / 1_000_000;
  const labelPackaging = input.packagingSource === "label"
    && input.tilesPerBox != null
    && isValidTilesPerBox(input.tilesPerBox);
  const values: PlitkaTransferValues = {
    inputMode: 1,
    area: Math.round(areaM2 * 100) / 100,
    tileWidth: Math.round(input.tileW),
    tileHeight: Math.round(input.tileH),
    jointWidth: Math.round(input.groutMm * 10) / 10,
    layingMethod: mapLayoutModeToLayingMethod(input.layoutMode),
    packagingMode: labelPackaging ? 1 : 0,
  };
  if (input.packAreaM2 != null && isValidTilePackArea(input.packAreaM2)) {
    values.packArea = Math.round(input.packAreaM2 * 1000) / 1000;
  }
  if (labelPackaging) values.tilesPerPackage = input.tilesPerBox;
  return values;
}

/** Категория формата в калькуляторе клея: мелкая / средняя / крупная / крупноформат. */
export function mapTileSizeToAdhesiveOption(tileW: number, tileH: number): number {
  const minSide = Math.min(tileW, tileH);
  const maxSide = Math.max(tileW, tileH);
  if (maxSide <= 300) return 0;
  if (maxSide <= 600 && minSide < 600) return 1;
  if (maxSide <= 600) return 2;
  return 3;
}

function resolveTransferAreaM2(input: TileLayoutTransferInput, areaM2?: number): number {
  const fallback = (input.surfaceW * input.surfaceH) / 1_000_000;
  const resolved = areaM2 != null && Number.isFinite(areaM2) && areaM2 >= 0
    ? areaM2
    : fallback;
  return Math.round(resolved * 100) / 100;
}

export function buildPlitkaCalculatorSearchParams(
  input: TileLayoutTransferInput,
): URLSearchParams {
  const v = buildPlitkaTransferValues(input);
  const params = new URLSearchParams();
  params.set("from", TILE_LAYOUT_TRANSFER_FROM);
  params.set("inputMode", String(v.inputMode));
  params.set("area", String(v.area));
  params.set("tileWidth", String(v.tileWidth));
  params.set("tileHeight", String(v.tileHeight));
  params.set("jointWidth", String(v.jointWidth));
  params.set("layingMethod", String(v.layingMethod));
  params.set("packagingMode", String(v.packagingMode));
  if (v.packArea != null) params.set("packArea", String(v.packArea));
  if (v.tilesPerPackage != null) params.set("tilesPerPackage", String(v.tilesPerPackage));
  params.set("packagingSource", v.packagingMode === 1 ? "label" : "estimated");
  if (input.tilesPerBox != null && isValidTilesPerBox(input.tilesPerBox)) {
    params.set("layoutTilesPerBox", String(input.tilesPerBox));
  }
  params.set("layoutSurfaceW", String(Math.round(input.surfaceW)));
  params.set("layoutSurfaceH", String(Math.round(input.surfaceH)));
  params.set("layoutMode", input.layoutMode);
  if (input.hasOpening && input.openingW && input.openingH) {
    params.set("layoutHasOpening", "1");
    params.set("layoutOpeningW", String(Math.round(input.openingW)));
    params.set("layoutOpeningH", String(Math.round(input.openingH)));
    if (input.openingOffsetLeft != null && Number.isFinite(input.openingOffsetLeft)) {
      params.set("layoutOpeningOffsetLeft", String(Math.round(input.openingOffsetLeft)));
    }
  }
  if (input.reservePercent != null && Number.isFinite(input.reservePercent) && input.reservePercent >= 0) {
    params.set("reserveHint", String(Math.round(input.reservePercent * 10) / 10));
  }
  return params;
}

export function buildPlitkaCalculatorHref(
  input: TileLayoutTransferInput,
  options?: { tilesTotal?: number; areaM2?: number },
): string {
  const params = buildPlitkaCalculatorSearchParams(input);
  if (options?.areaM2 != null && Number.isFinite(options.areaM2) && options.areaM2 >= 0) {
    params.set("area", String(Math.round(options.areaM2 * 100) / 100));
  }
  if (options?.tilesTotal != null && options.tilesTotal > 0) {
    params.set("tilesHint", String(options.tilesTotal));
  }
  return `${PLITKA_CALCULATOR_PATH}?${params.toString()}`;
}

const LAYOUT_PATH = "/instrumenty/raskladka-plitki/";

/** Обратная передача: калькулятор / ванная → раскладка (мм в URL). */
export function buildTileLayoutHref(input: TileLayoutTransferInput): string {
  const params = new URLSearchParams();
  if (input.transferSource) params.set("from", input.transferSource);
  if (input.surfaceSource) params.set("surfaceSource", input.surfaceSource);
  params.set("surfaceW", String(Math.round(input.surfaceW)));
  params.set("surfaceH", String(Math.round(input.surfaceH)));
  params.set("tileW", String(Math.round(input.tileW)));
  params.set("tileH", String(Math.round(input.tileH)));
  params.set("groutMm", String(input.groutMm));
  params.set("layoutMode", input.layoutMode);
  if (input.packAreaM2 != null && isValidTilePackArea(input.packAreaM2)) {
    params.set("packAreaM2", String(Math.round(input.packAreaM2 * 1000) / 1000));
  }
  if (input.tilesPerBox != null && isValidTilesPerBox(input.tilesPerBox)) {
    params.set("tilesPerBox", String(input.tilesPerBox));
  }
  if (input.packagingSource) params.set("packagingSource", input.packagingSource);
  if (input.reservePercent != null && Number.isFinite(input.reservePercent) && input.reservePercent >= 0) {
    params.set("reservePercent", String(Math.round(input.reservePercent * 10) / 10));
  }
  if (input.hasOpening && input.openingW && input.openingH) {
    params.set("hasOpening", "1");
    params.set("openingW", String(Math.round(input.openingW)));
    params.set("openingH", String(Math.round(input.openingH)));
    if (input.openingOffsetLeft != null && Number.isFinite(input.openingOffsetLeft)) {
      params.set("openingOffsetLeft", String(Math.round(input.openingOffsetLeft)));
    }
  }
  return `${LAYOUT_PATH}?${params.toString()}`;
}

function mapLayingMethodToLayoutMode(method: number | undefined): LayoutMode {
  if (Math.round(method ?? 0) === 1) return "diagonal";
  if (Math.round(method ?? 0) === 2) return "offset-half";
  return "straight";
}

/** Передача из обычного калькулятора в визуальную раскладку без потери фасовки. */
export function buildTileLayoutHrefFromCalculatorValues(
  input: TileCalculatorTransferInput,
): string {
  const areaM2 = Number.isFinite(input.area) && (input.area ?? 0) > 0 ? input.area! : 12;
  const exactDimensions = Math.round(input.inputMode ?? 0) === 0
    && Number.isFinite(input.length) && (input.length ?? 0) > 0
    && Number.isFinite(input.width) && (input.width ?? 0) > 0;
  const surfaceW = exactDimensions
    ? input.length! * 1000
    : Math.sqrt(areaM2) * 1000;
  const surfaceH = exactDimensions
    ? input.width! * 1000
    : (areaM2 * 1_000_000) / Math.round(surfaceW);
  const tileW = Number.isFinite(input.tileWidth) && (input.tileWidth ?? 0) > 0 ? input.tileWidth! : 300;
  const tileH = Number.isFinite(input.tileHeight) && (input.tileHeight ?? 0) > 0 ? input.tileHeight! : 300;
  const packAreaM2 = input.packArea != null && isValidTilePackArea(input.packArea)
    ? input.packArea
    : undefined;
  const labelPackaging = Math.round(input.packagingMode ?? 0) === 1
    && input.tilesPerPackage != null
    && isValidTilesPerBox(input.tilesPerPackage);
  const tilesPerBox = labelPackaging
    ? input.tilesPerPackage
    : packAreaM2 != null
      ? estimateTilesPerBoxFromArea(tileW, tileH, packAreaM2)
      : undefined;

  return buildTileLayoutHref({
    surfaceW,
    surfaceH,
    tileW,
    tileH,
    groutMm: Number.isFinite(input.jointWidth) && (input.jointWidth ?? 0) > 0 ? input.jointWidth! : 2,
    layoutMode: mapLayingMethodToLayoutMode(input.layingMethod),
    packAreaM2,
    tilesPerBox,
    packagingSource: labelPackaging ? "label" : "estimated",
    transferSource: "calculator",
    surfaceSource: exactDimensions ? "exact" : "area-derived",
  });
}

export function parseTileLayoutFromSearchParams(
  params: URLSearchParams,
): Partial<TileLayoutTransferInput> | null {
  const surfaceW = Number(params.get("surfaceW"));
  const surfaceH = Number(params.get("surfaceH"));
  if (!Number.isFinite(surfaceW) || !Number.isFinite(surfaceH) || surfaceW <= 0 || surfaceH <= 0) {
    return null;
  }
  const tileW = Number(params.get("tileW"));
  const tileH = Number(params.get("tileH"));
  const groutMm = Number(params.get("groutMm"));
  const mode = params.get("layoutMode") as LayoutMode | null;
  const packAreaM2 = Number(params.get("packAreaM2"));
  const tilesPerBox = Number(params.get("tilesPerBox"));
  const packagingSource = params.get("packagingSource");
  const reservePercent = Number(params.get("reservePercent"));
  const surfaceSource = params.get("surfaceSource");
  const openingW = Number(params.get("openingW"));
  const openingH = Number(params.get("openingH"));
  const openingOffsetLeft = Number(params.get("openingOffsetLeft"));
  const hasOpening = params.get("hasOpening") === "1" && openingW > 0 && openingH > 0;
  const validModes: LayoutMode[] = ["straight", "offset-half", "offset-third", "diagonal"];
  return {
    surfaceW,
    surfaceH,
    tileW: Number.isFinite(tileW) && tileW > 0 ? tileW : 300,
    tileH: Number.isFinite(tileH) && tileH > 0 ? tileH : 600,
    groutMm: Number.isFinite(groutMm) && groutMm > 0 ? groutMm : 2,
    layoutMode: mode && validModes.includes(mode) ? mode : "straight",
    packAreaM2: isValidTilePackArea(packAreaM2) ? packAreaM2 : undefined,
    tilesPerBox: isValidTilesPerBox(tilesPerBox) ? tilesPerBox : undefined,
    packagingSource: packagingSource === "label" ? "label" : "estimated",
    reservePercent: Number.isFinite(reservePercent) && reservePercent >= 0 ? reservePercent : undefined,
    transferSource: params.get("from") === "calculator" ? "calculator" : undefined,
    surfaceSource: surfaceSource === "area-derived" ? "area-derived" : "exact",
    hasOpening,
    openingW: hasOpening ? openingW : undefined,
    openingH: hasOpening ? openingH : undefined,
    openingOffsetLeft: hasOpening && Number.isFinite(openingOffsetLeft) && openingOffsetLeft >= 0
      ? openingOffsetLeft
      : undefined,
  };
}

export function buildTileAdhesiveCalculatorHref(
  input: TileLayoutTransferInput,
  options?: { areaM2?: number; surfaceView?: "wall" | "floor" },
): string {
  const params = new URLSearchParams();
  params.set("from", TILE_LAYOUT_TRANSFER_FROM);
  params.set("area", String(resolveTransferAreaM2(input, options?.areaM2)));
  params.set("tileSize", String(mapTileSizeToAdhesiveOption(input.tileW, input.tileH)));
  params.set("layingType", options?.surfaceView === "wall" ? "1" : "0");
  return `${TILE_ADHESIVE_CALCULATOR_PATH}?${params.toString()}`;
}

export function buildTileGroutCalculatorHref(
  input: TileLayoutTransferInput,
  options?: { areaM2?: number },
): string {
  const params = new URLSearchParams();
  params.set("from", TILE_LAYOUT_TRANSFER_FROM);
  params.set("area", String(resolveTransferAreaM2(input, options?.areaM2)));
  params.set("tileWidth", String(Math.round(input.tileW)));
  params.set("tileHeight", String(Math.round(input.tileH)));
  if (input.groutMm > 0) {
    params.set("jointWidth", String(Math.round(input.groutMm * 10) / 10));
  }
  return `${TILE_GROUT_CALCULATOR_PATH}?${params.toString()}`;
}
