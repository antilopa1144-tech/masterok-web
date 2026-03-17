import { describe, it, expect } from "vitest";
import { doorsDef } from "../formulas/doors";
import { findMaterial, checkInvariants } from "./_helpers";

const calc = doorsDef.calculate.bind(doorsDef);

describe("Калькулятор установки дверей", () => {
  describe("3 двери 700×2000, стена 120 мм, с наличниками", () => {
    // doorType=0 → w=700, h=2000
    // perimM = 2*(700+2000)/1000 = 5.4
    // foamPerDoor = 5.4 * 100 / 1000 = 0.54 litres
    // foamCans = ceil(3 * 0.54 * 1.1 / 0.75) = ceil(2.376) = 3
    // wallThickness=120 > 70 → needDobor, doborWidth=50
    // doborLenPerDoor = (2*2000+700)/1000 * 1.05 = 4.935
    // doborPcs = ceil(4.935/2.2) * 3 = 3 * 3 = 9
    // nalichnikLenPerDoor = 4.935
    // nalichnikPcs = ceil(4.935/2.2) * 3 * 2 = 3*3*2 = 18
    // glueCarts = ceil(3*0.5) = 2
    // screwPacks = ceil(3*12/50) = 1
    // dubelPacks = ceil(3*6/20) = 1
    const result = calc({
      doorCount: 3,
      doorType: 0,
      wallThickness: 120,
      withNalichnik: 1,
    });

    it("монтажная пена (750 мл) присутствует", () => {
      // Engine: "Монтажная пена (750 мл)"
      const foam = findMaterial(result, "Монтажная пена");
      expect(foam).toBeDefined();
      expect(foam!.purchaseQty).toBeGreaterThan(0);
    });

    it("доборы присутствуют (стена 120 > 70)", () => {
      // Engine: "Доборы (ширина 50 мм)"
      const dobor = findMaterial(result, "Доборы");
      expect(dobor).toBeDefined();
      expect(dobor!.purchaseQty).toBe(9);
    });

    it("наличники = 18 шт", () => {
      // Engine: "Наличники"
      const nalichnik = findMaterial(result, "Наличники");
      expect(nalichnik?.purchaseQty).toBe(18);
    });

    it("клей-герметик присутствует", () => {
      // Engine: "Клей-герметик (картриджи)"
      const glue = findMaterial(result, "Клей-герметик");
      expect(glue?.purchaseQty).toBe(2);
    });

    it("саморезы (упаковка 50 шт) = 1 пачка", () => {
      // Engine: "Саморезы (упаковка 50 шт)"
      const screws = findMaterial(result, "Саморезы");
      expect(screws?.purchaseQty).toBe(1);
    });

    it("дюбели (упаковка 20 шт) = 1 пачка × 20 = 20 шт", () => {
      // Engine: "Дюбели (упаковка 20 шт)" — purchaseQty = packs * packSize
      const dubels = findMaterial(result, "Дюбели");
      expect(dubels?.purchaseQty).toBe(20);
    });

    it("totals содержат doorCount и foamCans", () => {
      expect(result.totals.doorCount).toBe(3);
      expect(result.totals.foamCans).toBeGreaterThan(0);
    });

    it("инварианты", () => {
      checkInvariants(result);
    });
  });

  describe("1 дверь 860×2050, стена 250 мм", () => {
    // doorType=3 → w=860, h=2050
    // doborWidth = 250 - 70 = 180
    const result = calc({
      doorCount: 1,
      doorType: 3,
      wallThickness: 250,
      withNalichnik: 1,
    });

    it("предупреждение о толстых стенах", () => {
      // Engine: "При толстых стенах проверьте ширину доборов в магазине"
      expect(result.warnings.some((w) => w.includes("толстых стенах") || w.includes("доборов"))).toBe(true);
    });

    it("доборы 180 мм присутствуют", () => {
      // Engine: "Доборы (ширина 180 мм)"
      const dobor = findMaterial(result, "Доборы");
      expect(dobor).toBeDefined();
      expect(dobor!.name).toContain("180");
    });

    it("монтажная пена присутствует", () => {
      const foam = findMaterial(result, "Монтажная пена");
      expect(foam).toBeDefined();
    });
  });

  describe("Без наличников", () => {
    const result = calc({
      doorCount: 2,
      doorType: 1,
      wallThickness: 80,
      withNalichnik: 0,
    });

    it("наличники отсутствуют в результате", () => {
      const nalichnik = findMaterial(result, "Наличники");
      expect(nalichnik).toBeUndefined();
    });

    it("доборы есть (80 > 70)", () => {
      // doborWidth = 80 - 70 = 10
      const dobor = findMaterial(result, "Доборы");
      expect(dobor).toBeDefined();
      expect(dobor!.name).toContain("10 мм");
    });
  });

  describe("Стена 80 мм, дверь 800×2000", () => {
    const result = calc({
      doorCount: 1,
      doorType: 1,
      wallThickness: 80,
      withNalichnik: 1,
    });

    it("инварианты", () => {
      checkInvariants(result);
    });

    it("доборы есть (80 > 70)", () => {
      const dobor = findMaterial(result, "Доборы");
      expect(dobor).toBeDefined();
    });
  });
});
