import { describe, expect, it } from "vitest";
import { calculateProject, createDefaultProject } from "./core";
import { createInteriorRoom, layoutFurnishings } from "./interiors";
import { reviewFurnishings } from "./furnishing-review";

describe("Room-wide furnishing review", () => {
  it("counts each instance once while retaining all of its remarks", () => {
    const room = createInteriorRoom("bathroom", []);
    room.openings = [{ id: "door", type: "door", wall: 0, widthMm: 800, heightMm: 2100, offsetMm: 0, sillMm: 0 }];
    room.interior!.items = [
      { id: "washer-a", kind: "washer", dimensions: { widthMm: 600, depthMm: 700, heightMm: 3000 }, position: { xMm: 0, yMm: 0, rotationDeg: 0 } },
      { id: "washer-b", kind: "washer", position: { xMm: 100, yMm: 100, rotationDeg: 0 } },
    ];
    const review = reviewFurnishings(room);
    expect(review.map((item) => [item.id, item.name])).toEqual([["washer-a", "Стиральная машина 1"], ["washer-b", "Стиральная машина 2"]]);
    expect(review[0].issues.map((issue) => issue.code)).toEqual(["height", "opening", "overlap"]);
    expect(review[1].issues.map((issue) => issue.code)).toEqual(["opening", "overlap"]);
  });

  it("includes equipment that could not be placed, alongside positioned equipment", () => {
    const room = createInteriorRoom("bathroom", []);
    room.interior!.items = [
      { id: "large-bath", kind: "bathtub", dimensions: { widthMm: 5000, depthMm: 5000, heightMm: 1000 } },
      { id: "washer", kind: "washer", position: { xMm: room.widthMm, yMm: 1000, rotationDeg: 0 } },
    ];
    const review = reviewFurnishings(room);
    expect(review[0]).toMatchObject({ id: "large-bath", omitted: true, issues: [] });
    expect(review[1]).toMatchObject({ id: "washer", omitted: false, issues: [{ code: "bounds" }] });
  });

  it("clears corrected remarks without mutating the layout or the material calculation", () => {
    const room = createInteriorRoom("bathroom", []);
    room.interior!.items = [{ id: "washer", kind: "washer", position: { xMm: 2500, yMm: 500, rotationDeg: 0 } }];
    const project = { ...createDefaultProject(), rooms: [room] }, layout = layoutFurnishings(room);
    const before = structuredClone(room), result = calculateProject(project);
    expect(reviewFurnishings(room, layout)).toHaveLength(1);
    expect(room).toEqual(before);
    expect(layout).toEqual(layoutFurnishings(room));
    expect(calculateProject(project)).toEqual(result);
    room.interior!.items[0].position!.xMm = 1000;
    expect(reviewFurnishings(room)).toEqual([]);
    expect(calculateProject(project)).toEqual(result);
  });

  it("has no remarks for an empty room or valid automatic placement", () => {
    const room = createInteriorRoom("living", []);
    expect(reviewFurnishings(room)).toEqual([]);
    room.interior!.items = [];
    expect(reviewFurnishings(room)).toEqual([]);
  });
});
