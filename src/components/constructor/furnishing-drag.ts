import { Plane, Raycaster, Vector2, Vector3, type Object3D, type PerspectiveCamera, type Ray } from "three";
import type { ConstructorRoom, FurnishingPosition } from "@/lib/constructor/core";
import { clampFurnishingPosition, layoutFurnishings, positionForPlacement, type FurnishingPlacement } from "@/lib/constructor/interiors";

/** Use the grabbed height, so a tall object's point stays under the pointer. */
export function furnishingPositionFromRay(room: ConstructorRoom, item: FurnishingPlacement, grab: Vector3, ray: Ray): FurnishingPosition | null {
  const point = ray.intersectPlane(new Plane(new Vector3(0, 1, 0), -grab.y), new Vector3());
  if (!point || !Number.isFinite(point.x) || !Number.isFinite(point.z)) return null;
  const initial = positionForPlacement(item);
  // Match the plan's 10 mm drag step; keyboard movement also offers 1 mm.
  return clampFurnishingPosition(room, item.id, { ...initial,
    xMm: Math.round((initial.xMm + (point.x - grab.x) * 1000) / 10) * 10,
    yMm: Math.round((initial.yMm + (point.z - grab.z) * 1000) / 10) * 10 });
}

type Drag = { pointerId: number; clientX: number; clientY: number; grab: Vector3; initial: FurnishingPosition; position: FurnishingPosition; moved: boolean };

/** Preview is confined to scene transforms. Only pointerup commits to the project. */
export function attachFurnishingDrag({ canvas, camera, content, selection, room, id, render, onPosition, onGesture, onExit }: {
  canvas: HTMLCanvasElement; camera: PerspectiveCamera; content: Object3D; selection: Object3D; room: ConstructorRoom; id: string;
  render: () => void; onPosition: (id: string, position: FurnishingPosition) => void; onGesture: (active: boolean) => void; onExit: () => void;
}) {
  const placed = layoutFurnishings(room).placements.find((item) => item.id === id);
  let model: Object3D | undefined;
  content.traverse((object) => { if (object.userData.furnishingId === id) model = object; });
  if (!placed || !model) return () => {};
  const item = model, initialModel = item.position.clone(), initialSelection = selection.position.clone();
  const cursor = canvas.style.cursor, tabIndex = canvas.tabIndex;
  canvas.style.cursor = "grab"; canvas.tabIndex = 0; canvas.focus({ preventScroll: true });
  const pointers = new Set<number>(), raycaster = new Raycaster(), pointer = new Vector2();
  let drag: Drag | null = null, suppress = false;
  const rayAt = (event: PointerEvent) => {
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return null;
    pointer.set((event.clientX - rect.left) / rect.width * 2 - 1, -(event.clientY - rect.top) / rect.height * 2 + 1);
    camera.updateMatrixWorld(); raycaster.setFromCamera(pointer, camera);
    return raycaster.ray;
  };
  const finish = (commit: boolean) => {
    const previous = drag; drag = null;
    if (!previous) return;
    item.position.copy(initialModel); selection.position.copy(initialSelection); canvas.style.cursor = "grab";
    if (canvas.hasPointerCapture(previous.pointerId)) canvas.releasePointerCapture(previous.pointerId);
    onGesture(false);
    if (commit && previous.moved && (previous.position.xMm !== previous.initial.xMm || previous.position.yMm !== previous.initial.yMm)) onPosition(id, previous.position);
    render();
  };
  const cancel = () => { finish(false); suppress = pointers.size > 0; };
  const update = (event: PointerEvent) => {
    const current = drag;
    if (!current || current.pointerId !== event.pointerId) return;
    if (!current.moved && Math.hypot(event.clientX - current.clientX, event.clientY - current.clientY) < 3) return;
    const ray = rayAt(event), next = ray && furnishingPositionFromRay(room, placed, current.grab, ray);
    if (!next) return;
    current.moved = true; current.position = next;
    const dx = (next.xMm - current.initial.xMm) / 1000, dz = (next.yMm - current.initial.yMm) / 1000;
    item.position.set(initialModel.x + dx, initialModel.y, initialModel.z + dz);
    selection.position.set(initialSelection.x + dx, initialSelection.y, initialSelection.z + dz);
    render();
  };
  const down = (event: PointerEvent) => {
    if (drag || suppress) {
      pointers.add(event.pointerId); cancel(); event.preventDefault(); return;
    }
    if (event.target !== canvas || !event.isPrimary || event.button !== 0) return;
    pointers.add(event.pointerId);
    if (!rayAt(event)) return;
    content.updateWorldMatrix(true, true);
    for (const hit of raycaster.intersectObjects(content.children, true)) {
      let ancestor: Object3D | null = hit.object, owner: string | undefined, visible = true;
      while (ancestor) {
        if (!ancestor.visible) visible = false;
        if (ancestor.userData.furnishingId) owner = ancestor.userData.furnishingId as string;
        ancestor = ancestor.parent;
      }
      if (!visible) continue;
      if (owner) {
        if (owner !== id) return;
        const initial = positionForPlacement(placed);
        drag = { pointerId: event.pointerId, clientX: event.clientX, clientY: event.clientY, grab: hit.point.clone(), initial, position: initial, moved: false };
        canvas.setPointerCapture(event.pointerId); canvas.focus({ preventScroll: true }); canvas.style.cursor = "grabbing";
        event.preventDefault(); onGesture(true); return;
      }
      if (hit.object.userData.floor || hit.object.userData.wall !== undefined) return;
    }
  };
  const move = (event: PointerEvent) => {
    if (!drag || event.pointerId !== drag.pointerId) return;
    if (event.pointerType === "mouse" && !event.buttons) { cancel(); return; }
    event.preventDefault(); update(event);
  };
  const up = (event: PointerEvent) => {
    if (drag?.pointerId === event.pointerId) { update(event); finish(true); }
    pointers.delete(event.pointerId); if (!pointers.size) suppress = false;
  };
  const pointerCancel = (event: PointerEvent) => {
    if (drag?.pointerId === event.pointerId) cancel();
    pointers.delete(event.pointerId); if (!pointers.size) suppress = false;
  };
  const blur = () => { cancel(); pointers.clear(); suppress = false; };
  const visibility = () => { if (document.hidden) blur(); };
  const lostContext = () => { blur(); onExit(); };
  const keydown = (event: KeyboardEvent) => {
    if (drag && (event.key === "Escape" || ((event.ctrlKey || event.metaKey) && ["z", "y"].includes(event.key.toLowerCase())))) {
      event.preventDefault(); event.stopPropagation(); cancel(); return;
    }
    if (event.target !== canvas || event.ctrlKey || event.metaKey) return;
    if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); onExit(); return; }
    if (drag) return;
    const direction = ({ ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] } as Record<string, number[]>)[event.key];
    if (!direction) return;
    event.preventDefault(); event.stopPropagation();
    const initial = positionForPlacement(placed), step = event.altKey ? 1 : event.shiftKey ? 100 : 10;
    const next = clampFurnishingPosition(room, id, { ...initial, xMm: initial.xMm + direction[0] * step, yMm: initial.yMm + direction[1] * step });
    if (next.xMm !== initial.xMm || next.yMm !== initial.yMm) onPosition(id, next);
  };
  window.addEventListener("pointerdown", down, true);
  window.addEventListener("pointermove", move, { capture: true, passive: false });
  window.addEventListener("pointerup", up, true);
  window.addEventListener("pointercancel", pointerCancel, true);
  window.addEventListener("keydown", keydown, true);
  window.addEventListener("blur", blur);
  window.addEventListener("resize", blur);
  document.addEventListener("visibilitychange", visibility);
  canvas.addEventListener("lostpointercapture", cancel);
  canvas.addEventListener("webglcontextlost", lostContext);
  return () => {
    blur(); canvas.style.cursor = cursor; canvas.tabIndex = tabIndex;
    window.removeEventListener("pointerdown", down, { capture: true }); window.removeEventListener("pointermove", move, { capture: true });
    window.removeEventListener("pointerup", up, { capture: true }); window.removeEventListener("pointercancel", pointerCancel, { capture: true });
    window.removeEventListener("keydown", keydown, { capture: true }); window.removeEventListener("blur", blur); window.removeEventListener("resize", blur);
    document.removeEventListener("visibilitychange", visibility);
    canvas.removeEventListener("lostpointercapture", cancel); canvas.removeEventListener("webglcontextlost", lostContext);
  };
}
