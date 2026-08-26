import { describe, expect, it } from "vitest";
import type { CalculatorMeta } from "./types";
import { CATALOG_TOP_LIMIT, filterCatalogCalculators, getCatalogTopIds } from "./catalog";

const calculators = [
  {
    id: "concrete",
    slug: "beton",
    title: "Калькулятор бетона",
    description: "Бетон для фундамента",
    category: "foundation",
    categorySlug: "fundament",
    tags: ["цемент"],
    popularity: 95,
  },
  {
    id: "screed",
    slug: "styazhka",
    title: "Калькулятор стяжки пола",
    description: "Смесь и пескобетон",
    category: "flooring",
    categorySlug: "poly",
    tags: ["пол"],
    popularity: 80,
  },
] as CalculatorMeta[];

describe("catalog helpers", () => {
  it("оставляет TOP только у ограниченного числа лидеров", () => {
    const expanded = Array.from({ length: 12 }, (_, index) => ({
      ...calculators[0],
      id: `calc-${index}`,
      title: `Калькулятор ${index}`,
      popularity: 100 - index,
    }));

    const ids = getCatalogTopIds(expanded);
    expect(ids).toHaveLength(CATALOG_TOP_LIMIT);
    expect(ids).toEqual(expanded.slice(0, CATALOG_TOP_LIMIT).map((calculator) => calculator.id));
  });

  it("совмещает фильтр категории и поиск", () => {
    expect(filterCatalogCalculators(calculators, "бетон", "foundation").map((item) => item.id)).toEqual(["concrete"]);
    expect(filterCatalogCalculators(calculators, "фундамент", "flooring")).toEqual([]);
  });

  it("понимает пользовательский запрос через поисковые алиасы", () => {
    expect(filterCatalogCalculators(calculators, "сколько мешков на пол", "all").map((item) => item.id)).toEqual(["screed"]);
  });

  it("не показывает карточки по одному случайно совпавшему слову", () => {
    expect(filterCatalogCalculators(calculators, "сколько мешков на фундамент", "all")).toEqual([]);
  });
});
