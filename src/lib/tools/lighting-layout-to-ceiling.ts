import type { LightingLayoutResult } from "./lighting-layout";

export const CEILING_STRETCH_TRANSFER_FROM = "natyazhnoj-potolok";
export const LIGHTING_LAYOUT_TRANSFER_FROM = "rasstanovka-svetilnikov";

type SearchParamsReader = Pick<URLSearchParams, "get">;
type Values = Record<string, unknown> | null | undefined;

export interface LightingLayoutCeilingTransfer {
  roomWidthMm: number;
  roomLengthMm: number;
  areaM2: number;
  fixtures: number;
  exactPerimeterM: number;
}

export interface CeilingCalculatorLightingTransfer {
  areaM2: number;
  fixtures: number;
}

function round(value: number, digits = 2): number {
  const factor = 10 ** digits;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

function readParam(searchParams: SearchParamsReader, key: string, min: number, max: number): number | null {
  const raw = searchParams.get(key);
  if (raw === null || raw.trim() === "") return null;
  const value = Number(raw);
  if (!Number.isFinite(value) || value < min || value > max) return null;
  return value;
}

function readValue(values: Values, key: string, min: number, max: number): number | null {
  const value = Number(values?.[key]);
  if (!Number.isFinite(value) || value < min || value > max) return null;
  return value;
}

export function buildCeilingStretchHrefFromLightingLayout(result: LightingLayoutResult): string | null {
  const roomWidthMm = result.input.roomWidthMm;
  const roomLengthMm = result.input.roomLengthMm;
  const areaM2 = round(roomWidthMm * roomLengthMm / 1_000_000);
  const fixtures = result.count;

  if (
    roomWidthMm < 500
    || roomWidthMm > 30_000
    || roomLengthMm < 500
    || roomLengthMm > 30_000
    || areaM2 < 1
    || areaM2 > 500
    || !Number.isInteger(fixtures)
    || fixtures < 1
    || fixtures > 50
  ) return null;

  const params = new URLSearchParams({
    from: LIGHTING_LAYOUT_TRANSFER_FROM,
    area: String(areaM2),
    corners: "4",
    fixtures: String(fixtures),
    roomWidthMm: String(roomWidthMm),
    roomLengthMm: String(roomLengthMm),
  });
  return `/kalkulyatory/potolki/natyazhnoj-potolok/?${params.toString()}`;
}

export function readLightingLayoutCeilingTransfer(
  searchParams: SearchParamsReader,
): LightingLayoutCeilingTransfer | null {
  if (searchParams.get("from") !== LIGHTING_LAYOUT_TRANSFER_FROM) return null;

  const roomWidthMm = readParam(searchParams, "roomWidthMm", 500, 30_000);
  const roomLengthMm = readParam(searchParams, "roomLengthMm", 500, 30_000);
  const areaM2 = readParam(searchParams, "area", 1, 500);
  const fixtures = readParam(searchParams, "fixtures", 1, 50);
  if (
    roomWidthMm === null
    || roomLengthMm === null
    || areaM2 === null
    || fixtures === null
    || !Number.isInteger(fixtures)
  ) return null;

  const exactAreaM2 = round(roomWidthMm * roomLengthMm / 1_000_000);
  if (Math.abs(exactAreaM2 - areaM2) > 0.01) return null;

  return {
    roomWidthMm,
    roomLengthMm,
    areaM2,
    fixtures,
    exactPerimeterM: round((roomWidthMm + roomLengthMm) * 2 / 1000),
  };
}

export function buildLightingLayoutHrefFromCeilingCalculator(values: Values): string | null {
  const areaM2 = readValue(values, "area", 1, 500);
  const fixtures = readValue(values, "fixtures", 0, 50);
  if (areaM2 === null || fixtures === null || !Number.isInteger(fixtures)) return null;

  const params = new URLSearchParams({
    from: CEILING_STRETCH_TRANSFER_FROM,
    areaHint: String(areaM2),
    fixturesHint: String(fixtures),
  });
  return `/instrumenty/rasstanovka-svetilnikov/?${params.toString()}`;
}

export function readCeilingCalculatorLightingTransfer(
  searchParams: SearchParamsReader,
): CeilingCalculatorLightingTransfer | null {
  if (searchParams.get("from") !== CEILING_STRETCH_TRANSFER_FROM) return null;

  const areaM2 = readParam(searchParams, "areaHint", 1, 500);
  const fixtures = readParam(searchParams, "fixturesHint", 0, 50);
  if (areaM2 === null || fixtures === null || !Number.isInteger(fixtures)) return null;
  return { areaM2, fixtures };
}
