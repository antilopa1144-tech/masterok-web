import { describe, it, expect } from "vitest";
import {
  ALL_CALCULATORS,
  getCalculatorBySlug,
  getCalculatorById,
  getCalculatorsByCategory,
  getPopularCalculators,
} from "../index";

describe("Индекс калькуляторов", () => {
  describe("ALL_CALCULATORS", () => {
    it("содержит 50 калькуляторов", () => {
      expect(ALL_CALCULATORS).toHaveLength(50);
    });

    it("все id уникальны", () => {
      const ids = ALL_CALCULATORS.map((c) => c.id);
      expect(new Set(ids).size).toBe(ids.length);
    });

    it("все slug уникальны", () => {
      const slugs = ALL_CALCULATORS.map((c) => c.slug);
      expect(new Set(slugs).size).toBe(slugs.length);
    });

    it("у каждого калькулятора есть функция calculate", () => {
      for (const calc of ALL_CALCULATORS) {
        expect(typeof calc.calculate, `calculate не функция у ${calc.id}`).toBe("function");
      }
    });

    it("у каждого калькулятора есть обязательные мета-поля", () => {
      for (const calc of ALL_CALCULATORS) {
        expect(calc.id, `id пуст`).toBeTruthy();
        expect(calc.slug, `slug пуст у ${calc.id}`).toBeTruthy();
        expect(calc.title, `title пуст у ${calc.id}`).toBeTruthy();
        expect(calc.category, `category пуст у ${calc.id}`).toBeTruthy();
        expect(calc.fields.length, `fields пуст у ${calc.id}`).toBeGreaterThan(0);
      }
    });

    it("у каждого калькулятора корректная category", () => {
      const validCategories = [
        "foundation", "walls", "flooring", "roofing",
        "facade", "engineering", "interior", "ceiling",
      ];
      for (const calc of ALL_CALCULATORS) {
        expect(validCategories, `невалидная категория '${calc.category}' у ${calc.id}`)
          .toContain(calc.category);
      }
    });

    it("popularity — положительное число", () => {
      for (const calc of ALL_CALCULATORS) {
        expect(calc.popularity, `popularity невалиден у ${calc.id}`).toBeGreaterThan(0);
      }
    });

    it("complexity — 1, 2 или 3", () => {
      for (const calc of ALL_CALCULATORS) {
        expect([1, 2, 3], `complexity невалиден у ${calc.id}`).toContain(calc.complexity);
      }
    });
  });

  describe("getCalculatorBySlug", () => {
    it("находит калькулятор по slug", () => {
      expect(getCalculatorBySlug("beton")?.id).toBe("concrete_universal");
      expect(getCalculatorBySlug("kirpich")?.id).toBe("brick");
      expect(getCalculatorBySlug("plitka")?.id).toBe("tile");
      expect(getCalculatorBySlug("laminat")?.id).toBe("laminate");
    });

    it("возвращает undefined для несуществующего slug", () => {
      expect(getCalculatorBySlug("nonexistent")).toBeUndefined();
      expect(getCalculatorBySlug("")).toBeUndefined();
    });
  });

  describe("getCalculatorById", () => {
    it("находит калькулятор по id", () => {
      expect(getCalculatorById("concrete_universal")?.slug).toBe("beton");
      expect(getCalculatorById("brick")?.slug).toBe("kirpich");
      expect(getCalculatorById("tile")?.slug).toBe("plitka");
    });

    it("возвращает undefined для несуществующего id", () => {
      expect(getCalculatorById("nonexistent")).toBeUndefined();
    });
  });

  describe("getCalculatorsByCategory", () => {
    it("фильтрует по категории foundation", () => {
      const found = getCalculatorsByCategory("foundation");
      expect(found.length).toBeGreaterThan(0);
      for (const c of found) {
        expect(c.category).toBe("foundation");
      }
    });

    it("фильтрует по категории flooring", () => {
      const found = getCalculatorsByCategory("flooring");
      expect(found.length).toBeGreaterThan(0);
      for (const c of found) {
        expect(c.category).toBe("flooring");
      }
    });

    it("каждая категория имеет хотя бы 1 калькулятор", () => {
      const categories = [
        "foundation", "walls", "flooring", "roofing",
        "facade", "engineering", "interior", "ceiling",
      ];
      for (const cat of categories) {
        const found = getCalculatorsByCategory(cat);
        expect(found.length, `категория '${cat}' пуста`).toBeGreaterThan(0);
      }
    });

    it("пустой массив для несуществующей категории", () => {
      expect(getCalculatorsByCategory("nonexistent")).toHaveLength(0);
    });
  });

  describe("getPopularCalculators", () => {
    it("возвращает до 8 по умолчанию", () => {
      const popular = getPopularCalculators();
      expect(popular.length).toBeLessThanOrEqual(8);
      expect(popular.length).toBeGreaterThan(0);
    });

    it("отсортированы по убыванию popularity", () => {
      const popular = getPopularCalculators();
      for (let i = 1; i < popular.length; i++) {
        expect(popular[i - 1].popularity).toBeGreaterThanOrEqual(popular[i].popularity);
      }
    });

    it("limit ограничивает количество", () => {
      const top3 = getPopularCalculators(3);
      expect(top3).toHaveLength(3);
    });

    it("limit > ALL_CALCULATORS.length возвращает все", () => {
      const all = getPopularCalculators(100);
      expect(all).toHaveLength(ALL_CALCULATORS.length);
    });
  });

  describe("Согласованность slug с registry", () => {
    it("все slug из ALL_CALCULATORS соответствуют маппингу registry", () => {
      // Просто проверяем, что slug не пустые и уникальны (маппинг проверен в registry.test)
      const slugs = ALL_CALCULATORS.map((c) => c.slug);
      expect(new Set(slugs).size).toBe(ALL_CALCULATORS.length);
    });
  });
});
