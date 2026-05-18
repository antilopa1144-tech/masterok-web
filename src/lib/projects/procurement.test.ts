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
  it("объединяет одинаковые позиции из разных расчётов", () => {
    const lines = aggregateProcurementLines([
      entry("e1", [{ name: "Ламинат", quantity: 10, unit: "упаковка", category: "Напольное" }]),
      entry("e2", [{ name: "Ламинат", quantity: 5, unit: "упаковка", category: "Напольное" }], "Комната 2"),
    ]);

    expect(lines).toHaveLength(1);
    expect(lines[0]!.quantity).toBe(15);
    expect(lines[0]!.sources).toHaveLength(2);
    expect(lines[0]!.category).toBe("Напольное");
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
