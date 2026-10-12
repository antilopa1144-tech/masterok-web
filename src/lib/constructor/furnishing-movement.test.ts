import { describe, expect, it } from "vitest";
import { calculateProject, createDefaultProject } from "./core";
import { createInteriorRoom, interiorWithPosition, layoutFurnishings, placementForPosition, positionForPlacement } from "./interiors";
import { nudgeFurnishingPosition, type FurnishingDirection } from "./furnishing-movement";
import { cloneValue, commitWorkspace, createWorkspace, undoWorkspace, redoWorkspace } from "./workspace";

describe("Precise movement on the room plan", () => {
  it.each([
    ["left", 1199.25, 1300.5], ["right", 1201.25, 1300.5], ["up", 1200.25, 1299.5], ["down", 1200.25, 1301.5],
  ] as const)("moves %s by one millimetre without losing fractional coordinates", (direction, xMm, yMm) => {
    const room = createInteriorRoom("bathroom", []);
    const item = placementForPosition({ id: "washer", kind: "washer" }, { xMm: 1200.25, yMm: 1300.5, rotationDeg: 0 });
    const before = structuredClone(item);
    expect(nudgeFurnishingPosition(room, item, direction, 1)).toEqual({ xMm, yMm, rotationDeg: 0 });
    expect(item).toEqual(before);
  });

  it("stops at the actual boundary of the rotated footprint", () => {
    const room = createInteriorRoom("bathroom", []);
    const item = placementForPosition({ id: "washer", kind: "washer" }, { xMm: 1790.5, yMm: 2195.25, rotationDeg: 90 });
    expect(nudgeFurnishingPosition(room, item, "right", 100)).toEqual({ xMm: 1800, yMm: 2195.25, rotationDeg: 90 });
    expect(nudgeFurnishingPosition(room, item, "down", 10)).toEqual({ xMm: 1790.5, yMm: 2200, rotationDeg: 90 });
    const origin = placementForPosition({ id: "washer", kind: "washer" }, { xMm: 0, yMm: 0, rotationDeg: 0 });
    for (const direction of ["left", "up"] as FurnishingDirection[]) expect(nudgeFurnishingPosition(room, origin, direction, 1)).toEqual({ xMm: 0, yMm: 0, rotationDeg: 0 });
  });

  it("makes a single undoable move without changing the other items or material quantities", () => {
    const room = createInteriorRoom("bathroom", []), layout = layoutFurnishings(room);
    const workspace = createWorkspace(); workspace.project = { ...createDefaultProject(), rooms: [room] };
    const item = layout.placements.find(i => i.id === "washer")!;
    const next = cloneValue(workspace);
    next.project.rooms[0].interior = interiorWithPosition(room, item.id, nudgeFurnishingPosition(room, item, "left", 10));
    const history = commitWorkspace({ present: workspace, past: [], future: [] }, next);
    expect(history.past).toHaveLength(1);
    expect(undoWorkspace(history).present).toEqual(workspace);
    expect(redoWorkspace(undoWorkspace(history)).present).toEqual(history.present);
    expect(calculateProject(next.project)).toEqual(calculateProject(workspace.project));
    const neighbors = (items: typeof layout.placements) => items.filter(i => i.id !== "washer").map(i => ({ id: i.id, position: positionForPlacement(i) }));
    expect(neighbors(layoutFurnishings(next.project.rooms[0]).placements)).toEqual(neighbors(layout.placements));
  });
});
