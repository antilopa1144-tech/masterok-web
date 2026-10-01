/** UI-only scale and precision. These helpers never alter a saved/calculated value. */
export interface NumberControlBounds { min: number; max: number; integer?: boolean; unit?: string; emptyValue?: number }
export const SLIDER_TICKS = 10_000;

export function numberControlStep({ min, max, integer, unit }: NumberControlBounds): number {
  if (integer) return 1;
  if (unit?.startsWith("кг") || unit === "м²" || unit === "мм" && max - min <= 100) return .1;
  return 1;
}

function power(bounds: NumberControlBounds): number {
  const span = bounds.max - bounds.min;
  return span > 100_000 ? 4 : span > 1_000 || bounds.integer && span > 100 ? 3 : 1;
}

export function sliderPosition(value: number, bounds: NumberControlBounds): number {
  if (bounds.max <= bounds.min) return 0;
  const ratio = Math.max(0, Math.min(1, (value - bounds.min) / (bounds.max - bounds.min)));
  return Math.pow(ratio, 1 / power(bounds)) * SLIDER_TICKS;
}

export function sliderNumber(position: number, bounds: NumberControlBounds): number {
  if (bounds.max <= bounds.min) return bounds.min;
  const ratio = Math.max(0, Math.min(1, position / SLIDER_TICKS));
  if (ratio === 0) return bounds.min;
  if (ratio === 1) return bounds.max;
  const raw = bounds.min + Math.pow(ratio, power(bounds)) * (bounds.max - bounds.min);
  const step = numberControlStep(bounds);
  return Math.max(bounds.min, Math.min(bounds.max, Number((Math.round(raw / step) * step).toFixed(9))));
}

/** Fine changes preserve an existing fraction; integer counts stay integer. */
export function stepNumber(value: number, direction: number, bounds: NumberControlBounds, multiplier = 1): number {
  const next = Number((value + direction * numberControlStep(bounds) * multiplier).toFixed(9));
  return Math.max(bounds.min, Math.min(bounds.max, bounds.integer ? Math.round(next) : next));
}

export function parseNumberControl(draft: string, bounds: NumberControlBounds): number | null {
  const typed = draft.trim().replace(",", ".");
  const normalized = !typed && bounds.emptyValue !== undefined ? String(bounds.emptyValue) : typed;
  if (!normalized || !/^\d+(?:\.\d*)?$/.test(normalized)) return null;
  const next = Number(normalized);
  return Number.isFinite(next) && next >= bounds.min && next <= bounds.max && (!bounds.integer || Number.isInteger(next)) ? next : null;
}

export function controlNumberText(value: number): string {
  return value.toLocaleString("ru-RU", { maximumFractionDigits: 9 });
}
