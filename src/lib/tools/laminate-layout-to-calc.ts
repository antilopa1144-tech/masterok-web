import type { LaminateMode } from "./laminate-layout";

export const LAMINATE_CALCULATOR_PATH = "/kalkulyatory/poly/laminat/";
export const LAMINATE_LAYOUT_PATH = "/instrumenty/raskladka-laminata/";
export const LAMINATE_LAYOUT_TRANSFER_FROM = "raskladka-laminata";
export const LAMINATE_ROOM_TRANSFER_FROM = "ploshchad-komnaty";

interface LaminateLayoutTransferInput {
  surfaceW: number;
  surfaceH: number;
  mode: LaminateMode;
}

interface LaminateCalculatorValues {
  inputMode?: number;
  length?: number;
  width?: number;
  layingMethod?: number;
  offsetMode?: number;
}

interface LaminateRoomTransferInput {
  length?: number;
  width?: number;
  area: number;
}

function round(value: number, digits = 3): number {
  const factor = 10 ** digits;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

function calculatorLayoutValues(mode: LaminateMode): {
  layingMethod: number;
  offsetMode: number;
} {
  if (mode === "herringbone") return { layingMethod: 2, offsetMode: 0 };
  return {
    layingMethod: 0,
    offsetMode: mode === "deck-half" ? 2 : 1,
  };
}

function toolLayoutMode(values: LaminateCalculatorValues): LaminateMode | undefined {
  if (Math.round(values.layingMethod ?? 0) === 2) return "herringbone";
  if (Math.round(values.layingMethod ?? 0) === 1) return undefined;
  return Math.round(values.offsetMode ?? 0) === 2 ? "deck-half" : "deck-third";
}

export function buildLaminateCalculatorHref(input: LaminateLayoutTransferInput): string {
  const params = new URLSearchParams();
  const layout = calculatorLayoutValues(input.mode);

  params.set("from", LAMINATE_LAYOUT_TRANSFER_FROM);
  params.set("inputMode", "0");
  params.set("length", String(round(input.surfaceH / 1000)));
  params.set("width", String(round(input.surfaceW / 1000)));
  params.set("layingMethod", String(layout.layingMethod));
  params.set("offsetMode", String(layout.offsetMode));

  return `${LAMINATE_CALCULATOR_PATH}?${params.toString()}`;
}

export function buildLaminateCalculatorHrefFromRoom(input: LaminateRoomTransferInput): string {
  const params = new URLSearchParams();
  const length = Number(input.length);
  const width = Number(input.width);
  const area = Number(input.area);
  const hasSupportedDimensions =
    Number.isFinite(length) &&
    length >= 1 &&
    length <= 30 &&
    Number.isFinite(width) &&
    width >= 1 &&
    width <= 30;

  params.set("from", LAMINATE_ROOM_TRANSFER_FROM);
  if (hasSupportedDimensions) {
    params.set("inputMode", "0");
    params.set("length", String(round(length)));
    params.set("width", String(round(width)));
  } else if (Number.isFinite(area) && area >= 1 && area <= 500) {
    params.set("inputMode", "1");
    params.set("area", String(round(area)));
  } else {
    return LAMINATE_CALCULATOR_PATH;
  }

  return `${LAMINATE_CALCULATOR_PATH}?${params.toString()}`;
}

export function buildLaminateLayoutHref(values: LaminateCalculatorValues): string {
  const params = new URLSearchParams();
  const inputMode = Math.round(values.inputMode ?? 0);
  const length = Number(values.length);
  const width = Number(values.width);
  const mode = toolLayoutMode(values);

  if (inputMode === 0 && Number.isFinite(length) && length > 0 && Number.isFinite(width) && width > 0) {
    params.set("surfaceW", String(round(width * 1000)));
    params.set("surfaceH", String(round(length * 1000)));
  }
  if (mode) params.set("mode", mode);

  const query = params.toString();
  return query ? `${LAMINATE_LAYOUT_PATH}?${query}` : LAMINATE_LAYOUT_PATH;
}

export function parseLaminateLayoutSearchParams(params: URLSearchParams): {
  surfaceW?: number;
  surfaceH?: number;
  mode?: LaminateMode;
} {
  const readDimension = (key: string): number | undefined => {
    const value = Number(params.get(key));
    return Number.isFinite(value) && value >= 300 && value <= 30_000 ? value : undefined;
  };
  const mode = params.get("mode");

  return {
    surfaceW: readDimension("surfaceW"),
    surfaceH: readDimension("surfaceH"),
    mode:
      mode === "deck-third" || mode === "deck-half" || mode === "herringbone"
        ? mode
        : undefined,
  };
}
