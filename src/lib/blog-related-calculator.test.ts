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

  it("не подставляет кирпичную кладку к раскладке листов ОСП", () => {
    expect(pickRelatedCalculator({
      title: "Раскладка ОСП на полу: почему на 12 м² нужно не четыре листа",
      tags: ["ОСП", "раскладка листов", "пол по лагам"],
    })).toBeUndefined();
  });

  it("оставляет калькулятор кладки для отдельного слова «кладка»", () => {
    expect(pickRelatedCalculator({
      title: "Кладка кирпича: сколько нужно материала",
      tags: ["кирпич"],
    })).toEqual({ slug: "kladka-kirpicha", categorySlug: "steny" });
  });
});
