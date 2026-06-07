import { describe, it, expect } from "vitest";
import { resolveFieldOptions, shouldHideField } from "./useCalculator";
import type { CalculatorField } from "@/lib/calculators/types";

const thicknessField: CalculatorField = {
  key: "thickness",
  label: "Толщина",
  type: "select",
  defaultValue: 100,
  options: [
    { value: 50, label: "50 мм" },
    { value: 100, label: "100 мм" },
    { value: 150, label: "150 мм" },
    { value: 200, label: "200 мм" },
  ],
  optionsFromBrand: {
    category: "insulation",
    specKey: "thicknessOptions",
    labelTemplate: "%v мм",
  },
};

describe("resolveFieldOptions — динамические опции от бренда", () => {
  it("без бренда возвращает статичные options", () => {
    const r = resolveFieldOptions(thicknessField, { manufacturer: 0 });
    expect(r?.map((o) => o.value)).toEqual([50, 100, 150, 200]);
  });

  it("бренд с thicknessOptions подменяет опции", () => {
    // manufacturer=10 → «Пеноплэкс Комфорт», thicknessOptions=[20,30,50,100]
    const r = resolveFieldOptions(thicknessField, { manufacturer: 10 });
    expect(r?.map((o) => o.value)).toEqual([20, 30, 50, 100]);
    expect(r?.[0].label).toBe("20 мм");
  });

  it("Rockwool Лайт Баттс (manufacturer=4) — [50,100,150]", () => {
    const r = resolveFieldOptions(thicknessField, { manufacturer: 4 });
    expect(r?.map((o) => o.value)).toEqual([50, 100, 150]);
  });

  it("несуществующий бренд → fallback на статичные options", () => {
    const r = resolveFieldOptions(thicknessField, { manufacturer: 999 });
    expect(r?.map((o) => o.value)).toEqual([50, 100, 150, 200]);
  });

  it("поле без optionsFromBrand игнорирует бренд", () => {
    const plain: CalculatorField = {
      key: "x",
      label: "X",
      type: "select",
      defaultValue: 0,
      options: [{ value: 0, label: "A" }],
    };
    const r = resolveFieldOptions(plain, { manufacturer: 4 });
    expect(r).toEqual(plain.options);
  });
});

describe("resolveFieldOptions — каталог утеплителя (productId)", () => {
  const productField: CalculatorField = {
    key: "productId",
    label: "Линейка",
    type: "select",
    defaultValue: 1,
    options: [],
  };

  it("плиты для фасада (application=0): фасадные линейки, без Лайт Баттс и Пеноплэкс", () => {
    // Фасад (0): Фасад Баттс (apps=[0]), Роклайт (apps=[0,1]).
    // Лайт Баттс (apps=[1,2]) и Пеноплэкс (apps=[3,4]) — исключены.
    const r = resolveFieldOptions(productField, { materialForm: 0, application: 0 });
    const labels = r?.map((o) => o.label).join(" ") ?? "";
    expect(labels).toContain("Фасад Баттс");
    expect(labels).toContain("Роклайт");
    expect(labels).not.toContain("Лайт Баттс");
    expect(labels).not.toContain("Пеноплэкс");
    expect(labels).not.toContain("Тепло Roll");
  });

  it("плиты для стен (application=1): стеновые линейки", () => {
    // Стены (1): Лайт Баттс Скандик (apps=[1,2]), Роклайт (apps=[0,1]).
    // Пеноплэкс (apps=[3,4]) — исключён.
    const r = resolveFieldOptions(productField, { materialForm: 0, application: 1 });
    const labels = r?.map((o) => o.label).join(" ") ?? "";
    expect(labels).toContain("Лайт Баттс");
    expect(labels).toContain("Роклайт");
    expect(labels).not.toContain("Пеноплэкс");
  });

  it("рулоны: только рулонные линейки (стены, application=1)", () => {
    // Техно 37 (рулон) — apps=[1,2,3], без фасада. Для фасада (0) исключён.
    const r = resolveFieldOptions(productField, { materialForm: 1, application: 1 });
    const labels = r?.map((o) => o.label).join(" ") ?? "";
    expect(labels).toContain("Техно 37");
    expect(labels).not.toContain("Лайт Баттс");
    expect(labels).not.toContain("Пеноплэкс");
  });
});

describe("shouldHideField — декларативные условия", () => {
  it("hideIf gt: скрывает когда значение больше", () => {
    const f: CalculatorField = {
      key: "x",
      label: "X",
      type: "select",
      defaultValue: 0,
      hideIf: { key: "manufacturer", op: "gt", value: 0 },
    };
    expect(shouldHideField(f, { manufacturer: 0 })).toBe(false);
    expect(shouldHideField(f, { manufacturer: 5 })).toBe(true);
  });

  it("hideIf массив = OR", () => {
    const f: CalculatorField = {
      key: "x",
      label: "X",
      type: "select",
      defaultValue: 0,
      hideIf: [
        { key: "a", op: "gt", value: 0 },
        { key: "b", op: "eq", value: 1 },
      ],
    };
    expect(shouldHideField(f, { a: 0, b: 0 })).toBe(false);
    expect(shouldHideField(f, { a: 5, b: 0 })).toBe(true);
    expect(shouldHideField(f, { a: 0, b: 1 })).toBe(true);
  });
});
