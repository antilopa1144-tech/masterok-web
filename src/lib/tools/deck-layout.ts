/** Визуальная раскладка террасной доски с повторным использованием обрезков. */

export type DeckOrientation = "along-length" | "along-width";
export type DeckStagger = "aligned" | "half";

export interface DeckLayoutInput {
  deckLengthMm: number;
  deckWidthMm: number;
  boardLengthMm: number;
  boardWidthMm: number;
  gapMm: number;
  orientation: DeckOrientation;
  stagger: DeckStagger;
  sawKerfMm: number;
  reservePercent: number;
}

export interface DeckPlacement {
  id: string;
  row: number;
  xMm: number;
  yMm: number;
  lengthMm: number;
  widthMm: number;
  cut: boolean;
  sourceBoard: number;
}

export interface DeckStockBoard {
  index: number;
  pieces: Array<{ pieceId: string; xMm: number; lengthMm: number }>;
  offcutMm: number;
}

export interface DeckLayoutResult {
  input: DeckLayoutInput;
  runLengthMm: number;
  crossWidthMm: number;
  rows: number;
  placements: DeckPlacement[];
  stock: DeckStockBoard[];
  deckAreaM2: number;
  exactLinearM: number;
  baseBoards: number;
  reserveBoards: number;
  purchaseBoards: number;
  offcutLinearM: number;
  wastePercent: number;
  lastRowWidthMm: number;
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

interface RawPiece { id: string; row: number; xMm: number; yMm: number; lengthMm: number; widthMm: number; cut: boolean }

function packDeckPieces(pieces: RawPiece[], stockLength: number, kerf: number): { stock: DeckStockBoard[]; source: Map<string, number> } {
  const bins: Array<{ cursor: number; pieces: DeckStockBoard["pieces"] }> = [];
  const source = new Map<string, number>();
  const sorted = [...pieces].sort((a, b) => b.lengthMm - a.lengthMm || a.row - b.row);
  for (const piece of sorted) {
    let bestIndex = -1;
    let bestRemain = Number.POSITIVE_INFINITY;
    bins.forEach((bin, index) => {
      const start = bin.cursor;
      const needed = piece.lengthMm + (bin.pieces.length > 0 ? kerf : 0);
      const remain = stockLength - start - needed;
      if (remain >= -0.01 && remain < bestRemain) { bestIndex = index; bestRemain = remain; }
    });
    if (bestIndex < 0) {
      bins.push({ cursor: 0, pieces: [] });
      bestIndex = bins.length - 1;
    }
    const bin = bins[bestIndex];
    const start = bin.cursor + (bin.pieces.length > 0 ? kerf : 0);
    bin.pieces.push({ pieceId: piece.id, xMm: round(start, 1), lengthMm: piece.lengthMm });
    bin.cursor = start + piece.lengthMm;
    source.set(piece.id, bestIndex + 1);
  }
  return {
    stock: bins.map((bin, index) => {
      const rawOffcut = Math.max(0, stockLength - bin.cursor);
      return { index: index + 1, pieces: bin.pieces, offcutMm: round(Math.max(0, rawOffcut - (rawOffcut > 0 ? kerf : 0)), 1) };
    }),
    source,
  };
}

export function calculateDeckLayout(raw: DeckLayoutInput): DeckLayoutResult {
  const deckLengthMm = round(clamp(raw.deckLengthMm, 500, 30_000), 0);
  const deckWidthMm = round(clamp(raw.deckWidthMm, 500, 30_000), 0);
  const boardLengthMm = round(clamp(raw.boardLengthMm, 500, 12_000), 0);
  const boardWidthMm = round(clamp(raw.boardWidthMm, 40, 400), 1);
  const gapMm = round(clamp(raw.gapMm, 0, 30), 1);
  const sawKerfMm = round(clamp(raw.sawKerfMm, 0, 10), 1);
  const reservePercent = round(clamp(raw.reservePercent, 0, 30), 1);
  const orientation: DeckOrientation = raw.orientation === "along-width" ? "along-width" : "along-length";
  const stagger: DeckStagger = raw.stagger === "aligned" ? "aligned" : "half";
  const runLengthMm = orientation === "along-length" ? deckLengthMm : deckWidthMm;
  const crossWidthMm = orientation === "along-length" ? deckWidthMm : deckLengthMm;
  const rows = Math.max(1, Math.ceil((crossWidthMm + gapMm) / (boardWidthMm + gapMm)));
  const lastRowWidthMm = Math.min(boardWidthMm, Math.max(1, crossWidthMm - (rows - 1) * (boardWidthMm + gapMm)));
  const rawPieces: RawPiece[] = [];

  for (let row = 0; row < rows; row += 1) {
    let x = 0;
    const firstTarget = stagger === "half" && row % 2 === 1 ? boardLengthMm / 2 : boardLengthMm;
    let pieceIndex = 0;
    while (x < runLengthMm - 0.01) {
      const target = pieceIndex === 0 ? firstTarget : boardLengthMm;
      const lengthMm = Math.min(target, runLengthMm - x);
      rawPieces.push({
        id: `deck-${row + 1}-${pieceIndex + 1}`,
        row: row + 1,
        xMm: round(x, 1),
        yMm: round(row * (boardWidthMm + gapMm), 1),
        lengthMm: round(lengthMm, 1),
        widthMm: row === rows - 1 ? lastRowWidthMm : boardWidthMm,
        cut: lengthMm < boardLengthMm - 0.01,
      });
      x += lengthMm;
      pieceIndex += 1;
    }
  }
  const packed = packDeckPieces(rawPieces, boardLengthMm, sawKerfMm);
  const placements = rawPieces.map((piece) => ({ ...piece, sourceBoard: packed.source.get(piece.id) ?? 0 }));
  const baseBoards = packed.stock.length;
  const reserveBoards = baseBoards > 0 ? Math.ceil(baseBoards * reservePercent / 100) : 0;
  const exactLinearMm = rawPieces.reduce((sum, piece) => sum + piece.lengthMm, 0);
  const purchasedLinearMm = baseBoards * boardLengthMm;
  const warnings: string[] = [];
  if (lastRowWidthMm < boardWidthMm * 0.4) warnings.push("Последний ряд уже 40% доски. Попробуйте симметричную подрезку первого и последнего рядов на объекте.");
  if (stagger === "aligned" && runLengthMm > boardLengthMm) warnings.push("Поперечные стыки совпадают по рядам. Проверьте схему опор и допустимость такого рисунка у производителя системы.");

  return {
    input: { deckLengthMm, deckWidthMm, boardLengthMm, boardWidthMm, gapMm, orientation, stagger, sawKerfMm, reservePercent },
    runLengthMm,
    crossWidthMm,
    rows,
    placements,
    stock: packed.stock,
    deckAreaM2: round(deckLengthMm * deckWidthMm / 1_000_000, 2),
    exactLinearM: round(exactLinearMm / 1000, 2),
    baseBoards,
    reserveBoards,
    purchaseBoards: baseBoards + reserveBoards,
    offcutLinearM: round(packed.stock.reduce((sum, board) => sum + board.offcutMm, 0) / 1000, 2),
    wastePercent: purchasedLinearMm > 0 ? round((purchasedLinearMm - exactLinearMm) / purchasedLinearMm * 100, 1) : 0,
    lastRowWidthMm: round(lastRowWidthMm, 1),
    warnings,
    notes: [
      "Карта раскроя повторно использует подходящие обрезки и учитывает ширину пропила между деталями.",
      "Зазор и допустимое расстояние между торцами задавайте по инструкции конкретной доски: дерево и ДПК меняют размеры по-разному.",
      "Все торцевые стыки должны попадать на опору. Инструмент не проектирует лаги, основание, уклон и крепёж.",
    ],
  };
}
