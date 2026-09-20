import type { CalculatorField } from "@/lib/calculators/types";
import { resolveFieldOptions } from "@/lib/calculators/field-options";

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
  values: Record<string, number> = { [field.key]: value },
): boolean {
  if (!Number.isFinite(value)) return false;

  if (field.type === "switch") return value === 0 || value === 1;

  if (field.type === "select" || field.type === "radio") {
    const options = resolveFieldOptions(field, values) ?? [];
    return options.length === 0 || options.some((option) => option.value === value);
  }

  if (!isNumericField(field)) return true;

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
    return isCalculatorFieldValueValid(field, value, values) ? [] : [{ field, value }];
  });
}
