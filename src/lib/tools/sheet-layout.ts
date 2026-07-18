/**
 * Визуальная раскладка прямоугольных листовых материалов.
 *
 * Модуль разделяет три задачи: геометрию поверхности, монтажную разбежку и
 * раскрой физических листов. Обрезки упаковываются обратно в листы без
 * поворота — направление длинной оси и заводских кромок не меняется.
 */

export type SheetMaterial = "drywall" | "osb" | "custom";
export type SheetSurface = "wall" | "floor" | "ceiling";
export type SheetOrientation = "auto" | "portrait" | "landscape";
export type ResolvedSheetOrientation = Exclude<SheetOrientation, "auto">;
export type SheetStagger = "aligned" | "half";

export interface SheetLayoutInput {
  surfaceWidthMm: number;
  surfaceHeightMm: number;
  sheetWidthMm: number;
  sheetLengthMm: number;
  material: SheetMaterial;
  surface: SheetSurface;
  orientation: SheetOrientation;
  stagger: SheetStagger;
  layers: 1 | 2;
  jointGapMm: number;
  reservePercent: number;
}

export interface SheetPlacement {
  id: string;
  layer: number;
  row: number;
  x: number;
  y: number;
  widthMm: number;
  heightMm: number;
  whole: boolean;
}

export interface SheetLayerLayout {
  layer: number;
  placements: SheetPlacement[];
}

export interface SheetCutPlacement {
  pieceId: string;
  layer: number;
  x: number;
  y: number;
  widthMm: number;
  heightMm: number;
}

export interface SheetStockPlan {
  index: number;
  cuts: SheetCutPlacement[];
  usedAreaM2: number;
  offcutAreaM2: number;
  largestOffcut?: { widthMm: number; heightMm: number; areaM2: number };
}

export interface SheetOrientationComparison {
  orientation: ResolvedSheetOrientation;
  baseSheets: number;
  cutPieces: number;
  wastePercent: number;
}

export interface SheetLayoutResult {
  input: SheetLayoutInput;
  requestedOrientation: SheetOrientation;
  orientation: ResolvedSheetOrientation;
  orientedSheetWidthMm: number;
  orientedSheetHeightMm: number;
  layers: SheetLayerLayout[];
  stock: SheetStockPlan[];
  surfaceAreaM2: number;
  coveredAreaM2: number;
  netMaterialAreaM2: number;
  sheetAreaM2: number;
  layoutPieces: number;
  wholePlacements: number;
  cutPieces: number;
  baseSheets: number;
  reserveSheets: number;
  purchaseSheets: number;
  offcutAreaM2: number;
  wastePercent: number;
  comparisons: SheetOrientationComparison[];
  warnings: string[];
  notes: string[];
}

export const SHEET_PRESETS = [
  { id: "gkl-2500", material: "drywall" as const, label: "ГКЛ 1200 × 2500", widthMm: 1200, lengthMm: 2500 },
  { id: "gkl-3000", material: "drywall" as const, label: "ГКЛ 1200 × 3000", widthMm: 1200, lengthMm: 3000 },
  { id: "gkl-small", material: "drywall" as const, label: "ГКЛ 600 × 1500", widthMm: 600, lengthMm: 1500 },
  { id: "osb-2500", material: "osb" as const, label: "ОСП 1250 × 2500", widthMm: 1250, lengthMm: 2500 },
  { id: "osb-2440", material: "osb" as const, label: "ОСП 1220 × 2440", widthMm: 1220, lengthMm: 2440 },
  { id: "osb-tg", material: "osb" as const, label: "ОСП шип-паз 675 × 2500", widthMm: 675, lengthMm: 2500 },
] as const;

const EPSILON = 0.01;

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, value));
}

function round(value: number, digits = 2): number {
  const factor = 10 ** digits;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

export function normalizeSheetLayoutInput(raw: SheetLayoutInput): SheetLayoutInput {
  return {
    surfaceWidthMm: round(clamp(raw.surfaceWidthMm, 300, 30_000), 1),
    surfaceHeightMm: round(clamp(raw.surfaceHeightMm, 300, 30_000), 1),
    sheetWidthMm: round(clamp(raw.sheetWidthMm, 300, 3_000), 1),
    sheetLengthMm: round(clamp(raw.sheetLengthMm, 600, 6_000), 1),
    material: raw.material === "drywall" || raw.material === "osb" ? raw.material : "custom",
    surface: raw.surface === "floor" || raw.surface === "ceiling" ? raw.surface : "wall",
    orientation: raw.orientation === "portrait" || raw.orientation === "landscape" ? raw.orientation : "auto",
    stagger: raw.stagger === "aligned" ? "aligned" : "half",
    layers: raw.layers === 2 ? 2 : 1,
    jointGapMm: round(clamp(raw.jointGapMm, 0, 20), 1),
    reservePercent: round(clamp(raw.reservePercent, 0, 30), 1),
  };
}

function visibleSegments(total: number, unit: number, offset: number, gap: number): Array<{ start: number; size: number }> {
  const segments: Array<{ start: number; size: number }> = [];
  let cursor = -offset;
  let guard = 0;
  while (cursor < total - EPSILON && guard < 10_000) {
    const start = Math.max(0, cursor);
    const end = Math.min(total, cursor + unit);
    if (end - start > EPSILON) segments.push({ start, size: end - start });
    cursor += unit + gap;
    guard += 1;
  }
  return segments;
}

function buildLayers(
  input: SheetLayoutInput,
  sheetWidth: number,
  sheetHeight: number,
): SheetLayerLayout[] {
  return Array.from({ length: input.layers }, (_, layerIndex) => {
    const layer = layerIndex + 1;
    const layerXShift = layerIndex === 0 ? 0 : sheetWidth / 2;
    const layerYShift = layerIndex === 0 || input.surfaceHeightMm <= sheetHeight
      ? 0
      : Math.min(400, sheetHeight / 2);
    const rows = visibleSegments(input.surfaceHeightMm, sheetHeight, layerYShift, input.jointGapMm);
    const placements: SheetPlacement[] = [];

    rows.forEach((row, rowIndex) => {
      const rowShift = input.stagger === "half" && rowIndex % 2 === 1 ? sheetWidth / 2 : 0;
      const xShift = (rowShift + layerXShift) % (sheetWidth + input.jointGapMm);
      const columns = visibleSegments(input.surfaceWidthMm, sheetWidth, xShift, input.jointGapMm);
      columns.forEach((column, columnIndex) => {
        const whole = Math.abs(column.size - sheetWidth) <= EPSILON
          && Math.abs(row.size - sheetHeight) <= EPSILON;
        placements.push({
          id: `layer-${layer}-row-${rowIndex + 1}-piece-${columnIndex + 1}`,
          layer,
          row: rowIndex + 1,
          x: round(column.start, 2),
          y: round(row.start, 2),
          widthMm: round(column.size, 2),
          heightMm: round(row.size, 2),
          whole,
        });
      });
    });

    return { layer, placements };
  });
}

interface FreeRect { x: number; y: number; width: number; height: number }
interface MutableBin { cuts: SheetCutPlacement[]; free: FreeRect[]; usedArea: number }

function mergeFreeRectangles(rectangles: FreeRect[]): FreeRect[] {
  const result = rectangles.filter((rect) => rect.width > EPSILON && rect.height > EPSILON);
  let merged = true;
  while (merged) {
    merged = false;
    outer: for (let a = 0; a < result.length; a += 1) {
      for (let b = a + 1; b < result.length; b += 1) {
        const first = result[a];
        const second = result[b];
        if (Math.abs(first.x - second.x) <= EPSILON
          && Math.abs(first.width - second.width) <= EPSILON
          && (Math.abs(first.y + first.height - second.y) <= EPSILON
            || Math.abs(second.y + second.height - first.y) <= EPSILON)) {
          result[a] = {
            x: first.x,
            y: Math.min(first.y, second.y),
            width: first.width,
            height: first.height + second.height,
          };
          result.splice(b, 1);
          merged = true;
          break outer;
        }
        if (Math.abs(first.y - second.y) <= EPSILON
          && Math.abs(first.height - second.height) <= EPSILON
          && (Math.abs(first.x + first.width - second.x) <= EPSILON
            || Math.abs(second.x + second.width - first.x) <= EPSILON)) {
          result[a] = {
            x: Math.min(first.x, second.x),
            y: first.y,
            width: first.width + second.width,
            height: first.height,
          };
          result.splice(b, 1);
          merged = true;
          break outer;
        }
      }
    }
  }
  return result;
}

function placeIntoFreeRect(free: FreeRect, width: number, height: number): FreeRect[] {
  const remainingW = free.width - width;
  const remainingH = free.height - height;
  if (remainingW <= remainingH) {
    return [
      { x: free.x + width, y: free.y, width: remainingW, height },
      { x: free.x, y: free.y + height, width: free.width, height: remainingH },
    ];
  }
  return [
    { x: free.x + width, y: free.y, width: remainingW, height: free.height },
    { x: free.x, y: free.y + height, width, height: remainingH },
  ];
}

function packPieces(
  pieces: SheetPlacement[],
  sheetWidth: number,
  sheetHeight: number,
  sortMode: "area" | "height" | "width" = "area",
): SheetStockPlan[] {
  const sorted = [...pieces].sort((a, b) => {
    if (sortMode === "height") return b.heightMm - a.heightMm || b.widthMm - a.widthMm;
    if (sortMode === "width") return b.widthMm - a.widthMm || b.heightMm - a.heightMm;
    return b.widthMm * b.heightMm - a.widthMm * a.heightMm
      || Math.max(b.widthMm, b.heightMm) - Math.max(a.widthMm, a.heightMm);
  });
  const bins: MutableBin[] = [];

  for (const piece of sorted) {
    let best: { bin: number; free: number; score: number } | undefined;
    bins.forEach((bin, binIndex) => {
      bin.free.forEach((free, freeIndex) => {
        if (piece.widthMm <= free.width + EPSILON && piece.heightMm <= free.height + EPSILON) {
          const score = free.width * free.height - piece.widthMm * piece.heightMm;
          if (!best || score < best.score) best = { bin: binIndex, free: freeIndex, score };
        }
      });
    });

    if (!best) {
      bins.push({
        cuts: [],
        free: [{ x: 0, y: 0, width: sheetWidth, height: sheetHeight }],
        usedArea: 0,
      });
      best = { bin: bins.length - 1, free: 0, score: sheetWidth * sheetHeight - piece.widthMm * piece.heightMm };
    }

    const bin = bins[best.bin];
    const free = bin.free[best.free];
    bin.cuts.push({
      pieceId: piece.id,
      layer: piece.layer,
      x: round(free.x, 2),
      y: round(free.y, 2),
      widthMm: piece.widthMm,
      heightMm: piece.heightMm,
    });
    bin.usedArea += piece.widthMm * piece.heightMm;
    bin.free.splice(best.free, 1, ...placeIntoFreeRect(free, piece.widthMm, piece.heightMm));
    bin.free = mergeFreeRectangles(bin.free);
  }

  const sheetAreaMm2 = sheetWidth * sheetHeight;
  return bins.map((bin, index) => {
    const largest = [...bin.free].sort((a, b) => b.width * b.height - a.width * a.height)[0];
    return {
      index: index + 1,
      cuts: bin.cuts,
      usedAreaM2: round(bin.usedArea / 1_000_000, 3),
      offcutAreaM2: round((sheetAreaMm2 - bin.usedArea) / 1_000_000, 3),
      largestOffcut: largest ? {
        widthMm: round(largest.width, 0),
        heightMm: round(largest.height, 0),
        areaM2: round(largest.width * largest.height / 1_000_000, 3),
      } : undefined,
    };
  });
}

interface OrientationCalculation {
  orientation: ResolvedSheetOrientation;
  sheetWidth: number;
  sheetHeight: number;
  layers: SheetLayerLayout[];
  stock: SheetStockPlan[];
  wholePlacements: number;
  cutPieces: number;
  wastePercent: number;
}

function calculateOrientation(
  input: SheetLayoutInput,
  orientation: ResolvedSheetOrientation,
): OrientationCalculation {
  const sheetWidth = orientation === "portrait" ? input.sheetWidthMm : input.sheetLengthMm;
  const sheetHeight = orientation === "portrait" ? input.sheetLengthMm : input.sheetWidthMm;
  const layers = buildLayers(input, sheetWidth, sheetHeight);
  const pieces = layers.flatMap((layer) => layer.placements);
  const stock = (["area", "height", "width"] as const)
    .map((mode) => packPieces(pieces, sheetWidth, sheetHeight, mode))
    .sort((a, b) => a.length - b.length)[0];
  const coveredArea = pieces.reduce((sum, piece) => sum + piece.widthMm * piece.heightMm, 0);
  const purchasedArea = stock.length * sheetWidth * sheetHeight;
  return {
    orientation,
    sheetWidth,
    sheetHeight,
    layers,
    stock,
    wholePlacements: pieces.filter((piece) => piece.whole).length,
    cutPieces: pieces.filter((piece) => !piece.whole).length,
    wastePercent: purchasedArea > 0 ? (purchasedArea - coveredArea) / purchasedArea * 100 : 0,
  };
}

function buildNotes(input: SheetLayoutInput, orientation: ResolvedSheetOrientation): string[] {
  const notes = [
    "Схема считает прямоугольную поверхность без вычета окон и дверей: вокруг проёмов листы лучше раскладывать по фактическому каркасу.",
    "Куски раскладываются по листам без поворота: сохраняется направление длинной оси и заводских кромок.",
    "Все стыки и края листов должны иметь опору. Эта схема раскроя не заменяет проект каркаса, лаг или обрешётки.",
    "На открытых швах сохраняйте заводскую кромку, где это возможно; с обрезанных кромок ГКЛ перед шпаклеванием снимают фаску по системе производителя.",
  ];
  if (input.material === "drywall") {
    notes.push(orientation === "portrait"
      ? "ГКЛ показан вертикально. Торцевые стыки соседних рядов и слоёв разнесены не менее чем на 400 мм."
      : "Горизонтальную раскладку ГКЛ применяйте только если поперечные стыки поддержаны элементами каркаса.");
  }
  if (input.material === "osb" && input.surface !== "wall") {
    notes.push("Для пола и потолка длинную (силовую) ось ОСП ориентируют поперёк лаг или балок; проверьте направление опор на объекте.");
  }
  if (input.material === "osb") {
    notes.push(`Между плитами на схеме оставлен зазор ${input.jointGapMm.toLocaleString("ru-RU")} мм; периметрический зазор задаётся по системе пола или обшивки отдельно.`);
  }
  return notes;
}

export function calculateSheetLayout(raw: SheetLayoutInput): SheetLayoutResult {
  const input = normalizeSheetLayoutInput(raw);
  const portrait = calculateOrientation(input, "portrait");
  const landscape = calculateOrientation(input, "landscape");
  const candidates = [portrait, landscape];
  const selected = input.orientation === "auto"
    ? [...candidates].sort((a, b) => (
      a.stock.length - b.stock.length
      || (input.material === "drywall" && input.surface === "wall"
        ? (a.orientation === "portrait" ? -1 : 1)
        : 0)
      || a.wastePercent - b.wastePercent
      || a.cutPieces - b.cutPieces
      || (a.orientation === "portrait" ? -1 : 1)
    ))[0]
    : candidates.find((candidate) => candidate.orientation === input.orientation)!;
  const surfaceAreaM2 = input.surfaceWidthMm * input.surfaceHeightMm / 1_000_000;
  const coveredAreaM2 = surfaceAreaM2 * input.layers;
  const netMaterialAreaM2 = selected.layers.flatMap((layer) => layer.placements)
    .reduce((sum, piece) => sum + piece.widthMm * piece.heightMm / 1_000_000, 0);
  const sheetAreaM2 = input.sheetWidthMm * input.sheetLengthMm / 1_000_000;
  const baseSheets = selected.stock.length;
  const reserveSheets = baseSheets > 0 ? Math.ceil(baseSheets * input.reservePercent / 100) : 0;
  const offcutAreaM2 = baseSheets * sheetAreaM2 - netMaterialAreaM2;
  const warnings: string[] = [];
  const narrowPieces = selected.layers.flatMap((layer) => layer.placements)
    .filter((piece) => piece.widthMm < 150 || piece.heightMm < 150);
  if (narrowPieces.length > 0) {
    warnings.push("В схеме есть полосы уже 150 мм. До резки проверьте стартовую линию и положение каркаса — узкую подрезку часто можно перенести на другой край.");
  }
  if (input.material === "drywall" && selected.orientation === "landscape") {
    warnings.push("Для ГКЛ выбрана горизонтальная ориентация. Каждый поперечный стык нужно поддержать перемычкой каркаса.");
  }
  if (input.stagger === "aligned") {
    warnings.push("Стыки стоят в одну линию. Для многорядной или двухслойной обшивки обычно нужна разбежка — проверьте систему производителя.");
  }
  if (input.material === "osb" && input.jointGapMm <= 0) {
    warnings.push("Для ОСП указан нулевой межлистовой зазор. Проверьте инструкцию производителя: плитам обычно оставляют место на изменение размеров.");
  }

  return {
    input,
    requestedOrientation: input.orientation,
    orientation: selected.orientation,
    orientedSheetWidthMm: selected.sheetWidth,
    orientedSheetHeightMm: selected.sheetHeight,
    layers: selected.layers,
    stock: selected.stock,
    surfaceAreaM2: round(surfaceAreaM2, 2),
    coveredAreaM2: round(coveredAreaM2, 2),
    netMaterialAreaM2: round(netMaterialAreaM2, 2),
    sheetAreaM2: round(sheetAreaM2, 3),
    layoutPieces: selected.layers.reduce((sum, layer) => sum + layer.placements.length, 0),
    wholePlacements: selected.wholePlacements,
    cutPieces: selected.cutPieces,
    baseSheets,
    reserveSheets,
    purchaseSheets: baseSheets + reserveSheets,
    offcutAreaM2: round(Math.max(0, offcutAreaM2), 2),
    wastePercent: round(selected.wastePercent, 1),
    comparisons: candidates.map((candidate) => ({
      orientation: candidate.orientation,
      baseSheets: candidate.stock.length,
      cutPieces: candidate.cutPieces,
      wastePercent: round(candidate.wastePercent, 1),
    })),
    warnings,
    notes: buildNotes(input, selected.orientation),
  };
}
