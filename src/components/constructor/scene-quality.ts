/** Render budgets only; they never change project geometry or material quantities. */
export function scenePixelRatio(width: number, height: number, deviceRatio: number, compact: boolean, moving = false): number {
  const budget = compact ? 2_400_000 : 8_000_000;
  const preferred = compact ? 2 : Math.max(deviceRatio, 2);
  return Math.max(1, Math.min(preferred, compact && moving ? 1.35 : compact ? 2 : 3, Math.sqrt(budget / Math.max(1, width * height))));
}

/** Coalesce wheel/touch gestures; restore detail once rather than between wheel ticks. */
export function createSceneQualityController(getRatio: (moving: boolean) => number, apply: (ratio: number) => void) {
  let moving = false;
  let disposed = false;
  let applied: number | undefined;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const clear = () => { clearTimeout(timer); timer = undefined; };
  const update = () => {
    if (disposed) return;
    const ratio = getRatio(moving);
    if (ratio !== applied) { applied = ratio; apply(ratio); }
  };
  const restore = () => { clear(); moving = false; update(); };
  return {
    update,
    start: () => { clear(); moving = true; update(); },
    end: () => { clear(); if (!disposed) timer = setTimeout(restore, 180); },
    restore,
    dispose: () => { disposed = true; clear(); },
  };
}
