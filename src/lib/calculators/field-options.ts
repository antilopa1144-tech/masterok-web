import type { CalculatorField, FieldOption, HideCondition } from "./types";
import { getManufacturerCategory } from "@/lib/manufacturers";
import { buildProductSelectOptions, getProductThicknessOptions } from "./insulation-catalog";
import { getAllowedMaterialForms } from "./insulation-application";

/**
 * Видимость и динамические опции полей калькулятора.
 *
 * Вынесено из useCalculator: это доменная логика (каталог утеплителя,
 * specs производителей), а не управление React-состоянием.
 */

/**
 * Проверка одного декларативного условия скрытия (HideCondition).
 * Если поле отсутствует в values — условие считается невыполненным
 * (поле не скрывается из-за отсутствующего ключа).
 */
function evalHideCondition(c: HideCondition, values: Record<string, number>): boolean {
  const v = values[c.key];
  if (v === undefined || v === null || Number.isNaN(v)) return false;
  switch (c.op) {
    case "gt": return v > c.value;
    case "gte": return v >= c.value;
    case "lt": return v < c.value;
    case "lte": return v <= c.value;
    case "eq": return v === c.value;
    case "ne": return v !== c.value;
  }
}

/**
 * Стоит ли скрыть поле для текущих значений формы.
 * hideIf-массив объединяется через OR, hideIfAll — через AND.
 */
export function shouldHideField(field: CalculatorField, values: Record<string, number>): boolean {
  if (field.hideIf) {
    const conds = Array.isArray(field.hideIf) ? field.hideIf : [field.hideIf];
    if (conds.some((c) => evalHideCondition(c, values))) return true;
  }
  if (field.hideIfAll && field.hideIfAll.length > 0) {
    if (field.hideIfAll.every((c) => evalHideCondition(c, values))) return true;
  }
  return false;
}

/**
 * Возвращает реальные опции селекта, учитывая `optionsFromBrand`.
 *
 * Если поле объявило зависимость от бренда и пользователь выбрал конкретную
 * линейку — опции формируются из `manufacturer.specs[specKey]`. Иначе берутся
 * статичные `field.options`.
 *
 * Пример: `thickness` у Пеноплэкс Комфорт → [20, 30, 50, 100] мм вместо
 * стандартных [50, 80, 100, 150, 200, 250, 300]. Пользователь не сможет
 * выбрать толщину, которой бренд не выпускает.
 */
export function resolveFieldOptions(
  field: CalculatorField,
  values: Record<string, number>,
): FieldOption[] | undefined {
  if (field.key === "materialForm") {
    const application = Math.round(values.application ?? 0);
    const allowed = getAllowedMaterialForms(application);
    return (field.options ?? []).filter((o) => allowed.includes(o.value));
  }

  if (field.key === "productId") {
    const form = Math.round(values.materialForm ?? 0);
    const application = Math.round(values.application ?? 0);
    return buildProductSelectOptions(form, application);
  }

  if (field.optionsFromProduct) {
    const productId = Math.round(values.productId ?? 0);
    const thicknesses = getProductThicknessOptions(productId);
    if (thicknesses.length > 0) {
      return thicknesses.map((v) => ({ value: v, label: `${v} мм` }));
    }
  }

  const cfg = field.optionsFromBrand;
  if (!cfg) return field.options;
  const manufacturerIdx = values.manufacturer;
  if (!manufacturerIdx || manufacturerIdx <= 0) return field.options;
  const category = getManufacturerCategory(cfg.category);
  if (!category) return field.options;
  const brand = category.items[manufacturerIdx - 1];
  if (!brand) return field.options;
  const raw = (brand.specs as Record<string, unknown>)[cfg.specKey];
  if (!Array.isArray(raw) || raw.length === 0) return field.options;
  const template = cfg.labelTemplate ?? "%v";
  return raw
    .filter((v): v is number => typeof v === "number")
    .map((v) => ({ value: v, label: template.replace("%v", String(v)) }));
}
