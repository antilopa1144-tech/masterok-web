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

  describe("Региональная валидация глубины промерзания", () => {
    it("Москва, depth 700 мм < 1400 мм → warning о промерзании", () => {
      const result = calc({
        perimeter: 40,
        width: 400,
        depth: 700,
        aboveGround: 300,
        reinforcement: 1,
        regionId: "moscow",
      });
      const hasFrostWarning = result.warnings.some((w) =>
        w.includes("Москва") && w.includes("1.40")
      );
      expect(hasFrostWarning).toBe(true);
      expect(result.totals.requiredFrostDepthMm).toBe(1400);
    });

    it("Москва, depth 1500 мм >= 1400 мм → нет warning о регионе", () => {
      const result = calc({
        perimeter: 40,
        width: 400,
        depth: 1500,
        aboveGround: 300,
        reinforcement: 1,
        regionId: "moscow",
      });
      const hasFrostWarning = result.warnings.some((w) => w.includes("«Москва»"));
      expect(hasFrostWarning).toBe(false);
    });

    it("Сочи, depth 700 мм >= 600 мм → нет warning", () => {
      const result = calc({
        perimeter: 40,
        width: 400,
        depth: 700,
        aboveGround: 300,
        reinforcement: 1,
        regionId: "sochi",
      });
      const hasFrostWarning = result.warnings.some((w) => w.includes("«Сочи»"));
      expect(hasFrostWarning).toBe(false);
      expect(result.totals.requiredFrostDepthMm).toBe(600);
    });

    it("Якутск (нет в списке) → нет региональной валидации", () => {
      const result = calc({
        perimeter: 40,
        width: 400,
        depth: 700,
        aboveGround: 300,
        reinforcement: 1,
        regionId: "yakutsk",
      });
      // Регион не найден → requiredFrostDepthMm = 0, warning по региону отсутствует
      expect(result.totals.requiredFrostDepthMm).toBe(0);
    });

    it("Без regionId → backward-compat, поведение как раньше", () => {
      const result = calc({
        perimeter: 40,
        width: 400,
        depth: 700,
        aboveGround: 300,
        reinforcement: 1,
      });
      const hasRegionalWarning = result.warnings.some((w) => w.includes("«"));
      expect(hasRegionalWarning).toBe(false);
      expect(result.totals.requiredFrostDepthMm).toBe(0);
    });

    it("Тип грунта: песок (soilType=3) даёт большую требуемую глубину чем суглинок (0)", () => {
      const loamResult = calc({
        perimeter: 40,
        width: 400,
        depth: 1000,
        aboveGround: 300,
        reinforcement: 1,
        regionId: "moscow",
        soilType: 0,
      });
      const sandResult = calc({
        perimeter: 40,
        width: 400,
        depth: 1000,
        aboveGround: 300,
        reinforcement: 1,
        regionId: "moscow",
        soilType: 3,
      });
      // Москва суглинок = 1400, песок = 1400 * 1.30 = 1820
      expect(loamResult.totals.requiredFrostDepthMm).toBe(1400);
      expect(sandResult.totals.requiredFrostDepthMm).toBe(1820);
    });
  });
});
