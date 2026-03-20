/**
 * Smart packaging: pick optimal container sizes for liquid materials.
 *
 * Instead of always dividing by a fixed container size (e.g. 10L),
 * this picks the best combination of available sizes to minimize waste.
 *
 * Real-world container sizes for common building liquids:
 * - Primer (грунтовка): 1L, 2L, 5L, 10L
 * - Paint (краска): 0.9L, 2.5L, 5L, 10L, 20L
 * - Adhesive liquid: 1L, 5L, 10L
 */

import type { CanonicalMaterialResult } from "./canonical";

export interface ContainerOption {
  /** Container volume in base units (liters, kg, etc.) */
  size: number;
  /** Display label, e.g. "10 л" */
  label: string;
}

export interface PackagingResult {
  /** Total number of containers to buy */
  totalContainers: number;
  /** Breakdown by container size: [{size, label, count}] */
  breakdown: Array<{ size: number; label: string; count: number }>;
  /** Total volume purchased */
  totalVolume: number;
  /** Leftover (waste) */
  leftover: number;
  /** Human-readable name, e.g. "2 канистры по 5 л + 1 канистра 1 л" */
  displayName: string;
  /** Unit label for material list */
  unitLabel: string;
}

/** Standard primer container sizes (liters) */
export const PRIMER_CONTAINERS: ContainerOption[] = [
  { size: 1, label: "1 л" },
  { size: 2, label: "2 л" },
  { size: 5, label: "5 л" },
  { size: 10, label: "10 л" },
];

/** Standard paint container sizes (liters) */
export const PAINT_CONTAINERS: ContainerOption[] = [
  { size: 0.9, label: "0,9 л" },
  { size: 2.5, label: "2,5 л" },
  { size: 5, label: "5 л" },
  { size: 10, label: "10 л" },
  { size: 20, label: "20 л" },
];

/**
 * Pick the optimal combination of containers for a given volume.
 *
 * Strategy: greedy from largest to smallest, then check if a single
 * larger container would be cheaper (less waste) than multiple small ones.
 */
export function pickOptimalContainers(
  neededVolume: number,
  containers: ContainerOption[],
): PackagingResult {
  if (neededVolume <= 0) {
    return { totalContainers: 0, breakdown: [], totalVolume: 0, leftover: 0, displayName: "", unitLabel: "" };
  }

  // Sort descending by size
  const sorted = [...containers].sort((a, b) => b.size - a.size);

  // Strategy 1: greedy fill from largest
  const greedy = greedyFill(neededVolume, sorted);

  // Strategy 2: single next-size-up (if one container covers it all)
  const singleUp = sorted.find((c) => c.size >= neededVolume);
  const singleResult = singleUp
    ? { breakdown: [{ ...singleUp, count: 1 }], total: singleUp.size, containers: 1 }
    : null;

  // Pick the one with least waste, preferring fewer containers
  let best = greedy;
  if (singleResult && singleResult.total - neededVolume <= greedy.total - neededVolume) {
    best = singleResult;
  }

  const totalVolume = best.total;
  const leftover = Math.round((totalVolume - neededVolume) * 100) / 100;
  const totalContainers = best.breakdown.reduce((sum, b) => sum + b.count, 0);

  // Build display name
  const parts = best.breakdown
    .filter((b) => b.count > 0)
    .map((b) => `${b.count}×${b.label}`);
  const displayName = parts.join(" + ");

  // Build unit label (use the most common size)
  const primarySize = best.breakdown.reduce((a, b) => (b.count > a.count ? b : a), best.breakdown[0]);
  const unitLabel = `канистр (${primarySize.label})`;

  return { totalContainers, breakdown: best.breakdown, totalVolume, leftover, displayName, unitLabel };
}

function greedyFill(needed: number, sorted: ContainerOption[]) {
  let remaining = needed;
  const breakdown: Array<{ size: number; label: string; count: number }> = [];
  let total = 0;

  for (const container of sorted) {
    if (remaining <= 0) break;
    const count = Math.floor(remaining / container.size);
    if (count > 0) {
      breakdown.push({ ...container, count });
      remaining -= count * container.size;
      total += count * container.size;
    }
  }

  // If there's remaining, add one of the smallest container that covers it
  if (remaining > 0) {
    // Find smallest container that exists
    const smallest = sorted[sorted.length - 1];
    const existing = breakdown.find((b) => b.size === smallest.size);
    if (existing) {
      existing.count += 1;
    } else {
      breakdown.push({ ...smallest, count: 1 });
    }
    total += smallest.size;
  }

  return { breakdown, total, containers: breakdown.reduce((s, b) => s + b.count, 0) };
}

/**
 * Build a primer material result with smart container sizing.
 * Replaces all hardcoded "Math.ceil(liters / 10)" patterns across calculators.
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
