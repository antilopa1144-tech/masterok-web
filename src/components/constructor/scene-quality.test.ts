import { describe, expect, it } from "vitest";
import { scenePixelRatio } from "./scene-quality";

describe("scene drawing budget", () => {
  it("keeps mobile DPR 3 within a crisp 2x buffer", () => {
    expect(scenePixelRatio(390, 554, 3, true)).toBe(2);
  });
  it("bounds large viewport memory independently of device ratio", () => {
    const ratio = scenePixelRatio(1920, 1080, 3, false);
    expect(1920 * 1080 * ratio * ratio).toBeLessThanOrEqual(8_000_001);
    expect(ratio).toBeGreaterThan(1);
  });
  it("keeps desktop supersampling and handles a zero-sized mount", () => {
    expect(scenePixelRatio(900, 700, 1, false)).toBe(2);
    expect(Number.isFinite(scenePixelRatio(0, 0, 3, true))).toBe(true);
  });
});
