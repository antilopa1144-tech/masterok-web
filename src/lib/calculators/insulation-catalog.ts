import catalogJson from "../../../configs/insulation-catalog.v1.json";

export const INSULATION_FORM_SLABS = 0;
export const INSULATION_FORM_ROLLS = 1;
export const INSULATION_FORM_SPRAY = 2;

export const INSULATION_PRODUCT_MANUAL = 0;

export interface InsulationCatalogProduct {
  id: number;
  form: "slabs" | "rolls" | "spray";
  subgroup: string;
  manufacturer: string;
  lineName: string;
  insulationTypeId: number;
  plateWidthMm?: number;
  plateLengthMm?: number;
  plateAreaM2?: number;
  rollWidthMm?: number;
  rollLengthMm?: number;
  rollAreaM2?: number;
  rollsPerPack?: number;
  densityKgM3?: number;
  packHeightMm?: number;
  thicknessMm: number[];
  packPieces?: Record<string, number>;
  ecowoolBagKg?: number;
  ecowoolDensityKgM3?: number;
  costPerM2At100mm?: number;
  note?: string;
}

const catalog = catalogJson as {
  products: InsulationCatalogProduct[];
  subgroups: Record<string, { label: string }>;
  manualOption: { id: number; label: string };
};

const SUBGROUP_ORDER_SLABS = ["mineral_wool", "penoplex", "penoplast"] as const;
const SUBGROUP_ORDER_ROLLS = ["rolls"] as const;
const SUBGROUP_ORDER_SPRAY = ["spray"] as const;

export function getInsulationProduct(id: number): InsulationCatalogProduct | null {
  if (id <= 0) return null;
  return catalog.products.find((p) => p.id === id) ?? null;
}

export function getDefaultProductIdForForm(materialForm: number): number {
  const formKey = materialForm === INSULATION_FORM_ROLLS
    ? "rolls"
    : materialForm === INSULATION_FORM_SPRAY
      ? "spray"
      : "slabs";
  return catalog.products.find((p) => p.form === formKey)?.id ?? INSULATION_PRODUCT_MANUAL;
}

export function buildProductSelectOptions(materialForm: number): Array<{
  value: number;
  label: string;
  optGroup?: string;
}> {
  const formKey =
    materialForm === INSULATION_FORM_ROLLS
      ? "rolls"
      : materialForm === INSULATION_FORM_SPRAY
        ? "spray"
        : "slabs";

  const order =
    formKey === "slabs"
      ? SUBGROUP_ORDER_SLABS
      : formKey === "rolls"
        ? SUBGROUP_ORDER_ROLLS
        : SUBGROUP_ORDER_SPRAY;

  const options: Array<{ value: number; label: string; optGroup?: string }> = [];

  for (const sg of order) {
    const groupLabel = catalog.subgroups[sg]?.label ?? sg;
    const items = catalog.products.filter((p) => p.form === formKey && p.subgroup === sg);
    for (const p of items) {
      const sizeHint =
        p.form === "rolls" && p.rollWidthMm && p.rollLengthMm
          ? ` · ${p.rollWidthMm}×${p.rollLengthMm} мм`
          : p.plateWidthMm && p.plateLengthMm
            ? ` · ${p.plateLengthMm}×${p.plateWidthMm} мм`
            : "";
      const densityHint = p.densityKgM3 ? ` · ${p.densityKgM3} кг/м³` : "";
      options.push({
        value: p.id,
        label: `${p.manufacturer} — ${p.lineName}${sizeHint}${densityHint}`,
        optGroup: groupLabel,
      });
    }
  }

  options.push({
    value: INSULATION_PRODUCT_MANUAL,
    label: catalog.manualOption.label,
    optGroup: "Другой материал",
  });

  return options;
}

export function getProductThicknessOptions(productId: number): number[] {
  const p = getInsulationProduct(productId);
  return p?.thicknessMm ?? [];
}

/** Подстановка параметров линейки в inputs движка. */
export function applyCatalogProductToInputs(
  product: InsulationCatalogProduct,
  inputs: Record<string, unknown>,
  thickness: number,
): void {
  inputs.insulationType = product.insulationTypeId;
  inputs.productForm =
    product.form === "rolls"
      ? INSULATION_FORM_ROLLS
      : product.form === "spray"
        ? INSULATION_FORM_SPRAY
        : INSULATION_FORM_SLABS;

  if (product.form === "slabs") {
    inputs.plateAreaM2 = product.plateAreaM2;
    if (product.packPieces?.[String(thickness)] !== undefined) {
      inputs.piecesPerPack = product.packPieces[String(thickness)];
    } else {
      inputs.piecesPerPack = 0;
    }
    if (product.packHeightMm) {
      inputs.packHeightMmOverride = product.packHeightMm;
    }
  }

  if (product.form === "rolls") {
    inputs.rollAreaM2 = product.rollAreaM2;
    inputs.rollsPerPack = product.rollsPerPack ?? 1;
    inputs.rollWidthMm = product.rollWidthMm;
    inputs.rollLengthMm = product.rollLengthMm;
  }

  if (product.form === "spray") {
    if (product.ecowoolDensityKgM3) {
      inputs.ecowoolDensityKgM3 = product.ecowoolDensityKgM3;
    }
    if (product.ecowoolBagKg) {
      inputs.ecowoolBagKg = product.ecowoolBagKg;
    }
  }

  if (product.densityKgM3) {
    inputs.density = product.densityKgM3;
  }

  inputs.catalogProductId = product.id;
}

export function getProductDisplayName(product: InsulationCatalogProduct): string {
  return `${product.manufacturer} ${product.lineName}`;
}

export function getProductCostPerM2(product: InsulationCatalogProduct): number {
  return product.costPerM2At100mm ?? 0;
}
