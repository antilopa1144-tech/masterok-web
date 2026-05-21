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
