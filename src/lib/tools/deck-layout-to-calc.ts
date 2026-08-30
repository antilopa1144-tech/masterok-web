import type { DeckLayoutResult } from "./deck-layout";

export const TERRACE_CALCULATOR_TRANSFER_FROM = "kalkulyator-terrasnoy-doski";
export const DECK_LAYOUT_TRANSFER_FROM = "raskladka-terrasnoy-doski";

type Totals = Record<string, unknown> | null | undefined;
type SearchParamsReader = Pick<URLSearchParams, "get">;

export interface DeckLayoutTransfer {
  deckLengthMm: number;
  deckWidthMm: number;
  boardLengthMm: number;
  boardWidthMm: number;
  gapMm: number;
  reservePercent: number;
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

export function buildDeckLayoutHrefFromTerraceResult(totals: Totals): string | null {
  const lengthM = readNumber(totals, "length", 1, 30);
  const widthM = readNumber(totals, "width", 1, 15);
  const boardLengthMm = readNumber(totals, "boardLength", 1000, 12000);
  const boardWidthMm = readNumber(totals, "boardWidth", 70, 300);
  const gapMm = readNumber(totals, "gap", 0, 20);
  const reservePercent = readNumber(totals, "boardReservePercent", 0, 30);
  if (
    lengthM === null
    || widthM === null
    || boardLengthMm === null
    || boardWidthMm === null
    || gapMm === null
    || reservePercent === null
  ) return null;

  const params = new URLSearchParams({
    from: TERRACE_CALCULATOR_TRANSFER_FROM,
    deckLengthMm: String(Math.round(lengthM * 1000)),
    deckWidthMm: String(Math.round(widthM * 1000)),
    boardLengthMm: String(Math.round(boardLengthMm)),
    boardWidthMm: String(boardWidthMm),
    gapMm: String(gapMm),
    reservePercent: String(reservePercent),
  });
  return `/instrumenty/raskladka-terrasnoy-doski/?${params.toString()}`;
}

export function readDeckLayoutTransfer(searchParams: SearchParamsReader): DeckLayoutTransfer | null {
  if (searchParams.get("from") !== TERRACE_CALCULATOR_TRANSFER_FROM) return null;

  const deckLengthMm = readParam(searchParams, "deckLengthMm", 500, 30000);
  const deckWidthMm = readParam(searchParams, "deckWidthMm", 500, 30000);
  const boardLengthMm = readParam(searchParams, "boardLengthMm", 500, 12000);
  const boardWidthMm = readParam(searchParams, "boardWidthMm", 40, 400);
  const gapMm = readParam(searchParams, "gapMm", 0, 30);
  const reservePercent = readParam(searchParams, "reservePercent", 0, 30);
  if (
    deckLengthMm === null
    || deckWidthMm === null
    || boardLengthMm === null
    || boardWidthMm === null
    || gapMm === null
    || reservePercent === null
  ) return null;

  return { deckLengthMm, deckWidthMm, boardLengthMm, boardWidthMm, gapMm, reservePercent };
}

export function buildTerraceCalculatorHrefFromDeckLayout(result: DeckLayoutResult): string | null {
  const { input } = result;
  const runLengthMm = input.orientation === "along-length" ? input.deckLengthMm : input.deckWidthMm;
  const crossWidthMm = input.orientation === "along-length" ? input.deckWidthMm : input.deckLengthMm;

  // Калькулятор всегда считает доску вдоль поля length. Для поперечной
  // раскладки меняем стороны местами, а не теряем выбранное направление.
  if (
    runLengthMm < 1000
    || runLengthMm > 30000
    || crossWidthMm < 1000
    || crossWidthMm > 15000
    || input.boardLengthMm < 1000
    || input.boardLengthMm > 12000
    || input.boardWidthMm < 70
    || input.boardWidthMm > 300
    || input.gapMm < 0
    || input.gapMm > 20
    || input.reservePercent < 0
    || input.reservePercent > 30
  ) return null;

  const params = new URLSearchParams({
    from: DECK_LAYOUT_TRANSFER_FROM,
    length: String(runLengthMm / 1000),
    width: String(crossWidthMm / 1000),
    boardLength: String(input.boardLengthMm),
    boardWidthMm: String(input.boardWidthMm),
    gapMm: String(input.gapMm),
    offcutReuseMode: "1",
    boardReservePercent: String(input.reservePercent),
    layoutBoardsHint: String(result.purchaseBoards),
  });
  return `/kalkulyatory/fasad/kalkulyator-terrasnoy-doski/?${params.toString()}`;
}
