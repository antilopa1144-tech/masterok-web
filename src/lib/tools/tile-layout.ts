/**
 * Расчёт раскладки плитки для инструмента «Раскладка плитки».
 * Источник истины: сетка ячеек → счётчики и отход.
 */

export type LayoutMode = "straight" | "offset-half" | "offset-third" | "diagonal";

export type TileCellType = "whole" | "cut" | "corner";

export interface TileCell {
  type: TileCellType;
  widthMm: number;
  heightMm: number;
}

export interface TileLayoutResult {
  wholeTiles: number;
  cutTiles: number;
  totalTiles: number;
  wastePercent: number;
  rows: number;
  cols: number;
  cutRight: number;
  cutBottom: number;
  tileGrid: TileCell[][];
  mode: LayoutMode;
  /** Доп. плитки к закупке (только диагональ — схема остаётся прямой) */
  purchaseReserveTiles: number;
  notes: string[];
}

export interface LayoutModeOption {
  value: LayoutMode;
  label: string;
  desc: string;
}

export const LAYOUT_MODE_OPTIONS: LayoutModeOption[] = [
  { value: "straight", label: "Прямая", desc: "Классическая раскладка без смещения" },
  { value: "offset-half", label: "Со смещением 1/2", desc: "Кирпичная кладка — сдвиг ряда на половину плитки" },
  { value: "offset-third", label: "Со смещением 1/3", desc: "Сдвиг ряда на ⅓ и ⅔ — цикл из трёх рядов" },
  {
    value: "diagonal",
    label: "Диагональная",
    desc: "Схема — прямая сетка; +15% к закупке на подрезку под 45°",
  },
];

export const TILE_SIZE_PRESETS = [
  { label: "20×20", w: 200, h: 200 },
  { label: "30×30", w: 300, h: 300 },
  { label: "30×60", w: 300, h: 600 },
  { label: "40×40", w: 400, h: 400 },
  { label: "60×60", w: 600, h: 600 },
  { label: "60×120", w: 600, h: 1200 },
] as const;

export const SURFACE_SIZE_PRESETS = [
  { label: "Ванная стена 1.7×2.5м", w: 1700, h: 2500 },
  { label: "Ванная пол 1.7×1.5м", w: 1700, h: 1500 },
  { label: "Кухня фартук 2.4×0.6м", w: 2400, h: 600 },
  { label: "Пол 3×4м", w: 3000, h: 4000 },
  { label: "Стена 4×2.7м", w: 4000, h: 2700 },
] as const;

const DIAGONAL_PURCHASE_RESERVE = 0.15;

export function clampLayoutInputs(
  surfaceW: number,
  surfaceH: number,
  tileW: number,
  tileH: number,
  groutMm: number,
): { surfaceW: number; surfaceH: number; tileW: number; tileH: number; groutMm: number } {
  return {
    surfaceW: Math.max(100, Math.min(20000, surfaceW)),
    surfaceH: Math.max(100, Math.min(20000, surfaceH)),
    tileW: Math.max(10, Math.min(2000, tileW)),
    tileH: Math.max(10, Math.min(2000, tileH)),
    groutMm: Math.max(0, Math.min(10, groutMm)),
  };
}

function classifyCell(
  cellW: number,
  cellH: number,
  tileW: number,
  tileH: number,
  isLastRow: boolean,
  isLastCol: boolean,
): TileCellType {
  const fullW = cellW >= tileW - 0.5;
  const fullH = cellH >= tileH - 0.5;
  if (fullW && fullH) return "whole";
  if (isLastRow && isLastCol) return "corner";
  return "cut";
}

function summarizeGrid(
  grid: TileCell[][],
  tileW: number,
  tileH: number,
): Pick<TileLayoutResult, "wholeTiles" | "cutTiles" | "totalTiles" | "wastePercent" | "cols"> {
  let wholeTiles = 0;
  let cutTiles = 0;
  let maxCols = 0;
  const wholeArea = tileW * tileH;
  let wasteArea = 0;

  for (const row of grid) {
    maxCols = Math.max(maxCols, row.length);
    for (const cell of row) {
      if (cell.type === "whole") wholeTiles++;
      else cutTiles++;
      if (cell.type !== "whole") {
        wasteArea += wholeArea - cell.widthMm * cell.heightMm;
      }
    }
  }

  const totalTiles = wholeTiles + cutTiles;
  const wastePercent =
    totalTiles > 0 ? (wasteArea / (totalTiles * wholeArea)) * 100 : 0;

  return { wholeTiles, cutTiles, totalTiles, wastePercent, cols: maxCols };
}

export function countCellsInGrid(grid: TileCell[][]): number {
  return grid.reduce((sum, row) => sum + row.length, 0);
}

export function computeLayoutSvgBoundsMm(
  grid: TileCell[][],
  groutMm: number,
): { widthMm: number; heightMm: number } {
  if (grid.length === 0) return { widthMm: 0, heightMm: 0 };

  let maxRowW = 0;
  let totalH = 0;
  for (let ri = 0; ri < grid.length; ri++) {
    const row = grid[ri];
    const rowW = row.reduce(
      (sum, cell, ci) => sum + cell.widthMm + (ci < row.length - 1 ? groutMm : 0),
      0,
    );
    maxRowW = Math.max(maxRowW, rowW);
    totalH += row[0]?.heightMm ?? 0;
    if (ri < grid.length - 1) totalH += groutMm;
  }
  return { widthMm: maxRowW, heightMm: totalH };
}

function calculateStraightLayout(
  surfaceW: number,
  surfaceH: number,
  tileW: number,
  tileH: number,
  groutMm: number,
): Omit<TileLayoutResult, "mode" | "purchaseReserveTiles" | "notes"> {
  const stepW = tileW + groutMm;
  const stepH = tileH + groutMm;

  const wholeCols = Math.floor(surfaceW / stepW);
  const wholeRows = Math.floor(surfaceH / stepH);

  const usedW = wholeCols * stepW;
  const usedH = wholeRows * stepH;

  const remainW = surfaceW - usedW;
  const remainH = surfaceH - usedH;

  const hasRightCut = remainW > groutMm;
  const hasBottomCut = remainH > groutMm;

  const cutRight = hasRightCut ? remainW - groutMm : 0;
  const cutBottom = hasBottomCut ? remainH - groutMm : 0;

  const cols = wholeCols + (hasRightCut ? 1 : 0);
  const rows = wholeRows + (hasBottomCut ? 1 : 0);

  const grid: TileCell[][] = [];
  for (let r = 0; r < rows; r++) {
    const row: TileCell[] = [];
    const isLastRow = hasBottomCut && r === rows - 1;
    const cellH = isLastRow ? cutBottom : tileH;

    for (let c = 0; c < cols; c++) {
      const isLastCol = hasRightCut && c === cols - 1;
      const cellW = isLastCol ? cutRight : tileW;
      row.push({
        type: classifyCell(cellW, cellH, tileW, tileH, isLastRow, isLastCol),
        widthMm: cellW,
        heightMm: cellH,
      });
    }
    grid.push(row);
  }

  const summary = summarizeGrid(grid, tileW, tileH);

  return {
    ...summary,
    rows,
    cutRight,
    cutBottom,
    tileGrid: grid,
  };
}

function rowOffsetMm(rowIndex: number, tileW: number, mode: "offset-half" | "offset-third"): number {
  if (mode === "offset-half") {
    return rowIndex % 2 === 1 ? Math.round(tileW * 0.5) : 0;
  }
  const phase = rowIndex % 3;
  if (phase === 0) return 0;
  if (phase === 1) return Math.round(tileW / 3);
  return Math.round((tileW * 2) / 3);
}

function calculateOffsetLayout(
  surfaceW: number,
  surfaceH: number,
  tileW: number,
  tileH: number,
  groutMm: number,
  mode: "offset-half" | "offset-third",
): Omit<TileLayoutResult, "mode" | "purchaseReserveTiles" | "notes"> {
  const stepW = tileW + groutMm;
  const stepH = tileH + groutMm;

  const wholeRows = Math.floor(surfaceH / stepH);
  const remainH = surfaceH - wholeRows * stepH;
  const hasBottomCut = remainH > groutMm;
  const cutBottom = hasBottomCut ? remainH - groutMm : 0;
  const rows = wholeRows + (hasBottomCut ? 1 : 0);

  const grid: TileCell[][] = [];

  for (let r = 0; r < rows; r++) {
    const row: TileCell[] = [];
    const isLastRow = hasBottomCut && r === rows - 1;
    const cellH = isLastRow ? cutBottom : tileH;
    const leadOffset = rowOffsetMm(r, tileW, mode);

    let x = 0;
    if (leadOffset > 0) {
      const firstW = Math.min(leadOffset, surfaceW);
      const isLastCol = false;
      row.push({
        type: classifyCell(firstW, cellH, tileW, tileH, isLastRow, isLastCol),
        widthMm: firstW,
        heightMm: cellH,
      });
      x = firstW + groutMm;
    }

    while (x < surfaceW) {
      const remaining = surfaceW - x;
      if (remaining >= tileW) {
        const isLastCol = false;
        row.push({
          type: classifyCell(tileW, cellH, tileW, tileH, isLastRow, isLastCol),
          widthMm: tileW,
          heightMm: cellH,
        });
        x += stepW;
      } else if (remaining > groutMm) {
        const cutW = remaining - groutMm;
        row.push({
          type: classifyCell(cutW, cellH, tileW, tileH, isLastRow, true),
          widthMm: Math.max(1, cutW),
          heightMm: cellH,
        });
        break;
      } else {
        break;
      }
    }

    if (row.length > 0) {
      const last = row[row.length - 1];
      const isLastCol = true;
      last.type = classifyCell(last.widthMm, last.heightMm, tileW, tileH, isLastRow, isLastCol);
    }

    grid.push(row);
  }

  const summary = summarizeGrid(grid, tileW, tileH);

  let cutRight = 0;
  if (grid.length > 0) {
    const topRow = grid[0];
    const lastCell = topRow[topRow.length - 1];
    if (lastCell.widthMm < tileW - 0.5) cutRight = lastCell.widthMm;
  }

  return {
    ...summary,
    rows,
    cutRight,
    cutBottom,
    tileGrid: grid,
  };
}

export function calculateTileLayout(
  surfaceW: number,
  surfaceH: number,
  tileW: number,
  tileH: number,
  groutMm: number,
  mode: LayoutMode = "straight",
): TileLayoutResult {
  const clamped = clampLayoutInputs(surfaceW, surfaceH, tileW, tileH, groutMm);
  surfaceW = clamped.surfaceW;
  surfaceH = clamped.surfaceH;
  tileW = clamped.tileW;
  tileH = clamped.tileH;
  groutMm = clamped.groutMm;

  if (mode === "offset-half" || mode === "offset-third") {
    const base = calculateOffsetLayout(surfaceW, surfaceH, tileW, tileH, groutMm, mode);
    return {
      ...base,
      mode,
      purchaseReserveTiles: 0,
      notes: [],
    };
  }

  const base = calculateStraightLayout(surfaceW, surfaceH, tileW, tileH, groutMm);

  if (mode === "diagonal") {
    const reserve = Math.ceil(base.totalTiles * DIAGONAL_PURCHASE_RESERVE);
    return {
      ...base,
      mode: "diagonal",
      purchaseReserveTiles: reserve,
      wastePercent: Math.min(base.wastePercent + 15, 45),
      notes: [
        "Схема показана как прямая сетка — так удобнее планировать подрезку по стенам.",
        `Для укладки под 45° заложите ещё ~${reserve} плиток (+15%) на подрезку углов и бой.`,
        "Точный расчёт клея и затирки — в калькуляторе плитки (с запасом по схеме укладки).",
      ],
    };
  }

  return {
    ...base,
    mode: "straight",
    purchaseReserveTiles: 0,
    notes: [],
  };
}
