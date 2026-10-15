import type { ConstructorRoom, PurchaseLine, Wall } from "./core";

export interface PurchaseTarget { roomId: string; label: string; surface: "floor" | "walls"; wall?: Wall }

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
      if (room.floor.kind === "tile") add(id);
      else {
        const wall = room.wallTiles.findIndex(Boolean);
        if (wall >= 0) add(id, wall as Wall);
      }
    }
  }
  return targets;
}
