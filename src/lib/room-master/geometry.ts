/** Общие размеры помещения для мастера «Мой ремонт». */
export interface RoomDimensions {
  length: number;
  width: number;
  height: number;
  doorWidth: number;
  floorTileSize: number;
  wallTileSize: number;
  hasWaterproofing: number;
}

export const DEFAULT_ROOM_DIMENSIONS: RoomDimensions = {
  length: 2.5,
  width: 1.7,
  height: 2.5,
  doorWidth: 0.7,
  floorTileSize: 0,
  wallTileSize: 1,
  hasWaterproofing: 1,
};

export type RoomMeasureKey = "length" | "width" | "height" | "doorWidth";

export const ROOM_MEASURE_LIMITS: Record<RoomMeasureKey, { min: number; max: number }> = {
  length: { min: 1, max: 12 },
  width: { min: 1, max: 12 },
  height: { min: 2, max: 3.5 },
  doorWidth: { min: 0.6, max: 1.2 },
};

export function parseRoomMeasure(value: string): number {
  if (value.trim() === "") return Number.NaN;
  return Number.parseFloat(value.replace(",", "."));
}

export function validateRoomMeasures(
  values: Pick<RoomDimensions, RoomMeasureKey>,
): Partial<Record<RoomMeasureKey, string>> {
  const labels: Record<RoomMeasureKey, string> = {
    length: "Длина",
    width: "Ширина",
    height: "Высота",
    doorWidth: "Ширина двери",
  };
  const emptyLabels: Record<RoomMeasureKey, string> = {
    length: "длину",
    width: "ширину",
    height: "высоту",
    doorWidth: "ширину двери",
  };
  const errors: Partial<Record<RoomMeasureKey, string>> = {};

  for (const key of Object.keys(ROOM_MEASURE_LIMITS) as RoomMeasureKey[]) {
    const value = values[key];
    const { min, max } = ROOM_MEASURE_LIMITS[key];
    if (!Number.isFinite(value)) {
      errors[key] = `Укажите ${emptyLabels[key]}.`;
    } else if (value < min || value > max) {
      errors[key] = `${labels[key]}: от ${min.toLocaleString("ru-RU")} до ${max.toLocaleString("ru-RU")} м.`;
    }
  }

  return errors;
}

export function floorAreaM2(d: RoomDimensions): number {
  return d.length * d.width;
}

/** Площадь стен минус дверной проём (высота проёма до 2.1 м). */
export function wallAreaM2(d: RoomDimensions): number {
  const doorHeight = Math.min(d.height, 2.1);
  const gross = 2 * (d.length + d.width) * d.height;
  return Math.max(0, gross - d.doorWidth * doorHeight);
}

export function perimeterM(d: RoomDimensions): number {
  return 2 * (d.length + d.width);
}
