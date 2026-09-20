import { describe, expect, it } from "vitest";
import { ALL_CALCULATORS_META } from "./meta.generated";
import { CALCULATOR_RELATED_TOOLS } from "./related-tools";
import { getToolConfig } from "../tools/config";

describe("контекстные связи калькуляторов с инструментами", () => {
  it("ссылается только на существующие калькуляторы и инструменты без дублей", () => {
    const calculatorSlugs = new Set(ALL_CALCULATORS_META.map((item) => item.slug));

    for (const [calculatorSlug, links] of Object.entries(CALCULATOR_RELATED_TOOLS)) {
      expect(calculatorSlugs.has(calculatorSlug), calculatorSlug).toBe(true);
      expect(links.length, calculatorSlug).toBeGreaterThan(0);
      expect(new Set(links.map((item) => item.slug)).size, calculatorSlug).toBe(links.length);

      for (const link of links) {
        expect(getToolConfig(link.slug), `${calculatorSlug} -> ${link.slug}`).toBeDefined();
        expect(link.reason.trim().length, `${calculatorSlug} -> ${link.slug}`).toBeGreaterThan(20);
      }
    }
  });

  it("закрывает первую волну слабосвязанных инструментов", () => {
    const targets = new Set(
      Object.values(CALCULATOR_RELATED_TOOLS).flatMap((links) => links.map((item) => item.slug)),
    );

    for (const slug of [
      "raskladka-reek",
      "raskladka-kirpicha",
      "normy-raskhoda",
      "raskladka-trotuarnoy-plitki",
      "rasstanovka-svetilnikov",
    ]) {
      expect(targets.has(slug), slug).toBe(true);
    }
  });
});
