import { describe, expect, it } from "vitest";
import { ALL_CALCULATORS_META } from "@/lib/calculators/meta.generated";
import { CATEGORIES } from "@/lib/calculators/categories";
import { TOOL_CONFIGS } from "@/lib/tools/config";
import { ALL_CHECKLISTS } from "@/lib/checklists";
import {
  ROUTE_CALCULATOR_CATEGORY,
  ROUTE_CALCULATOR_SLUGS,
  ROUTE_CATEGORY_SLUGS,
  ROUTE_CHECKLIST_SLUGS,
  ROUTE_TOOL_SLUGS,
} from "@/lib/seo/route-manifest.generated";

/**
 * Манифест нужен middleware, чтобы отдавать 404 до старта стриминга.
 * Если он разойдётся с источниками, живые страницы начнут получать 404 —
 * поэтому синхронность проверяется жёстко.
 */
describe("route-manifest синхронен с источниками", () => {
  it("категории совпадают с CATEGORIES", () => {
    expect([...ROUTE_CATEGORY_SLUGS].sort()).toEqual(CATEGORIES.map((c) => c.slug).sort());
  });

  it("калькуляторы совпадают с ALL_CALCULATORS_META", () => {
    expect([...ROUTE_CALCULATOR_SLUGS].sort()).toEqual(
      ALL_CALCULATORS_META.map((c) => c.slug).sort(),
    );
  });

  it("карта калькулятор → категория совпадает с реестром", () => {
    const expected: Record<string, string> = {};
    for (const c of ALL_CALCULATORS_META) expected[c.slug] = c.categorySlug;
    expect(ROUTE_CALCULATOR_CATEGORY).toEqual(expected);
  });

  it("инструменты совпадают с TOOL_CONFIGS без noindex", () => {
    expect([...ROUTE_TOOL_SLUGS].sort()).toEqual(
      TOOL_CONFIGS.filter((t) => !t.noindex).map((t) => t.slug).sort(),
    );
  });

  it("чек-листы совпадают с ALL_CHECKLISTS", () => {
    expect([...ROUTE_CHECKLIST_SLUGS].sort()).toEqual(ALL_CHECKLISTS.map((c) => c.slug).sort());
  });

  it("в манифесте нет пустых значений", () => {
    for (const list of [ROUTE_CATEGORY_SLUGS, ROUTE_CALCULATOR_SLUGS, ROUTE_TOOL_SLUGS, ROUTE_CHECKLIST_SLUGS]) {
      for (const slug of list) expect(slug.trim().length).toBeGreaterThan(0);
    }
  });

  it("каждый калькулятор ссылается на существующую категорию", () => {
    const known = new Set(ROUTE_CATEGORY_SLUGS);
    for (const [slug, category] of Object.entries(ROUTE_CALCULATOR_CATEGORY)) {
      expect(known.has(category), `${slug} ссылается на неизвестную категорию ${category}`).toBe(true);
    }
  });
});
