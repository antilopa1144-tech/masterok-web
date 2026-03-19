import { describe, it, expect } from "vitest";
import { slopesDef } from "../formulas/slopes";
import { findMaterial, checkInvariants, withBasicAccuracy } from "./_helpers";

const calc = withBasicAccuracy(slopesDef.calculate.bind(slopesDef));

describe("Калькулятор откосов окон и дверей", () => {
  describe("5 окон 1200×1400, ширина откоса 350, сэндвич-панели", () => {
    // openingType=0 → w=1200, h=1400, sides=3
    // slopePerim = (2*1400+1200)/1000 = 4.0
    // slopeArea = 4.0 * 0.35 = 1.4
    // totalArea = 1.4*5 = 7.0
    // totalPerim = 4.0*5 = 20.0
    //
    // finishType=0 → сэндвич:
    //   panelCount = ceil(7.0*1.12/3.6) = ceil(2.178) = 3
    //   fProfilePcs = ceil(20.0*1.1/3) = ceil(7.333) = 8
    //   foamCans = ceil(20.0/5) = 4
    //
    // sealantTubes = ceil(20.0/5) = 4
    // primerCans = ceil(7.0*0.15*1.15/10) = ceil(0.12075) = 1
    const result = calc({
      openingCount: 5,
      openingType: 0,
      slopeWidth: 350,
      finishType: 0,
    });

    it("сэндвич-панели ПВХ = 3 шт (base), purchaseQty with REC multiplier", () => {
      // Engine: "Сэндвич-панели ПВХ" — quantity = recScenario.exact_need
      const panels = findMaterial(result, "Сэндвич-панели ПВХ");
      expect(panels).toBeDefined();
      expect(panels!.purchaseQty).toBeGreaterThanOrEqual(3);
    });

    it("F-профиль = 8 шт", () => {
      // Engine: "F-профиль (3 м)"
      const fProfile = findMaterial(result, "F-профиль");
      expect(fProfile?.purchaseQty).toBe(8);
    });

    it("монтажная пена = 4 баллона", () => {
      // Engine: "Монтажная пена"
      const foam = findMaterial(result, "Монтажная пена");
      expect(foam?.purchaseQty).toBe(4);
    });

    it("герметик (тубы) присутствует", () => {
      // Engine: "Герметик (тубы)"
      const sealant = findMaterial(result, "Герметик");
      expect(sealant).toBeDefined();
      expect(sealant?.purchaseQty).toBe(4);
    });

    it("грунтовка (канистра 10 л) = 1", () => {
      // Engine: "Грунтовка (канистра 10 л)"
      const primer = findMaterial(result, "Грунтовка");
      expect(primer?.purchaseQty).toBe(1);
    });

    it("totals содержат totalArea и openingCount", () => {
      expect(result.totals.totalArea).toBeCloseTo(7.0, 3);
      expect(result.totals.openingCount).toBe(5);
    });

    it("инварианты", () => {
      checkInvariants(result);
    });
  });

  describe("ПВХ-панели (finishType=1)", () => {
    const result = calc({
      openingCount: 3,
      openingType: 1, // окно 900×1200, sides=3
      slopeWidth: 250,
      finishType: 1,
    });

    it("ПВХ-панели присутствуют", () => {
      // Engine: "ПВХ-панели"
      const panel = findMaterial(result, "ПВХ-панели");
      expect(panel).toBeDefined();
    });

    it("F-профиль присутствует", () => {
      expect(findMaterial(result, "F-профиль")).toBeDefined();
    });

    it("инварианты", () => {
      checkInvariants(result);
    });
  });

  describe("Штукатурка (finishType=2)", () => {
    // openingType=0 → w=1200, h=1400, sides=3
    // totalArea = 7.0
    // totalPerim = 20.0
    // plasterBags = ceil(7.0*12*1.1/25) = ceil(3.696) = 4
    // puttyBagsPlaster = ceil(7.0*1.2*1.1/25) = ceil(0.3696) = 1
    // cornerPcs = ceil(20.0/3) = 7
    const result = calc({
      openingCount: 5,
      openingType: 0,
      slopeWidth: 350,
      finishType: 2,
    });

    it("штукатурка (мешки 25 кг) присутствует", () => {
      // Engine: "Штукатурка (мешки 25 кг)"
      const plaster = findMaterial(result, "Штукатурка");
      expect(plaster).toBeDefined();
      // purchaseQty = ceil(recScenario.exact_need) with REC multiplier ≈ ceil(4*1.06) = 5
      expect(plaster!.purchaseQty).toBeGreaterThanOrEqual(4);
    });

    it("шпаклёвка (мешки 25 кг) присутствует", () => {
      // Engine: "Шпаклёвка (мешки 25 кг)"
      const putty = findMaterial(result, "Шпаклёвка");
      expect(putty?.purchaseQty).toBeGreaterThanOrEqual(1);
    });

    it("уголок перфорированный = 7 шт", () => {
      // Engine: "Уголок перфорированный"
      const corner = findMaterial(result, "Уголок перфорированный");
      expect(corner?.purchaseQty).toBe(7);
    });

    it("нет сэндвич-панелей", () => {
      expect(findMaterial(result, "Сэндвич-панели ПВХ")).toBeUndefined();
    });
  });

  describe("ГКЛ (finishType=3)", () => {
    // openingType=3 → w=900, h=2000, sides=3
    // slopePerim = (2*2000+900)/1000 = 4.9
    // slopeArea = 4.9 * 0.5 = 2.45
    // totalArea = 2.45*2 = 4.9
    // gklSheets = ceil(4.9*1.12/3.0) = ceil(1.829) = 2
    // screwsGKL = ceil(2*20*1.05) = 42
    // puttyBagsGKL = ceil(4.9*1.2*1.1/25) = ceil(0.258) = 1
    const result = calc({
      openingCount: 2,
      openingType: 3,
      slopeWidth: 500,
      finishType: 3,
    });

    it("ГКЛ для откосов присутствует", () => {
      // Engine: "ГКЛ для откосов"
      const gkl = findMaterial(result, "ГКЛ для откосов");
      expect(gkl).toBeDefined();
      // purchaseQty = ceil(recScenario.exact_need) with REC multiplier
      expect(gkl!.purchaseQty).toBeGreaterThanOrEqual(2);
    });

    it("саморезы для ГКЛ присутствуют", () => {
      // Engine: "Саморезы для ГКЛ"
      const screws = findMaterial(result, "Саморезы для ГКЛ");
      expect(screws).toBeDefined();
      expect(screws!.unit).toBe("кг");
      expect(screws!.purchaseQty).toBe(1);
    });

    it("шпаклёвка для ГКЛ присутствует", () => {
      // Engine: "Шпаклёвка (мешки 25 кг)"
      const putty = findMaterial(result, "Шпаклёвка");
      expect(putty).toBeDefined();
    });
  });

  describe("Дверной проём без верхнего откоса (openingType=2)", () => {
    // openingType=2 → w=800, h=2000, sides=2
    // slopePerim = 2*2000/1000 = 4.0
    // slopeArea = 4.0 * 0.15 = 0.6
    // totalArea = 0.6 * 1 = 0.6
    const result = calc({
      openingCount: 1,
      openingType: 2,
      slopeWidth: 150,
      finishType: 0,
    });

    it("площадь откосов — только 2 боковых", () => {
      expect(result.totals.totalArea).toBeCloseTo(0.6, 3);
    });

    it("инварианты", () => {
      checkInvariants(result);
    });
  });

  describe("Предупреждения", () => {
    it("slopeWidth >= 400 → предупреждение", () => {
      const result = calc({ openingCount: 5, openingType: 0, slopeWidth: 400, finishType: 0 });
      // Engine: "Широкие откосы — рекомендуется дополнительное утепление"
      expect(result.warnings.some((w) => w.includes("Широкие откосы"))).toBe(true);
    });

    it("openingCount > 15 → предупреждение", () => {
      const result = calc({ openingCount: 20, openingType: 0, slopeWidth: 350, finishType: 0 });
      // Engine: "Большое количество проёмов — рассмотрите оптовую закупку"
      expect(result.warnings.some((w) => w.includes("оптовую закупку"))).toBe(true);
    });
  });
});
