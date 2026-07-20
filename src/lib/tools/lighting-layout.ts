/** Геометрическая схема равномерной расстановки точечных светильников. */

export type LightingPattern = "grid" | "staggered";

export interface LightingLayoutInput {
  roomWidthMm: number;
  roomLengthMm: number;
  columns: number;
  rows: number;
  wallOffsetXmm: number;
  wallOffsetYmm: number;
  pattern: LightingPattern;
}

export interface LightPoint {
  id: string;
  row: number;
  column: number;
  xMm: number;
  yMm: number;
}

export interface LightingLayoutResult {
  input: LightingLayoutInput;
  points: LightPoint[];
  count: number;
  roomAreaM2: number;
  spacingXmm: number;
  spacingYmm: number;
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

export function calculateLightingLayout(raw: LightingLayoutInput): LightingLayoutResult {
  const roomWidthMm = round(clamp(raw.roomWidthMm, 500, 30_000), 0);
  const roomLengthMm = round(clamp(raw.roomLengthMm, 500, 30_000), 0);
  const columns = Math.round(clamp(raw.columns, 1, 20));
  const rows = Math.round(clamp(raw.rows, 1, 20));
  const maxOffsetX = Math.max(0, roomWidthMm / 2 - 50);
  const maxOffsetY = Math.max(0, roomLengthMm / 2 - 50);
  const wallOffsetXmm = round(clamp(raw.wallOffsetXmm, 0, maxOffsetX), 0);
  const wallOffsetYmm = round(clamp(raw.wallOffsetYmm, 0, maxOffsetY), 0);
  const pattern: LightingPattern = raw.pattern === "staggered" ? "staggered" : "grid";
  const usableWidth = Math.max(0, roomWidthMm - wallOffsetXmm * 2);
  const usableLength = Math.max(0, roomLengthMm - wallOffsetYmm * 2);
  const spacingXmm = columns > 1 ? usableWidth / (columns - 1) : 0;
  const spacingYmm = rows > 1 ? usableLength / (rows - 1) : 0;
  const points: LightPoint[] = [];

  for (let row = 0; row < rows; row += 1) {
    const shifted = pattern === "staggered" && row % 2 === 1 && columns > 1;
    const rowInset = shifted ? spacingXmm / 2 : 0;
    const rowUsable = Math.max(0, usableWidth - rowInset * 2);
    const rowSpacing = columns > 1 ? rowUsable / (columns - 1) : 0;
    for (let column = 0; column < columns; column += 1) {
      points.push({
        id: `light-${row + 1}-${column + 1}`,
        row: row + 1,
        column: column + 1,
        xMm: round(columns === 1 ? roomWidthMm / 2 : wallOffsetXmm + rowInset + column * rowSpacing, 1),
        yMm: round(rows === 1 ? roomLengthMm / 2 : wallOffsetYmm + row * spacingYmm, 1),
      });
    }
  }

  const warnings: string[] = [];
  if (columns > 1 && spacingXmm < 250) warnings.push("Светильники по ширине стоят ближе 250 мм друг к другу — проверьте габариты корпусов и закладных.");
  if (rows > 1 && spacingYmm < 250) warnings.push("Светильники по длине стоят ближе 250 мм друг к другу — проверьте габариты корпусов и закладных.");

  return {
    input: { roomWidthMm, roomLengthMm, columns, rows, wallOffsetXmm, wallOffsetYmm, pattern },
    points,
    count: points.length,
    roomAreaM2: round(roomWidthMm * roomLengthMm / 1_000_000, 2),
    spacingXmm: round(spacingXmm, 0),
    spacingYmm: round(spacingYmm, 0),
    warnings,
    notes: [
      "Схема отвечает только за ровную геометрию. Достаточность света проверяют по световому потоку, углу рассеивания, высоте потолка и назначению помещения.",
      "До монтажа отметьте на плане люстру, карниз, шкафы, экран телевизора, вентиляцию и трассы проводки — сетку вокруг них корректируют на объекте.",
      "Для натяжного и подвесного потолка под каждый прибор заранее предусматривают совместимую закладную.",
    ],
  };
}
