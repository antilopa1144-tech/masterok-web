import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { calculateProject, createDefaultProject, createRoom, validateProject } from "../../engine/constructor/calculate";
import { createFixture } from "../../src/components/constructor/room-fixtures";
import { createInteriorRoom, defaultInterior, FURNISHINGS, INTERIOR_PRESETS, interiorFor, layoutFurnishings } from "../../src/lib/constructor/interiors";
import { cloneValue, commitWorkspace, createWorkspace, importWorkspaceFile, parseWorkspace, redoWorkspace, serializeWorkspace, undoWorkspace } from "../../src/lib/constructor/workspace";
import type { FurnishingKind } from "../../engine/constructor/model";
import { planSvg } from "../../src/lib/constructor/presentation";

describe("Room interiors", () => {
  it.each(INTERIOR_PRESETS)("places the complete $name example inside the room without overlaps", (preset) => {
    const room = createInteriorRoom(preset.type, []), layout = layoutFurnishings(room);
    expect(validateProject({ ...createDefaultProject(), rooms: [room] })).toEqual([]);
    expect(layout.omitted).toEqual([]);
    expect(layout.placements.map((item) => item.kind)).toEqual(preset.items);
    for (const item of layout.placements) {
      expect(item.xMm).toBeGreaterThanOrEqual(99.999);
      expect(item.yMm).toBeGreaterThanOrEqual(99.999);
      expect(item.xMm + item.widthMm).toBeLessThanOrEqual(room.widthMm - 99.999);
      expect(item.yMm + item.depthMm).toBeLessThanOrEqual(room.lengthMm - 99.999);
      for (const other of layout.placements.filter((value) => value !== item)) {
        const overlaps = item.xMm < other.xMm + other.widthMm && item.xMm + item.widthMm > other.xMm
          && item.yMm < other.yMm + other.depthMm && item.yMm + item.depthMm > other.yMm;
        expect(overlaps, `${item.kind} intersects ${other.kind}`).toBe(false);
      }
    }
  });

  it("finds the narrow valid vanity slot between the bath and washer", () => {
    const layout = layoutFurnishings(createInteriorRoom("bathroom", []));
    expect(layout.placements.find((item) => item.kind === "vanity")?.wall).toBe(0);
  });

  it("keeps the floor and wall calculation exactly the same for every interior", () => {
    const project = createDefaultProject(); project.rooms[0].floor.packPriceRub = 2345;
    const control = calculateProject(project);
    for (const preset of INTERIOR_PRESETS) {
      project.rooms[0].interior = defaultInterior(preset.type);
      expect(calculateProject(project)).toEqual(control);
    }
  });

  it("keeps old rooms compatible without guessing a type from their names", () => {
    const workspace = createWorkspace(); workspace.project.rooms[0].name = "Ванная";
    expect(parseWorkspace(workspace)).toEqual(workspace);
    expect(interiorFor(workspace.project.rooms[0]).type).toBe("living");
  });

  it("persists equipment choices in files, copies, variants and undo history", () => {
    const workspace = createWorkspace(); workspace.project.rooms[0].interior = defaultInterior("bathroom");
    workspace.variants.push({ id: "before", name: "С ванной", rooms: cloneValue(workspace.project.rooms), savedAt: new Date().toISOString() });
    const next = cloneValue(workspace); next.project.rooms[0].interior = { type: "bathroom", items: ["shower", "washer", "vanity"].map((kind) => ({ id: kind, kind: kind as FurnishingKind })) };
    const history = commitWorkspace({ present: workspace, past: [], future: [] }, next);
    expect(undoWorkspace(history).present).toEqual(workspace);
    expect(redoWorkspace(undoWorkspace(history)).present).toEqual(history.present);
    const imported = importWorkspaceFile(serializeWorkspace(history.present));
    expect(imported.project.rooms).toEqual(next.project.rooms);
    expect(imported.variants[0].rooms[0].interior?.items.map((item) => item.kind)).toContain("bathtub");
    imported.project.rooms[0].interior!.items.pop();
    expect(next.project.rooms[0].interior!.items).toHaveLength(3);
  });

  it.each([null, [], "bathroom", { type: "unknown", items: [] }, { type: "bathroom", items: "washer" }, { type: "bathroom", items: ["washer", "washer"] }, { type: "bathroom", items: ["unknown"] }, { type: "empty", items: ["washer"] }, { type: "kitchen", items: ["bathtub"] }])("rejects malformed interior metadata: %j", (interior) => {
    const workspace = createWorkspace(); Object.assign(workspace.project.rooms[0], { interior });
    expect(() => parseWorkspace(workspace)).toThrow("обстановки");
  });

  it("does not shrink oversized equipment or place it through doors/windows", () => {
    const room = createInteriorRoom("bathroom", []); room.widthMm = 900; room.lengthMm = 900;
    expect(layoutFurnishings(room).omitted).toContain("bathtub");
    room.widthMm = 2500; room.lengthMm = 2800;
    room.openings = [0, 1, 2, 3].map((wall) => ({ id: `opening-${wall}`, type: "door" as const, wall: wall as 0 | 1 | 2 | 3, offsetMm: 0, widthMm: wall % 2 ? 2800 : 2500, heightMm: 2100, sillMm: 0 }));
    expect(layoutFurnishings(room).placements).toEqual([]);
    room.openings = []; room.heightMm = 600;
    expect(layoutFurnishings(room).placements).toEqual([]);
  });

  it("honors an explicit empty equipment list and gives new rooms unique names", () => {
    const room = createRoom(); room.interior = { type: "living", items: [] };
    expect(layoutFurnishings(room)).toEqual({ placements: [], omitted: [] });
    expect(createInteriorRoom("bathroom", ["Ванная", "Ванная 2"]).name).toBe("Ванная 3");
  });

  it("uses the same placed equipment in the plan, with no furniture on cutting plans by default", () => {
    const room = createInteriorRoom("bathroom", []);
    const result = calculateProject({ ...createDefaultProject(), rooms: [room] }).rooms[0];
    expect(planSvg(room, result)).not.toContain("data-furnishing-kind");
    const markup = planSvg(room, result, { furnished: true });
    for (const item of layoutFurnishings(room).placements) expect(markup).toContain(`data-furnishing-kind="${item.kind}"`);
    room.interior!.items = room.interior!.items.filter((item) => item.kind !== "washer");
    expect(planSvg(room, result, { furnished: true })).not.toContain('data-furnishing-kind="washer"');
  });

  it.each(Object.keys(FURNISHINGS).filter((kind) => !["sofa", "coffee-table", "plant"].includes(kind)) as FurnishingKind[])("keeps the %s model inside its declared footprint", (kind) => {
    const fixture = createFixture(kind), bounds = new THREE.Box3().setFromObject(fixture);
    const spec = FURNISHINGS[kind];
    expect(bounds.min.x * 1000).toBeGreaterThanOrEqual(-spec.widthMm / 2 - 1);
    expect(bounds.max.x * 1000).toBeLessThanOrEqual(spec.widthMm / 2 + 1);
    expect(bounds.min.z * 1000).toBeGreaterThanOrEqual(-spec.depthMm / 2 - 1);
    expect(bounds.max.z * 1000).toBeLessThanOrEqual(spec.depthMm / 2 + 1);
    expect(bounds.max.y * 1000 + 23).toBeLessThanOrEqual(spec.heightMm + 30);
    fixture.traverse((object) => { if (object instanceof THREE.Mesh) { object.geometry.dispose(); const materials = Array.isArray(object.material) ? object.material : [object.material]; materials.forEach((value) => value.dispose()); } });
  });
});
