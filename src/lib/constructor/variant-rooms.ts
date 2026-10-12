import type { ConstructorRoom } from "./core";
import { interiorFor } from "./interiors";

export type VariantRoomChangeKind = "added" | "removed" | "changed";
export interface VariantRoomChange {
  roomId: string;
  name: string;
  kind: VariantRoomChangeKind;
  details: string[];
}

// Imported snapshots may use a different property order. Array order is kept:
// it identifies walls and also affects automatic furniture placement.
function canonical(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => [key, canonical(item)]));
  return value;
}
const equal = (a: unknown, b: unknown) => JSON.stringify(canonical(a)) === JSON.stringify(canonical(b));
const orderedOpenings = (room: ConstructorRoom) => [...room.openings].sort((a, b) => a.id.localeCompare(b.id));

/** Describe the whole snapshot that applying a variant will restore, without changing it. */
export function compareVariantRooms(current: readonly ConstructorRoom[], saved: readonly ConstructorRoom[]): VariantRoomChange[] {
  const currentById = new Map(current.map((room) => [room.id, room]));
  const savedIds = new Set(saved.map((room) => room.id));
  const changes: VariantRoomChange[] = [];
  for (const room of saved) {
    const previous = currentById.get(room.id);
    if (!previous) { changes.push({ roomId: room.id, name: room.name, kind: "added", details: [] }); continue; }
    const details: string[] = [];
    if (previous.name !== room.name) details.push("Название");
    if (!equal([previous.widthMm, previous.lengthMm, previous.heightMm], [room.widthMm, room.lengthMm, room.heightMm])) details.push("Размеры");
    if (!equal(orderedOpenings(previous), orderedOpenings(room))) details.push("Двери и окна");
    if (!equal(previous.floor, room.floor)) details.push("Параметры пола");
    if (!equal(previous.wallTiles, room.wallTiles)) details.push("Плитка на стенах");
    if (!equal(previous.tileSupplies ?? {}, room.tileSupplies ?? {})) details.push("Клей и затирка");
    if (!equal(interiorFor(previous), interiorFor(room))) details.push("Обстановка");
    if (details.length) changes.push({ roomId: room.id, name: room.name, kind: "changed", details });
  }
  for (const room of current) if (!savedIds.has(room.id)) changes.push({ roomId: room.id, name: room.name, kind: "removed", details: [] });
  return changes;
}

/** Keep one room identity across all cards. A missing room must not show another room's plan. */
export function comparisonRooms(current: readonly ConstructorRoom[], saved: readonly (readonly ConstructorRoom[])[]): Array<{ id: string; name: string }> {
  const rooms = new Map<string, { id: string; name: string }>();
  for (const list of [current, ...saved]) for (const room of list) if (!rooms.has(room.id)) rooms.set(room.id, { id: room.id, name: room.name });
  return [...rooms.values()];
}
