import type { MaterialResult } from "@/lib/calculators/types";
import { displayUnit, pluralizePackageUnit } from "@/lib/format/pluralize";

export type MaterialPriceBasisKind = "package" | "raw";

export interface MaterialPriceBasis {
  kind: MaterialPriceBasisKind;
  quantity: number;
  unitLabel: string;
  unitDescription: string;
  calculationLabel: string;
  key: string;
}

export type MaterialPriceMap = Record<string, number>;

export function getMaterialQuantity(material: MaterialResult): number {
  const value = material.purchaseQty ?? material.withReserve ?? material.quantity;
  return Number.isFinite(value) && value > 0 ? value : 0;
}

function formatBasisNumber(value: number): string {
  return value.toLocaleString("ru-RU", { maximumFractionDigits: 3 });
}

function normalizeKeyPart(value: string | number): string {
  return String(value).trim().toLowerCase().replace(/\s+/g, " ");
}

export function getMaterialPriceBasis(material: MaterialResult): MaterialPriceBasis {
  const unit = displayUnit(material.unit);
  const packageInfo = material.packageInfo;

  if (
    packageInfo
    && Number.isFinite(packageInfo.count)
    && packageInfo.count > 0
    && Number.isFinite(packageInfo.size)
    && packageInfo.size > 0
    && packageInfo.packageUnit
  ) {
    const packageUnit = pluralizePackageUnit(1, packageInfo.packageUnit);
    const calculationLabel = `${formatBasisNumber(packageInfo.count)} ${pluralizePackageUnit(packageInfo.count, packageInfo.packageUnit)} × ${formatBasisNumber(packageInfo.size)} ${unit}`;

    return {
      kind: "package",
      quantity: packageInfo.count,
      unitLabel: packageUnit,
      unitDescription: `${packageUnit} ${formatBasisNumber(packageInfo.size)} ${unit}`,
      calculationLabel,
      key: [
        normalizeKeyPart(material.name),
        "package",
        normalizeKeyPart(packageInfo.packageUnit),
        normalizeKeyPart(packageInfo.size),
        normalizeKeyPart(unit),
      ].join("|"),
    };
  }

  const quantity = getMaterialQuantity(material);

  return {
    kind: "raw",
    quantity,
    unitLabel: unit,
    unitDescription: `1 ${unit}`,
    calculationLabel: `${formatBasisNumber(quantity)} ${unit}`,
    key: [
      normalizeKeyPart(material.name),
      "raw",
      normalizeKeyPart(unit),
    ].join("|"),
  };
}

export function getMaterialPriceKey(material: MaterialResult): string {
  return getMaterialPriceBasis(material).key;
}

export function getMaterialStoredPrice(
  prices: MaterialPriceMap,
  material: MaterialResult,
  basis = getMaterialPriceBasis(material),
): number {
  const currentValue = prices[basis.key];
  if (typeof currentValue === "number" && currentValue > 0) return currentValue;

  // Old price storage used material.name as the key. It is still safe for raw
  // materials because their price basis did not change. For packaged materials
  // we intentionally do not reuse the old value: it may have been entered as
  // price per kg/m/m2, while the new basis is price per bag/roll/rod.
  if (basis.kind === "raw") {
    const legacyValue = prices[material.name];
    if (typeof legacyValue === "number" && legacyValue > 0) return legacyValue;
  }

  return 0;
}

export function getMaterialPriceTotal(materials: MaterialResult[], prices: MaterialPriceMap): number {
  return materials.reduce((sum, material) => {
    const basis = getMaterialPriceBasis(material);
    return sum + basis.quantity * getMaterialStoredPrice(prices, material, basis);
  }, 0);
}

export function getRelevantPriceCount(materials: MaterialResult[], prices: MaterialPriceMap): number {
  const counted = new Set<string>();
  let count = 0;

  for (const material of materials) {
    const basis = getMaterialPriceBasis(material);
    if (counted.has(basis.key)) continue;
    if (getMaterialStoredPrice(prices, material, basis) > 0) {
      counted.add(basis.key);
      count += 1;
    }
  }

  return count;
}
