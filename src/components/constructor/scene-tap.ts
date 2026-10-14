type Point = { pointerId: number; clientX: number; clientY: number };

/** A selection is a single tap, never the final finger of a pinch or an orbit. */
export function createSceneTapTracker() {
  const pointers = new Set<number>();
  let candidate: Point | undefined;
  const move = (point: Point) => {
    if (candidate?.pointerId === point.pointerId && Math.hypot(point.clientX - candidate.clientX, point.clientY - candidate.clientY) > 5) candidate = undefined;
  };
  return {
    down: (point: Point & { button: number; isPrimary: boolean }) => {
      if (!pointers.size) candidate = point.button === 0 && point.isPrimary ? point : undefined;
      pointers.add(point.pointerId);
      if (pointers.size > 1) candidate = undefined;
    },
    move,
    up: (point: Point) => {
      move(point);
      const tap = pointers.size === 1 && candidate?.pointerId === point.pointerId;
      pointers.delete(point.pointerId); candidate = undefined;
      return tap;
    },
    cancel: (pointerId: number) => { pointers.delete(pointerId); candidate = undefined; },
    reset: () => { pointers.clear(); candidate = undefined; },
  };
}
