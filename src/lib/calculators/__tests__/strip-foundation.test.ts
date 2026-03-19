import { describe, it, expect } from "vitest";
import { stripFoundationDef } from "../formulas/strip-foundation";
import { findMaterial, checkInvariants, withBasicAccuracy } from "./_helpers";

const calc = withBasicAccuracy(stripFoundationDef.calculate.bind(stripFoundationDef));

describe("Калькулятор ленточного фундамента", () => {
  describe("Периметр 40 м, ширина 400 мм, глубина 700 мм, цоколь 300 мм, reinforcement=1", () => {
    // widthM = 0.4, totalH = (700+300)/1000 = 1.0
    // vol = 40 * 0.4 * 1.0 = 16
    // volReserve = (16 + techLoss) * concrete_reserve
    const result = calc({
      perimeter: 40,
      width: 400,
      depth: 700,
      aboveGround: 300,
      reinforcement: 1,
    });

    it("объём бетона vol = 16 м³", () => {
      expect(result.totals.vol).toBeCloseTo(16, 2);
    });

    it("бетон М300 присутствует", () => {
      // Engine: "Бетон М300"
      expect(findMaterial(result, "Бетон М300")).toBeDefined();
    });

    it("объём с запасом > 16 м³", () => {
      const concrete = findMaterial(result, "Бетон М300");
      expect(concrete!.purchaseQty).toBeGreaterThan(16);
    });

    it("арматура продольная присутствует", () => {
      // Engine: "Арматура продольная ∅XX мм"
      const rebar = findMaterial(result, "продольная");
      expect(rebar).toBeDefined();
    });

    it("арматура поперечная (хомуты) присутствует", () => {
      // Engine: "Арматура поперечная (хомуты)"
      expect(findMaterial(result, "хомуты")).toBeDefined();
    });

    it("вязальная проволока присутствует", () => {
      // Engine: "Проволока вязальная"
      expect(findMaterial(result, "Проволока вязальная")).toBeDefined();
    });

    it("опалубка присутствует", () => {
      // Engine: "Опалубка (доска обрезная)"
      expect(findMaterial(result, "Опалубка")).toBeDefined();
    });

    it("доска обрезная присутствует", () => {
      // Engine: "Доска обрезная 150×6000 мм"
      expect(findMaterial(result, "Доска обрезная")).toBeDefined();
    });

    it("инварианты", () => {
      checkInvariants(result);
    });
  });

  describe("Предупреждения", () => {
    it("мелкое заглубление → предупреждение о промерзании", () => {
      const result = calc({
        perimeter: 40,
        width: 400,
        depth: 300,
        aboveGround: 300,
        reinforcement: 1,
      });
      // Engine: "Мелкое заглубление — убедитесь, что глубина ниже уровня промерзания грунта"
      expect(result.warnings.some((w) => w.includes("промерзания"))).toBe(true);
    });

    it("большой периметр → предупреждение о деформационных швах", () => {
      const result = calc({
        perimeter: 200,
        width: 400,
        depth: 700,
        aboveGround: 300,
        reinforcement: 1,
      });
      // Engine: "Большой периметр — рекомендуется разделить на секции с деформационными швами"
      expect(result.warnings.some((w) => w.includes("деформационными швами"))).toBe(true);
    });
  });

  describe("reinforcement=0 (лёгкие постройки)", () => {
    const result = calc({
      perimeter: 40,
      width: 400,
      depth: 700,
      aboveGround: 300,
      reinforcement: 0,
    });

    it("рабочая арматура присутствует", () => {
      const rebar = findMaterial(result, "продольная");
      expect(rebar).toBeDefined();
    });
  });
});
