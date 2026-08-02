import { describe, it, expect } from "vitest";
import { stripFoundationDef } from "../formulas/strip-foundation";
import { findMaterial, checkInvariants, withBasicAccuracy } from "./_helpers";

const calc = withBasicAccuracy(stripFoundationDef.calculate.bind(stripFoundationDef)) as (
  inputs: Record<string, any>,
) => ReturnType<typeof stripFoundationDef.calculate>;

describe("Калькулятор ленточного фундамента", () => {
  describe("Периметр 40 м, ширина 400 мм, глубина 700 мм, цоколь 300 мм, reinforcement=1", () => {
    // widthM = 0.4, totalH = (700+300)/1000 = 1.0
    // vol = 40 * 0.4 * 1.0 = 16
    // Чистый объём = 16; при basic + самосливе REC остаётся 16 м³.
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

    it("товарный бетон без выдуманного класса присутствует", () => {
      expect(findMaterial(result, "Товарный бетон")).toBeDefined();
    });

    it("при базовом режиме и самосливе REC не добавляет скрытый запас", () => {
      const concrete = findMaterial(result, "Товарный бетон");
      expect(concrete?.quantity).toBe(16);
      expect(concrete?.withReserve).toBe(16);
      expect(concrete?.purchaseQty).toBe(16);
    });

    it("бетон к покупке округляется до 0,1 м³, а не до целого куба", () => {
      const decimalResult = calc({
        perimeter: 40.25,
        width: 400,
        depth: 700,
        aboveGround: 300,
        reinforcement: 1,
      });
      const concrete = findMaterial(decimalResult, "Товарный бетон");
      expect((concrete?.purchaseQty ?? 0) * 10).toBeCloseTo(
        Math.round((concrete?.purchaseQty ?? 0) * 10),
        8,
      );
      expect(concrete?.purchaseQty).toBeLessThan(Math.ceil(concrete!.quantity));
    });

    it("арматура продольная присутствует", () => {
      // Engine: "Арматура продольная ∅XX мм"
      const rebar = findMaterial(result, "продольная");
      expect(rebar).toBeDefined();
      expect(rebar?.subtitle).toMatch(/прутков по 11[,.]7 м/);
    });

    it("арматура поперечная (хомуты) присутствует", () => {
      // Engine: "Арматура поперечная (хомуты)"
      expect(findMaterial(result, "Хомуты")).toBeDefined();
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

    it("опалубка считается по двум сторонам цоколя без скрытых 100 мм", () => {
      expect(result.totals.formwork).toBe(24);
      expect(result.totals.boards).toBe(30);
    });

    it("вязальная проволока считается по длине вязок, а не по 50 г на узел", () => {
      expect(result.totals.tieCount).toBe(400);
      expect(result.totals.wireLengthM).toBe(120);
      expect(result.totals.wireKg).toBeCloseTo(0.72, 6);
      expect(findMaterial(result, "Проволока")?.purchaseQty).toBe(1);
    });

    it("инварианты", () => {
      checkInvariants(result);
    });
  });

  describe("Предупреждения", () => {
    it("мелкое заглубление → предупреждение о необходимости расчёта", () => {
      const result = calc({
        perimeter: 40,
        width: 400,
        depth: 300,
        aboveGround: 300,
        reinforcement: 1,
      });
      expect(result.warnings.some((w) => w.includes("мелкое заглубление"))).toBe(true);
    });

    it("всегда объясняет, что размеры и армирование задаёт проект", () => {
      const result = calc({
        perimeter: 40,
        width: 400,
        depth: 700,
        aboveGround: 300,
        reinforcement: 1,
      });
      expect(result.warnings.some((w) => w.includes("по заданным размерам"))).toBe(true);
    });
  });

  describe("Подача и сценарии", () => {
    it("0,5 м³ добавляется только для бетононасоса", () => {
      const selfDischarge = calc({
        perimeter: 40,
        width: 400,
        depth: 700,
        aboveGround: 300,
        reinforcement: 1,
        deliveryMethod: 0,
      });
      const pump = calc({
        perimeter: 40,
        width: 400,
        depth: 700,
        aboveGround: 300,
        reinforcement: 1,
        deliveryMethod: 1,
      });

      expect(selfDischarge.totals.deliveryLossM3).toBe(0);
      expect(selfDischarge.scenarios?.REC.exact_need).toBe(16);
      expect(pump.totals.deliveryLossM3).toBe(0.5);
      expect(pump.scenarios?.REC.exact_need).toBe(16.5);
      expect(pump.scenarios?.REC.purchase_quantity).toBe(16.5);
    });

    it("ни один сценарий не опускается ниже чистой геометрии", () => {
      const result = calc({
        perimeter: 40,
        width: 400,
        depth: 700,
        aboveGround: 300,
        reinforcement: 1,
      });

      expect(result.scenarios?.MIN.exact_need).toBeGreaterThanOrEqual(16);
      expect(result.scenarios?.REC.exact_need).toBeGreaterThanOrEqual(16);
      expect(result.scenarios?.MAX.exact_need).toBeGreaterThanOrEqual(16);
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
