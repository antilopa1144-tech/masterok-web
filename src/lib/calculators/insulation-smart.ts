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
import { INSULATION_APPLICATION } from "./insulation-application";
import type { CalculatorField } from "./types";

/** Рекомендуемая толщина стен, мм — зоны 0..4 (СП 50.13330). */
const ZONE_REC_WALLS_MM = [100, 150, 150, 200, 250] as const;
/** Пол / перекрытие по грунту или лагам — меньше, чем наружная стена. */
const ZONE_REC_FLOOR_MM = [80, 100, 100, 150, 150] as const;
/** Цоколь / фундамент (ЭППС). */
const ZONE_REC_FOUNDATION_MM = [100, 100, 150, 150, 200] as const;

/** Минимальная толщина стен, мм — зоны 0..4. */
const ZONE_MIN_WALLS_MM = [80, 100, 150, 150, 200] as const;
const ZONE_MIN_FLOOR_MM = [50, 80, 80, 100, 100] as const;

function thicknessTableForApplication(application: number): readonly number[] {
  if (application === INSULATION_APPLICATION.FLOOR) return ZONE_REC_FLOOR_MM;
  if (application === INSULATION_APPLICATION.FOUNDATION) return ZONE_REC_FOUNDATION_MM;
  return ZONE_REC_WALLS_MM;
}

function minThicknessTableForApplication(application: number): readonly number[] {
  if (application === INSULATION_APPLICATION.FLOOR) return ZONE_MIN_FLOOR_MM;
  return ZONE_MIN_WALLS_MM;
}

export function getRecommendedThicknessMm(
  climateZone: number,
  application: number = INSULATION_APPLICATION.FACADE,
): number {
  const table = thicknessTableForApplication(application);
  const z = Math.max(0, Math.min(table.length - 1, Math.round(climateZone)));
  return table[z] ?? 150;
}

export function getMinThicknessMm(
  climateZone: number,
  application: number = INSULATION_APPLICATION.FACADE,
): number {
  const table = minThicknessTableForApplication(application);
  const z = Math.max(0, Math.min(table.length - 1, Math.round(climateZone)));
  return table[z] ?? 100;
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
  application: number = INSULATION_APPLICATION.FACADE,
): number {
  const rec = getRecommendedThicknessMm(climateZone, application);
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
