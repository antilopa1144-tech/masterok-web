export const BRICKWORK_LAYOUT_PATH = "/instrumenty/raskladka-kirpicha/";
export const BRICK_CALCULATOR_PATH = "/kalkulyatory/steny/kirpich/";
export const BRICKWORK_CALCULATOR_PATH = "/kalkulyatory/steny/kladka-kirpicha/";
export const BRICK_LAYOUT_TRANSFER_FROM = "raskladka-kirpicha";

export type BrickLayoutCalculatorSource = "kirpich" | "kladka-kirpicha";

export interface BrickLayoutTransfer {
  source: BrickLayoutCalculatorSource | null;
  surfaceWmm?: number;
  surfaceHmm?: number;
  brickLmm?: number;
  brickHmm?: number;
}

const BRICK_HEIGHTS_MM: Record<number, number> = {
  0: 65,
  1: 88,
  2: 138,
};

function finiteNumber(value: unknown): number | null {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function rounded(value: number): number {
  return Math.round((value + Number.EPSILON) * 1000) / 1000;
}

function inRange(value: number | null, min: number, max: number): value is number {
  return value !== null && value >= min && value <= max;
}

/**
 * Передаёт геометрию только из режима «по размерам» калькулятора кирпича.
 * У калькулятора кладки длина может означать суммарный периметр, поэтому оттуда
 * открывается чистая раскладка без автоматического прямоугольника.
 */
export function buildBrickworkLayoutHrefFromCalculatorResult(
  calculatorSlug: string,
  totals: Record<string, number> | undefined,
): string | null {
  if (!totals || (calculatorSlug !== "kirpich" && calculatorSlug !== "kladka-kirpicha")) {
    return null;
  }

  const params = new URLSearchParams();
  params.set("from", calculatorSlug);

  if (calculatorSlug === "kladka-kirpicha" || Math.round(Number(totals.inputMode)) !== 0) {
    return `${BRICKWORK_LAYOUT_PATH}?${params.toString()}`;
  }

  const wallWidthM = finiteNumber(totals.wallWidth);
  const wallHeightM = finiteNumber(totals.wallHeight);
  const brickType = Math.round(Number(totals.brickType));
  const brickHeightMm = BRICK_HEIGHTS_MM[brickType];

  if (
    !inRange(wallWidthM, 0.25, 30)
    || !inRange(wallHeightM, 0.065, 15)
    || !brickHeightMm
  ) {
    return `${BRICKWORK_LAYOUT_PATH}?${params.toString()}`;
  }

  params.set("surfaceWmm", String(rounded(wallWidthM * 1000)));
  params.set("surfaceHmm", String(rounded(wallHeightM * 1000)));
  params.set("brickLmm", "250");
  params.set("brickHmm", String(brickHeightMm));
  return `${BRICKWORK_LAYOUT_PATH}?${params.toString()}`;
}

export function parseBrickworkLayoutSearchParams(params: URLSearchParams): BrickLayoutTransfer {
  const sourceValue = params.get("from");
  const source: BrickLayoutCalculatorSource | null = sourceValue === "kirpich" || sourceValue === "kladka-kirpicha"
    ? sourceValue
    : null;
  const surfaceWmm = finiteNumber(params.get("surfaceWmm"));
  const surfaceHmm = finiteNumber(params.get("surfaceHmm"));
  const brickLmm = finiteNumber(params.get("brickLmm"));
  const brickHmm = finiteNumber(params.get("brickHmm"));

  if (
    !inRange(surfaceWmm, 250, 30000)
    || !inRange(surfaceHmm, 65, 15000)
    || !inRange(brickLmm, 60, 400)
    || !inRange(brickHmm, 40, 200)
  ) {
    return { source };
  }

  return { source, surfaceWmm, surfaceHmm, brickLmm, brickHmm };
}

/** Переносит один непрерывный участок стены; толщину кладки вывести из рисунка нельзя. */
export function buildBrickworkCalculatorHref(input: {
  surfaceWmm: number;
  surfaceHmm: number;
  brickLmm: number;
  brickHmm: number;
  jointMm: number;
}): string {
  const wallLengthM = input.surfaceWmm / 1000;
  const wallHeightM = input.surfaceHmm / 1000;
  if (!inRange(wallLengthM, 1, 100) || !inRange(wallHeightM, 1, 5)) {
    return BRICKWORK_CALCULATOR_PATH;
  }

  const params = new URLSearchParams();
  params.set("from", BRICK_LAYOUT_TRANSFER_FROM);
  params.set("inputMode", "0");
  params.set("wallLength", String(rounded(wallLengthM)));
  params.set("wallHeight", String(rounded(wallHeightM)));
  params.set("openingsArea", "0");

  if (input.brickLmm === 250) {
    const brickFormat = Object.entries(BRICK_HEIGHTS_MM)
      .find(([, height]) => height === input.brickHmm)?.[0];
    if (brickFormat !== undefined) params.set("brickFormat", brickFormat);
  }
  if (input.jointMm >= 8 && input.jointMm <= 15) {
    params.set("mortarJoint", String(rounded(input.jointMm)));
  }

  return `${BRICKWORK_CALCULATOR_PATH}?${params.toString()}`;
}
