/**
 * Расчёт раскладки плитки для инструмента «Раскладка плитки».
 * Источник истины: сетка ячеек → счётчики и отход.
 */

export type LayoutMode = "straight" | "offset-half" | "offset-third" | "diagonal";

export type TileStartMode = "edge" | "center" | "custom";

export interface TileLayoutStartInput {
  mode: TileStartMode;
  /** Ширина первого видимого добора от левого края, мм. */
  offsetXmm?: number;
  /** Высота первого видимого добора от верхнего края, мм. */
  offsetYmm?: number;
}

export type TileCellType = "whole" | "cut" | "corner";

export interface TileCell {
  type: TileCellType;
  /** Положение логической плитки от левого верхнего угла поверхности, мм. */
  xMm: number;
  yMm: number;
  widthMm: number;
  heightMm: number;
  /** Фактически закрытая плиткой площадь после выреза проёма, мм². */
  placedAreaMm2?: number;
  /** Логическая позиция целиком попала внутрь проёма и не расходует плитку. */
  excludedByOpening?: boolean;
  /** Плитка пересечена контуром проёма и требует отдельной подрезки. */
  cutByOpening?: boolean;
}

export interface TileOpeningInput {
  widthMm: number;
  heightMm: number;
  offsetLeftMm: number;
}

export interface TileOpening extends TileOpeningInput {
  /** Проём начинается от пола; координата хранится от верхнего края стены. */
  offsetTopMm: number;
}

/** Один ромб/добор диагональной раскладки (плитка, повёрнутая на 45°). */
export interface DiagonalCell {
  /** Центр ромба в координатах поверхности, мм. */
  cx: number;
  cy: number;
  /** whole — полный ромб целиком внутри; edge — обрезан кромкой поверхности. */
  type: "whole" | "edge";
  placedAreaMm2?: number;
  excludedByOpening?: boolean;
  cutByOpening?: boolean;
}

export interface DiagonalLayout {
  /** Половина диагонали ромба (= (tile+grout)/√2 шаг), мм. */
  halfDiagonalMm: number;
  cells: DiagonalCell[];
  surfaceW: number;
  surfaceH: number;
}

export interface TileLayoutResult {
  /** Площадь поверхности за вычетом проёма, но вместе со швами, мм². */
  coveredAreaMm2: number;
  /** Площадь дверного проёма, мм². */
  openingAreaMm2: number;
  /** Сумма лицевых площадей реально уложенных фрагментов плитки, мм². */
  exactNeedAreaMm2: number;
  wholeTiles: number;
  cutTiles: number;
  /** Количество отдельных элементов на схеме: целые плитки + все доборы. */
  totalTiles: number;
  /** Целые плитки, реально расходуемые на схему после повторного использования подрезки. */
  basePurchaseTiles: number;
  /** Итог к покупке: расход на схему + практический запас. */
  purchaseTiles: number;
  /** Фактически применённый практический запас, %. Для диагонали не менее 15%. */
  reservePercent: number;
  wastePercent: number;
  rows: number;
  cols: number;
  /** Минимальная подрезка на соответствующей границе поверхности, мм. */
  cutLeft: number;
  cutRight: number;
  cutTop: number;
  cutBottom: number;
  startMode: TileStartMode;
  /** Фактически применённая стартовая подрезка по осям, мм. */
  startOffsetXMm: number;
  startOffsetYMm: number;
  tileGrid: TileCell[][];
  mode: LayoutMode;
  /** Дополнительные целые плитки к закупке по выбранному практическому запасу. */
  purchaseReserveTiles: number;
  notes: string[];
  opening?: TileOpening;
  /** Геометрия диагональной раскладки для SVG (только mode === "diagonal"). */
  diagonal?: DiagonalLayout;
}

type BaseTileLayoutResult = Omit<
  TileLayoutResult,
  "mode" | "reservePercent" | "purchaseReserveTiles" | "notes" | "coveredAreaMm2" | "openingAreaMm2" | "opening"
>;

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
    desc: "Плитка под 45°; практический запас — не менее 15%",
  },
];

export const TILE_SIZE_PRESETS = [
  { label: "60×30", w: 600, h: 300 },
  { label: "20×20", w: 200, h: 200 },
  { label: "30×30", w: 300, h: 300 },
  { label: "30×60", w: 300, h: 600 },
  { label: "40×40", w: 400, h: 400 },
  { label: "60×60", w: 600, h: 600 },
  { label: "60×120", w: 600, h: 1200 },
] as const;

export const SURFACE_SIZE_PRESETS = [
  { label: "Стена 2.5×2.6м", w: 2500, h: 2600 },
  { label: "Ванная стена 1.7×2.5м", w: 1700, h: 2500 },
  { label: "Ванная пол 1.7×1.5м", w: 1700, h: 1500 },
  { label: "Кухня фартук 2.4×0.6м", w: 2400, h: 600 },
  { label: "Пол 3×4м", w: 3000, h: 4000 },
  { label: "Стена 4×2.7м", w: 4000, h: 2700 },
] as const;

const DIAGONAL_MIN_RESERVE_PERCENT = 15;

export type LayoutInputKind = "surface" | "tile" | "grout" | "reserve";

const LAYOUT_INPUT_LIMITS: Record<LayoutInputKind, readonly [number, number]> = {
  surface: [100, 20000],
  tile: [10, 2000],
  grout: [0, 10],
  reserve: [0, 30],
};

/** Normalizes every UI, URL and calculation value to the same supported range. */
export function clampLayoutInput(value: number, kind: LayoutInputKind): number {
  const [min, max] = LAYOUT_INPUT_LIMITS[kind];
  if (!Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, value));
}

export interface TileLayoutStartComparisonInput {
  surfaceW: number;
  surfaceH: number;
  tileW: number;
  tileH: number;
  groutMm: number;
  layoutMode: LayoutMode;
  opening?: TileOpeningInput;
  reservePercent?: number;
  customOffsetXmm?: number;
  customOffsetYmm?: number;
  includeCustom?: boolean;
}

export interface TileLayoutStartVariant {
  mode: TileStartMode;
  result: TileLayoutResult;
  minimumEdgeCutMm: number;
  narrowEdgeCount: number;
  recommended: boolean;
}

export type TileOpeningAxisAlignment = "grout-line" | "tile-center";

export interface TileOpeningAxisVariant {
  alignment: TileOpeningAxisAlignment;
  offsetXmm: number;
  result: TileLayoutResult;
  minimumEdgeCutMm: number;
  narrowEdgeCount: number;
  recommended: boolean;
}

export function clampLayoutInputs(
  surfaceW: number,
  surfaceH: number,
  tileW: number,
  tileH: number,
  groutMm: number,
): { surfaceW: number; surfaceH: number; tileW: number; tileH: number; groutMm: number } {
  return {
    surfaceW: clampLayoutInput(surfaceW, "surface"),
    surfaceH: clampLayoutInput(surfaceH, "surface"),
    tileW: clampLayoutInput(tileW, "tile"),
    tileH: clampLayoutInput(tileH, "tile"),
    groutMm: clampLayoutInput(groutMm, "grout"),
  };
}

/**
 * Вписывает дверной проём, начинающийся от пола, в границы поверхности.
 * UI передаёт только положительные размеры; функция дополнительно защищает
 * прямые вызовы расчётного модуля и не допускает отрицательную площадь.
 */
export function normalizeTileOpening(
  opening: TileOpeningInput | undefined,
  surfaceW: number,
  surfaceH: number,
): TileOpening | undefined {
  if (!opening) return undefined;
  if (
    !Number.isFinite(opening.widthMm)
    || !Number.isFinite(opening.heightMm)
    || !Number.isFinite(opening.offsetLeftMm)
    || opening.widthMm <= 0
    || opening.heightMm <= 0
  ) {
    return undefined;
  }

  const widthMm = Math.min(surfaceW, Math.max(1, opening.widthMm));
  const heightMm = Math.min(surfaceH, Math.max(1, opening.heightMm));
  const maxOffsetLeft = Math.max(0, surfaceW - widthMm);
  const offsetLeftMm = Math.min(maxOffsetLeft, Math.max(0, opening.offsetLeftMm));

  return {
    widthMm,
    heightMm,
    offsetLeftMm,
    offsetTopMm: surfaceH - heightMm,
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
): Pick<
  TileLayoutResult,
  | "wholeTiles"
  | "cutTiles"
  | "totalTiles"
  | "basePurchaseTiles"
  | "purchaseTiles"
  | "wastePercent"
  | "exactNeedAreaMm2"
  | "cols"
> {
  let wholeTiles = 0;
  let cutTiles = 0;
  let maxCols = 0;
  const wholeArea = tileW * tileH;
  // Подрезы делим на «мелкие» (≤ половины плитки по обеим сторонам — из одной
  // целой плитки выходит две таких) и «крупные» (нужна отдельная плитка на каждую,
  // остаток слишком мал для парного края). Это даёт реалистичный отход без
  // переоптимизма: нельзя нарезать два куска по 590 мм из плитки 600 мм.
  let cutPlacedArea = 0;
  let wholePlacedArea = 0;
  let smallCuts = 0;
  let largeCuts = 0;
  let openingCuts = 0;

  for (const row of grid) {
    maxCols = Math.max(maxCols, row.length);
    for (const cell of row) {
      if (cell.excludedByOpening) continue;

      const placedArea = Math.max(0, cell.placedAreaMm2 ?? cell.widthMm * cell.heightMm);
      if (placedArea <= 0.5) continue;

      if (cell.type === "whole" && !cell.cutByOpening) {
        wholeTiles++;
        wholePlacedArea += placedArea;
      } else {
        cutTiles++;
        cutPlacedArea += placedArea;
        if (cell.cutByOpening) {
          // Подрезы вокруг косяка и перемычки могут быть L-образными и
          // геометрически несовместимыми. Без плана раскроя не объединяем их.
          openingCuts++;
        } else {
          const reusable = cell.widthMm <= tileW / 2 + 0.5 && cell.heightMm <= tileH / 2 + 0.5;
          if (reusable) smallCuts++;
          else largeCuts++;
        }
      }
    }
  }

  const totalTiles = wholeTiles + cutTiles;

  // Из мелких подрезов парами выходит по 2 куска из 1 плитки → ceil(smallCuts/2)
  // плиток. Крупные подрезы расходуют по целой плитке каждый.
  const cutTilesConsumed = Math.ceil(smallCuts / 2) + largeCuts + openingCuts;
  const basePurchaseTiles = wholeTiles + cutTilesConsumed;
  const cutConsumedArea = cutTilesConsumed * wholeArea;
  const wasteArea = Math.max(0, cutConsumedArea - cutPlacedArea);
  const consumedArea = wholeTiles * wholeArea + cutConsumedArea;
  const wastePercent = consumedArea > 0 ? (wasteArea / consumedArea) * 100 : 0;
  const exactNeedAreaMm2 = wholePlacedArea + cutPlacedArea;

  return {
    wholeTiles,
    cutTiles,
    totalTiles,
    basePurchaseTiles,
    purchaseTiles: basePurchaseTiles,
    wastePercent,
    exactNeedAreaMm2,
    cols: maxCols,
  };
}

export function countCellsInGrid(grid: TileCell[][]): number {
  return grid.reduce(
    (sum, row) => sum + row.filter((cell) => !cell.excludedByOpening && (cell.placedAreaMm2 ?? 1) > 0.5).length,
    0,
  );
}

export function computeLayoutSvgBoundsMm(
  grid: TileCell[][],
  groutMm: number,
): { widthMm: number; heightMm: number } {
  if (grid.length === 0) return { widthMm: 0, heightMm: 0 };

  let maxX = 0;
  let maxY = 0;
  for (const row of grid) {
    for (const cell of row) {
      maxX = Math.max(maxX, cell.xMm + cell.widthMm);
      maxY = Math.max(maxY, cell.yMm + cell.heightMm);
    }
  }
  return { widthMm: maxX, heightMm: maxY };
}

interface AxisSegment {
  startMm: number;
  sizeMm: number;
  isCut: boolean;
}

function clampStartOffset(value: number | undefined, tileSize: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(tileSize - 0.5, Number(value)));
}

export function normalizeTileLayoutStart(
  input: TileLayoutStartInput | undefined,
  tileW: number,
  tileH: number,
): Required<TileLayoutStartInput> {
  const mode: TileStartMode = input?.mode === "center" || input?.mode === "custom"
    ? input.mode
    : "edge";
  return {
    mode,
    offsetXmm: mode === "custom" ? clampStartOffset(input?.offsetXmm, tileW) : 0,
    offsetYmm: mode === "custom" ? clampStartOffset(input?.offsetYmm, tileH) : 0,
  };
}

/**
 * Возвращает левую стартовую подрезку, при которой заданная вертикальная ось
 * проходит по центру межплиточного шва. Геометрия остаётся в миллиметрах и не
 * смешивается с запасом или упаковкой.
 */
function calculateOpeningGroutAxisOffset(
  openingCenterMm: number,
  tileW: number,
  groutMm: number,
): number {
  if (!Number.isFinite(openingCenterMm) || !Number.isFinite(tileW) || tileW <= 0) {
    return 0;
  }

  const grout = Number.isFinite(groutMm) ? Math.max(groutMm, 0) : 0;
  const period = tileW + grout;
  if (period <= 0) return 0;

  const rawOffset = ((openingCenterMm - grout / 2) % period + period) % period;
  return rawOffset >= tileW - 0.5 ? 0 : Math.max(rawOffset, 0);
}

function calculateOpeningTileCenterAxisOffset(
  openingCenterMm: number,
  tileW: number,
  groutMm: number,
): number {
  if (!Number.isFinite(openingCenterMm) || !Number.isFinite(tileW) || tileW <= 0) {
    return 0;
  }

  const grout = Number.isFinite(groutMm) ? Math.max(groutMm, 0) : 0;
  const period = tileW + grout;
  if (period <= 0) return 0;

  const rawOffset = ((openingCenterMm - grout - tileW / 2) % period + period) % period;
  return rawOffset >= tileW - 0.5 ? 0 : Math.max(rawOffset, 0);
}

/** Строит одну ось плиточной сетки, точно оставляя шов между соседними деталями. */
function buildAxisSegments(
  surface: number,
  tile: number,
  grout: number,
  leadingCut = 0,
): AxisSegment[] {
  const segments: AxisSegment[] = [];
  const normalizedLead = Math.min(clampStartOffset(leadingCut, tile), surface);
  let cursor = 0;

  if (normalizedLead > 0.5 && normalizedLead < surface - 0.5) {
    segments.push({ startMm: 0, sizeMm: normalizedLead, isCut: true });
    cursor = normalizedLead;
    if (surface - cursor <= grout + 0.5) return segments;
    cursor += grout;
  }

  while (cursor < surface - 0.5) {
    const remaining = surface - cursor;
    const sizeMm = Math.min(tile, remaining);
    segments.push({
      startMm: cursor,
      sizeMm,
      isCut: sizeMm < tile - 0.5,
    });
    cursor += sizeMm;
    if (surface - cursor <= grout + 0.5) break;
    cursor += grout;
  }

  return segments;
}

/**
 * Центрирует сетку. Если простое деление остатка создаёт полосы уже 30% плитки,
 * убирает один целый ряд/столбец и распределяет освободившуюся плитку по краям.
 */
function centeredLeadingCut(surface: number, tile: number, grout: number): number {
  const edgeSegments = buildAxisSegments(surface, tile, grout);
  const last = edgeSegments[edgeSegments.length - 1];
  const wholeCount = edgeSegments.filter((segment) => !segment.isCut).length;
  if (!last?.isCut || wholeCount === 0) return 0;

  let centeredWholeCount = wholeCount;
  let cut = (surface - centeredWholeCount * tile - (centeredWholeCount + 1) * grout) / 2;
  if (cut < tile * 0.3 && centeredWholeCount > 1) {
    centeredWholeCount--;
    cut = (surface - centeredWholeCount * tile - (centeredWholeCount + 1) * grout) / 2;
  }
  return cut > 0.5 && cut < tile - 0.5 ? cut : 0;
}

function resolveLeadingCut(
  start: Required<TileLayoutStartInput>,
  surface: number,
  tile: number,
  grout: number,
  axis: "x" | "y",
): number {
  if (start.mode === "center") return centeredLeadingCut(surface, tile, grout);
  if (start.mode === "custom") return axis === "x" ? start.offsetXmm : start.offsetYmm;
  return 0;
}

function minimumCut(values: number[]): number {
  const positive = values.filter((value) => value > 0.5);
  return positive.length > 0 ? Math.min(...positive) : 0;
}

function measurePerimeterCuts(
  grid: TileCell[][],
  surfaceW: number,
  surfaceH: number,
  tileW: number,
  tileH: number,
): Pick<TileLayoutResult, "cutLeft" | "cutRight" | "cutTop" | "cutBottom"> {
  const left: number[] = [];
  const right: number[] = [];
  const top: number[] = [];
  const bottom: number[] = [];
  for (const cell of grid.flat()) {
    if (cell.xMm <= 0.5 && cell.widthMm < tileW - 0.5) left.push(cell.widthMm);
    if (cell.xMm + cell.widthMm >= surfaceW - 0.5 && cell.widthMm < tileW - 0.5) right.push(cell.widthMm);
    if (cell.yMm <= 0.5 && cell.heightMm < tileH - 0.5) top.push(cell.heightMm);
    if (cell.yMm + cell.heightMm >= surfaceH - 0.5 && cell.heightMm < tileH - 0.5) bottom.push(cell.heightMm);
  }
  return {
    cutLeft: minimumCut(left),
    cutRight: minimumCut(right),
    cutTop: minimumCut(top),
    cutBottom: minimumCut(bottom),
  };
}

function calculateStraightLayout(
  surfaceW: number,
  surfaceH: number,
  tileW: number,
  tileH: number,
  groutMm: number,
  start: Required<TileLayoutStartInput>,
): BaseTileLayoutResult {
  const startOffsetXMm = resolveLeadingCut(start, surfaceW, tileW, groutMm, "x");
  const startOffsetYMm = resolveLeadingCut(start, surfaceH, tileH, groutMm, "y");
  const xSegments = buildAxisSegments(surfaceW, tileW, groutMm, startOffsetXMm);
  const ySegments = buildAxisSegments(surfaceH, tileH, groutMm, startOffsetYMm);

  const grid: TileCell[][] = [];
  for (let r = 0; r < ySegments.length; r++) {
    const ySegment = ySegments[r];
    const row: TileCell[] = [];
    for (let c = 0; c < xSegments.length; c++) {
      const xSegment = xSegments[c];
      row.push({
        type: classifyCell(
          xSegment.sizeMm,
          ySegment.sizeMm,
          tileW,
          tileH,
          r === ySegments.length - 1,
          c === xSegments.length - 1,
        ),
        xMm: xSegment.startMm,
        yMm: ySegment.startMm,
        widthMm: xSegment.sizeMm,
        heightMm: ySegment.sizeMm,
      });
    }
    grid.push(row);
  }

  const summary = summarizeGrid(grid, tileW, tileH);
  const cuts = measurePerimeterCuts(grid, surfaceW, surfaceH, tileW, tileH);

  return {
    ...summary,
    ...cuts,
    rows: ySegments.length,
    cols: xSegments.length,
    startMode: start.mode,
    startOffsetXMm,
    startOffsetYMm,
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
  start: Required<TileLayoutStartInput>,
): BaseTileLayoutResult {
  const startOffsetXMm = resolveLeadingCut(start, surfaceW, tileW, groutMm, "x");
  const startOffsetYMm = resolveLeadingCut(start, surfaceH, tileH, groutMm, "y");
  const ySegments = buildAxisSegments(surfaceH, tileH, groutMm, startOffsetYMm);

  const grid: TileCell[][] = [];
  for (let r = 0; r < ySegments.length; r++) {
    const ySegment = ySegments[r];
    const row: TileCell[] = [];
    const shiftedLead = (startOffsetXMm + rowOffsetMm(r, tileW, mode)) % (tileW + groutMm);
    const rowLead = shiftedLead > tileW ? 0 : shiftedLead;
    const xSegments = buildAxisSegments(surfaceW, tileW, groutMm, rowLead);
    for (let c = 0; c < xSegments.length; c++) {
      const xSegment = xSegments[c];
      row.push({
        type: classifyCell(
          xSegment.sizeMm,
          ySegment.sizeMm,
          tileW,
          tileH,
          r === ySegments.length - 1,
          c === xSegments.length - 1,
        ),
        xMm: xSegment.startMm,
        yMm: ySegment.startMm,
        widthMm: xSegment.sizeMm,
        heightMm: ySegment.sizeMm,
      });
    }

    grid.push(row);
  }

  const summary = summarizeGrid(grid, tileW, tileH);
  const cuts = measurePerimeterCuts(grid, surfaceW, surfaceH, tileW, tileH);

  return {
    ...summary,
    ...cuts,
    rows: ySegments.length,
    startMode: start.mode,
    startOffsetXMm,
    startOffsetYMm,
    tileGrid: grid,
  };
}

function rectangleIntersectionArea(
  ax: number,
  ay: number,
  aw: number,
  ah: number,
  bx: number,
  by: number,
  bw: number,
  bh: number,
): number {
  const overlapW = Math.max(0, Math.min(ax + aw, bx + bw) - Math.max(ax, bx));
  const overlapH = Math.max(0, Math.min(ay + ah, by + bh) - Math.max(ay, by));
  return overlapW * overlapH;
}

function applyOpeningToGrid(
  grid: TileCell[][],
  opening: TileOpening | undefined,
): TileCell[][] {
  if (!opening) return grid;

  return grid.map((row) => row.map((cell) => {
    const cellArea = cell.widthMm * cell.heightMm;
    const overlapArea = rectangleIntersectionArea(
      cell.xMm,
      cell.yMm,
      cell.widthMm,
      cell.heightMm,
      opening.offsetLeftMm,
      opening.offsetTopMm,
      opening.widthMm,
      opening.heightMm,
    );
    if (overlapArea <= 0.5) return cell;

    const placedAreaMm2 = Math.max(0, cellArea - overlapArea);
    if (placedAreaMm2 <= 0.5) {
      return {
        ...cell,
        placedAreaMm2: 0,
        excludedByOpening: true,
      };
    }

    return {
      ...cell,
      type: cell.type === "corner" ? "corner" : "cut",
      placedAreaMm2,
      cutByOpening: true,
    };
  }));
}

function applyOpeningToBaseLayout(
  base: BaseTileLayoutResult,
  opening: TileOpening | undefined,
  tileW: number,
  tileH: number,
): BaseTileLayoutResult {
  if (!opening) return base;
  const tileGrid = applyOpeningToGrid(base.tileGrid, opening);
  const summary = summarizeGrid(tileGrid, tileW, tileH);
  return {
    ...base,
    ...summary,
    tileGrid,
  };
}

type GeometryPoint = readonly [number, number];

function polygonArea(points: GeometryPoint[]): number {
  if (points.length < 3) return 0;
  let area = 0;
  for (let index = 0; index < points.length; index++) {
    const [x1, y1] = points[index];
    const [x2, y2] = points[(index + 1) % points.length];
    area += x1 * y2 - x2 * y1;
  }
  return Math.abs(area) / 2;
}

function clipPolygonEdge(
  points: GeometryPoint[],
  isInside: (point: GeometryPoint) => boolean,
  intersection: (from: GeometryPoint, to: GeometryPoint) => GeometryPoint,
): GeometryPoint[] {
  if (points.length === 0) return [];
  const clipped: GeometryPoint[] = [];
  let previous = points[points.length - 1];
  let previousInside = isInside(previous);

  for (const current of points) {
    const currentInside = isInside(current);
    if (currentInside !== previousInside) clipped.push(intersection(previous, current));
    if (currentInside) clipped.push(current);
    previous = current;
    previousInside = currentInside;
  }
  return clipped;
}

function clipPolygonToRect(
  points: GeometryPoint[],
  x: number,
  y: number,
  width: number,
  height: number,
): GeometryPoint[] {
  const right = x + width;
  const bottom = y + height;
  const atX = (edgeX: number) => (from: GeometryPoint, to: GeometryPoint): GeometryPoint => {
    const dx = to[0] - from[0];
    const ratio = Math.abs(dx) < 1e-9 ? 0 : (edgeX - from[0]) / dx;
    return [edgeX, from[1] + (to[1] - from[1]) * ratio];
  };
  const atY = (edgeY: number) => (from: GeometryPoint, to: GeometryPoint): GeometryPoint => {
    const dy = to[1] - from[1];
    const ratio = Math.abs(dy) < 1e-9 ? 0 : (edgeY - from[1]) / dy;
    return [from[0] + (to[0] - from[0]) * ratio, edgeY];
  };

  let clipped = clipPolygonEdge(points, (point) => point[0] >= x, atX(x));
  clipped = clipPolygonEdge(clipped, (point) => point[0] <= right, atX(right));
  clipped = clipPolygonEdge(clipped, (point) => point[1] >= y, atY(y));
  return clipPolygonEdge(clipped, (point) => point[1] <= bottom, atY(bottom));
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
  opening?: TileOpening,
): DiagonalLayout {
  // Для диагонали считаем плитку квадратной по меньшей стороне (классическая
  // диагональ кладётся квадратом). Диагональ квадрата = side·√2.
  const side = Math.min(tileW, tileH);
  const diagonal = (side + groutMm) * Math.SQRT2;
  const half = diagonal / 2;
  const nominalTileArea = side * side;
  const nominalDiamondArea = Math.max(1, 2 * half * half);

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
      const diamond: GeometryPoint[] = [
        [cx, cy - half],
        [cx + half, cy],
        [cx, cy + half],
        [cx - half, cy],
      ];
      const surfaceFaceArea = polygonArea(clipPolygonToRect(diamond, 0, 0, surfaceW, surfaceH));
      const openingOverlapArea = opening
        ? polygonArea(clipPolygonToRect(
          diamond,
          opening.offsetLeftMm,
          opening.offsetTopMm,
          opening.widthMm,
          opening.heightMm,
        ))
        : 0;
      const visibleGeometryArea = Math.max(0, surfaceFaceArea - openingOverlapArea);
      const placedAreaMm2 = nominalTileArea * Math.min(1, visibleGeometryArea / nominalDiamondArea);
      const excludedByOpening = openingOverlapArea > 0.5 && placedAreaMm2 <= 0.5;
      const cutByOpening = openingOverlapArea > 0.5 && !excludedByOpening;
      cells.push({
        cx,
        cy,
        type: fullyInside && !cutByOpening ? "whole" : "edge",
        placedAreaMm2,
        excludedByOpening: excludedByOpening || undefined,
        cutByOpening: cutByOpening || undefined,
      });
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
  base: Pick<TileLayoutResult, "cutLeft" | "cutRight" | "cutTop" | "cutBottom" | "wholeTiles">,
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
  const thinHorizontal = [base.cutLeft, base.cutRight]
    .some((cut) => cut > 0 && cut < tileW * 0.3);
  const thinVertical = [base.cutTop, base.cutBottom]
    .some((cut) => cut > 0 && cut < tileH * 0.3);
  if (thinHorizontal || thinVertical) {
    notes.push(
      "Узкая подрезка по краю (меньше ⅓ плитки) — её трудно резать ровно. Сдвиньте старт от центра, чтобы краевые подрезы были крупнее и симметричнее.",
    );
  }
  return notes;
}

function buildOpeningNotes(opening: TileOpening | undefined): string[] {
  if (!opening) return [];
  return [
    `Проём ${Math.round(opening.widthMm)}×${Math.round(opening.heightMm)} мм учтён в площади и раскладке.`,
    "Плитки, пересечённые косяком или верхом проёма, считаются консервативно: одна исходная плитка на каждый отдельный добор.",
  ];
}

function calculatePurchaseReserve(
  basePurchaseTiles: number,
  requestedReservePercent: number,
  mode: LayoutMode,
): { reservePercent: number; purchaseReserveTiles: number; purchaseTiles: number } {
  const normalizedReservePercent = clampLayoutInput(requestedReservePercent, "reserve");
  const reservePercent = mode === "diagonal"
    ? Math.max(normalizedReservePercent, DIAGONAL_MIN_RESERVE_PERCENT)
    : normalizedReservePercent;
  const purchaseReserveTiles = basePurchaseTiles > 0 && reservePercent > 0
    ? Math.ceil(basePurchaseTiles * reservePercent / 100)
    : 0;

  return {
    reservePercent,
    purchaseReserveTiles,
    purchaseTiles: basePurchaseTiles + purchaseReserveTiles,
  };
}

function buildReserveNote(
  basePurchaseTiles: number,
  purchaseReserveTiles: number,
  reservePercent: number,
  mode: LayoutMode,
): string[] {
  if (purchaseReserveTiles === 0) return [];
  if (mode === "diagonal") {
    return [
      `Для диагональной раскладки применён запас ${reservePercent}%: ${purchaseReserveTiles} шт. на подрезку углов, бой и непарные остатки.`,
    ];
  }
  return [
    `Запас ${reservePercent}%: ${purchaseReserveTiles} шт. сверх ${basePurchaseTiles} шт., необходимых на схему.`,
  ];
}

export function calculateTileLayout(
  surfaceW: number,
  surfaceH: number,
  tileW: number,
  tileH: number,
  groutMm: number,
  mode: LayoutMode = "straight",
  openingInput?: TileOpeningInput,
  requestedReservePercent = 0,
  startInput: TileLayoutStartInput = { mode: "edge" },
): TileLayoutResult {
  const clamped = clampLayoutInputs(surfaceW, surfaceH, tileW, tileH, groutMm);
  surfaceW = clamped.surfaceW;
  surfaceH = clamped.surfaceH;
  tileW = clamped.tileW;
  tileH = clamped.tileH;
  groutMm = clamped.groutMm;
  const requestedStart = normalizeTileLayoutStart(startInput, tileW, tileH);
  const effectiveStart = mode === "diagonal"
    ? normalizeTileLayoutStart({ mode: "center" }, tileW, tileH)
    : requestedStart;
  const opening = normalizeTileOpening(openingInput, surfaceW, surfaceH);
  const openingAreaMm2 = opening ? opening.widthMm * opening.heightMm : 0;
  const coveredAreaMm2 = Math.max(0, surfaceW * surfaceH - openingAreaMm2);
  const areaFields = { coveredAreaMm2, openingAreaMm2, opening };

  if (mode === "offset-half" || mode === "offset-third") {
    const baseWithoutOpening = calculateOffsetLayout(
      surfaceW,
      surfaceH,
      tileW,
      tileH,
      groutMm,
      mode,
      effectiveStart,
    );
    const base = applyOpeningToBaseLayout(baseWithoutOpening, opening, tileW, tileH);
    const purchase = calculatePurchaseReserve(base.basePurchaseTiles, requestedReservePercent, mode);
    return {
      ...base,
      ...purchase,
      ...areaFields,
      mode,
      notes: [
        ...buildOpeningNotes(opening),
        ...buildReserveNote(base.basePurchaseTiles, purchase.purchaseReserveTiles, purchase.reservePercent, mode),
        ...buildInputNotes(surfaceW, surfaceH, tileW, tileH, base),
      ],
    };
  }

  const baseWithoutOpening = calculateStraightLayout(
    surfaceW,
    surfaceH,
    tileW,
    tileH,
    groutMm,
    effectiveStart,
  );
  const base = applyOpeningToBaseLayout(baseWithoutOpening, opening, tileW, tileH);
  const inputNotes = buildInputNotes(surfaceW, surfaceH, tileW, tileH, base);

  if (mode === "diagonal") {
    const diagonal = buildDiagonalLayout(surfaceW, surfaceH, tileW, tileH, groutMm, opening);
    const visibleCells = diagonal.cells.filter((cell) => !cell.excludedByOpening);
    const wholeTiles = visibleCells.filter((cell) => cell.type === "whole").length;
    const edgeTiles = visibleCells.filter((cell) => cell.type === "edge").length;
    const openingEdgeTiles = visibleCells.filter((cell) => cell.type === "edge" && cell.cutByOpening).length;
    const perimeterEdgeTiles = edgeTiles - openingEdgeTiles;
    // Краевые ромбы режутся по диагонали — из одной плитки часто выходит
    // две краевые половины. Подрезы проёма считаем отдельно и консервативно.
    const edgeTilesConsumed = Math.ceil(perimeterEdgeTiles / 2) + openingEdgeTiles;
    const totalTiles = wholeTiles + edgeTiles;
    const basePurchaseTiles = wholeTiles + edgeTilesConsumed;
    const purchase = calculatePurchaseReserve(basePurchaseTiles, requestedReservePercent, mode);
    // Отход диагонали: целые ромбы укладываются без потерь, а каждый краевой
    // ромб режется под 45° с заметным остатком. Эмпирически отход диагонали
    // стабильно выше прямой раскладки (треугольные доборы по периметру,
    // частые непарные обрезки углов) — порядка 8–15%. Считаем как долю
    // израсходованной площади, не уложенной в дело: целые = 0 потерь,
    // краевые ромбы теряют ~40% площади израсходованной на них плитки.
    const side = Math.min(tileW, tileH);
    const tileArea = side * side;
    const consumedArea = (wholeTiles + edgeTilesConsumed) * tileArea;
    const exactNeedAreaMm2 = visibleCells.reduce(
      (sum, cell) => sum + Math.max(0, cell.placedAreaMm2 ?? tileArea),
      0,
    );
    const edgeWasteArea = opening
      ? Math.max(0, consumedArea - exactNeedAreaMm2)
      : edgeTilesConsumed * tileArea * 0.4;
    const wastePercent = consumedArea > 0 ? (edgeWasteArea / consumedArea) * 100 : 0;

    return {
      ...base,
      ...areaFields,
      mode: "diagonal",
      exactNeedAreaMm2,
      wholeTiles,
      cutTiles: edgeTiles,
      totalTiles,
      basePurchaseTiles,
      ...purchase,
      wastePercent,
      diagonal,
      notes: [
        ...buildOpeningNotes(opening),
        "Плитка уложена под 45° — по периметру идут треугольные доборы (половинки плиток).",
        "Диагональная сетка автоматически центрирована; ручной сдвиг для неё не применяется.",
        ...buildReserveNote(basePurchaseTiles, purchase.purchaseReserveTiles, purchase.reservePercent, mode),
        "Точный расчёт клея и затирки — в калькуляторе плитки (с запасом по схеме укладки).",
        ...inputNotes,
      ],
    };
  }

  const purchase = calculatePurchaseReserve(base.basePurchaseTiles, requestedReservePercent, mode);

  return {
    ...base,
    ...purchase,
    ...areaFields,
    mode: "straight",
    notes: [
      ...buildOpeningNotes(opening),
      ...buildReserveNote(base.basePurchaseTiles, purchase.purchaseReserveTiles, purchase.reservePercent, mode),
      ...inputNotes,
    ],
  };
}

function variantEdgeMetrics(
  result: TileLayoutResult,
  tileW: number,
  tileH: number,
): { minimumEdgeCutMm: number; narrowEdgeCount: number } {
  const cuts = [
    { value: result.cutLeft, threshold: tileW * 0.3 },
    { value: result.cutRight, threshold: tileW * 0.3 },
    { value: result.cutTop, threshold: tileH * 0.3 },
    { value: result.cutBottom, threshold: tileH * 0.3 },
  ].filter((cut) => cut.value > 0.5);
  return {
    minimumEdgeCutMm: cuts.length > 0
      ? Math.min(...cuts.map((cut) => cut.value))
      : Math.min(tileW, tileH),
    narrowEdgeCount: cuts.filter((cut) => cut.value < cut.threshold).length,
  };
}

/** Сравнивает практические варианты старта, не смешивая выбранный запас с геометрией. */
export function compareTileLayoutStartModes(
  input: TileLayoutStartComparisonInput,
): TileLayoutStartVariant[] {
  const modes: TileLayoutStartInput[] = [
    { mode: "edge" },
    { mode: "center" },
  ];
  if (input.includeCustom) {
    modes.push({
      mode: "custom",
      offsetXmm: input.customOffsetXmm,
      offsetYmm: input.customOffsetYmm,
    });
  }

  const variants = modes.map((start) => {
    const result = calculateTileLayout(
      input.surfaceW,
      input.surfaceH,
      input.tileW,
      input.tileH,
      input.groutMm,
      input.layoutMode,
      input.opening,
      input.reservePercent ?? 0,
      start,
    );
    return {
      mode: start.mode,
      result,
      ...variantEdgeMetrics(result, input.tileW, input.tileH),
      recommended: false,
    };
  });

  const ranked = [...variants].sort((a, b) => (
    a.narrowEdgeCount - b.narrowEdgeCount
    || a.result.basePurchaseTiles - b.result.basePurchaseTiles
    || a.result.cutTiles - b.result.cutTiles
    || a.result.wastePercent - b.result.wastePercent
    || b.minimumEdgeCutMm - a.minimumEdgeCutMm
  ));
  const recommendedMode = ranked[0]?.mode;
  return variants.map((variant) => ({
    ...variant,
    recommended: variant.mode === recommendedMode,
  }));
}

/**
 * Сравнивает два корректных способа привязать вертикальную раскладочную ось к
 * дверному проёму: провести её по центру целой плитки либо по центру шва.
 * Сначала исключаются узкие края, затем минимизируется закупка и подрезка.
 */
export function compareTileLayoutOpeningAxisStarts(
  input: TileLayoutStartComparisonInput & { opening: TileOpeningInput },
): TileOpeningAxisVariant[] {
  const opening = normalizeTileOpening(input.opening, input.surfaceW, input.surfaceH);
  if (!opening) return [];

  const openingCenterMm = opening.offsetLeftMm + opening.widthMm / 2;
  const verticalOffsetMm = centeredLeadingCut(input.surfaceH, input.tileH, input.groutMm);
  const candidates: Array<{ alignment: TileOpeningAxisAlignment; offsetXmm: number }> = [
    {
      alignment: "tile-center",
      offsetXmm: calculateOpeningTileCenterAxisOffset(openingCenterMm, input.tileW, input.groutMm),
    },
    {
      alignment: "grout-line",
      offsetXmm: calculateOpeningGroutAxisOffset(openingCenterMm, input.tileW, input.groutMm),
    },
  ];

  const variants = candidates.map((candidate) => {
    const result = calculateTileLayout(
      input.surfaceW,
      input.surfaceH,
      input.tileW,
      input.tileH,
      input.groutMm,
      input.layoutMode,
      opening,
      input.reservePercent ?? 0,
      { mode: "custom", offsetXmm: candidate.offsetXmm, offsetYmm: verticalOffsetMm },
    );
    return {
      ...candidate,
      result,
      ...variantEdgeMetrics(result, input.tileW, input.tileH),
      recommended: false,
    };
  });

  const ranked = [...variants].sort((a, b) => (
    a.narrowEdgeCount - b.narrowEdgeCount
    || a.result.basePurchaseTiles - b.result.basePurchaseTiles
    || a.result.cutTiles - b.result.cutTiles
    || a.result.wastePercent - b.result.wastePercent
    || b.minimumEdgeCutMm - a.minimumEdgeCutMm
  ));
  const recommendedAlignment = ranked[0]?.alignment;
  return variants.map((variant) => ({
    ...variant,
    recommended: variant.alignment === recommendedAlignment,
  }));
}
