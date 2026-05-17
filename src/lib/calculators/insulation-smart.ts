/**
 * «Умная» логика калькулятора утеплителя: регион → толщина, согласование формы и линейки.
 * Константы климатических зон синхронизированы с insulation-canonical.v1.json (без импорта JSON в client bundle).
 */
import {
  getInsulationProduct,
  getProductThicknessOptions,
  INSULATION_FORM_SLABS,
  INSULATION_PRODUCT_MANUAL,
} from "./insulation-catalog";
import type { CalculatorField } from "./types";

/** Рекомендуемая толщина стен, мм — зоны 0..4 (СП 50.13330). */
const ZONE_REC_MM = [100, 150, 150, 200, 250] as const;

/** Минимальная толщина стен, мм — зоны 0..4. */
const ZONE_MIN_MM = [80, 100, 150, 150, 200] as const;

export function getRecommendedThicknessMm(climateZone: number): number {
  const z = Math.max(0, Math.min(ZONE_REC_MM.length - 1, Math.round(climateZone)));
  return ZONE_REC_MM[z] ?? 150;
}

export function getMinThicknessMm(climateZone: number): number {
  const z = Math.max(0, Math.min(ZONE_MIN_MM.length - 1, Math.round(climateZone)));
  return ZONE_MIN_MM[z] ?? 100;
}

/** Ближайшая толщина из линейки или общего списка. */
export function snapThicknessMm(
  targetMm: number,
  productId: number,
  fallbackThicknesses: number[],
): number {
  const fromProduct = getProductThicknessOptions(productId);
  const pool =
    fromProduct.length > 0
      ? fromProduct
      : fallbackThicknesses.length > 0
        ? fallbackThicknesses
        : [50, 80, 100, 150, 200, 250, 300];
  return pool.reduce((best, t) =>
    Math.abs(t - targetMm) < Math.abs(best - targetMm) ? t : best,
  );
}

export function defaultThicknessOptionsFromField(
  fields: CalculatorField[],
): number[] {
  const f = fields.find((x) => x.key === "thickness");
  return f?.options?.map((o) => o.value) ?? [50, 80, 100, 150, 200, 250, 300];
}

/** Подбор толщины под климат и выбранную линейку. */
export function thicknessForClimateAndProduct(
  climateZone: number,
  productId: number,
  fields: CalculatorField[],
): number {
  const rec = getRecommendedThicknessMm(climateZone);
  return snapThicknessMm(rec, productId, defaultThicknessOptionsFromField(fields));
}

export function fieldUsesDynamicOptions(field: CalculatorField): boolean {
  return Boolean(field.optionsFromBrand || field.optionsFromProduct || field.key === "productId");
}

/** Показывать поле «Плотность минваты» только для плитной минваты без каталога. */
export function shouldShowMineralDensityField(values: Record<string, number>): boolean {
  const form = Math.round(values.materialForm ?? INSULATION_FORM_SLABS);
  if (form !== INSULATION_FORM_SLABS) return false;
  const productId = Math.round(values.productId ?? INSULATION_PRODUCT_MANUAL);
  if (productId > INSULATION_PRODUCT_MANUAL) {
    const p = getInsulationProduct(productId);
    return p?.insulationTypeId === 0;
  }
  return Math.round(values.insulationType ?? 0) === 0;
}
