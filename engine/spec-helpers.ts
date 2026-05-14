import type { CanonicalCalculatorSpecBase } from "./canonical";

/**
 * Достаёт default_value поля из input_schema спецификации.
 * Возвращает fallback, если поле не найдено.
 *
 * Раньше эта функция была продублирована в каждом калькуляторе движка.
 * Источник истины для дефолтов — конфиг (configs/calculators/*-canonical.v1.json).
 */
export function getInputDefault(
  spec: Pick<CanonicalCalculatorSpecBase, "input_schema">,
  key: string,
  fallback: number,
): number {
  return spec.input_schema.find((field) => field.key === key)?.default_value ?? fallback;
}
