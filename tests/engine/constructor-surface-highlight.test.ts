import { describe, expect, it } from "vitest";
import { Raycaster, Vector3 } from "three";
import { createSurfaceHighlight, type SelectedSurface } from "../../src/components/constructor/surface-highlight";

const room = Object.freeze({ widthMm: 3000, lengthMm: 4000, heightMm: 2700 });

describe("Constructor selected surface", () => {
  it.each([
    ["floor", [-1.5, .027, -2], [1.5, .027, 2]],
    [0, [-1.5, 0, -2], [1.5, 2.7, -2]],
    [1, [1.5, 0, -2], [1.5, 2.7, 2]],
    [2, [-1.5, 0, 2], [1.5, 2.7, 2]],
    [3, [-1.5, 0, -2], [-1.5, 2.7, 2]],
  ] as const)("places %s on its room boundary with clockwise wall numbering", (surface, min, max) => {
    const outline = createSurfaceHighlight(room, surface);
    try {
      const bounds = outline.geometry.boundingBox!;
      min.forEach((value, axis) => expect(bounds.min.getComponent(axis)).toBeCloseTo(value));
      max.forEach((value, axis) => expect(bounds.max.getComponent(axis)).toBeCloseTo(value));
    } finally { outline.geometry.dispose(); outline.material.dispose(); }
  });

  it("follows new room dimensions without changing the previous contour", () => {
    const original = createSurfaceHighlight(room, 1);
    const resized = createSurfaceHighlight({ widthMm: 5500, lengthMm: 6200, heightMm: 3100 }, 1);
    try {
      expect(resized.geometry.boundingBox!.min.x).toBeCloseTo(2.75);
      expect(resized.geometry.boundingBox!.max.y).toBeCloseTo(3.1);
      expect(resized.geometry.boundingBox!.max.z).toBeCloseTo(3.1);
      expect(original.geometry.boundingBox!.min.x).toBeCloseTo(1.5);
      expect(original.geometry.boundingBox!.max.z).toBeCloseTo(2);
    } finally { for (const outline of [original, resized]) { outline.geometry.dispose(); outline.material.dispose(); } }
  });

  it("does not intercept clicks intended for floor, wall or furniture meshes", () => {
    for (const surface of ["floor", 0, 1, 2, 3] as Exclude<SelectedSurface, null>[]) {
      const outline = createSurfaceHighlight(room, surface);
      try {
        const ray = new Raycaster(new Vector3(1.5, 5, 2), new Vector3(0, -1, 0));
        expect(ray.intersectObject(outline)).toEqual([]);
      } finally { outline.geometry.dispose(); outline.material.dispose(); }
    }
  });
});
