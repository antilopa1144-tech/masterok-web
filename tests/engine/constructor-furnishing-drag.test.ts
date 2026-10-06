import { afterEach, describe, expect, it, vi } from "vitest";
import { BoxGeometry, Group, Mesh, MeshBasicMaterial, PerspectiveCamera, Ray, Vector3 } from "three";
import { attachFurnishingDrag, furnishingPositionFromRay } from "../../src/components/constructor/furnishing-drag";
import { createInteriorRoom, layoutFurnishings, positionForPlacement } from "../../src/lib/constructor/interiors";

function roomFixture(rotationDeg: 0 | 90 = 0) {
  return { ...createInteriorRoom("bathroom", []), widthMm: 3000, lengthMm: 4000, openings: [],
    interior: { type: "bathroom" as const, items: [{ id: "washer", kind: "washer" as const, position: { xMm: 1200, yMm: 1650, rotationDeg } }] } };
}

describe("3D furnishing projection", () => {
  it("projects at the grabbed height, snaps in millimetres and leaves the room intact", () => {
    const room = roomFixture(), before = structuredClone(room), placed = layoutFurnishings(room).placements[0];
    const grab = new Vector3(.1, .8, -.1), target = new Vector3(.256, .8, -.134);
    const origin = new Vector3(4, 5, 6), ray = new Ray(origin, target.clone().sub(origin).normalize());
    expect(furnishingPositionFromRay(room, placed, grab, ray)).toEqual({ xMm: 1360, yMm: 1620, rotationDeg: 0 });
    expect(room).toEqual(before);
  });

  it("keeps rotation and clamps the rotated footprint to room boundaries", () => {
    const room = roomFixture(90), placed = layoutFurnishings(room).placements[0];
    expect(furnishingPositionFromRay(room, placed, new Vector3(0, .8, 0), new Ray(new Vector3(-20, 5, 20), new Vector3(0, -1, 0))))
      .toEqual({ xMm: 0, yMm: 3400, rotationDeg: 90 });
  });

  it("ignores rays parallel to or pointing away from the drag plane", () => {
    const room = roomFixture(), placed = layoutFurnishings(room).placements[0], grab = new Vector3(0, .8, 0);
    for (const direction of [new Vector3(1, 0, 0), new Vector3(0, 1, 0)]) {
      expect(furnishingPositionFromRay(room, placed, grab, new Ray(new Vector3(0, 5, 0), direction))).toBeNull();
    }
  });
});

const cleanups: Array<() => void> = [];
afterEach(() => { cleanups.splice(0).reverse().forEach((cleanup) => cleanup()); vi.unstubAllGlobals(); });

function gestureFixture() {
  const windowTarget = new EventTarget(), documentTarget = Object.assign(new EventTarget(), { hidden: false, activeElement: null as unknown });
  vi.stubGlobal("window", windowTarget); vi.stubGlobal("document", documentTarget);
  const captures = new Set<number>();
  const canvas = Object.assign(new EventTarget(), {
    style: { cursor: "auto" }, tabIndex: -1,
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 800, height: 600 }),
    focus: () => { documentTarget.activeElement = canvas; },
    hasPointerCapture: (id: number) => captures.has(id),
    setPointerCapture: (id: number) => { captures.add(id); },
    releasePointerCapture: (id: number) => { captures.delete(id); },
  });
  const room = roomFixture(), content = new Group(), item = new Group(), selection = new Group();
  item.userData.furnishingId = "washer";
  const geometry = new BoxGeometry(.6, .8, .7), material = new MeshBasicMaterial(), mesh = new Mesh(geometry, material);
  mesh.position.y = .4; item.add(mesh); content.add(item);
  cleanups.push(() => { geometry.dispose(); material.dispose(); });
  const camera = new PerspectiveCamera(50, 800 / 600, .1, 100);
  camera.position.set(0, 10, 0); camera.up.set(0, 0, -1); camera.lookAt(0, 0, 0); camera.updateMatrixWorld();
  const onPosition = vi.fn(), onGesture = vi.fn(), onExit = vi.fn(), render = vi.fn();
  const dispose = attachFurnishingDrag({ canvas: canvas as unknown as HTMLCanvasElement, camera, content, selection, room, id: "washer", render, onPosition, onGesture, onExit });
  cleanups.push(dispose);
  const event = (type: string, values: Record<string, unknown> = {}, dispatch: EventTarget = windowTarget) => {
    const result = new Event(type, { cancelable: true });
    for (const [name, value] of Object.entries({ target: canvas, clientX: 400, clientY: 300, pointerId: 1, isPrimary: true, button: 0, buttons: 1, pointerType: "mouse", ...values })) {
      Object.defineProperty(result, name, { value });
    }
    dispatch.dispatchEvent(result); return result;
  };
  return { room, item, selection, content, mesh, canvas, camera, documentTarget, windowTarget, onPosition, onGesture, onExit, render, event, dispose, captures };
}

describe("3D furnishing gesture lifecycle", () => {
  it("previews model and highlight without changing data, then commits once on release", () => {
    const f = gestureFixture(), before = structuredClone(f.room);
    f.event("pointerdown"); expect(f.onGesture).toHaveBeenLastCalledWith(true);
    expect(f.captures.has(1)).toBe(true);
    f.event("pointermove", { clientX: 430, clientY: 325 });
    expect(f.item.position.x).toBeGreaterThan(0); expect(f.item.position.z).toBeGreaterThan(0);
    expect(f.selection.position).toEqual(f.item.position);
    expect(f.onPosition).not.toHaveBeenCalled(); expect(f.room).toEqual(before);
    const preview = f.item.position.clone();
    f.event("pointerup", { clientX: 430, clientY: 325 });
    expect(f.onPosition).toHaveBeenCalledExactlyOnceWith("washer", { xMm: 1200 + preview.x * 1000, yMm: 1650 + preview.z * 1000, rotationDeg: 0 });
    expect(f.onGesture).toHaveBeenLastCalledWith(false); expect(f.captures.size).toBe(0);
    f.event("pointerup", { clientX: 430 }); expect(f.onPosition).toHaveBeenCalledTimes(1);
  });

  it("does not add history for a tap, tiny movement or a return to the original position", () => {
    const f = gestureFixture();
    for (const delta of [0, 1, 30]) {
      f.event("pointerdown"); f.event("pointermove", { clientX: 400 + delta }); f.event("pointerup");
    }
    expect(f.onPosition).not.toHaveBeenCalled(); expect(f.item.position.length()).toBe(0);
  });

  it.each(["Escape", "z", "y"])("cancels the preview with %s before undo can change project history", (key) => {
    const f = gestureFixture(); f.event("pointerdown"); f.event("pointermove", { clientX: 430 });
    expect(f.event("keydown", { key, ctrlKey: key !== "Escape" }).defaultPrevented).toBe(true);
    expect(f.item.position.length()).toBe(0); expect(f.selection.position.length()).toBe(0);
    f.event("pointerup", { clientX: 430 }); expect(f.onPosition).not.toHaveBeenCalled(); expect(f.onExit).not.toHaveBeenCalled();
    f.event("keydown", { key: "Escape" }); expect(f.onExit).toHaveBeenCalledOnce();
  });

  it.each(["pointercancel", "lostpointercapture", "blur", "resize", "visibilitychange", "webglcontextlost"])("restores the preview when interrupted by %s", (type) => {
    const f = gestureFixture(); f.event("pointerdown"); f.event("pointermove", { clientX: 430 });
    f.documentTarget.hidden = true;
    const target = type === "lostpointercapture" || type === "webglcontextlost" ? f.canvas : type === "visibilitychange" ? f.documentTarget : f.windowTarget;
    f.event(type, {}, target); f.event("pointerup", { clientX: 430 });
    expect(f.item.position.length()).toBe(0); expect(f.selection.position.length()).toBe(0);
    expect(f.onPosition).not.toHaveBeenCalled(); expect(f.onGesture).toHaveBeenLastCalledWith(false);
    expect(f.onExit).toHaveBeenCalledTimes(type === "webglcontextlost" ? 1 : 0);
  });

  it("cancels a touch drag on a second finger and waits until both fingers are released", () => {
    const f = gestureFixture();
    f.event("pointerdown", { pointerType: "touch" }); f.event("pointermove", { clientX: 430, pointerType: "touch" });
    f.event("pointerdown", { pointerId: 2, isPrimary: false, pointerType: "touch" });
    expect(f.item.position.length()).toBe(0);
    f.event("pointerup", { pointerId: 2 }); f.event("pointermove", { clientX: 450 }); f.event("pointerup", { clientX: 450 });
    expect(f.onPosition).not.toHaveBeenCalled();
    f.event("pointerdown"); f.event("pointerup", { clientX: 430 }); expect(f.onPosition).toHaveBeenCalledOnce();
  });

  it("ignores another item in front, hidden objects and non-primary pointer buttons", () => {
    const f = gestureFixture();
    const blocker = f.item.clone(); blocker.userData.furnishingId = "other"; blocker.position.y = 2; f.content.add(blocker);
    f.event("pointerdown"); f.event("pointerup", { clientX: 430 }); expect(f.onGesture).not.toHaveBeenCalled();
    blocker.visible = false; f.item.visible = false;
    f.event("pointerdown"); f.event("pointerup", { clientX: 430 }); expect(f.onPosition).not.toHaveBeenCalled();
    f.item.visible = true;
    f.event("pointerdown", { button: 2 }); f.event("pointerup", { clientX: 430 }); expect(f.onPosition).not.toHaveBeenCalled();
    f.event("pointerdown"); f.event("pointerup", { clientX: 430 }); expect(f.onPosition).toHaveBeenCalledOnce();
  });

  it.each([[{}, 10], [{ shiftKey: true }, 100], [{ altKey: true }, 1]] as const)("moves with keyboard modifier %j by %i mm", (modifier, step) => {
    const f = gestureFixture(), initial = positionForPlacement(layoutFurnishings(f.room).placements[0]);
    f.event("keydown", { key: "ArrowRight", ...modifier });
    expect(f.onPosition).toHaveBeenCalledExactlyOnceWith("washer", { ...initial, xMm: initial.xMm + step });
    f.event("keydown", { key: "ArrowRight", target: new EventTarget() });
    f.event("keydown", { key: "ArrowRight", ctrlKey: true }); expect(f.onPosition).toHaveBeenCalledOnce();
  });

  it("removes listeners and restores state when the mode, room or view changes mid-drag", () => {
    const f = gestureFixture(); f.event("pointerdown"); f.event("pointermove", { clientX: 430 }); f.dispose();
    expect(f.item.position.length()).toBe(0); expect(f.selection.position.length()).toBe(0);
    expect(f.canvas.style.cursor).toBe("auto"); expect(f.canvas.tabIndex).toBe(-1); expect(f.captures.size).toBe(0);
    f.event("pointerup", { clientX: 430 }); f.event("pointerdown"); f.event("pointerup", { clientX: 430 });
    expect(f.onPosition).not.toHaveBeenCalled();
  });
});
