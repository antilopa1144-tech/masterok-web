import type { CalculatorField } from "@/lib/calculators/types";

export interface InvalidCalculatorField {
  field: CalculatorField;
  value: number;
}

function isNumericField(field: CalculatorField): boolean {
  return field.type === "number" || field.type === "slider";
}

export function isCalculatorFieldValueValid(
  field: CalculatorField,
  value: number,
): boolean {
  if (!isNumericField(field)) return true;
  if (!Number.isFinite(value)) return false;

  const min = field.min ?? 0;
  const max = field.max ?? 100;
  return value >= min
    && value <= max
    && (!field.integerOnly || Number.isInteger(value));
}

export function getInvalidCalculatorFields(
  fields: CalculatorField[],
  values: Record<string, number>,
): InvalidCalculatorField[] {
  return fields.flatMap((field) => {
    const value = values[field.key] ?? field.defaultValue;
    return isCalculatorFieldValueValid(field, value) ? [] : [{ field, value }];
  });
}
