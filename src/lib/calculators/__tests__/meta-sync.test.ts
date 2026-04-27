import { describe, it, expect } from "vitest";
import { ALL_CALCULATORS } from "../index";
import { ALL_CALCULATORS_META } from "../meta.generated";

/**
 * Проверяет что meta.generated.ts синхронен с ALL_CALCULATORS.
 *
 * Если упал — выполни:
 *   npx tsx scripts/generate-calculators-meta.ts
 *
 * meta.generated.ts — lite-проекция для импорта в clientside коде, экономит
 * ~250-300 KB First Load JS (см. PR #38). Источник истины — ALL_CALCULATORS.
 */
describe("meta.generated.ts должен быть синхронен с ALL_CALCULATORS", () => {
  it("количество калькуляторов совпадает", () => {
    expect(ALL_CALCULATORS_META).toHaveLength(ALL_CALCULATORS.length);
  });

  it("каждый калькулятор присутствует в meta с теми же базовыми полями", () => {
    for (const full of ALL_CALCULATORS) {
      const meta = ALL_CALCULATORS_META.find((m) => m.id === full.id);
      expect(meta, `meta для ${full.id} отсутствует`).toBeDefined();
      if (!meta) continue;
      expect(meta.slug).toBe(full.slug);
      expect(meta.title).toBe(full.title);
      expect(meta.h1).toBe(full.h1);
      expect(meta.description).toBe(full.description);
      expect(meta.metaTitle).toBe(full.metaTitle);
      expect(meta.metaDescription).toBe(full.metaDescription);
      expect(meta.category).toBe(full.category);
      expect(meta.categorySlug).toBe(full.categorySlug);
      expect(meta.popularity).toBe(full.popularity);
      expect(meta.complexity).toBe(full.complexity);
      expect(meta.tags).toEqual(full.tags);
    }
  });

  it("в meta нет лишних калькуляторов которых нет в полном массиве", () => {
    for (const meta of ALL_CALCULATORS_META) {
      const full = ALL_CALCULATORS.find((c) => c.id === meta.id);
      expect(full, `meta содержит ${meta.id}, которого нет в ALL_CALCULATORS`).toBeDefined();
    }
  });
});
