import type { WallSlatLayoutResult } from "./wall-slat-layout";

export const WALL_SLAT_TRANSFER_FROM = "raskladka-reek";

type SearchParamsReader = Pick<URLSearchParams, "get">;

export interface WallSlatCutTransfer {
  stockLengthMm: number;
  partLengthMm: number;
  quantity: number;
  reservePercent: number;
  safeStockHint: number;
}

function readParam(searchParams: SearchParamsReader, key: string, min: number, max: number): number | null {
  const raw = searchParams.get(key);
  if (raw === null || raw.trim() === "") return null;
  const value = Number(raw);
  if (!Number.isFinite(value) || value < min || value > max) return null;
  return value;
}

export function buildLinearCutHrefFromWallSlat(result: WallSlatLayoutResult): string | null {
  const { input } = result;
  if (
    input.wallHeightMm > input.stockLengthMm
    || result.slatCount < 1
    || result.slatCount > 200
  ) return null;

  const params = new URLSearchParams({
    from: WALL_SLAT_TRANSFER_FROM,
    stockLengthMm: String(input.stockLengthMm),
    partLengthMm: String(input.wallHeightMm),
    quantity: String(result.slatCount),
    reservePercent: String(input.reservePercent),
    safeStockHint: String(result.purchasePieces),
  });
  return `/instrumenty/lineynyy-raskroy/?${params.toString()}`;
}

export function readWallSlatCutTransfer(searchParams: SearchParamsReader): WallSlatCutTransfer | null {
  if (searchParams.get("from") !== WALL_SLAT_TRANSFER_FROM) return null;
  const stockLengthMm = readParam(searchParams, "stockLengthMm", 100, 20_000);
  const partLengthMm = readParam(searchParams, "partLengthMm", 1, 20_000);
  const quantity = readParam(searchParams, "quantity", 1, 200);
  const reservePercent = readParam(searchParams, "reservePercent", 0, 30);
  const safeStockHint = readParam(searchParams, "safeStockHint", 1, 1000);
  if (
    stockLengthMm === null
    || partLengthMm === null
    || quantity === null
    || reservePercent === null
    || safeStockHint === null
    || partLengthMm > stockLengthMm
    || !Number.isInteger(quantity)
    || !Number.isInteger(safeStockHint)
  ) return null;

  return { stockLengthMm, partLengthMm, quantity, reservePercent, safeStockHint };
}
