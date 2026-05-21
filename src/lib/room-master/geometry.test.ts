import { describe, expect, it } from "vitest";
import { DEFAULT_ROOM_DIMENSIONS, floorAreaM2, wallAreaM2 } from "./geometry";

describe("room-master geometry", () => {
  it("computes floor area", () => {
    expect(floorAreaM2(DEFAULT_ROOM_DIMENSIONS)).toBeCloseTo(4.25, 2);
  });

  it("computes wall area minus door", () => {
    const wall = wallAreaM2(DEFAULT_ROOM_DIMENSIONS);
    expect(wall).toBeGreaterThan(15);
    expect(wall).toBeLessThan(22);
  });
});
