import { afterEach, describe, expect, it, vi } from "vitest";
import * as THREE from "three";
import { calculateProject, createDefaultProject, validateProject } from "../../engine/constructor/calculate";
import { FURNISHING_TYPES, MAX_FURNISHINGS_PER_ROOM, type FurnishingInstance, type FurnishingDimensions } from "../../engine/constructor/model";
import { createInteriorRoom, dimensionsFor, FURNISHINGS, furnishingIssues, furnishingName, interiorWithAddedItem, interiorWithDimensions, interiorWithoutItem, interiorWithPosition, layoutFurnishings, placementForPosition, positionForPlacement, rotatedFurnishingPosition } from "../../src/lib/constructor/interiors";
import { buildFurnishings } from "../../src/components/constructor/room-furnishings";
import { cloneValue, commitWorkspace, createWorkspace, parseWorkspace, redoWorkspace, serializeWorkspace, undoWorkspace } from "../../src/lib/constructor/workspace";
import { planSvg } from "../../src/lib/constructor/presentation";

const dimensions: FurnishingDimensions = { widthMm: 610, depthMm: 450, heightMm: 845 };
const dispose = (group: THREE.Group) => group.traverse((object) => {
  if (object instanceof THREE.Mesh) { object.geometry.dispose(); (Array.isArray(object.material) ? object.material : [object.material]).forEach((material) => material.dispose()); }
});
afterEach(() => vi.unstubAllGlobals());

describe("Individual furnishing sizes and copies", () => {
  it("changes a rotated item's footprint without moving its anchor or neighbours and leaves material totals unchanged", () => {
    const room = createInteriorRoom("bathroom", []), project = { ...createDefaultProject(), rooms: [room] };
    const result = calculateProject(project), before = layoutFurnishings(room);
    room.interior = interiorWithDimensions(room, "washer", dimensions);
    const after = layoutFurnishings(room), washer = after.placements.find((item) => item.id === "washer")!;
    expect(washer.dimensions).toEqual(dimensions);
    for (const item of before.placements) expect(positionForPlacement(after.placements.find((other) => other.id === item.id)!)).toEqual(positionForPlacement(item));
    expect(calculateProject(project)).toEqual(result); expect(validateProject(project)).toEqual([]);
    room.interior = interiorWithDimensions(room, "washer");
    expect(dimensionsFor(room.interior.items.find((item) => item.id === "washer")!)).toEqual({ widthMm: 600, depthMm: 700, heightMm: 870 });
  });

  it("rotates and clamps using custom sizes, including decimal millimetres", () => {
    const room = createInteriorRoom("bathroom", []);
    room.interior = interiorWithDimensions(room, "washer", { ...dimensions, widthMm: 610.5 });
    const item = placementForPosition(room.interior.items.find((item) => item.id === "washer")!, { xMm: 1000, yMm: 1000, rotationDeg: 0 });
    const position = rotatedFurnishingPosition(room, item);
    expect(position).toEqual({ xMm: 1080.25, yMm: 919.75, rotationDeg: 90 });
    const turned = placementForPosition(room.interior.items.find((item) => item.id === "washer")!, position);
    expect(turned.widthMm).toBe(450); expect(turned.depthMm).toBe(610.5);
    expect(turned.centerXmm).toBe(item.centerXmm); expect(turned.centerYmm).toBe(item.centerYmm);
  });

  it("places two identical kinds independently without moving the original", () => {
    const room = createInteriorRoom("bedroom", []), before = layoutFurnishings(room);
    room.interior = interiorWithAddedItem(room, { id: "nightstand-2", kind: "nightstand", dimensions: { widthMm: 400, depthMm: 400, heightMm: 600 } });
    const after = layoutFurnishings(room);
    expect(after.omitted).toEqual([]); expect(furnishingIssues(room)).toEqual([]);
    for (const item of before.placements) expect(positionForPlacement(after.placements.find((other) => other.id === item.id)!)).toEqual(positionForPlacement(item));
    expect(furnishingName(room, "nightstand")).toBe("Прикроватная тумба 1"); expect(furnishingName(room, "nightstand-2")).toBe("Прикроватная тумба 2");
    const original = cloneValue(after.placements.find((item) => item.id === "nightstand")!);
    room.interior = interiorWithPosition(room, "nightstand-2", { xMm: 1500, yMm: 1800, rotationDeg: 90 });
    expect(positionForPlacement(layoutFurnishings(room).placements.find((item) => item.id === "nightstand")!)).toEqual(positionForPlacement(original));
    const afterMove = layoutFurnishings(room);
    room.interior = interiorWithoutItem(room, "nightstand");
    expect(room.interior.items.some((item) => item.id === "nightstand")).toBe(false);
    expect(positionForPlacement(layoutFurnishings(room).placements.find((item) => item.id === "nightstand-2")!)).toEqual(positionForPlacement(afterMove.placements.find((item) => item.id === "nightstand-2")!));
  });

  it("reports collisions per instance and preserves oversize geometry rather than shrinking it", () => {
    const room = createInteriorRoom("bathroom", []);
    room.interior = { type: "bathroom", items: [
      { id: "a", kind: "washer", dimensions: { widthMm: 3000, depthMm: 600, heightMm: 3000 }, position: { xMm: 100, yMm: 100, rotationDeg: 0 } },
      { id: "b", kind: "washer", position: { xMm: 200, yMm: 200, rotationDeg: 0 } },
    ] };
    const issues = furnishingIssues(room);
    expect(issues.filter((issue) => issue.id === "a").map((issue) => issue.code)).toEqual(["bounds", "height", "overlap"]);
    expect(issues.find((issue) => issue.id === "b")!.message).toContain("Стиральная машина 1");
    expect(layoutFurnishings(room).placements[0].widthMm).toBe(3000);
    expect(validateProject({ ...createDefaultProject(), rooms: [room] })).toEqual([]);
  });

  it("can resize an omitted object back into the room and keeps another oversized copy identifiable", () => {
    const room = createInteriorRoom("bathroom", []); room.widthMm = room.lengthMm = 1000;
    room.interior = { type: "bathroom", items: [{ id: "large", kind: "washer", dimensions: { widthMm: 1400, depthMm: 1400, heightMm: 900 } }, { id: "small", kind: "washer" }] };
    expect(layoutFurnishings(room).omitted).toContain("large");
    room.interior = interiorWithDimensions(room, "large", { widthMm: 100, depthMm: 100, heightMm: 100 });
    expect(layoutFurnishings(room).omitted).toEqual([]);
  });

  it("limits item count, rejects duplicate IDs on add and never shares the new instance's dimensions", () => {
    const room = createInteriorRoom("bathroom", []), source: FurnishingInstance = { id: "copy", kind: "washer", dimensions: { ...dimensions } };
    room.interior = interiorWithAddedItem(room, source); source.dimensions!.widthMm = 1200;
    expect(dimensionsFor(room.interior.items.find((item) => item.id === "copy")!).widthMm).toBe(610);
    expect(interiorWithAddedItem(room, { id: "copy", kind: "washer" })).toBe(room.interior);
    room.interior.items = Array.from({ length: MAX_FURNISHINGS_PER_ROOM }, (_, index) => ({ id: `item-${index}`, kind: "washer" }));
    expect(interiorWithAddedItem(room, { id: "extra", kind: "washer" })).toBe(room.interior);
    expect(validateProject({ ...createDefaultProject(), rooms: [room] })).toEqual([]);
    room.interior.items.push({ id: "extra", kind: "washer" });
    expect(validateProject({ ...createDefaultProject(), rooms: [room] }).join(" ")).toContain("обстановки");
  });

  it.each([null, [], "sizes", {}, { ...dimensions, widthMm: 0 }, { ...dimensions, depthMm: -1 }, { ...dimensions, heightMm: 30001 }, { ...dimensions, widthMm: "610" }, { ...dimensions, depthMm: NaN }, { ...dimensions, heightMm: Infinity }])("rejects malformed dimensions %j", (invalid) => {
    const workspace = createWorkspace(); workspace.project.rooms[0].interior = { type: "bathroom", items: [{ id: "washer", kind: "washer" }] };
    Object.assign(workspace.project.rooms[0].interior.items[0], { dimensions: invalid });
    expect(() => parseWorkspace(workspace)).toThrow("габариты");
  });
  it.each([null, [], { xMm: -1, yMm: 0, rotationDeg: 0 }, { xMm: 0, yMm: Infinity, rotationDeg: 0 }, { xMm: 0, yMm: 0, rotationDeg: 45 }])("rejects malformed per-instance positions %j", (invalid) => {
    const workspace = createWorkspace(); workspace.project.rooms[0].interior = { type: "bathroom", items: [{ id: "washer", kind: "washer" }] };
    Object.assign(workspace.project.rooms[0].interior.items[0], { position: invalid });
    expect(() => parseWorkspace(workspace)).toThrow("координаты");
  });
  it.each(["", 'x" onclick="bad', "x".repeat(81)])("rejects unsafe or invalid identity %j", (id) => {
    const workspace = createWorkspace(); workspace.project.rooms[0].interior = { type: "bathroom", items: [{ id, kind: "washer" }] };
    expect(() => parseWorkspace(workspace)).toThrow("обстановки");
  });

  it("round-trips sizes and multiple positions in files, variants, room copies and undo/redo", () => {
    const workspace = createWorkspace(); workspace.project.rooms = [createInteriorRoom("bathroom", [])];
    const next = cloneValue(workspace), room = next.project.rooms[0];
    room.interior = interiorWithDimensions(room, "washer", dimensions);
    room.interior = interiorWithAddedItem(room, { id: "washer-2", kind: "washer", dimensions: { widthMm: 700, depthMm: 500, heightMm: 1000 } });
    room.interior = interiorWithPosition(room, "washer-2", { xMm: 123.5, yMm: 1900, rotationDeg: 270 });
    const copy = cloneValue(room); copy.id = "room-copy"; next.project.rooms.push(copy);
    next.variants.push({ id: "custom", name: "Две стиралки", savedAt: new Date().toISOString(), rooms: cloneValue(next.project.rooms) });
    const history = commitWorkspace({ present: workspace, past: [], future: [] }, next), loaded = parseWorkspace(JSON.parse(serializeWorkspace(history.present)));
    expect(loaded.project.rooms).toEqual(next.project.rooms); expect(undoWorkspace(history).present).toEqual(workspace);
    expect(redoWorkspace(undoWorkspace(history)).present).toEqual(history.present);
    loaded.project.rooms[0].interior!.items.find((item) => item.id === "washer")!.dimensions!.widthMm = 800;
    expect(loaded.project.rooms[1].interior!.items.find((item) => item.id === "washer")!.dimensions!.widthMm).toBe(610);
    expect(loaded.variants[0].rooms[0].interior!.items.find((item) => item.id === "washer")!.dimensions!.widthMm).toBe(610);
  });

  it("migrates v4 manual positions and variants losslessly without mutating the source", () => {
    const workspace = createWorkspace(), room = createInteriorRoom("bathroom", []);
    const oldRoom = { ...room, interior: { type: "bathroom", items: ["washer", "vanity"], positions: { washer: { xMm: 1750, yMm: 100, rotationDeg: 180 } } } };
    const legacy = { ...workspace, version: 4, project: { ...workspace.project, schemaVersion: 4, rooms: [oldRoom] }, variants: [{ id: "old", name: "Прежний", savedAt: new Date().toISOString(), rooms: [cloneValue(oldRoom)] }] };
    const before = JSON.stringify(legacy), loaded = parseWorkspace(legacy);
    expect(loaded.version).toBe(5); expect(loaded.project.rooms[0].interior!.items).toEqual([{ id: "washer", kind: "washer", position: oldRoom.interior.positions.washer }, { id: "vanity", kind: "vanity" }]);
    expect(loaded.variants[0].rooms).toEqual(loaded.project.rooms); expect(JSON.stringify(legacy)).toBe(before);
    loaded.project.rooms[0].interior!.items[0].position!.xMm = 1600;
    expect(legacy.project.rooms[0].interior.positions.washer.xMm).toBe(1750);
    expect(loaded.variants[0].rooms[0].interior!.items[0].position!.xMm).toBe(1750);
    expect(() => parseWorkspace({ ...workspace, version: 4, project: { ...workspace.project, schemaVersion: 4, rooms: [room] } })).toThrow("версии 4");
  });

  it.each(FURNISHING_TYPES)("fits the custom %s mesh to the exact plan footprint and floor height", (kind) => {
    const context = { fillRect() {}, beginPath() {}, moveTo() {}, lineTo() {}, stroke() {} };
    vi.stubGlobal("document", { createElement: () => ({ width: 192, height: 192, getContext: () => context }) });
    const type = kind === "sofa" || kind === "coffee-table" || kind === "plant" ? "living" : kind === "bed" || kind === "nightstand" || kind === "wardrobe" ? "bedroom" : kind === "desk" || kind === "office-chair" ? "office" : kind === "console" ? "hallway" : kind === "kitchen-unit" || kind === "fridge" || kind === "dining-table" ? "kitchen" : "bathroom";
    const room = createInteriorRoom(type, []), size = { widthMm: FURNISHINGS[kind].widthMm * .8, depthMm: FURNISHINGS[kind].depthMm * .6, heightMm: FURNISHINGS[kind].heightMm * .9 };
    room.interior = { type, items: [{ id: "custom", kind, dimensions: size, position: { xMm: 200, yMm: 300, rotationDeg: 90 } }] };
    const group = buildFurnishings(room), object = group.children[0]; group.updateMatrixWorld(true);
    const bounds = new THREE.Box3().setFromObject(object.getObjectByName("furnishing-model")!), actual = bounds.getSize(new THREE.Vector3());
    expect(actual.x * 1000).toBeCloseTo(size.depthMm, 4); expect(actual.z * 1000).toBeCloseTo(size.widthMm, 4); expect(actual.y * 1000).toBeCloseTo(size.heightMm, 4);
    expect(bounds.min.y).toBeCloseTo(.023, 6); expect(object.userData.furnishingId).toBe("custom");
    const placement = layoutFurnishings(room).placements[0], center = bounds.getCenter(new THREE.Vector3());
    expect(center.x * 1000).toBeCloseTo(placement.centerXmm - room.widthMm / 2, 4); expect(center.z * 1000).toBeCloseTo(placement.centerYmm - room.lengthMm / 2, 4);
    const markup = planSvg(room, calculateProject({ ...createDefaultProject(), rooms: [room] }).rooms[0], { furnished: true, interior: { interactive: true, selectedId: "custom" } });
    expect(markup).toContain(`width="${size.widthMm}" height="${size.depthMm}"`); expect(markup).toContain('data-furnishing-id="custom"');
    dispose(group);
  });
});
