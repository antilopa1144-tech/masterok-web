/**
 * Расчёт раскладки ламината/паркетной доски для инструмента
 * «Раскладка ламината». В отличие от плитки (tile-layout.ts):
 *  - доски длинные и узкие (типично 1200–1380 × 100–200 мм);
 *  - «ёлочка» (herringbone) — это пары досок под 90° друг к другу,
 *    каждая повёрнута на 45° к стене; принципиально иная геометрия,
 *    НЕ диагональ плитки;
 *  - «палуба» (deck) — прямые ряды со смещением стыков (обычно 1/3).
 *
 * Модуль самостоятельный — общую геометрию с плиткой не делим намеренно,
 * она здесь другая.
 */

export type LaminateMode = "deck-third" | "deck-half" | "herringbone";

export interface LaminateBoard {
  /** Левый-нижний угол в координатах поверхности, мм (для прямой укладки). */
  x: number;
  y: number;
  widthMm: number;
  heightMm: number;
  type: "whole" | "cut";
}

/** Доска ёлочки: центр + угол поворота (±45°). */
export interface HerringboneBoard {
  cx: number;
  cy: number;
  /** +45 или −45 градусов. */
  angleDeg: 45 | -45;
  type: "whole" | "cut";
}

export interface LaminateLayoutResult {
  mode: LaminateMode;
  /** Целых досок по схеме. */
  wholeBoards: number;
  /** Досок с подрезкой. */
  cutBoards: number;
  /** Всего досок по схеме. */
  totalBoards: number;
  /** Доски на схему после повторного использования подходящих отрезов, без запаса. */
  basePurchaseBoards: number;
  /** Дополнительные доски практического запаса. */
  purchaseReserveBoards: number;
  /** Доски к закупке с учётом повторного использования отрезов + запас. */
  purchaseBoards: number;
  /** Процент отхода. */
  wastePercent: number;
  surfaceW: number;
  surfaceH: number;
  boardW: number;
  boardH: number;
  /** Прямые ряды (deck-*). */
  rows?: LaminateBoard[][];
  /** Доски ёлочки (herringbone). */
  herringbone?: HerringboneBoard[];
  notes: string[];
}

export interface LaminateModeOption {
  value: LaminateMode;
  label: string;
  desc: string;
}

export const LAMINATE_MODE_OPTIONS: LaminateModeOption[] = [
  { value: "deck-third", label: "Палуба 1/3", desc: "Прямые ряды, смещение стыков на ⅓ доски — самый ходовой и экономный способ" },
  { value: "deck-half", label: "Палуба 1/2", desc: "Прямые ряды, смещение на половину доски — выразительный рисунок" },
  { value: "herringbone", label: "Ёлочка", desc: "Доски под 45° парами «рыбья кость» — премиальный рисунок, больше отхода" },
];

// Реальные форматы досок (длина × ширина, мм).
export const LAMINATE_SIZE_PRESETS = [
  { label: "1285×192 (классика)", w: 1285, h: 192 },
  { label: "1380×193", w: 1380, h: 193 },
  { label: "1200×190", w: 1200, h: 190 },
  { label: "1200×100 (ёлочка)", w: 1200, h: 100 },
  { label: "600×100 (ёлочка)", w: 600, h: 100 },
  { label: "2000×236 (XL)", w: 2000, h: 236 },
] as const;

export const ROOM_SIZE_PRESETS = [
  { label: "Спальня 3×4 м", w: 3000, h: 4000 },
  { label: "Гостиная 4×5 м", w: 4000, h: 5000 },
  { label: "Кухня 2.5×3 м", w: 2500, h: 3000 },
  { label: "Коридор 1.2×4 м", w: 1200, h: 4000 },
] as const;

// Запас на подрезку: палуба ~5%, ёлочка ~10–15% (сложный рез под 45°).
const DECK_RESERVE = 0.05;
const HERRINGBONE_RESERVE = 0.12;

export function clampLaminateInputs(
  surfaceW: number,
  surfaceH: number,
  boardW: number,
  boardH: number,
): { surfaceW: number; surfaceH: number; boardW: number; boardH: number } {
  return {
    surfaceW: Math.max(300, Math.min(30000, surfaceW)),
    surfaceH: Math.max(300, Math.min(30000, surfaceH)),
    boardW: Math.max(100, Math.min(3000, boardW)),
    boardH: Math.max(40, Math.min(500, boardH)),
  };
}

/** Смещение стыка в ряду (deck): доля длины доски. */
function deckOffsetFraction(rowIndex: number, mode: "deck-third" | "deck-half"): number {
  if (mode === "deck-half") return rowIndex % 2 === 1 ? 0.5 : 0;
  const phase = rowIndex % 3;
  return phase === 0 ? 0 : phase === 1 ? 1 / 3 : 2 / 3;
}

function calculateDeckLayout(
  surfaceW: number,
  surfaceH: number,
  boardW: number,
  boardH: number,
  mode: "deck-third" | "deck-half",
): Pick<LaminateLayoutResult, "wholeBoards" | "cutBoards" | "totalBoards" | "wastePercent" | "rows"> & {
  boardsConsumed: number;
} {
  // Доски кладутся длинной стороной вдоль ширины помещения (boardW = длина).
  const rowCount = Math.ceil(surfaceH / boardH);
  const rows: LaminateBoard[][] = [];
  let wholeBoards = 0;
  let cutBoards = 0;
  let cutPlacedLen = 0; // суммарная длина подрезанных досок (для отхода)
  const cutLengths: number[] = []; // длины всех обрезков для поштучного учёта

  for (let r = 0; r < rowCount; r++) {
    const y = r * boardH;
    const rowH = Math.min(boardH, surfaceH - y);
    const isLastRow = r === rowCount - 1 && rowH < boardH - 0.5;
    const lead = deckOffsetFraction(r, mode) * boardW;
    const row: LaminateBoard[] = [];

    let x = 0;
    // Первая доска в ряду — обрезок от смещения (если есть).
    if (lead > 0) {
      const w = Math.min(lead, surfaceW);
      row.push({ x, y, widthMm: w, heightMm: rowH, type: "cut" });
      cutBoards++;
      cutPlacedLen += w;
      cutLengths.push(w);
      x += w;
    }
    while (x < surfaceW - 0.5) {
      const remaining = surfaceW - x;
      if (remaining >= boardW - 0.5 && !isLastRow) {
        row.push({ x, y, widthMm: boardW, heightMm: rowH, type: "whole" });
        wholeBoards++;
        x += boardW;
      } else {
        const w = remaining;
        const cutByLen = w < boardW - 0.5;
        const cutByRow = isLastRow;
        row.push({ x, y, widthMm: w, heightMm: rowH, type: cutByLen || cutByRow ? "cut" : "whole" });
        if (cutByLen || cutByRow) {
          cutBoards++;
          cutPlacedLen += w;
          cutLengths.push(w);
        } else {
          wholeBoards++;
        }
        x += w;
      }
    }
    rows.push(row);
  }

  const totalBoards = wholeBoards + cutBoards;
  // Расход досок на обрезки через раскрой: обрезок берём из остатка ранее
  // початой доски, если он туда влезает; иначе режем новую доску, а её хвост
  // оставляем для будущих обрезков. Так считает мастер — это даёт реалистичный
  // (невысокий) отход палубы и НЕ занижает закупку. Длинные обрезки сортируем
  // первыми, чтобы остатки расходовались плотнее (best-fit decreasing).
  let consumedCut = 0;
  const offcuts: number[] = []; // доступные хвосты початых досок
  for (const need of [...cutLengths].sort((a, b) => b - a)) {
    // ищем подходящий остаток
    let bestIdx = -1;
    for (let i = 0; i < offcuts.length; i++) {
      if (offcuts[i] >= need - 0.5 && (bestIdx === -1 || offcuts[i] < offcuts[bestIdx])) {
        bestIdx = i;
      }
    }
    if (bestIdx >= 0) {
      offcuts[bestIdx] -= need;
    } else {
      consumedCut++;
      offcuts.push(boardW - need);
    }
  }
  const wasteLen = Math.max(0, consumedCut * boardW - cutPlacedLen);
  const consumedLen = (wholeBoards + consumedCut) * boardW;
  const wastePercent = consumedLen > 0 ? (wasteLen / consumedLen) * 100 : 0;

  return {
    wholeBoards,
    cutBoards,
    totalBoards,
    wastePercent,
    rows,
    boardsConsumed: wholeBoards + consumedCut,
  };
}

function calculateHerringbone(
  surfaceW: number,
  surfaceH: number,
  boardW: number,
  boardH: number,
): Pick<LaminateLayoutResult, "wholeBoards" | "cutBoards" | "totalBoards" | "wastePercent" | "herringbone"> & {
  boardsConsumed: number;
} {
  // Ёлочка: доски стоят парами под 90° (каждая ±45° к стене). Габарит ячейки
  // одного «зигзага» по диагонали ≈ длина доски. Шаг сетки центров берём по
  // проекции доски на оси: step = (boardW / √2) — половина диагонали пары.
  const step = boardW / Math.SQRT2;
  const boards: HerringboneBoard[] = [];
  let wholeBoards = 0;
  let cutBoards = 0;

  const cols = Math.ceil(surfaceW / step) + 2;
  const rows = Math.ceil(surfaceH / step) + 2;

  for (let r = -1; r < rows; r++) {
    for (let c = -1; c < cols; c++) {
      const cx = c * step;
      const cy = r * step;
      // Чередуем угол: в шахматном порядке доски смотрят влево/вправо.
      const angleDeg: 45 | -45 = (r + c) % 2 === 0 ? 45 : -45;
      // Габарит доски, повёрнутой на 45°: проекция = (boardW+boardH)/√2 по каждой оси.
      const halfSpanX = (boardW * Math.SQRT2) / 2;
      const halfSpanY = (boardH * Math.SQRT2) / 2;
      const minX = cx - halfSpanX;
      const maxX = cx + halfSpanX;
      const minY = cy - halfSpanY;
      const maxY = cy + halfSpanY;
      if (maxX <= 0 || minX >= surfaceW || maxY <= 0 || minY >= surfaceH) continue;
      const fullyInside = minX >= -0.5 && maxX <= surfaceW + 0.5 && minY >= -0.5 && maxY <= surfaceH + 0.5;
      boards.push({ cx, cy, angleDeg, type: fullyInside ? "whole" : "cut" });
      if (fullyInside) wholeBoards++;
      else cutBoards++;
    }
  }

  const totalBoards = wholeBoards + cutBoards;
  // Ёлочка отходна: краевые доски режутся под 45°, остаток мал. ~10–15%.
  const consumedCut = Math.ceil(cutBoards / 2);
  const boardArea = boardW * boardH;
  const consumedArea = (wholeBoards + consumedCut) * boardArea;
  const edgeWaste = consumedCut * boardArea * 0.4;
  const wastePercent = consumedArea > 0 ? (edgeWaste / consumedArea) * 100 : 0;

  return {
    wholeBoards,
    cutBoards,
    totalBoards,
    wastePercent,
    herringbone: boards,
    boardsConsumed: wholeBoards + consumedCut,
  };
}

function buildLaminateNotes(
  surfaceW: number,
  surfaceH: number,
  boardW: number,
  boardH: number,
  mode: LaminateMode,
): string[] {
  const notes: string[] = [];
  if (surfaceW < boardW && surfaceH < boardW) {
    notes.push("Помещение меньше длины доски — каждая доска под подрезку. Проверьте, что размеры в миллиметрах.");
  }
  if (mode === "deck-third" || mode === "deck-half") {
    notes.push("Смещайте стыки соседних рядов минимум на 30 см — иначе укладка считается браком и слабее держится.");
  }
  if (mode === "herringbone") {
    notes.push("Для ёлочки берут специальные короткие доски (часто 600–1200 × 100–120 мм) с замком под укладку «рыбьей костью».");
  }
  notes.push("Оставьте зазор 8–12 мм у стен — ламинат расширяется от влажности и тепла.");
  return notes;
}

export function calculateLaminateLayout(
  surfaceW: number,
  surfaceH: number,
  boardW: number,
  boardH: number,
  mode: LaminateMode = "deck-third",
): LaminateLayoutResult {
  const clamped = clampLaminateInputs(surfaceW, surfaceH, boardW, boardH);
  surfaceW = clamped.surfaceW;
  surfaceH = clamped.surfaceH;
  boardW = clamped.boardW;
  boardH = clamped.boardH;

  const notes = buildLaminateNotes(surfaceW, surfaceH, boardW, boardH, mode);

  if (mode === "herringbone") {
    const { boardsConsumed, ...base } = calculateHerringbone(surfaceW, surfaceH, boardW, boardH);
    const purchaseBoards = Math.ceil(boardsConsumed * (1 + HERRINGBONE_RESERVE));
    return {
      mode,
      ...base,
      basePurchaseBoards: boardsConsumed,
      purchaseReserveBoards: purchaseBoards - boardsConsumed,
      purchaseBoards,
      surfaceW,
      surfaceH,
      boardW,
      boardH,
      notes,
    };
  }

  const { boardsConsumed, ...base } = calculateDeckLayout(surfaceW, surfaceH, boardW, boardH, mode);
  const purchaseBoards = Math.ceil(boardsConsumed * (1 + DECK_RESERVE));
  return {
    mode,
    ...base,
    basePurchaseBoards: boardsConsumed,
    purchaseReserveBoards: purchaseBoards - boardsConsumed,
    purchaseBoards,
    surfaceW,
    surfaceH,
    boardW,
    boardH,
    notes,
  };
}
