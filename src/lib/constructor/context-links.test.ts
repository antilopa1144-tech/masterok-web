import { describe, expect, it } from "vitest";
import { constructorContext } from "./context-links";
import { getCalculatorMetaBySlug } from "@/lib/calculators/meta.generated";

describe("constructor context links", () => {
  it("links supported calculator families to the appropriate examples", () => {
    for (const [slug, scenario] of [["laminat", "laminate"], ["plitka", "tile"], ["zatirka", "bathroom"], ["klej-dlya-plitki", "bathroom"], ["vannaya-komnata", "bathroom"]]) {
      expect(getCalculatorMetaBySlug(slug)).toBeDefined();
      expect(constructorContext(slug)?.scenario).toBe(scenario);
    }
  });
  it("does not suggest indoor tile layouts for paving or unsupported finishes", () => {
    for (const slug of [undefined, "trotuarnaya-plitka", "parket", "linoleum", "beton"]) expect(constructorContext(slug)).toBeUndefined();
  });
});
