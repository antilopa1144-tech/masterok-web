import { buildTileLayoutHref } from "@/lib/tools/tile-layout-to-calc";
import type { RoomDimensions } from "./geometry";

const FLOOR_TILE_MM: Record<number, [number, number]> = {
  0: [300, 300],
  1: [450, 450],
  2: [600, 600],
};

/** Ссылка на раскладку пола ванной/кухни по размерам комнаты. */
export function roomFloorLayoutHref(d: RoomDimensions): string {
  const [tileW, tileH] = FLOOR_TILE_MM[d.floorTileSize] ?? [300, 300];
  return buildTileLayoutHref({
    surfaceW: Math.round(d.length * 1000),
    surfaceH: Math.round(d.width * 1000),
    tileW,
    tileH,
    groutMm: 2,
    layoutMode: "straight",
  });
}
