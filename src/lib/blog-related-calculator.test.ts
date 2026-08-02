import { describe, expect, it } from "vitest";
import { pickRelatedCalculator } from "./blog-related-calculator";

describe("pickRelatedCalculator", () => {
  it("ведёт статью о профнастиле на забор к калькулятору забора", () => {
    expect(pickRelatedCalculator({
      title: "Сколько профлиста нужно на забор",
      tags: ["профнастил", "забор"],
    })).toEqual({ slug: "zabor", categorySlug: "fasad" });
  });

  it("сохраняет кровельный интент профнастила", () => {
    expect(pickRelatedCalculator({
      title: "Расчёт профнастила для крыши",
      tags: ["кровля"],
    })).toEqual({ slug: "krovlya", categorySlug: "krovlya" });
  });
});
