import type { PaverLayoutResult } from "./paver-layout";

export const PAVING_CALCULATOR_TRANSFER_FROM = "trotuarnaya-plitka";
export const PAVER_LAYOUT_TRANSFER_FROM = "raskladka-trotuarnoy-plitki";

type Totals = Record<string, unknown> | null | undefined;
type SearchParamsReader = Pick<URLSearchParams, "get">;

export interface PaverLayoutHints {
  areaM2: number;
  perimeterM: number;
}

function readNumber(source: Totals, key: string, min: number, max: number): number | null {
  const value = Number(source?.[key]);
  if (!Number.isFinite(value) || value < min || value > max) return null;
  return value;
}

function readParam(searchParams: SearchParamsReader, key: string, min: number, max: number): number | null {
  const raw = searchParams.get(key);
  if (raw === null || raw.trim() === "") return null;
  const value = Number(raw);
  if (!Number.isFinite(value) || value < min || value > max) return null;
  return value;
}

export function buildPaverLayoutHrefFromCalculatorResult(totals: Totals): string | null {
  const areaM2 = readNumber(totals, "area", 5, 2000);
  const perimeterM = readNumber(totals, "perimeter", 4, 500);
  if (areaM2 === null || perimeterM === null) return null;

  const params = new URLSearchParams({
    from: PAVING_CALCULATOR_TRANSFER_FROM,
    areaHint: String(areaM2),
    perimeterHint: String(perimeterM),
  });
  return `/instrumenty/raskladka-trotuarnoy-plitki/?${params.toString()}`;
}

export function readPaverLayoutHints(searchParams: SearchParamsReader): PaverLayoutHints | null {
  if (searchParams.get("from") !== PAVING_CALCULATOR_TRANSFER_FROM) return null;
  const areaM2 = readParam(searchParams, "areaHint", 5, 2000);
  const perimeterM = readParam(searchParams, "perimeterHint", 4, 500);
  if (areaM2 === null || perimeterM === null) return null;
  return { areaM2, perimeterM };
}

export function buildPavingCalculatorHrefFromLayout(result: PaverLayoutResult): string | null {
  const areaM2 = result.areaM2;
  const perimeterM = Math.round(
    ((result.input.surfaceWidthMm + result.input.surfaceLengthMm) * 2 / 1000) * 1000,
  ) / 1000;
  if (areaM2 < 5 || areaM2 > 2000 || perimeterM < 4 || perimeterM > 500) return null;

  const params = new URLSearchParams({
    from: PAVER_LAYOUT_TRANSFER_FROM,
    area: String(areaM2),
    perimeter: String(perimeterM),
    borderEnabled: "1",
    layoutPaversHint: String(result.purchasePavers),
  });
  return `/kalkulyatory/fasad/trotuarnaya-plitka/?${params.toString()}`;
}
