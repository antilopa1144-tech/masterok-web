import { describe, expect, it } from "vitest";
import {
  buildMaterialListBanner,
  organizeInsulationMaterials,
} from "@/lib/calculators/insulation-material-list";
import type { MaterialResult } from "@/lib/calculators/types";

describe("organizeInsulationMaterials", () => {
  it("фильтрует нулевые позиции и выделяет основной утеплитель", () => {
    const materials: MaterialResult[] = [
      {
        name: "Rockwool × 100 мм",
        quantity: 10,
        unit: "упаковок",
        purchaseQty: 10,
        category: "Утеплитель (плиты)",
      },
      { name: "Пусто", quantity: 0, unit: "шт", purchaseQty: 0, category: "Крепёж" },
      {
        name: "Дюбели",
        quantity: 350,
        unit: "шт",
        purchaseQty: 350,
        category: "Крепёж (СФТК)",
      },
    ];
    const out = organizeInsulationMaterials(materials, {
      materialForm: 0,
      mountSystem: 0,
      area: 50,
      thickness: 100,
      product: null,
    });
    expect(out).toHaveLength(2);
    expect(out[0].highlight).toBe(true);
    expect(out[0].category).toContain("Утеплитель");
    expect(out.find((m) => m.name === "Пусто")).toBeUndefined();
    expect(out[1].subtitle).toContain("Тарельчатые");
  });

  it("сортирует: утеплитель перед крепежом", () => {
    const materials: MaterialResult[] = [
      { name: "Клей", quantity: 250, unit: "кг", purchaseQty: 10, category: "Клей" },
      { name: "Утеплитель", quantity: 5, unit: "упаковок", purchaseQty: 5, category: "Утеплитель (плиты)" },
    ];
    const out = organizeInsulationMaterials(materials, {
      materialForm: 0,
      mountSystem: 0,
      area: 50,
      thickness: 100,
      product: null,
    });
    expect(out[0].category).toContain("Утеплитель");
  });
});

describe("buildMaterialListBanner", () => {
  it("СФТК для плит", () => {
    const banner = buildMaterialListBanner({
      materialForm: 0,
      mountSystem: 0,
      area: 50,
      thickness: 100,
      product: null,
    });
    expect(banner).toContain("СФТК");
    expect(banner).toContain("50 м²");
  });

  it("рулоны без СФТК", () => {
    const banner = buildMaterialListBanner({
      materialForm: 1,
      mountSystem: 1,
      area: 40,
      thickness: 100,
      product: null,
    });
    expect(banner).toContain("Рулон");
    expect(banner).not.toContain("СФТК");
  });
});
