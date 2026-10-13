/** Render budgets only; they never change project geometry or material quantities. */
export function scenePixelRatio(width: number, height: number, deviceRatio: number, compact: boolean): number {
  const budget = compact ? 2_400_000 : 8_000_000;
  const preferred = compact ? 2 : Math.max(deviceRatio, 2);
  return Math.max(1, Math.min(preferred, compact ? 2 : 3, Math.sqrt(budget / Math.max(1, width * height))));
}
