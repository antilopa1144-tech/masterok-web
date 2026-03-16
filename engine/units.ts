export type SupportedUnit = "kg" | "g" | "m2" | "mm" | "m";

const UNIT_FACTORS_TO_BASE: Record<SupportedUnit, number> = {
  kg: 1,
  g: 0.001,
  m2: 1,
  mm: 0.001,
  m: 1,
};

export function convertValue(value: number, from: SupportedUnit, to: SupportedUnit): number {
  if (from === to) return value;

  const fromFactor = UNIT_FACTORS_TO_BASE[from];
  const toFactor = UNIT_FACTORS_TO_BASE[to];
  if (fromFactor === undefined || toFactor === undefined) {
    throw new Error(`Unsupported conversion: ${from} -> ${to}`);
  }

  return (value * fromFactor) / toFactor;
}

export function roundDisplay(value: number, digits = 2): number {
  if (!Number.isFinite(value)) return 0;
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

export function roundPurchase(value: number, step = 1): number {
  if (step <= 0) return Math.ceil(value);
  return Math.ceil(value / step) * step;
}
