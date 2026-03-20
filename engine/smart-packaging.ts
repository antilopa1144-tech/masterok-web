/**
 * Smart packaging: pick optimal container size for liquid materials.
 *
 * Strategy: как покупает человек в магазине.
 * - Если нужно ≤ 10 л → одна канистра (ближайшая ≥ нужного)
 * - Если нужно > 10 л → N одинаковых канистр самого большого размера
 * - Максимум 2 разных типоразмера, не более
 * - Никаких "1×10 + 1×5 + 1×2 + 1×1" — это абсурд
 *
 * Стандартные тары:
 * - Грунтовка: 1, 5, 10 л (реально в продаже)
 * - Краска: 0.9, 2.5, 5, 10, 20 л
 */

import type { CanonicalMaterialResult } from "./canonical";

export interface ContainerOption {
  size: number;
  label: string;
}

export interface PackagingResult {
  totalContainers: number;
  breakdown: Array<{ size: number; label: string; count: number }>;
  totalVolume: number;
  leftover: number;
  displayName: string;
}

/** Realistic primer containers (what's actually sold in stores) */
export const PRIMER_CONTAINERS: ContainerOption[] = [
  { size: 1, label: "1 л" },
  { size: 5, label: "5 л" },
  { size: 10, label: "10 л" },
];

/** Standard paint containers */
export const PAINT_CONTAINERS: ContainerOption[] = [
  { size: 0.9, label: "0,9 л" },
  { size: 2.5, label: "2,5 л" },
  { size: 5, label: "5 л" },
  { size: 10, label: "10 л" },
  { size: 20, label: "20 л" },
];

/**
 * Pick the simplest container combo for a given volume.
 *
 * Rules (how a real person shops):
 * 1. Try single container of each size — pick smallest that fits
 * 2. If no single container fits — use N of the largest size
 * 3. Check if (N-1) large + 1 smaller is better (less waste)
 * 4. Never use more than 2 different sizes
 */
export function pickOptimalContainers(
  neededVolume: number,
  containers: ContainerOption[],
): PackagingResult {
  if (neededVolume <= 0) {
    return { totalContainers: 0, breakdown: [], totalVolume: 0, leftover: 0, displayName: "" };
  }

  const sorted = [...containers].sort((a, b) => a.size - b.size); // ascending
  const largest = sorted[sorted.length - 1];

  // Strategy 1: single container that covers the need
  const singleFit = sorted.find((c) => c.size >= neededVolume);
  if (singleFit) {
    return buildResult([{ ...singleFit, count: 1 }], neededVolume);
  }

  // Strategy 2: N identical containers of the largest size
  const nLargest = Math.ceil(neededVolume / largest.size);
  const allLargest = buildResult([{ ...largest, count: nLargest }], neededVolume);

  // Strategy 3: (N-1) largest + 1 smaller (if less waste)
  let bestCombo = allLargest;

  if (nLargest >= 2) {
    const remaining = neededVolume - (nLargest - 1) * largest.size;
    if (remaining > 0) {
      const filler = sorted.find((c) => c.size >= remaining && c.size < largest.size);
      if (filler) {
        const combo = buildResult(
          filler.size === largest.size
            ? [{ ...largest, count: nLargest }]
            : [{ ...largest, count: nLargest - 1 }, { ...filler, count: 1 }],
          neededVolume,
        );
        // Prefer combo if same or less waste
        if (combo.totalVolume <= bestCombo.totalVolume) {
          bestCombo = combo;
        }
      }
    }
  }

  return bestCombo;
}

function buildResult(
  breakdown: Array<{ size: number; label: string; count: number }>,
  needed: number,
): PackagingResult {
  const totalVolume = breakdown.reduce((sum, b) => sum + b.size * b.count, 0);
  const leftover = Math.round((totalVolume - needed) * 100) / 100;
  const totalContainers = breakdown.reduce((sum, b) => sum + b.count, 0);

  // Display: "2 × 10 л" or "1 × 10 л + 1 × 5 л"
  const parts = breakdown
    .filter((b) => b.count > 0)
    .sort((a, b) => b.size - a.size) // largest first
    .map((b) => b.count === 1 ? b.label : `${b.count} × ${b.label}`);
  const displayName = parts.join(" + ");

  return { totalContainers, breakdown, totalVolume, leftover, displayName };
}

/**
 * Build a primer material result with smart container sizing.
 * Drop-in replacement for hardcoded "Math.ceil(liters / 10)" across all calculators.
 */
export function buildPrimerMaterial(
  litersNeeded: number,
  opts?: {
    name?: string;
    category?: string;
    reserveFactor?: number;
    containers?: ContainerOption[];
  },
): CanonicalMaterialResult {
  const reserve = opts?.reserveFactor ?? 1;
  const totalLiters = litersNeeded * reserve;
  const pack = pickOptimalContainers(totalLiters, opts?.containers ?? PRIMER_CONTAINERS);

  return {
    name: opts?.name ?? `Грунтовка глубокого проникновения (${pack.displayName})`,
    quantity: Math.round(litersNeeded * 10) / 10,
    unit: "л",
    withReserve: Math.round(pack.totalVolume * 10) / 10,
    purchaseQty: Math.round(pack.totalVolume * 10) / 10,
    category: opts?.category ?? "Подготовка",
  };
}
