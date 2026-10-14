import { afterEach, describe, expect, it, vi } from "vitest";
import { createSceneQualityController, scenePixelRatio } from "./scene-quality";

describe("scene drawing budget", () => {
  it("reduces only the compact moving buffer, preserving full export and desktop detail", () => {
    expect(scenePixelRatio(390, 554, 3, true, true)).toBe(1.35);
    expect(scenePixelRatio(390, 554, 3, true, false)).toBe(2);
    expect(scenePixelRatio(900, 700, 2, false, true)).toBe(scenePixelRatio(900, 700, 2, false));
  });
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

describe("detail restoration", () => {
  afterEach(() => vi.useRealTimers());
  it("keeps moving quality across rapid gestures and restores it after the final release", () => {
    vi.useFakeTimers();
    const apply = vi.fn();
    const quality = createSceneQualityController(moving => moving ? 1.35 : 2, apply);
    quality.update(); quality.start(); quality.end();
    vi.advanceTimersByTime(100); quality.start();
    vi.advanceTimersByTime(200);
    expect(apply.mock.calls.map(([ratio]) => ratio)).toEqual([2, 1.35]);
    quality.end(); vi.advanceTimersByTime(180);
    expect(apply).toHaveBeenLastCalledWith(2);
    quality.dispose();
  });
  it("restores immediately for capture and interrupts, and never renders after disposal", () => {
    vi.useFakeTimers();
    const apply = vi.fn();
    const quality = createSceneQualityController(moving => moving ? 1.35 : 2, apply);
    quality.start(); quality.end(); quality.restore();
    expect(apply).toHaveBeenLastCalledWith(2);
    quality.start(); quality.end(); quality.dispose();
    const count = apply.mock.calls.length;
    vi.runAllTimers(); quality.update();
    expect(apply).toHaveBeenCalledTimes(count);
  });
});
