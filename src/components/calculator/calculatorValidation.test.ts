import { describe, expect, it } from "vitest";
import type { CalculatorField } from "@/lib/calculators/types";
import {
  getInvalidCalculatorFields,
  isCalculatorFieldValueValid,
} from "./calculatorValidation";

const areaField: CalculatorField = {
  key: "area",
  label: "Площадь",
  type: "number",
  unit: "м²",
  min: 1,
  max: 1000,
  step: 0.1,
  defaultValue: 10,
};

describe("валидация полей калькулятора", () => {
  it("не принимает значения за границами и не изменяет их", () => {
    expect(isCalculatorFieldValueValid(areaField, -1)).toBe(false);
    expect(isCalculatorFieldValueValid(areaField, 1001)).toBe(false);
    expect(isCalculatorFieldValueValid(areaField, Number.NaN)).toBe(false);
  });

  it("сохраняет валидные дробные значения", () => {
    expect(isCalculatorFieldValueValid(areaField, 1.5)).toBe(true);
  });

  it("отклоняет дробное значение для штучной упаковки", () => {
    const piecesField: CalculatorField = {
      ...areaField,
      key: "tilesPerPackage",
      label: "Плиток в коробке",
      unit: "шт.",
      min: 1,
      max: 500,
      step: 1,
      defaultValue: 16,
      integerOnly: true,
    };

    expect(isCalculatorFieldValueValid(piecesField, 10)).toBe(true);
    expect(isCalculatorFieldValueValid(piecesField, 10.5)).toBe(false);
  });

  it("возвращает проблемное поле для общей блокировки расчёта", () => {
    expect(getInvalidCalculatorFields([areaField], { area: -1 })).toEqual([
      { field: areaField, value: -1 },
    ]);
  });

  it("не применяет числовые границы к переключателям", () => {
    const modeField: CalculatorField = {
      key: "mode",
      label: "Режим",
      type: "select",
      defaultValue: 0,
      options: [{ value: 0, label: "Обычный" }],
    };

    expect(isCalculatorFieldValueValid(modeField, 99)).toBe(true);
  });
});
