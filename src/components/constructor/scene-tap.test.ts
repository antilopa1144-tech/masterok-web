import { describe, expect, it } from "vitest";
import { createSceneTapTracker } from "./scene-tap";

const point = (pointerId = 1, clientX = 100, clientY = 100) => ({ pointerId, clientX, clientY, isPrimary: pointerId === 1, button: 0 });

describe("3D surface selection", () => {
  it("accepts a tap with small finger jitter", () => {
    const taps = createSceneTapTracker();
    taps.down(point());
    expect(taps.up(point(1, 102, 102))).toBe(true);
  });
  it("does not select after an orbit that returns to its starting point", () => {
    const taps = createSceneTapTracker();
    taps.down(point()); taps.move(point(1, 130)); taps.move(point());
    expect(taps.up(point())).toBe(false);
  });
  it("does not select either finger of a pinch, even when one stays stationary", () => {
    for (const order of [[1, 2], [2, 1]]) {
      const taps = createSceneTapTracker();
      taps.down(point()); taps.down(point(2, 150)); taps.move(point(2, 180));
      expect(taps.up(point(order[0]))).toBe(false);
      expect(taps.up(point(order[1]))).toBe(false);
      taps.down(point()); expect(taps.up(point())).toBe(true);
    }
  });
  it("ignores canceled pointers, secondary buttons and releases without a press", () => {
    const taps = createSceneTapTracker();
    expect(taps.up(point())).toBe(false);
    taps.down(point()); taps.cancel(1); expect(taps.up(point())).toBe(false);
    taps.down({ ...point(), button: 2 }); expect(taps.up(point())).toBe(false);
    taps.down(point()); taps.reset(); expect(taps.up(point())).toBe(false);
  });
});
