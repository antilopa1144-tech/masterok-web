import type { RoomPackId } from "@/lib/room-master/packs";

export const ROOM_MASTER_TOOL_SLUG = "moy-remont";
export const RENOVATION_COST_TOOL_SLUG = "stoimost-remonta";

const MIN_RENOVATION_AREA_M2 = 5;
const MAX_RENOVATION_AREA_M2 = 500;

type SearchParamsReader = Pick<URLSearchParams, "get">;

export interface RoomRenovationCostTransfer {
  areaM2: number;
  packId: RoomPackId;
}

function isRoomPackId(value: string | null): value is RoomPackId {
  return value === "bathroom" || value === "kitchen" || value === "room";
}

function normalizeArea(areaM2: number): number | null {
  if (!Number.isFinite(areaM2) || areaM2 < MIN_RENOVATION_AREA_M2 || areaM2 > MAX_RENOVATION_AREA_M2) {
    return null;
  }
  return Math.round(areaM2 * 100) / 100;
}

export function buildRenovationCostHrefFromRoom({
  areaM2,
  packId,
}: RoomRenovationCostTransfer): string | null {
  const normalizedArea = normalizeArea(areaM2);
  if (normalizedArea === null) return null;

  const params = new URLSearchParams({
    area: String(normalizedArea),
    scope: "room",
    pack: packId,
    from: ROOM_MASTER_TOOL_SLUG,
  });
  return `/instrumenty/${RENOVATION_COST_TOOL_SLUG}/?${params}`;
}

export function readRenovationCostRoomTransfer(
  params: SearchParamsReader,
): RoomRenovationCostTransfer | null {
  if (params.get("from") !== ROOM_MASTER_TOOL_SLUG || params.get("scope") !== "room") return null;

  const packId = params.get("pack");
  const areaM2 = normalizeArea(Number(params.get("area")));
  if (!isRoomPackId(packId) || areaM2 === null) return null;

  return { areaM2, packId };
}

export function buildRoomMasterHrefFromRenovationCost(): string {
  return `/instrumenty/${ROOM_MASTER_TOOL_SLUG}/?from=${RENOVATION_COST_TOOL_SLUG}`;
}
