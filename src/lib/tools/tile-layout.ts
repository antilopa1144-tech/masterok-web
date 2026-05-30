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

/** Один ромб/добор диагональной раскладки (плитка, повёрнутая на 45°). */
export interface DiagonalCell {
  /** Центр ромба в координатах поверхности, мм. */
  cx: number;
  cy: number;
  /** whole — полный ромб целиком внутри; edge — обрезан кромкой поверхности. */
  type: "whole" | "edge";
}

export interface DiagonalLayout {
  /** Половина диагонали ромба (= (tile+grout)/√2 шаг), мм. */
  halfDiagonalMm: number;
  cells: DiagonalCell[];
  surfaceW: number;
  surfaceH: number;
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
  /** Доп. плитки к закупке (только диагональ — на подрезку углов под 45°) */
  purchaseReserveTiles: number;
  notes: string[];
  /** Геометрия диагональной раскладки для SVG (только mode === "diagonal"). */
  diagonal?: DiagonalLayout;
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
  // Подрезы делим на «мелкие» (≤ половины плитки по обеим сторонам — из одной
  // целой плитки выходит две таких) и «крупные» (нужна отдельная плитка на каждую,
  // остаток слишком мал для парного края). Это даёт реалистичный отход без
  // переоптимизма: нельзя нарезать два куска по 590 мм из плитки 600 мм.
  let cutPlacedArea = 0;
  let smallCuts = 0;
  let largeCuts = 0;

  for (const row of grid) {
    maxCols = Math.max(maxCols, row.length);
    for (const cell of row) {
      if (cell.type === "whole") {
        wholeTiles++;
      } else {
        cutTiles++;
        cutPlacedArea += cell.widthMm * cell.heightMm;
        const reusable = cell.widthMm <= tileW / 2 + 0.5 && cell.heightMm <= tileH / 2 + 0.5;
        if (reusable) smallCuts++;
        else largeCuts++;
      }
    }
  }

  const totalTiles = wholeTiles + cutTiles;

  // Из мелких подрезов парами выходит по 2 куска из 1 плитки → ceil(smallCuts/2)
  // плиток. Крупные подрезы расходуют по целой плитке каждый.
  const cutTilesConsumed = Math.ceil(smallCuts / 2) + largeCuts;
  const cutConsumedArea = cutTilesConsumed * wholeArea;
  const wasteArea = Math.max(0, cutConsumedArea - cutPlacedArea);
  const consumedArea = wholeTiles * wholeArea + cutConsumedArea;
  const wastePercent = consumedArea > 0 ? (wasteArea / consumedArea) * 100 : 0;

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

/**
 * Сколько целых плиток влезает в длину и какой остаётся хвост под подрезку.
 * N целых плиток занимают N*tile + (N-1)*grout (последний шов не нужен —
 * плитка упирается в стену). Без этой поправки ровная поверхность
 * (кратная плитке) давала ложную подрезку из-за лишнего шва. См. tile-layout.test.
 */
function fitWholeTiles(
  surface: number,
  tile: number,
  grout: number,
): { wholeCount: number; hasCut: boolean; cutSize: number } {
  // Первая плитка без ведущего шва, каждая следующая — со швом перед ней.
  let wholeCount = 0;
  let used = 0;
  while (used + tile <= surface + 0.5) {
    wholeCount++;
    used += tile;
    // шов добавляем только если за ним поместится ещё хотя бы кусок плитки
    if (used + grout < surface) used += grout;
    else break;
  }
  const remain = surface - used;
  // Подрезка нужна, только если остался заметный кусок (> 1 мм после шва).
  const hasCut = remain > grout + 0.5;
  const cutSize = hasCut ? Math.round(remain - grout) : 0;
  return { wholeCount, hasCut, cutSize };
}

function calculateStraightLayout(
  surfaceW: number,
  surfaceH: number,
  tileW: number,
  tileH: number,
  groutMm: number,
): Omit<TileLayoutResult, "mode" | "purchaseReserveTiles" | "notes"> {
  const fitW = fitWholeTiles(surfaceW, tileW, groutMm);
  const fitH = fitWholeTiles(surfaceH, tileH, groutMm);

  const wholeCols = fitW.wholeCount;
  const wholeRows = fitH.wholeCount;

  const hasRightCut = fitW.hasCut;
  const hasBottomCut = fitH.hasCut;

  const cutRight = fitW.cutSize;
  const cutBottom = fitH.cutSize;

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

/**
 * Геометрия диагональной раскладки: плитки повёрнуты на 45° и образуют
 * шахматный узор ромбов. Центры ромбов стоят на сетке с шагом, равным
 * диагонали плитки (с учётом шва). Ромб, у которого хоть один угол выходит
 * за поверхность, помечается edge (по краю режется → подрезка под 45°).
 */
function buildDiagonalLayout(
  surfaceW: number,
  surfaceH: number,
  tileW: number,
  tileH: number,
  groutMm: number,
): DiagonalLayout {
  // Для диагонали считаем плитку квадратной по меньшей стороне (классическая
  // диагональ кладётся квадратом). Диагональ квадрата = side·√2.
  const side = Math.min(tileW, tileH);
  const diagonal = (side + groutMm) * Math.SQRT2;
  const half = diagonal / 2;

  const cells: DiagonalCell[] = [];
  // Центры ромбов: шахматка с шагом half по обеим осям (соседние ряды смещены).
  // Идём с запасом за края (-1 ряд), чтобы покрыть краевые подрезы.
  const colCount = Math.ceil(surfaceW / half) + 2;
  const rowCount = Math.ceil(surfaceH / half) + 2;

  for (let r = -1; r < rowCount; r++) {
    for (let c = -1; c < colCount; c++) {
      // Шахматка: ромб стоит там, где (r + c) чётно.
      if ((r + c) % 2 !== 0) continue;
      const cx = c * half;
      const cy = r * half;
      // Углы ромба (вершины квадрата, повёрнутого на 45°).
      const minX = cx - half;
      const maxX = cx + half;
      const minY = cy - half;
      const maxY = cy + half;
      // Ромб целиком за пределами поверхности — пропускаем.
      if (maxX <= 0 || minX >= surfaceW || maxY <= 0 || minY >= surfaceH) continue;
      const fullyInside = minX >= -0.5 && maxX <= surfaceW + 0.5 && minY >= -0.5 && maxY <= surfaceH + 0.5;
      cells.push({ cx, cy, type: fullyInside ? "whole" : "edge" });
    }
  }

  return { halfDiagonalMm: half, cells, surfaceW, surfaceH };
}

/**
 * Подсказки пользователю по введённым размерам — чтобы не получить
 * бессмысленный или неудобный результат (поверхность меньше плитки,
 * слишком узкая подрезка по краю и т.п.).
 */
function buildInputNotes(
  surfaceW: number,
  surfaceH: number,
  tileW: number,
  tileH: number,
  base: Pick<TileLayoutResult, "cutRight" | "cutBottom" | "wholeTiles">,
): string[] {
  const notes: string[] = [];

  if (surfaceW < tileW || surfaceH < tileH) {
    notes.push(
      "Поверхность меньше одной плитки — потребуется резать каждую плитку. Проверьте, что размеры введены в миллиметрах.",
    );
  }
  if (base.wholeTiles === 0 && (surfaceW >= tileW || surfaceH >= tileH)) {
    notes.push(
      "Ни одной целой плитки не помещается. Возможно, плитку стоит повернуть (поменять ширину и высоту местами).",
    );
  }
  // Слишком узкая подрезка по краю — её сложно резать и она выглядит неаккуратно.
  const thinRight = base.cutRight > 0 && base.cutRight < tileW * 0.3;
  const thinBottom = base.cutBottom > 0 && base.cutBottom < tileH * 0.3;
  if (thinRight || thinBottom) {
    notes.push(
      "Узкая подрезка по краю (меньше ⅓ плитки) — её трудно резать ровно. Сдвиньте старт от центра, чтобы краевые подрезы были крупнее и симметричнее.",
    );
  }
  return notes;
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
      notes: buildInputNotes(surfaceW, surfaceH, tileW, tileH, base),
    };
  }

  const base = calculateStraightLayout(surfaceW, surfaceH, tileW, tileH, groutMm);
  const inputNotes = buildInputNotes(surfaceW, surfaceH, tileW, tileH, base);

  if (mode === "diagonal") {
    const diagonal = buildDiagonalLayout(surfaceW, surfaceH, tileW, tileH, groutMm);
    const wholeTiles = diagonal.cells.filter((c) => c.type === "whole").length;
    const edgeTiles = diagonal.cells.filter((c) => c.type === "edge").length;
    // Краевые ромбы режутся по диагонали — из одной плитки часто выходит
    // две краевые половины, поэтому к закупке: целые + ceil(краевые/2) + запас.
    const edgeTilesConsumed = Math.ceil(edgeTiles / 2);
    const totalTiles = wholeTiles + edgeTiles;
    const reserve = Math.ceil((wholeTiles + edgeTilesConsumed) * DIAGONAL_PURCHASE_RESERVE);
    // Отход диагонали: целые ромбы укладываются без потерь, а каждый краевой
    // ромб режется под 45° с заметным остатком. Эмпирически отход диагонали
    // стабильно выше прямой раскладки (треугольные доборы по периметру,
    // частые непарные обрезки углов) — порядка 8–15%. Считаем как долю
    // израсходованной площади, не уложенной в дело: целые = 0 потерь,
    // краевые ромбы теряют ~40% площади израсходованной на них плитки.
    const side = Math.min(tileW, tileH);
    const tileArea = side * side;
    const consumedArea = (wholeTiles + edgeTilesConsumed) * tileArea;
    const edgeWasteArea = edgeTilesConsumed * tileArea * 0.4;
    const wastePercent = consumedArea > 0 ? (edgeWasteArea / consumedArea) * 100 : 0;

    return {
      ...base,
      mode: "diagonal",
      wholeTiles,
      cutTiles: edgeTiles,
      totalTiles,
      purchaseReserveTiles: reserve,
      wastePercent,
      diagonal,
      notes: [
        "Плитка уложена под 45° — по периметру идут треугольные доборы (половинки плиток).",
        `К закупке заложите ещё ~${reserve} плиток (+15%) на подрезку углов и бой.`,
        "Точный расчёт клея и затирки — в калькуляторе плитки (с запасом по схеме укладки).",
        ...inputNotes,
      ],
    };
  }

  return {
    ...base,
    mode: "straight",
    purchaseReserveTiles: 0,
    notes: inputNotes,
  };
}
