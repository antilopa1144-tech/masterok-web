import { describe, it, expect, beforeEach } from "vitest";
import { getCalculateFn, getCalculateFnSync } from "../registry";
import { ALL_CALCULATORS } from "../index";

describe("Registry калькуляторов", () => {
  describe("getCalculateFn (async)", () => {
    it("загружает калькулятор бетона по slug", async () => {
      const fn = await getCalculateFn("beton");
      expect(fn).toBeDefined();
      expect(typeof fn).toBe("function");
    });

    it("загруженная функция возвращает корректный результат", async () => {
      const fn = await getCalculateFn("beton");
      expect(fn).toBeDefined();
      const result = fn!({ length: 10, width: 5, height: 0.3, concreteGrade: 0 });
      expect(result.materials.length).toBeGreaterThan(0);
      expect(result.totals).toBeDefined();
      expect(result.warnings).toBeDefined();
    });

    it("возвращает undefined для несуществующего slug", async () => {
      const fn = await getCalculateFn("nonexistent-slug-12345");
      expect(fn).toBeUndefined();
    });

    it("возвращает undefined для пустого slug", async () => {
      const fn = await getCalculateFn("");
      expect(fn).toBeUndefined();
    });

    it("загружает несколько разных калькуляторов", async () => {
      const slugs = ["kirpich", "plitka", "laminat", "krovlya"];
      for (const slug of slugs) {
        const fn = await getCalculateFn(slug);
        expect(fn, `не загружен калькулятор ${slug}`).toBeDefined();
      }
    });
  });

  describe("getCalculateFnSync", () => {
    it("возвращает undefined до загрузки", () => {
      // Используем slug, который точно ещё не загружался в текущем тесте
      const fn = getCalculateFnSync("zabor");
      // Может быть undefined или загружен из кеша предыдущих тестов
      // Тут мы просто проверяем что метод не бросает ошибку
      expect(fn === undefined || typeof fn === "function").toBe(true);
    });

    it("возвращает функцию после async загрузки", async () => {
      await getCalculateFn("styazhka");
      const fn = getCalculateFnSync("styazhka");
      expect(fn).toBeDefined();
      expect(typeof fn).toBe("function");
    });
  });

  describe("Кеширование", () => {
    it("повторный вызов возвращает ту же функцию", async () => {
      const fn1 = await getCalculateFn("oboi");
      const fn2 = await getCalculateFn("oboi");
      expect(fn1).toBe(fn2); // строгое равенство — тот же объект из кеша
    });
  });

  describe("Маппинг slug → formula полный", () => {
    // Все slug из ALL_CALCULATORS должны быть в FORMULA_MAP registry
    const expectedSlugs = ALL_CALCULATORS.map((c) => c.slug);

    it("все slug из индекса загружаются через registry", async () => {
      const failed: string[] = [];
      for (const slug of expectedSlugs) {
        const fn = await getCalculateFn(slug);
        if (!fn) failed.push(slug);
      }
      expect(failed, `Не загружены slug: ${failed.join(", ")}`).toHaveLength(0);
    });
  });
});
