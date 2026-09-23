import { describe, expect, it } from "vitest";
import { aggregateProcurementLines, groupProcurementByCategory } from "./procurement";
import type { StoredProjectEntry } from "@/lib/storage/types";

function entry(
  id: string,
  materials: StoredProjectEntry["materials"],
  calcTitle = "Расчёт",
): StoredProjectEntry {
  return {
    id,
    projectId: "p1",
    calcId: "calc",
    calcTitle,
    slug: "laminate",
    categorySlug: "poly",
    materials,
    ts: 1,
  };
}

describe("aggregateProcurementLines", () => {
  it("не объединяет legacy-позиции только по названию и единице", () => {
    const lines = aggregateProcurementLines([
      entry("e1", [{ name: "Ламинат", quantity: 10, unit: "упаковка", category: "Напольное" }]),
      entry("e2", [{ name: "Ламинат", quantity: 5, unit: "упаковка", category: "Напольное" }], "Комната 2"),
    ]);

    expect(lines).toHaveLength(2);
    expect(lines.map((line) => line.quantity).sort((a, b) => a - b)).toEqual([5, 10]);
    expect(lines.map((line) => line.sources)).toHaveLength(2);
  });

  it("не смешивает разные единицы измерения", () => {
    const lines = aggregateProcurementLines([
      entry("e1", [
        { name: "Клей", quantity: 2, unit: "мешок" },
        { name: "Клей", quantity: 3, unit: "кг" },
      ]),
    ]);

    expect(lines).toHaveLength(2);
  });

  it("подставляет категорию по умолчанию", () => {
    const lines = aggregateProcurementLines([
      entry("e1", [{ name: "Гвозди", quantity: 1, unit: "кг" }]),
    ]);
    expect(lines[0]!.category).toBe("Материалы");
  });

  it("показывает исходную фасовку даже до явной SKU-спецификации", () => {
    const [line] = aggregateProcurementLines([entry("e1", [{ name: "Смесь", quantity: 50, unit: "кг", reservedQuantity: 43, baseUnit: "кг", packageSize: 25, packageCount: 2, packageUnit: "мешок", remainder: 7 }])]);
    expect(line?.purchaseHint).toBe("Упаковок: 2 × 25 кг; с запасом нужно 43 кг; остаток 7 кг.");
  });

  it("не смешивает разные подписи без явной спецификации", () => {
    const lines = aggregateProcurementLines([
      entry("e1", [{ name: "Саморезы", subtitle: "Для ГКЛ по металлу 3,5×25 мм", quantity: 200, unit: "шт" }]),
      entry("e2", [{ name: "Саморезы", subtitle: "Для ГКЛ по металлу 3,5×35 мм", quantity: 300, unit: "шт" }]),
      entry("e3", [{ name: "Саморезы", subtitle: "Для ГКЛ по металлу 3,5×25 мм", quantity: 100, unit: "шт" }]),
    ]);

    expect(lines).toHaveLength(3);
    expect(lines.map((line) => line.quantity).sort((a, b) => a - b)).toEqual([100, 200, 300]);
  });

  it("суммирует совместимую потребность с запасом и округляет фасовку один раз", () => {
    const material = (quantity: number, exactQuantity: number, reservedQuantity: number) => ({
      name: "Клей для плитки", quantity, unit: "кг", category: "Сухие смеси",
      procurementKey: "tile-adhesive:brand-x:25kg",
      exactQuantity, reservedQuantity, baseUnit: "кг", packageSize: 25, packageCount: 1, packageUnit: "мешок",
    });
    const lines = aggregateProcurementLines([
      entry("e1", [material(25, 19, 21)]),
      entry("e2", [material(25, 20, 22)], "Кухня"),
    ]);

    expect(lines).toHaveLength(1);
    expect(lines[0]).toMatchObject({
      exactQuantity: 39, reservedQuantity: 43, packageSize: 25, packageCount: 2, quantity: 50, remainder: 7,
    });
    expect(lines[0]!.purchaseHint).toContain("с запасом нужно 43 кг");
    expect(lines[0]!.sources).toHaveLength(2);
  });

  it("исключает строку, не затрагивая остальные сохранённые материалы", () => {
    const lines = aggregateProcurementLines([
      entry("e1", [
        { name: "Клей", quantity: 25, unit: "кг", excluded: true },
        { name: "Грунтовка", quantity: 5, unit: "л" },
      ]),
    ]);
    expect(lines).toHaveLength(1);
    expect(lines[0]!.name).toBe("Грунтовка");
  });

  it("не объединяет ручную строку со спецификацией и считает фасовку в мешках", () => {
    const lines = aggregateProcurementLines([entry("e1", [
      { name: "Клей", quantity: 2, unit: "мешок", exactQuantity: 40, reservedQuantity: 44, baseUnit: "кг", packageSize: 25, packageUnit: "мешок", procurementKey: "sku:glue" },
      { name: "Клей", quantity: 3, unit: "мешок", exactQuantity: 40, reservedQuantity: 44, baseUnit: "кг", packageSize: 25, packageUnit: "мешок" },
    ])]);
    expect(lines).toHaveLength(2);
    expect(lines.find((line) => line.procurementKey)?.quantity).toBe(2);
    expect(lines.find((line) => !line.procurementKey)?.quantity).toBe(3);
  });

  it("объединяет явно одну спецификацию в упаковках без пересчёта мешков в кг", () => {
    const m = (reservedQuantity: number) => ({ name: "Клей", quantity: 2, unit: "мешок", exactQuantity: 40, reservedQuantity, baseUnit: "кг", packageSize: 25, packageCount: 2, packageUnit: "мешок", procurementKey: "sku:glue" });
    const [line] = aggregateProcurementLines([entry("e1", [m(44)]), entry("e2", [m(31)])]);
    expect(line).toMatchObject({ packageCount: 3, quantity: 3, remainder: 0 });
  });

  it("требует исходное количество упаковок для автоматического объединения", () => {
    const [line] = aggregateProcurementLines([entry("e1", [{ name: "Клей", quantity: 100, unit: "кг", exactQuantity: 22, reservedQuantity: 22, baseUnit: "кг", packageSize: 25, packageUnit: "мешок", procurementKey: "sku:glue" }])]);
    expect(line?.key).toContain("entry:");
    expect(line?.quantity).toBe(100);
  });
});

describe("groupProcurementByCategory", () => {
  it("группирует по категориям", () => {
    const lines = aggregateProcurementLines([
      entry("e1", [
        { name: "A", quantity: 1, unit: "шт", category: "Крепёж" },
        { name: "B", quantity: 1, unit: "шт", category: "Листовые" },
      ]),
    ]);
    const groups = groupProcurementByCategory(lines);
    expect(groups.map((g) => g.category).sort()).toEqual(["Крепёж", "Листовые"]);
  });
});
