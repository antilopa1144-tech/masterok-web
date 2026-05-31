/**
 * Расчёт и геометрия кирпичной кладки для инструмента «Раскладка кирпичной кладки».
 * Источник истины: сетка кирпичей по рядам → счётчики и схема перевязки.
 *
 * Отличие от tile-layout: у кирпича два «лица» — ЛОЖОК (длинная сторона к
 * зрителю, ~250×65) и ТЫЧОК (короткая, ~120×65). Тип перевязки определяет,
 * как ложки/тычки чередуются в ряду и между рядами.
 */

export type BondType = "stretcher" | "chain" | "flemish" | "bavarian";

export type BrickFace = "stretcher" | "header"; // ложок | тычок

export interface BrickCell {
  face: BrickFace;
  widthMm: number;
  /** Декоративный оттенок 0..2 (для баварской кладки); 0 у остальных. */
  tone: number;
  /** Обрезанный кирпич по краю ряда. */
  cut: boolean;
}

export interface BrickLayoutResult {
  rows: BrickCell[][];
  bond: BondType;
  /** Кирпичей всего по схеме (целые + половинки считаются как есть). */
  totalBricks: number;
  /** Целых кирпичей. */
  wholeBricks: number;
  /** Половинок/обрезков по краям. */
  cutBricks: number;
  /** К закупке с запасом на бой/подрезку. */
  purchaseBricks: number;
  surfaceWmm: number;
  surfaceHmm: number;
  brickLmm: number;
  brickHmm: number;
  notes: string[];
}

export interface BondOption {
  value: BondType;
  label: string;
  desc: string;
}

export const BOND_OPTIONS: BondOption[] = [
  { value: "stretcher", label: "Ложковая", desc: "Все ложки, сдвиг ряда на ½ кирпича — самая частая" },
  { value: "chain", label: "Цепная (однорядная)", desc: "Ряд ложков чередуется с рядом тычков" },
  { value: "flemish", label: "Фламандская", desc: "В каждом ряду ложок и тычок чередуются" },
  { value: "bavarian", label: "Баварская", desc: "Ложковая с кирпичами разных оттенков (декор)" },
];

/** Стандартные форматы кирпича (длина × высота ложка, мм). */
export const BRICK_SIZE_PRESETS = [
  { label: "Одинарный 250×65", l: 250, h: 65 },
  { label: "Полуторный 250×88", l: 250, h: 88 },
  { label: "Двойной 250×138", l: 250, h: 138 },
  { label: "Евро 250×65", l: 250, h: 65 },
] as const;

export const WALL_SIZE_PRESETS = [
  { label: "Простенок 2×1.5 м", w: 2000, h: 1500 },
  { label: "Стена 4×2.7 м", w: 4000, h: 2700 },
  { label: "Фасад 6×3 м", w: 6000, h: 3000 },
] as const;

/** Запас на бой и подрезку кирпича, % (норматив ~5%). */
const PURCHASE_RESERVE = 0.05;
/** Тычок ≈ половина ложка по ширине лицевой части. */
const HEADER_RATIO = 0.48;

export function clampBrickInputs(
  surfaceW: number,
  surfaceH: number,
  brickL: number,
  brickH: number,
  jointMm: number,
): { surfaceW: number; surfaceH: number; brickL: number; brickH: number; jointMm: number } {
  return {
    surfaceW: Math.max(250, Math.min(30000, surfaceW)),
    surfaceH: Math.max(65, Math.min(15000, surfaceH)),
    brickL: Math.max(60, Math.min(400, brickL)),
    brickH: Math.max(40, Math.min(200, brickH)),
    jointMm: Math.max(0, Math.min(20, jointMm)),
  };
}

/**
 * Заполняет один ряд кирпичами заданной последовательности «лиц».
 * faceAt(i) возвращает тип i-го кирпича; ряд режется по ширине стены.
 */
function buildRow(
  surfaceW: number,
  brickL: number,
  jointMm: number,
  faceAt: (index: number) => BrickFace,
  toneAt: (index: number) => number,
  leadOffsetMm: number,
): BrickCell[] {
  const row: BrickCell[] = [];
  const headerW = Math.round(brickL * HEADER_RATIO);
  let x = 0;
  let i = 0;

  // Стартовое смещение (перевязка) — обрезанный кирпич в начале ряда.
  if (leadOffsetMm > 0) {
    const w = Math.min(leadOffsetMm, surfaceW);
    row.push({ face: "stretcher", widthMm: w, tone: toneAt(i), cut: true });
    x = w + jointMm;
    i++;
  }

  while (x < surfaceW - 0.5) {
    const face = faceAt(i);
    const fullW = face === "header" ? headerW : brickL;
    const remaining = surfaceW - x;
    if (remaining >= fullW) {
      row.push({ face, widthMm: fullW, tone: toneAt(i), cut: false });
      x += fullW + jointMm;
    } else {
      // хвост ряда — обрезок
      const w = remaining;
      row.push({ face, widthMm: Math.max(1, w), tone: toneAt(i), cut: true });
      break;
    }
    i++;
  }
  return row;
}

// Псевдослучайный, но детерминированный оттенок для баварской кладки.
function bavarianTone(row: number, col: number): number {
  const h = (row * 73856093) ^ (col * 19349663);
  return Math.abs(h) % 3;
}

export function calculateBrickwork(
  surfaceW: number,
  surfaceH: number,
  brickL: number,
  brickH: number,
  jointMm: number,
  bond: BondType = "stretcher",
): BrickLayoutResult {
  const clamped = clampBrickInputs(surfaceW, surfaceH, brickL, brickH, jointMm);
  surfaceW = clamped.surfaceW;
  surfaceH = clamped.surfaceH;
  brickL = clamped.brickL;
  brickH = clamped.brickH;
  jointMm = clamped.jointMm;

  const stepH = brickH + jointMm;
  const rowCount = Math.max(1, Math.ceil(surfaceH / stepH));

  const rows: BrickCell[][] = [];
  for (let r = 0; r < rowCount; r++) {
    let faceAt: (i: number) => BrickFace;
    let toneAt: (i: number) => number = () => 0;
    let lead = 0;

    switch (bond) {
      case "stretcher":
        faceAt = () => "stretcher";
        lead = r % 2 === 1 ? Math.round(brickL / 2) : 0;
        break;
      case "chain":
        // чётный ряд — ложки, нечётный — тычки
        faceAt = r % 2 === 0 ? () => "stretcher" : () => "header";
        lead = r % 2 === 1 ? Math.round(brickL * HEADER_RATIO * 0.5) : 0;
        break;
      case "flemish":
        // в ряду чередуются ложок-тычок; соседний ряд сдвинут
        faceAt = (i) => (i % 2 === 0 ? "stretcher" : "header");
        lead = r % 2 === 1 ? Math.round(brickL / 2) : 0;
        break;
      case "bavarian":
      default:
        faceAt = () => "stretcher";
        toneAt = (i) => bavarianTone(r, i);
        lead = r % 2 === 1 ? Math.round(brickL / 2) : 0;
        break;
    }

    rows.push(buildRow(surfaceW, brickL, jointMm, faceAt, toneAt, lead));
  }

  // Счётчики
  let whole = 0;
  let cut = 0;
  for (const row of rows) {
    for (const b of row) {
      if (b.cut) cut++;
      else whole++;
    }
  }
  const total = whole + cut;
  // Обрезки часто переиспользуются на парный край (как у плитки) → к закупке
  // целые + половина обрезков + запас на бой.
  const effectiveBricks = whole + Math.ceil(cut / 2);
  const purchaseBricks = Math.ceil(effectiveBricks * (1 + PURCHASE_RESERVE));

  const notes: string[] = [];
  if (surfaceW < brickL || surfaceH < brickH) {
    notes.push("Стена меньше одного кирпича — проверьте, что размеры в миллиметрах.");
  }
  notes.push(
    "Шов кладки 10–12 мм — стандарт. Перевязка обязательна: вертикальные швы соседних рядов не должны совпадать (минимум ¼ кирпича), иначе кладка теряет прочность.",
  );
  if (bond === "bavarian") {
    notes.push("Баварская кладка: закупайте кирпич 2–4 близких оттенков и смешивайте из разных паллет для естественного рисунка.");
  }

  return {
    rows,
    bond,
    totalBricks: total,
    wholeBricks: whole,
    cutBricks: cut,
    purchaseBricks,
    surfaceWmm: surfaceW,
    surfaceHmm: surfaceH,
    brickLmm: brickL,
    brickHmm: brickH,
    notes,
  };
}

/** Размеры схемы в мм для SVG viewBox. */
export function computeBrickSvgBoundsMm(
  result: BrickLayoutResult,
  jointMm: number,
): { widthMm: number; heightMm: number } {
  const { rows, brickHmm } = result;
  if (rows.length === 0) return { widthMm: 0, heightMm: 0 };
  let maxW = 0;
  for (const row of rows) {
    const w = row.reduce((s, b, i) => s + b.widthMm + (i < row.length - 1 ? jointMm : 0), 0);
    maxW = Math.max(maxW, w);
  }
  const h = rows.length * brickHmm + (rows.length - 1) * jointMm;
  return { widthMm: maxW, heightMm: h };
}
