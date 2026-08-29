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
    // Чистый объём = 16; REC с явным запасом 5% = 16,8 м³.
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

    it("разделяет чистую геометрию, явный запас и покупку", () => {
      const concrete = findMaterial(result, "Товарный бетон");
      expect(concrete?.quantity).toBe(16);
      expect(concrete?.withReserve).toBe(16.8);
      expect(concrete?.purchaseQty).toBe(16.8);
    });

    it("бетон округляется выбранным шагом поставщика", () => {
      const decimalResult = calc({
        perimeter: 40.25,
        width: 400,
        depth: 700,
        aboveGround: 300,
        reinforcement: 1,
        readyMixOrderStepM3: 0.5,
      });
      const concrete = findMaterial(decimalResult, "Товарный бетон");
      expect((concrete?.purchaseQty ?? 0) * 2).toBeCloseTo(
        Math.round((concrete?.purchaseQty ?? 0) * 2),
        8,
      );
      expect(concrete?.purchaseQty).toBe(17);
    });

    it("арматура продольная присутствует", () => {
      // Engine: "Арматура продольная ∅XX мм"
      const rebar = findMaterial(result, "продольная");
      expect(rebar).toBeDefined();
      expect(rebar?.subtitle).toMatch(/прутков по 11[,.]7 м/);
      expect(rebar?.packageInfo).toEqual({ count: 16, size: 11.7, packageUnit: "прутков" });
      expect(rebar?.purchaseQty).toBe(187.2);
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

    it("опалубка использует явную высоту щита и запас доски", () => {
      expect(result.totals.formwork).toBe(24);
      expect(result.totals.formworkWithReserve).toBe(26.4);
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

  describe("Заказ и сценарии", () => {
    it("не выдумывает потери насоса и добавляет только введённый остаток", () => {
      const withoutAllowance = calc({
        perimeter: 40,
        width: 400,
        depth: 700,
        aboveGround: 300,
        reinforcement: 1,
        reserve: 0,
      });
      const withAllowance = calc({
        perimeter: 40,
        width: 400,
        depth: 700,
        aboveGround: 300,
        reinforcement: 1,
        reserve: 0,
        deliveryAllowanceM3: 0.35,
      });

      expect(withoutAllowance.totals.deliveryAllowanceM3).toBe(0);
      expect(withoutAllowance.scenarios?.REC.exact_need).toBe(16);
      expect(withAllowance.totals.deliveryAllowanceM3).toBe(0.35);
      expect(withAllowance.scenarios?.REC.exact_need).toBe(16.35);
      expect(withAllowance.scenarios?.REC.purchase_quantity).toBe(16.4);
    });

    it("MIN/REC/MAX используют 0%, выбранный запас и минимум 10%", () => {
      const result = calc({
        perimeter: 40,
        width: 400,
        depth: 700,
        aboveGround: 300,
        reserve: 4,
      });

      expect(result.scenarios?.MIN.exact_need).toBe(16);
      expect(result.scenarios?.REC.exact_need).toBe(16.64);
      expect(result.scenarios?.MAX.exact_need).toBe(17.6);
    });

    it("режим точности не добавляет второй скрытый коэффициент", () => {
      const basic = stripFoundationDef.calculate({ reserve: 5, accuracyMode: "basic" } as any);
      const professional = stripFoundationDef.calculate({ reserve: 5, accuracyMode: "professional" } as any);
      expect(professional.scenarios?.REC.exact_need).toBe(basic.scenarios?.REC.exact_need);
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
