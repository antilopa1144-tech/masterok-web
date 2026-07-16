import { describe, expect, it } from "vitest";
import { ALL_CALCULATORS_META } from "@/lib/calculators/meta.generated";
import { rankCalculatorSearch } from "@/lib/site-search";

describe("rankCalculatorSearch", () => {
  it.each([
    ["залить пол", "styazhka"],
    ["обшить баню", "paneli-dlya-sten"],
    ["утеплить лоджию", "otdelka-balkona"],
    ["посчитать блоки", "gazobeton"],
    ["сколько мешков", "styazhka"],
    ["сделать стяжку", "styazhka"],
    ["обшить стены", "paneli-dlya-sten"],
  ])("находит бытовой запрос «%s»", (query, expectedSlug) => {
    const results = rankCalculatorSearch(query, ALL_CALCULATORS_META);
    expect(results.map((item) => item.slug)).toContain(expectedSlug);
  });

  it("не возвращает результаты для несвязанной фразы", () => {
    expect(rankCalculatorSearch("приготовить борщ", ALL_CALCULATORS_META)).toEqual([]);
  });
});
