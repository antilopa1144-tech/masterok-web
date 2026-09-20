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
    inputMode: "0",
    length: String(round(roomLengthMm / 1000, 3)),
    width: String(round(roomWidthMm / 1000, 3)),
    lightingNodesEnabled: "1",
    projectLightingNodeCount: String(fixtures),
  });
  return `/kalkulyatory/potolki/natyazhnoj-potolok/?${params.toString()}`;
}

export function readLightingLayoutCeilingTransfer(
  searchParams: SearchParamsReader,
): LightingLayoutCeilingTransfer | null {
  if (searchParams.get("from") !== LIGHTING_LAYOUT_TRANSFER_FROM) return null;

  if (readParam(searchParams, "inputMode", 0, 0) !== 0) return null;
  const roomWidthM = readParam(searchParams, "width", 0.5, 30);
  const roomLengthM = readParam(searchParams, "length", 0.5, 30);
  const lightingNodesEnabled = readParam(searchParams, "lightingNodesEnabled", 1, 1);
  const fixtures = readParam(searchParams, "projectLightingNodeCount", 1, 50);
  if (
    roomWidthM === null
    || roomLengthM === null
    || lightingNodesEnabled !== 1
    || fixtures === null
    || !Number.isInteger(fixtures)
  ) return null;

  const roomWidthMm = round(roomWidthM * 1000, 3);
  const roomLengthMm = round(roomLengthM * 1000, 3);
  const areaM2 = round(roomWidthM * roomLengthM);

  return {
    roomWidthMm,
    roomLengthMm,
    areaM2,
    fixtures,
    exactPerimeterM: round((roomWidthMm + roomLengthMm) * 2 / 1000),
  };
}

export function buildLightingLayoutHrefFromCeilingCalculator(values: Values): string | null {
  const inputMode = readValue(values, "inputMode", 0, 1);
  if (inputMode === null || !Number.isInteger(inputMode)) return null;
  const lengthM = readValue(values, "length", 1, 50);
  const widthM = readValue(values, "width", 1, 50);
  const enteredAreaM2 = readValue(values, "area", 1, 500);
  const areaM2 = inputMode === 0 && lengthM !== null && widthM !== null
    ? round(lengthM * widthM)
    : enteredAreaM2;
  const lightingNodesEnabled = readValue(values, "lightingNodesEnabled", 0, 1);
  const fixtures = lightingNodesEnabled === 1
    ? readValue(values, "projectLightingNodeCount", 0, 50)
    : 0;
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
