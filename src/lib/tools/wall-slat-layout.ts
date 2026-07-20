/** Раскладка вертикальных декоративных реек на прямоугольной стене. */

export type SlatSizingMode = "by-gap" | "by-count";

export interface WallSlatLayoutInput {
  wallWidthMm: number;
  wallHeightMm: number;
  slatWidthMm: number;
  desiredGapMm: number;
  desiredCount: number;
  mode: SlatSizingMode;
  stockLengthMm: number;
  reservePercent: number;
}

export interface WallSlatPlacement { id: string; xMm: number; widthMm: number }

export interface WallSlatLayoutResult {
  input: WallSlatLayoutInput;
  placements: WallSlatPlacement[];
  slatCount: number;
  actualGapMm: number;
  edgeGapMm: number;
  exactLinearM: number;
  baseStockPieces: number;
  reservePieces: number;
  purchasePieces: number;
  offcutLinearM: number;
  warnings: string[];
  notes: string[];
}

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, value));
}

function round(value: number, digits = 1): number {
  const factor = 10 ** digits;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

export function calculateWallSlatLayout(raw: WallSlatLayoutInput): WallSlatLayoutResult {
  const wallWidthMm = round(clamp(raw.wallWidthMm, 300, 30_000), 0);
  const wallHeightMm = round(clamp(raw.wallHeightMm, 300, 10_000), 0);
  const slatWidthMm = round(clamp(raw.slatWidthMm, 5, Math.max(5, wallWidthMm / 2)), 1);
  const desiredGapMm = round(clamp(raw.desiredGapMm, 0, 1000), 1);
  const desiredCount = Math.round(clamp(raw.desiredCount, 1, 500));
  const stockLengthMm = round(clamp(raw.stockLengthMm, 300, 12_000), 0);
  const reservePercent = round(clamp(raw.reservePercent, 0, 30), 1);
  const mode: SlatSizingMode = raw.mode === "by-count" ? "by-count" : "by-gap";

  let slatCount: number;
  let actualGapMm: number;
  if (mode === "by-count") {
    slatCount = Math.min(desiredCount, Math.max(1, Math.floor((wallWidthMm - 1) / slatWidthMm)));
    actualGapMm = Math.max(0, (wallWidthMm - slatCount * slatWidthMm) / (slatCount + 1));
  } else {
    slatCount = Math.max(1, Math.floor((wallWidthMm + desiredGapMm) / (slatWidthMm + desiredGapMm)));
    actualGapMm = desiredGapMm;
  }
  const occupied = slatCount * slatWidthMm + Math.max(0, slatCount - 1) * actualGapMm;
  const edgeGapMm = Math.max(0, (wallWidthMm - occupied) / 2);
  const placements = Array.from({ length: slatCount }, (_, index) => ({
    id: `slat-${index + 1}`,
    xMm: round(edgeGapMm + index * (slatWidthMm + actualGapMm), 1),
    widthMm: slatWidthMm,
  }));
  const piecesPerSlat = Math.ceil(wallHeightMm / stockLengthMm);
  const baseStockPieces = slatCount * piecesPerSlat;
  const reservePieces = baseStockPieces > 0 ? Math.ceil(baseStockPieces * reservePercent / 100) : 0;
  const exactLinearMm = slatCount * wallHeightMm;
  const offcutLinearMm = baseStockPieces * stockLengthMm - exactLinearMm;
  const warnings: string[] = [];
  if (stockLengthMm < wallHeightMm) warnings.push("Одна рейка короче высоты стены: на каждой вертикали появится стык. Для цельного рисунка выберите длину не меньше высоты стены.");
  if (actualGapMm < 5 && slatCount > 1) warnings.push("Зазор меньше 5 мм: разметка и окраска стены между рейками будут сложнее.");

  return {
    input: { wallWidthMm, wallHeightMm, slatWidthMm, desiredGapMm, desiredCount, mode, stockLengthMm, reservePercent },
    placements,
    slatCount,
    actualGapMm: round(actualGapMm, 1),
    edgeGapMm: round(edgeGapMm, 1),
    exactLinearM: round(exactLinearMm / 1000, 2),
    baseStockPieces,
    reservePieces,
    purchasePieces: baseStockPieces + reservePieces,
    offcutLinearM: round(Math.max(0, offcutLinearMm) / 1000, 2),
    warnings,
    notes: [
      "Крайние поля выравниваются автоматически, поэтому рисунок остаётся симметричным относительно центра стены.",
      "Окончательную разметку делайте от фактической оси стены: углы и откосы редко бывают идеально параллельны.",
      "Крепление, подложку и пожарные ограничения выбирают по материалу рейки и основанию стены.",
    ],
  };
}
