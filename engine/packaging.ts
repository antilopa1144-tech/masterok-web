import { roundPurchase } from "./units";

export interface PackageOption {
  size: number;
  unit: string;
  label: string;
}

export interface PackagingResult {
  purchaseQuantity: number;
  leftover: number;
  package: PackageOption;
  packageCount: number;
}

export function optimizePackaging(exactNeed: number, options: PackageOption[]): PackagingResult {
  const safeNeed = Math.max(0, exactNeed);

  if (options.length === 0) {
    const purchaseQuantity = roundPurchase(safeNeed, 1);
    return {
      purchaseQuantity,
      leftover: purchaseQuantity - safeNeed,
      package: { size: 1, unit: "unit", label: "unit" },
      packageCount: purchaseQuantity,
    };
  }

  let best: PackagingResult | undefined;

  for (const option of options) {
    // Guard: skip options with zero or negative size to prevent Infinity/NaN
    if (!option.size || option.size <= 0) continue;
    const packageCount = Math.ceil(safeNeed / option.size);
    const purchaseQuantity = packageCount * option.size;
    const leftover = purchaseQuantity - safeNeed;

    const candidate: PackagingResult = {
      purchaseQuantity,
      leftover,
      package: option,
      packageCount,
    };

    if (!best) {
      best = candidate;
      continue;
    }

    const betterByLeftover = candidate.leftover < best.leftover;
    const sameLeftover = candidate.leftover === best.leftover;
    const betterByPurchase = candidate.purchaseQuantity < best.purchaseQuantity;

    if (betterByLeftover || (sameLeftover && betterByPurchase)) {
      best = candidate;
    }
  }

  return best as PackagingResult;
}
