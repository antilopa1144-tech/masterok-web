import type { LayoutMode } from "./tile-layout";

/** Параметры раскладки для передачи в калькулятор плитки. */
export interface TileLayoutTransferInput {
  surfaceW: number;
  surfaceH: number;
  tileW: number;
  tileH: number;
  groutMm: number;
  layoutMode: LayoutMode;
}

/** Значения полей калькулятора `plitka` (числовые ключи формы). */
export interface PlitkaTransferValues {
  inputMode: number;
  area: number;
  tileWidth: number;
  tileHeight: number;
  jointWidth: number;
  layingMethod: number;
}

export const PLITKA_CALCULATOR_PATH = "/kalkulyatory/poly/plitka/";
export const TILE_LAYOUT_TRANSFER_FROM = "raskladka";

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
  return {
    inputMode: 1,
    area: Math.round(areaM2 * 100) / 100,
    tileWidth: Math.round(input.tileW),
    tileHeight: Math.round(input.tileH),
    jointWidth: Math.round(input.groutMm * 10) / 10,
    layingMethod: mapLayoutModeToLayingMethod(input.layoutMode),
  };
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
  return params;
}

export function buildPlitkaCalculatorHref(
  input: TileLayoutTransferInput,
  options?: { tilesTotal?: number },
): string {
  const params = buildPlitkaCalculatorSearchParams(input);
  if (options?.tilesTotal != null && options.tilesTotal > 0) {
    params.set("tilesHint", String(options.tilesTotal));
  }
  return `${PLITKA_CALCULATOR_PATH}?${params.toString()}`;
}

const LAYOUT_PATH = "/instrumenty/raskladka-plitki/";

/** Обратная передача: калькулятор / ванная → раскладка (мм в URL). */
export function buildTileLayoutHref(input: TileLayoutTransferInput): string {
  const params = new URLSearchParams();
  params.set("surfaceW", String(Math.round(input.surfaceW)));
  params.set("surfaceH", String(Math.round(input.surfaceH)));
  params.set("tileW", String(Math.round(input.tileW)));
  params.set("tileH", String(Math.round(input.tileH)));
  params.set("groutMm", String(input.groutMm));
  params.set("layoutMode", input.layoutMode);
  return `${LAYOUT_PATH}?${params.toString()}`;
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
  const validModes: LayoutMode[] = ["straight", "offset-half", "offset-third", "diagonal"];
  return {
    surfaceW,
    surfaceH,
    tileW: Number.isFinite(tileW) && tileW > 0 ? tileW : 300,
    tileH: Number.isFinite(tileH) && tileH > 0 ? tileH : 600,
    groutMm: Number.isFinite(groutMm) && groutMm > 0 ? groutMm : 2,
    layoutMode: mode && validModes.includes(mode) ? mode : "straight",
  };
}
