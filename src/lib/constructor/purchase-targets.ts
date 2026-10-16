import { tileSupplyArea, type ConstructorRoom, type PurchaseLine, type RoomCalculation, type Wall } from "./core";

export interface PurchaseTarget { roomId: string; label: string; surface: "floor" | "walls"; wall?: Wall }
export type PurchaseSettingsSection = "packaging" | "supplies";

function mixtureTarget(room: ConstructorRoom): PurchaseTarget | undefined {
  const wall = room.floor.kind === "tile" ? undefined : room.wallTiles.findIndex(Boolean);
  if (wall === -1) return;
  return { roomId: room.id, surface: wall === undefined ? "floor" : "walls", wall: wall as Wall | undefined,
    label: `${room.name} · ${wall === undefined ? "Пол" : `Стена ${wall + 1}`}` };
}

/** Missing enabled mixtures are absent from purchase lines, but still need an edit destination. */
export function missingSupplyTargets(rooms: readonly ConstructorRoom[], calculations: readonly RoomCalculation[]) {
  return rooms.flatMap(room => {
    const calculation = calculations.find(item => item.roomId === room.id);
    if (!calculation || tileSupplyArea(calculation) <= 0) return [];
    const missing = (["adhesive", "grout"] as const).filter(kind => room.tileSupplies?.[kind]?.consumptionKgM2 === 0);
    const target = mixtureTarget(room);
    return missing.length && target ? [{ target, roomName: room.name, missing }] : [];
  });
}

/** Navigation only: use the engine's source references, never infer quantities. */
export function purchaseTargets(line: PurchaseLine, rooms: readonly ConstructorRoom[]): PurchaseTarget[] {
  const targets: PurchaseTarget[] = [];
  const add = (roomId: string, wall?: Wall) => {
    const room = rooms.find(item => item.id === roomId);
    if (!room || targets.some(item => item.roomId === roomId && item.wall === wall)) return;
    targets.push({ roomId, surface: wall === undefined ? "floor" : "walls", wall, label: `${room.name} · ${wall === undefined ? "Пол" : `Стена ${wall + 1}`}` });
  };
  if (line.kind === "laminate") line.roomIds.forEach(id => add(id));
  if (line.kind === "floor-tile" || line.kind === "wall-tile") {
    line.floorRoomIds?.forEach(id => add(id));
    line.surfaces?.forEach(item => add(item.roomId, item.wall));
  }
  if (line.kind === "tile-adhesive" || line.kind === "tile-grout") {
    for (const id of line.roomIds) {
      const room = rooms.find(item => item.id === id);
      if (!room) continue;
      // Mix settings belong to the room and are shared by its tiled surfaces.
      const target = mixtureTarget(room);
      if (target) add(id, target.wall);
    }
  }
  return targets;
}
