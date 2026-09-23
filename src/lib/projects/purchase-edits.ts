import type { StoredProjectMaterial } from "@/lib/storage/types";

export type PurchaseMaterialEdit = Partial<Pick<
  StoredProjectMaterial,
  "quantity" | "packageSize" | "packageCount" | "packageUnit" | "excluded" | "procurementKey"
>>;

function finitePositive(value: number | undefined): value is number {
  return value != null && Number.isFinite(value) && value > 0;
}

function finite(value: number | undefined): value is number {
  return value != null && Number.isFinite(value);
}

function isPieceUnit(unit: string): boolean {
  return /^шт\.?$/iu.test(unit.trim());
}

function packageCountFor(need: number, packageSize: number): number {
  const ratio = need / packageSize;
  return Math.ceil(ratio - Number.EPSILON * 4 * Math.max(1, Math.abs(ratio)));
}

/** Applies an explicit cart edit without attempting to derive missing calculator data. */
export function updatePurchaseMaterial(
  material: StoredProjectMaterial,
  edit: PurchaseMaterialEdit,
): StoredProjectMaterial {
  const next = { ...material, ...edit };
  // A manual purchase quantity is intentional. Only a packaging edit can
  // recompute the purchase quantity from the saved reserved need.
  if (Object.prototype.hasOwnProperty.call(edit, "quantity")) {
    if (!finite(next.quantity) || next.quantity < 0 || (isPieceUnit(next.unit) && !Number.isInteger(next.quantity))) return material;
    // A manual buy quantity must not be silently re-aggregated with a SKU later.
    const { procurementKey: _procurementKey, packageCount: _packageCount, remainder: _remainder, ...manual } = next;
    return manual;
  }
  if (Object.prototype.hasOwnProperty.call(edit, "packageSize") && !finitePositive(next.packageSize)) return material;
  if (Object.prototype.hasOwnProperty.call(edit, "packageCount") && (!finitePositive(next.packageCount) || !Number.isInteger(next.packageCount))) return material;
  if (Object.prototype.hasOwnProperty.call(edit, "packageSize") && finitePositive(next.packageSize) && finitePositive(next.reservedQuantity)) {
    const packageCount = packageCountFor(next.reservedQuantity, next.packageSize!);
    return {
      ...next,
      packageCount,
      quantity: !next.baseUnit || next.unit === next.baseUnit ? packageCount * next.packageSize : packageCount,
      remainder: Math.max(0, packageCount * next.packageSize - next.reservedQuantity),
    };
  }
  return next;
}

export function excludePurchaseMaterial(material: StoredProjectMaterial, excluded = true): StoredProjectMaterial {
  return { ...material, excluded };
}
