import { calculateTileLayout, type LayoutMode, type TileCell } from "./tile-layout";

export type PaverPattern = "straight" | "offset-half" | "offset-third";

export interface PaverLayoutInput {
  surfaceWidthMm: number;
  surfaceLengthMm: number;
  paverWidthMm: number;
  paverLengthMm: number;
  jointMm: number;
  pattern: PaverPattern;
  reservePercent: number;
}

export interface PaverLayoutResult {
  input: PaverLayoutInput;
  grid: TileCell[][];
  rows: number;
  maxColumns: number;
  wholePavers: number;
  cutPieces: number;
  basePavers: number;
  reservePavers: number;
  purchasePavers: number;
  areaM2: number;
  geometricWastePercent: number;
  warnings: string[];
  notes: string[];
}

function finite(value: number, fallback: number): number { return Number.isFinite(value) ? value : fallback; }
function clamp(value: number, min: number, max: number): number { return Math.max(min, Math.min(max, finite(value, min))); }
function round(value: number, digits = 1): number { const f = 10 ** digits; return Math.round((value + Number.EPSILON) * f) / f; }

export function calculatePaverLayout(raw: PaverLayoutInput): PaverLayoutResult {
  const surfaceWidthMm = round(clamp(raw.surfaceWidthMm, 300, 20_000), 0);
  const surfaceLengthMm = round(clamp(raw.surfaceLengthMm, 300, 20_000), 0);
  const paverWidthMm = round(clamp(raw.paverWidthMm, 40, 1000), 0);
  const paverLengthMm = round(clamp(raw.paverLengthMm, 40, 1000), 0);
  const jointMm = round(clamp(raw.jointMm, 0, 10), 1);
  const reservePercent = round(clamp(raw.reservePercent, 0, 30), 1);
  const pattern: PaverPattern = raw.pattern === "offset-half" || raw.pattern === "offset-third" ? raw.pattern : "straight";
  const layout = calculateTileLayout(surfaceWidthMm, surfaceLengthMm, paverWidthMm, paverLengthMm, jointMm, pattern as LayoutMode);
  const reservePavers = layout.basePurchaseTiles > 0 ? Math.ceil(layout.basePurchaseTiles * reservePercent / 100) : 0;
  const warnings = [...layout.notes];
  if (layout.cutRight > 0 && layout.cutRight < paverWidthMm * 0.3) warnings.push("У края получается узкий добор. До укладки сдвиньте стартовую линию или распределите подрезку на обе стороны.");

  return {
    input: { surfaceWidthMm, surfaceLengthMm, paverWidthMm, paverLengthMm, jointMm, pattern, reservePercent },
    grid: layout.tileGrid,
    rows: layout.rows,
    maxColumns: layout.cols,
    wholePavers: layout.wholeTiles,
    cutPieces: layout.cutTiles,
    basePavers: layout.basePurchaseTiles,
    reservePavers,
    purchasePavers: layout.basePurchaseTiles + reservePavers,
    areaM2: round(surfaceWidthMm * surfaceLengthMm / 1_000_000, 2),
    geometricWastePercent: round(layout.wastePercent, 1),
    warnings: [...new Set(warnings)],
    notes: [
      "Схема строится от прямого базового края. На объекте сначала отбейте контрольную ось и проверьте диагонали площадки.",
      "Запас добавляется отдельно к расходу по раскладке и остаётся закрытым на бой, замену и сложные примыкания.",
      "Инструмент показывает только верхний слой. Основание, уклон, геотекстиль, песок, ЦПС и бордюр считайте в профильном калькуляторе.",
    ],
  };
}
