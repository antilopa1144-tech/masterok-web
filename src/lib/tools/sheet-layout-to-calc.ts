import type { SheetLayoutInput } from "./sheet-layout";

export const SHEET_LAYOUT_PATH = "/instrumenty/raskladka-listov/";
export const DRYWALL_CALCULATOR_PATH = "/kalkulyatory/steny/gipsokarton/";
export const DRYWALL_CEILING_CALCULATOR_PATH = "/kalkulyatory/potolki/podvesnoy-potolok-gkl/";
export const FASTENERS_CALCULATOR_PATH = "/kalkulyatory/otdelka/krepezh/";
export const SHEET_LAYOUT_TRANSFER_FROM = "raskladka-listov";
export const FASTENERS_TRANSFER_FROM = "krepezh";

function round(value: number, digits = 3): number {
  const factor = 10 ** digits;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

function drywallSheetSize(widthMm: number, lengthMm: number): number | undefined {
  const key = [Math.round(widthMm), Math.round(lengthMm)].sort((a, b) => a - b).join("x");
  if (key === "1200x2500") return 0;
  if (key === "1200x3000") return 1;
  if (key === "600x2500") return 2;
  return undefined;
}

export function buildDrywallCalculatorHref(input: SheetLayoutInput, sheetsHint?: number): string | null {
  if (input.surface === "floor") return null;

  const params = new URLSearchParams();
  params.set("from", SHEET_LAYOUT_TRANSFER_FROM);
  params.set("inputMode", "0");
  params.set("length", String(round(input.surfaceWidthMm / 1000)));
  params.set("layers", String(input.layers));
  if (sheetsHint != null && sheetsHint > 0) params.set("sheetsHint", String(Math.round(sheetsHint)));

  if (input.surface === "ceiling") {
    params.set("width", String(round(input.surfaceHeightMm / 1000)));
    params.set("sheetWidthMm", String(Math.round(input.sheetWidthMm)));
    params.set("sheetLengthMm", String(Math.round(input.sheetLengthMm)));
    params.set("sheetReservePercent", String(round(input.reservePercent)));
    return `${DRYWALL_CEILING_CALCULATOR_PATH}?${params.toString()}`;
  }

  params.set("surfaceMode", "1");
  params.set("height", String(round(input.surfaceHeightMm / 1000)));
  params.set("openingsArea", "0");
  const sheetSize = drywallSheetSize(input.sheetWidthMm, input.sheetLengthMm);
  if (sheetSize != null) params.set("sheetSize", String(sheetSize));
  return `${DRYWALL_CALCULATOR_PATH}?${params.toString()}`;
}

export function buildFastenersCalculatorHref(
  input: SheetLayoutInput,
  purchaseSheets: number,
): string | null {
  if (input.material !== "drywall" && input.material !== "osb") return null;

  const sheetCount = Math.round(purchaseSheets);
  // Поле калькулятора крепежа принимает не более 200 листов. Не передаём
  // значение с неявным ограничением, чтобы пользователь не получил заниженную
  // закупку на большом объекте.
  if (!Number.isFinite(sheetCount) || sheetCount < 1 || sheetCount > 200) return null;

  const isDrywall = input.material === "drywall";
  const params = new URLSearchParams({
    from: SHEET_LAYOUT_TRANSFER_FROM,
    materialType: isDrywall ? "0" : "1",
    sheetCount: String(sheetCount),
    fastenerStep: isDrywall ? "250" : "200",
    withFrameScrews: isDrywall ? "1" : "0",
    withDubels: "0",
  });
  return `${FASTENERS_CALCULATOR_PATH}?${params.toString()}`;
}

export function buildSheetLayoutHref(values: Partial<Record<
  "surfaceWidthMm" | "surfaceHeightMm" | "sheetWidthMm" | "sheetLengthMm" | "layers",
  number
>>): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(values)) {
    if (value != null && Number.isFinite(value) && value > 0) params.set(key, String(round(value)));
  }
  const query = params.toString();
  return query ? `${SHEET_LAYOUT_PATH}?${query}` : SHEET_LAYOUT_PATH;
}

export function buildSheetLayoutHrefFromDrywall(values: {
  surfaceMode?: number;
  length?: number;
  height?: number;
  layers?: number;
  sheetSize?: number;
}): string {
  const sizes: Record<number, [number, number]> = {
    0: [1200, 2500],
    1: [1200, 3000],
    2: [600, 2500],
  };
  const size = sizes[Math.round(values.sheetSize ?? 0)] ?? sizes[0];
  const sheetValues = {
    sheetWidthMm: size[0],
    sheetLengthMm: size[1],
    layers: values.layers,
  };
  const isSingleWall = Math.round(values.surfaceMode ?? 0) === 1;
  const href = buildSheetLayoutHref(isSingleWall ? {
    ...sheetValues,
    surfaceWidthMm: (values.length ?? 0) * 1000,
    surfaceHeightMm: (values.height ?? 0) * 1000,
  } : sheetValues);
  const url = new URL(href, "https://getmasterok.ru");
  url.searchParams.set("from", "gipsokarton");
  url.searchParams.set("material", "drywall");
  return `${url.pathname}?${url.searchParams.toString()}`;
}

export function buildSheetLayoutHrefFromDrywallCeiling(values: {
  inputMode?: number;
  length?: number;
  width?: number;
  layers?: number;
  sheetWidthMm?: number;
  sheetLengthMm?: number;
  sheetReservePercent?: number;
}): string {
  const sheetValues = {
    sheetWidthMm: values.sheetWidthMm,
    sheetLengthMm: values.sheetLengthMm,
    layers: values.layers,
  };
  const hasRectangle = Math.round(values.inputMode ?? 0) === 0;
  const href = buildSheetLayoutHref(hasRectangle ? {
    ...sheetValues,
    surfaceWidthMm: (values.length ?? 0) * 1000,
    surfaceHeightMm: (values.width ?? 0) * 1000,
  } : sheetValues);
  const url = new URL(href, "https://getmasterok.ru");
  url.searchParams.set("from", "podvesnoy-potolok-gkl");
  url.searchParams.set("material", "drywall");
  url.searchParams.set("surface", "ceiling");
  url.searchParams.set("orientation", "auto");
  if (values.sheetReservePercent != null && Number.isFinite(values.sheetReservePercent)) {
    url.searchParams.set("reservePercent", String(round(values.sheetReservePercent)));
  }
  return `${url.pathname}?${url.searchParams.toString()}`;
}

export function buildSheetLayoutHrefFromFasteners(values: {
  materialType?: number;
}): string | null {
  const materialType = Math.round(values.materialType ?? Number.NaN);
  if (materialType !== 0 && materialType !== 1) return null;

  const params = new URLSearchParams({
    from: FASTENERS_TRANSFER_FROM,
    material: materialType === 0 ? "drywall" : "osb",
    sheetWidthMm: materialType === 0 ? "1200" : "1250",
    sheetLengthMm: "2500",
    orientation: materialType === 0 ? "portrait" : "auto",
    jointGapMm: materialType === 0 ? "0" : "3",
  });
  return `${SHEET_LAYOUT_PATH}?${params.toString()}`;
}
