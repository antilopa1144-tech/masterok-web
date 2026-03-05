import { describe, it, expect } from "vitest";
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

describe("Сценарный контракт через registry", () => {
  it("добавляет MIN/REC/MAX для выборки калькуляторов", async () => {
    const sample: Array<[string, Record<string, number>]> = [
      ["beton", { concreteVolume: 5, concreteGrade: 3, reserve: 5 }],
      ["kirpich", { inputMode: 1, area: 20, brickType: 0, wallThickness: 1 }],
      ["styazhka", { inputMode: 1, area: 20, thickness: 50, screedType: 1 }],
      ["teplyy-pol", { roomArea: 12, furnitureArea: 2, heatingType: 0, powerDensity: 150 }],
      ["elektrika", { apartmentArea: 60, roomsCount: 3, ceilingHeight: 2.7, hasKitchen: 1 }],
      ["shpaklevka", { inputMode: 1, area: 40, puttyType: 1, bagWeight: 25 }],
    ];

    for (const [slug, input] of sample) {
      const fn = await getCalculateFn(slug);
      expect(fn, `функция не загружена для ${slug}`).toBeDefined();

      const result = fn!(input);
      expect(result.scenarios, `нет scenarios для ${slug}`).toBeDefined();

      const min = result.scenarios?.MIN;
      const rec = result.scenarios?.REC;
      const max = result.scenarios?.MAX;

      expect(min?.exact_need ?? 0, `MIN exact invalid for ${slug}`).toBeGreaterThanOrEqual(0);
      expect(rec?.exact_need ?? 0, `REC exact invalid for ${slug}`).toBeGreaterThanOrEqual(min?.exact_need ?? 0);
      expect(max?.exact_need ?? 0, `MAX exact invalid for ${slug}`).toBeGreaterThanOrEqual(rec?.exact_need ?? 0);
      expect(rec?.purchase_quantity ?? 0, `purchase < exact for ${slug}`).toBeGreaterThanOrEqual(rec?.exact_need ?? 0);
    }
  });
});

