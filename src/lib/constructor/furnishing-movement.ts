import type { ConstructorRoom, FurnishingPosition } from "./core";
import { clampFurnishingPosition, positionForPlacement, type FurnishingPlacement } from "./interiors";

export const FURNISHING_MOVEMENT_STEPS = [1, 10, 100] as const;
export type FurnishingMovementStep = typeof FURNISHING_MOVEMENT_STEPS[number];
export type FurnishingDirection = "left" | "right" | "up" | "down";
const DIRECTIONS: Record<FurnishingDirection, readonly [number, number]> = { left: [-1, 0], right: [1, 0], up: [0, -1], down: [0, 1] };

/** Buttons and keyboard use the same plan axes and existing room-boundary rule. */
export function nudgeFurnishingPosition(room: ConstructorRoom, item: FurnishingPlacement, direction: FurnishingDirection, step: FurnishingMovementStep): FurnishingPosition {
  const position = positionForPlacement(item), [dx, dy] = DIRECTIONS[direction];
  return clampFurnishingPosition(room, item.id, { ...position, xMm: position.xMm + dx * step, yMm: position.yMm + dy * step });
}
