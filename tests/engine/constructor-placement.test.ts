import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { calculateProject, createDefaultProject, validateProject } from "../../engine/constructor/calculate";
import type { FurnishingPosition, FurnishingKind, RoomInterior } from "../../engine/constructor/model";
import { clampFurnishingPosition, createInteriorRoom, furnishingIssues, interiorWithAddedItem, interiorWithoutItem, interiorWithPosition, layoutFurnishings, placementForPosition, positionForPlacement, rotatedFurnishingPosition } from "../../src/lib/constructor/interiors";
import { cloneValue, commitWorkspace, createWorkspace, parseWorkspace, redoWorkspace, serializeWorkspace, undoWorkspace } from "../../src/lib/constructor/workspace";
import { buildFurnishings } from "../../src/components/constructor/room-furnishings";
import { planSvg } from "../../src/lib/constructor/presentation";

const itemsFor = (items: FurnishingKind[], positions: Partial<Record<FurnishingKind, FurnishingPosition>> = {}): RoomInterior => ({ type: "bathroom", items: items.map((kind) => ({ id: kind, kind, ...(positions[kind] ? { position: positions[kind] } : {}) })) });
const washerFor = (room: { interior?: RoomInterior }) => room.interior!.items.find((item) => item.kind === "washer")!;
describe("Manual furnishing placement", () => {
  it.each([0, 90, 180, 270] as const)("uses the rotated footprint and centre for %s degrees", (rotationDeg) => {
    const item = placementForPosition({ id: "washer", kind: "washer" }, { xMm: 123.5, yMm: 456, rotationDeg });
    expect(item.widthMm).toBe(rotationDeg % 180 ? 700 : 600);
    expect(item.depthMm).toBe(rotationDeg % 180 ? 600 : 700);
    expect(item.centerXmm).toBe(123.5 + item.widthMm / 2);
    expect(item.centerYmm).toBe(456 + item.depthMm / 2);
    expect(positionForPlacement(item)).toEqual({ xMm: 123.5, yMm: 456, rotationDeg });
  });

  it("freezes all visible neighbours on first edit and leaves calculations unchanged", () => {
    const room = createInteriorRoom("bathroom", []), before = layoutFurnishings(room), project = { ...createDefaultProject(), rooms: [room] };
    const result = calculateProject(project), washer = before.placements.find((item) => item.kind === "washer")!;
    room.interior = interiorWithPosition(room, "washer", { ...positionForPlacement(washer), xMm: 1100, yMm: 1300 });
    const after = layoutFurnishings(room);
    for (const item of before.placements.filter((item) => item.kind !== "washer")) {
      expect(positionForPlacement(after.placements.find((other) => other.kind === item.kind)!)).toEqual(positionForPlacement(item));
    }
    expect(calculateProject(project)).toEqual(result);
    expect(validateProject(project)).toEqual([]);
  });

  it("auto-places new items around saved positions and forgets positions of removed alternatives", () => {
    const room = createInteriorRoom("bathroom", []);
    room.interior = itemsFor(["washer", "vanity"], { washer: { xMm: 1000, yMm: 1500, rotationDeg: 90 } });
    const layout = layoutFurnishings(room);
    expect(layout.omitted).toEqual([]);
    expect(furnishingIssues(room)).toEqual([]);
    expect(positionForPlacement(layout.placements[0])).toEqual(washerFor(room).position);
    room.interior = itemsFor(["bathtub", "washer"], { bathtub: { xMm: 0, yMm: 0, rotationDeg: 90 }, washer: { xMm: 1000, yMm: 1500, rotationDeg: 90 } });
    const removed = { ...room, interior: interiorWithoutItem(room, "bathtub") }; const next = interiorWithAddedItem(removed, { id: "shower", kind: "shower" });
    expect(next.items.some((item) => item.kind === "bathtub")).toBe(false);
    expect(next.items.find((item) => item.kind === "washer")!.position).toEqual(washerFor(room).position);
    expect(room.interior.items.map((item) => item.kind)).toContain("bathtub");
  });

  it("clamps gestures inside the room while rotation preserves the centre wherever it fits", () => {
    const room = createInteriorRoom("bathroom", []), item = placementForPosition({ id: "washer", kind: "washer" }, { xMm: 1200, yMm: 1300, rotationDeg: 0 });
    const rotated = rotatedFurnishingPosition(room, item), placed = placementForPosition({ id: "washer", kind: "washer" }, rotated);
    expect(rotated).toEqual({ xMm: 1150, yMm: 1350, rotationDeg: 90 });
    expect(placed.centerXmm).toBe(item.centerXmm); expect(placed.centerYmm).toBe(item.centerYmm);
    expect(clampFurnishingPosition(room, "washer", { xMm: -100, yMm: 5000, rotationDeg: 90 })).toEqual({ xMm: 0, yMm: 2200, rotationDeg: 90 });
    const edge = rotatedFurnishingPosition(room, placementForPosition({ id: "washer", kind: "washer" }, { xMm: 0, yMm: 0, rotationDeg: 0 }));
    expect(edge.xMm).toBe(0); expect(edge.yMm).toBe(50);
  });

  it("keeps saved geometry after room shrinking and reports overlaps, openings, bounds and height", () => {
    const room = createInteriorRoom("bathroom", []);
    room.interior = itemsFor(["washer", "vanity"], { washer: { xMm: 100, yMm: 100, rotationDeg: 0 }, vanity: { xMm: 200, yMm: 200, rotationDeg: 0 } });
    room.openings = [{ id: "door", type: "door", wall: 0, offsetMm: 0, widthMm: 900, heightMm: 2100, sillMm: 0 }];
    expect(furnishingIssues(room).filter((item) => item.kind === "washer").map((item) => item.code)).toEqual(["opening", "overlap"]);
    room.openings = []; room.widthMm = 500; room.heightMm = 600;
    expect(furnishingIssues(room).filter((item) => item.kind === "washer").map((item) => item.code)).toEqual(["bounds", "height", "overlap"]);
    expect(positionForPlacement(layoutFurnishings(room).placements[0])).toEqual(washerFor(room).position);
    expect(validateProject({ ...createDefaultProject(), rooms: [room] })).toEqual([]);
  });

  it.each([null, [], "positions", { unknown: { xMm: 0, yMm: 0, rotationDeg: 0 } }, { washer: null }, { washer: [] }, { washer: { xMm: "0", yMm: 0, rotationDeg: 0 } }, { washer: { xMm: -1, yMm: 0, rotationDeg: 0 } }, { washer: { xMm: Infinity, yMm: 0, rotationDeg: 0 } }, { washer: { xMm: 30001, yMm: 0, rotationDeg: 0 } }, { washer: { xMm: 0, yMm: NaN, rotationDeg: 0 } }, { washer: { xMm: 0, yMm: 0, rotationDeg: 45 } }, { washer: { xMm: 0, yMm: 0, rotationDeg: "90" } }, { toilet: { xMm: 0, yMm: 0, rotationDeg: 0 } }])("rejects malformed or inactive item positions: %j", (positions) => {
    const workspace = createWorkspace(); workspace.project.rooms[0].interior = itemsFor(["washer"]); Object.assign(workspace, { version: 4 }); Object.assign(workspace.project, { schemaVersion: 4 });
    Object.assign(workspace.project.rooms[0].interior!, { items: ["washer"], positions });
    expect(() => parseWorkspace(workspace)).toThrow("обстановки");
  });

  it("migrates v3 projects and variants as copies without changing their previous auto layout", () => {
    const workspace = createWorkspace(); workspace.project.rooms = [createInteriorRoom("bathroom", [])];
    workspace.variants.push({ id: "v1", name: "До расстановки", savedAt: new Date().toISOString(), rooms: cloneValue(workspace.project.rooms) });
    const legacyRooms = workspace.project.rooms.map((room) => ({ ...room, interior: { ...room.interior!, items: room.interior!.items.map((item) => item.kind) } }));
    const legacy = { ...workspace, version: 3, project: { ...workspace.project, schemaVersion: 3, rooms: legacyRooms }, variants: workspace.variants.map((variant) => ({ ...variant, rooms: cloneValue(legacyRooms) })) }, before = JSON.stringify(legacy);
    const loaded = parseWorkspace(legacy);
    expect(loaded.version).toBe(5); expect(loaded.project.schemaVersion).toBe(5);
    expect(loaded.project.rooms).toEqual(workspace.project.rooms); expect(loaded.variants).toEqual(workspace.variants);
    expect(layoutFurnishings(loaded.project.rooms[0])).toEqual(layoutFurnishings(workspace.project.rooms[0]));
    expect(JSON.stringify(legacy)).toBe(before);
    loaded.project.rooms[0].interior!.items.pop(); expect(legacy.project.rooms[0].interior!.items).toHaveLength(5);
  });

  it("round-trips positions through file, independent variants and undo/redo", () => {
    const workspace = createWorkspace(); workspace.project.rooms = [createInteriorRoom("bathroom", [])];
    const next = cloneValue(workspace); next.project.rooms[0].interior = interiorWithPosition(next.project.rooms[0], "washer", { xMm: 123.5, yMm: 1800, rotationDeg: 270 });
    next.variants.push({ id: "manual", name: "Расстановка", savedAt: new Date().toISOString(), rooms: cloneValue(next.project.rooms) });
    const history = commitWorkspace({ present: workspace, past: [], future: [] }, next), loaded = parseWorkspace(JSON.parse(serializeWorkspace(history.present)));
    expect(loaded.project.rooms).toEqual(next.project.rooms);
    expect(undoWorkspace(history).present).toEqual(workspace); expect(redoWorkspace(undoWorkspace(history)).present).toEqual(history.present);
    washerFor(loaded.project.rooms[0]).position!.xMm = 400;
    expect(washerFor(loaded.variants[0].rooms[0]).position!.xMm).toBe(123.5);
    expect(washerFor(next.project.rooms[0]).position!.xMm).toBe(123.5);
    const disguised = cloneValue(next); Object.assign(disguised.project.rooms[0].interior!, { positions: {} }); expect(() => parseWorkspace({ ...disguised, version: 3, project: { ...disguised.project, schemaVersion: 3 } })).toThrow("версии 3");
  });

  it("renders manual positions and orientation consistently in 3D and plan", () => {
    const room = createInteriorRoom("bathroom", []);
    const position: FurnishingPosition = { xMm: 125, yMm: 1620, rotationDeg: 270 };
    room.interior = itemsFor(["washer"], { washer: position });
    const item = placementForPosition({ id: "washer", kind: "washer" }, position), group = buildFurnishings(room), mesh = group.children[0];
    expect(mesh.position.x * 1000).toBeCloseTo(item.centerXmm - room.widthMm / 2);
    expect(mesh.position.z * 1000).toBeCloseTo(item.centerYmm - room.lengthMm / 2);
    expect(mesh.rotation.y).toBeCloseTo(270 * Math.PI / 180);
    const result = calculateProject({ ...createDefaultProject(), rooms: [room] }).rooms[0];
    const markup = planSvg(room, result, { furnished: true });
    expect(markup).toContain(`translate(${item.centerXmm} ${item.centerYmm}) rotate(-270)`);
    expect(markup).not.toContain("tabindex");
    group.traverse((object) => { if (object instanceof THREE.Mesh) { object.geometry.dispose(); (Array.isArray(object.material) ? object.material : [object.material]).forEach((material) => material.dispose()); } });
  });
});
