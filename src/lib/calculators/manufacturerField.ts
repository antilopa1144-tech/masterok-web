import type { CalculatorField } from "./types";
import { getManufacturerCategory, type ManufacturerItem } from "../manufacturers";

export const NO_MANUFACTURER_INDEX = 0;

/**
 * Генерирует поле "Производитель" для калькулятора на основе manufacturers.json.
 * Первая опция (index 0) — «Не указан» (используются стандартные параметры).
 * При выборе бренда — specs подставляются в формулу.
 */
export function buildManufacturerField(
  categoryKey: string,
  overrides: Partial<CalculatorField> = {}
): CalculatorField | null {
  const cat = getManufacturerCategory(categoryKey);
  if (!cat) return null;

  const options = [
    { value: NO_MANUFACTURER_INDEX, label: "— Не указан (стандарт) —" },
    ...cat.items.map((item, idx) => ({
      value: idx + 1,
      label: item.name,
    })),
  ];

  return {
    key: "manufacturer",
    label: cat.label,
    type: "select",
    defaultValue: NO_MANUFACTURER_INDEX,
    options,
    hint: "При выборе бренда характеристики (расход, размер упаковки) подставляются автоматически",
    ...overrides,
  };
}

/**
 * По индексу из select возвращает выбранный бренд с его specs.
 * Если выбран «Не указан» (0) — возвращает null.
 */
export function getManufacturerByIndex(
  categoryKey: string,
  index: number | undefined
): ManufacturerItem | null {
  if (!index || index <= 0) return null;
  const cat = getManufacturerCategory(categoryKey);
  if (!cat) return null;
  return cat.items[index - 1] ?? null;
}

/**
 * Удобный хелпер — извлечь конкретный параметр бренда с fallback на дефолтное значение.
 * Пример: `getSpec(item, "consumptionKgPerM2PerMm", 0.9)`
 */
export function getSpec<T>(
  item: ManufacturerItem | null,
  specKey: string,
  defaultValue: T
): T {
  if (!item) return defaultValue;
  const v = item.specs[specKey];
  return v === undefined || v === null ? defaultValue : (v as T);
}
