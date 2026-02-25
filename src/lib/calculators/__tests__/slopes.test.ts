import { describe, it, expect } from "vitest";
import { slopesDef } from "../formulas/slopes";
import { findMaterial, checkInvariants } from "./_helpers";

const calc = slopesDef.calculate.bind(slopesDef);

describe("Калькулятор откосов окон и дверей", () => {
  describe("5 окон 1200×1400, ширина откоса 350, сэндвич-панели", () => {
    // openingType=0 → w=1200, h=1400, sides=3
    // wM=1.2, hM=1.4, slopeWidthM=0.35
    // slopeAreaPerOpening = (2*1.4+1.2)*0.35 = 4.0*0.35 = 1.4
    // totalSlopeArea = 1.4*5 = 7.0
    // perimeterPerOpening = 2*1.4+1.2 = 4.0
    // totalPerimeter = 4.0*5 = 20.0
    //
    // finishType=0 → сэндвич:
    //   panelArea = 3.6
    //   areaWithReserve = 7.0*1.12 = 7.84
    //   panelCount = ceil(7.84/3.6) = ceil(2.178) = 3
    //   fProfileLength = 20.0*1.1 = 22.0
    //   fProfilePcs = ceil(22.0/3) = ceil(7.333) = 8
    //   startProfilePcs = 8 (same as fProfile)
    //   foamCans = ceil(5*0.5) = 3
    //
    // Герметик = 5 туб
    // Грунтовка: 7.0*0.15*1.15 = 1.2075 → ceil(1.2075/10) = 1, max(1,1) = 1
    const result = calc({
      openingCount: 5,
      openingType: 0,
      slopeWidth: 350,
      finishType: 0,
    });

    it("сэндвич-панели = 3 листа", () => {
      const panels = findMaterial(result, "Сэндвич");
      expect(panels?.purchaseQty).toBe(3);
    });

    it("F-профиль = 8 шт", () => {
      const fProfile = findMaterial(result, "F-профиль");
      expect(fProfile?.purchaseQty).toBe(8);
    });

    it("стартовый профиль = 8 шт", () => {
      const startProfile = findMaterial(result, "Стартовый профиль");
      expect(startProfile?.purchaseQty).toBe(8);
    });

    it("монтажная пена = 3 баллона", () => {
      const foam = findMaterial(result, "Монтажная пена");
      expect(foam?.purchaseQty).toBe(3);
    });

    it("герметик = 5 туб", () => {
      const sealant = findMaterial(result, "Герметик");
      expect(sealant?.purchaseQty).toBe(5);
    });

    it("грунтовка = 1 канистра", () => {
      const primer = findMaterial(result, "Грунтовка");
      expect(primer?.purchaseQty).toBe(1);
    });

    it("totals содержат totalSlopeArea и openingCount", () => {
      expect(result.totals.totalSlopeArea).toBeCloseTo(7.0, 5);
      expect(result.totals.openingCount).toBe(5);
    });

    it("инварианты", () => {
      checkInvariants(result);
    });
  });

  describe("Пластиковые панели (finishType=1)", () => {
    // Та же формула, что и для сэндвич, та же площадь листа
    const result = calc({
      openingCount: 3,
      openingType: 1, // окно 900×1200, sides=3
      slopeWidth: 250,
      finishType: 1,
    });

    it("панели ПВХ присутствуют", () => {
      const panel = findMaterial(result, "Панель ПВХ");
      expect(panel).toBeDefined();
    });

    it("F-профиль присутствует", () => {
      expect(findMaterial(result, "F-профиль")).toBeDefined();
    });

    it("инварианты", () => {
      checkInvariants(result);
    });
  });

  describe("Штукатурка + шпаклёвка (finishType=2)", () => {
    // openingType=0 → w=1200, h=1400, sides=3
    // totalSlopeArea = (2*1.4+1.2)*0.35 * 5 = 7.0
    // totalPerimeter = 4.0 * 5 = 20.0
    // plasterKg = 7.0 * 12 * 1.1 = 92.4 → bags = ceil(92.4/25) = 4
    // puttyKg = 7.0 * 1.2 * 1.1 = 9.24 → bags = ceil(9.24/25) = 1
    // cornerPcs = ceil(20.0/3) = 7
    const result = calc({
      openingCount: 5,
      openingType: 0,
      slopeWidth: 350,
      finishType: 2,
    });

    it("штукатурка Ротбанд = 4 мешка", () => {
      const plaster = findMaterial(result, "Ротбанд");
      expect(plaster?.purchaseQty).toBe(4);
    });

    it("шпаклёвка финишная = 1 мешок", () => {
      const putty = findMaterial(result, "Шпаклёвка финишная");
      expect(putty?.purchaseQty).toBe(1);
    });

    it("уголок перфорированный = 7 шт", () => {
      const corner = findMaterial(result, "Уголок");
      expect(corner?.purchaseQty).toBe(7);
    });

    it("нет сэндвич-панелей", () => {
      expect(findMaterial(result, "Сэндвич")).toBeUndefined();
    });
  });

  describe("Гипсокартон + шпаклёвка (finishType=3)", () => {
    // openingType=3 → дверь 900×2000, sides=3
    // slopeAreaPerOpening = (2*2.0+0.9)*0.5 = 4.9*0.5 = 2.45
    // totalSlopeArea = 2.45*2 = 4.9
    // gklArea = 4.9*1.12 = 5.488
    // gklSheets = ceil(5.488/3) = 2
    // screwsCount = ceil(2*20*1.05) = ceil(42) = 42
    // purchaseQtyScrews = ceil(2*20/200) = ceil(0.2) = 1
    // puttyKg = 4.9*1.5*1.1 = 8.085 → bags = ceil(8.085/25) = 1
    const result = calc({
      openingCount: 2,
      openingType: 3,
      slopeWidth: 500,
      finishType: 3,
    });

    it("ГКЛ листы = 2 шт", () => {
      const gkl = findMaterial(result, "ГКЛ");
      expect(gkl?.purchaseQty).toBe(2);
    });

    it("саморезы присутствуют", () => {
      const screws = findMaterial(result, "Саморез");
      expect(screws).toBeDefined();
      expect(screws!.purchaseQty).toBe(1);
    });

    it("шпаклёвка для ГКЛ = 1 мешок", () => {
      const putty = findMaterial(result, "Шпаклёвка для ГКЛ");
      expect(putty?.purchaseQty).toBe(1);
    });
  });

  describe("Дверной проём без верхнего откоса (openingType=2)", () => {
    // openingType=2 → w=800, h=2000, sides=2
    // slopeAreaPerOpening = 2 * 2.0 * slopeWidthM (only 2 side slopes)
    const result = calc({
      openingCount: 1,
      openingType: 2,
      slopeWidth: 150,
      finishType: 0,
    });

    it("площадь откосов — только 2 боковых", () => {
      // slopeAreaPerOpening = 2*2.0*0.15 = 0.6
      expect(result.totals.totalSlopeArea).toBeCloseTo(0.6, 5);
    });

    it("инварианты", () => {
      checkInvariants(result);
    });
  });
});
