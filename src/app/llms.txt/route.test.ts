import { describe, expect, it, vi } from "vitest";
import { ALL_CALCULATORS_META } from "@/lib/calculators/meta.generated";
import { CATEGORIES } from "@/lib/calculators/categories";

vi.mock("@/lib/blog", () => ({
  getAllPosts: vi.fn(async () => []),
}));

import { GET } from "./route";

/**
 * llms.txt — точка входа для LLM. Раньше в разделе калькуляторов было только
 * 15 популярных из 65, а в описании стояло «65+» при ровно 65 калькуляторах.
 * Эти тесты держат полное покрытие и точность числа.
 */
describe("llms.txt", () => {
  async function content(): Promise<string> {
    const response = await GET();
    return response.text();
  }

  it("отдаёт plain text с кэшированием", async () => {
    const response = await GET();
    expect(response.headers.get("content-type")).toContain("text/plain");
    expect(response.headers.get("cache-control")).toContain("max-age");
  });

  it("перечисляет все калькуляторы каталога", async () => {
    const text = await content();
    const missing = ALL_CALCULATORS_META.filter(
      (calc) => !text.includes(`/kalkulyatory/${calc.categorySlug}/${calc.slug}/`),
    );
    expect(missing.map((c) => c.slug), "калькуляторы, которых нет в llms.txt").toEqual([]);
  });

  it("перечисляет все категории", async () => {
    const text = await content();
    const missing = CATEGORIES.filter((cat) => !text.includes(`/kalkulyatory/${cat.slug}/`));
    expect(missing.map((c) => c.slug)).toEqual([]);
  });

  it("не завышает число калькуляторов", async () => {
    const text = await content();
    expect(text, "в llms.txt вернулось «65+» при точном числе").not.toMatch(/\d+\+/);
    expect(text).toContain(`${ALL_CALCULATORS_META.length} калькуляторов`);
  });

  it("содержит блок частых вопросов и ссылки на справку", async () => {
    const text = await content();
    expect(text).toMatch(/^## Частые вопросы/m);
    expect(text).toContain("/ai/");
    expect(text).toContain("/metodologiya/");
  });

  it("описывает подход к расчётам и границы применимости", async () => {
    const text = await content();
    expect(text).toMatch(/^## Подход к расчётам/m);
    expect(text).toMatch(/^## Ограничения/m);
    expect(text).toContain("паспортный расход");
  });
});
