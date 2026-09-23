import type { MaterialResult } from "@/lib/calculators/types";
import type { StoredProjectMaterial } from "@/lib/storage/types";
import type { PROCUREMENT_PILOT } from "./types";

/** Extra fields are deliberately optional: most calculator results do not expose them. */
export type MaterialSnapshot = MaterialResult & Partial<Pick<StoredProjectMaterial,
  "exactQuantity" | "reservedQuantity" | "baseUnit" | "procurementKey" | "remainder"
>>;

export type ProcurementPilot = (typeof PROCUREMENT_PILOT)[number];

const PILOT_BY_CALCULATOR_ID: Record<string, ProcurementPilot> = {
  mixes_plaster: "plaster",
  mixes_putty: "putty",
  mixes_primer: "primer",
  paint: "paint",
  tile: "tile",
  mixes_tile_glue: "tile-adhesive",
  floors_tile_grout: "tile-grout",
  laminate: "laminate",
  floors_self_leveling: "self-leveling",
  bathroom_waterproof: "waterproofing",
};

function finite(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function finitePositive(value: unknown): value is number {
  return finite(value) && value > 0;
}

/** Units whose calculator result expresses a measurable need, rather than a bag/piece count. */
function isConsumableBaseUnit(unit: string, packageInfo: MaterialResult["packageInfo"]): boolean {
  if (["кг", "л", "м²", "м"].includes(unit.trim())) return true;
  if (!/^шт\.?$/iu.test(unit.trim()) || !packageInfo?.packageUnit.trim()) return false;
  const normalizedUnit = unit.trim().replace(/\.$/u, "").toLocaleLowerCase("ru-RU");
  const normalizedPackageUnit = packageInfo.packageUnit.trim().replace(/\.$/u, "").toLocaleLowerCase("ru-RU");
  return normalizedPackageUnit !== normalizedUnit;
}

/** Maps stable calculator ids to the deliberately small material-offer pilot. */
export function procurementPilotForCalculator(calculatorId?: string): ProcurementPilot | undefined {
  return calculatorId ? PILOT_BY_CALCULATOR_ID[calculatorId] : undefined;
}

/**
 * Persists values as reported by the calculator. It never converts package counts
 * to a base unit: `quantity` may already be a count of bags, sheets or rolls.
 */
export function toStoredMaterial(material: MaterialSnapshot): StoredProjectMaterial {
  const purchaseQuantity = material.purchaseQty ?? material.withReserve ?? material.quantity;
  const packageInfo = material.packageInfo;
  const hasKnownNeed = isConsumableBaseUnit(material.unit, packageInfo);
  const packageTotal = packageInfo && finitePositive(packageInfo.count) && finitePositive(packageInfo.size)
    ? packageInfo.count * packageInfo.size : undefined;
  // Some canonical adapters expose `withReserve` as the already package-rounded
  // purchase quantity. In that shape the only proven unrounded need is quantity.
  const reserveIsAlreadyPackaged = hasKnownNeed
    && packageTotal != null
    && finite(material.purchaseQty)
    && material.withReserve === material.purchaseQty;
  const exactQuantity = finite(material.exactQuantity)
    ? material.exactQuantity
    : hasKnownNeed && finite(material.quantity) ? material.quantity : undefined;
  const ambiguousPackagedNeed = hasKnownNeed && packageTotal == null && finite(material.purchaseQty) && material.withReserve === material.purchaseQty && material.quantity !== material.purchaseQty;
  const reservedQuantity = finite(material.reservedQuantity)
    ? material.reservedQuantity
    : ambiguousPackagedNeed ? undefined
    : reserveIsAlreadyPackaged && finite(material.quantity) ? material.quantity
    : hasKnownNeed && finite(material.withReserve) ? material.withReserve
      : hasKnownNeed && finite(material.quantity) ? material.quantity : undefined;
  const remainder = finite(material.remainder)
    ? material.remainder
    : reservedQuantity != null && finite(material.purchaseQty)
      ? Math.max(0, material.purchaseQty - reservedQuantity)
      : reservedQuantity != null && packageTotal != null
        ? Math.max(0, packageTotal - reservedQuantity) : undefined;
  return {
    name: material.name,
    ...(material.subtitle ? { subtitle: material.subtitle } : {}),
    quantity: finite(purchaseQuantity) ? purchaseQuantity : 0,
    unit: material.unit,
    ...(material.category ? { category: material.category } : {}),
    ...(material.procurementKey?.trim() ? { procurementKey: material.procurementKey.trim() } : {}),
    ...(finite(material.quantity) ? { baseQuantity: material.quantity } : {}),
    ...(finite(material.purchaseQty) ? { purchaseQty: material.purchaseQty } : {}),
    ...(exactQuantity != null ? { exactQuantity } : {}),
    ...(reservedQuantity != null ? { reservedQuantity } : {}),
    ...(material.baseUnit?.trim() ? { baseUnit: material.baseUnit.trim() } : hasKnownNeed ? { baseUnit: material.unit } : {}),
    ...(packageInfo && finitePositive(packageInfo.size) && finitePositive(packageInfo.count) && packageInfo.packageUnit.trim()
      ? { packageSize: packageInfo.size, packageCount: packageInfo.count, packageUnit: packageInfo.packageUnit }
      : {}),
    ...(remainder != null ? { remainder } : {}),
  };
}
