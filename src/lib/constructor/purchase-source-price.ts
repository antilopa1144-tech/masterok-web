import type { ConstructorRoom, PurchaseLine } from "./core";
import type { PurchaseTarget } from "./purchase-targets";

/** Read the source setting, not the aggregated maximum price from the purchase row. */
export function purchaseSourcePrice(line: PurchaseLine, target: PurchaseTarget, rooms: readonly ConstructorRoom[]): number | undefined {
  const room = rooms.find(item => item.id === target.roomId);
  if (!room) return undefined;
  if (line.kind === "laminate") return room.floor.packPriceRub;
  if (line.kind === "wall-tile" || line.kind === "floor-tile") {
    return target.wall === undefined ? room.floor.tile?.packPriceRub : room.wallTiles[target.wall]?.packPriceRub;
  }
  if (line.kind === "tile-adhesive") return room.tileSupplies?.adhesive?.packagePriceRub;
  if (line.kind === "tile-grout") return room.tileSupplies?.grout?.packagePriceRub;
  return undefined;
}
