import { describe, it, expect } from "vitest";
import { doorsDef } from "../formulas/doors";
import { findMaterial, checkInvariants } from "./_helpers";

const calc = doorsDef.calculate.bind(doorsDef);

describe("Калькулятор установки дверей", () => {
  describe("3 межкомнатные двери 700×2000, стена 120 мм, с наличниками", () => {
    // doorType=0 → w=700, h=2000
    // openingPerimeterM = 2*(700+2000)/1000 = 5.4
    // foamPerDoor = 5.4 * 0.1 = 0.54 → foamCansPerDoor = ceil(0.54/0.75) = 1
    // totalFoamCans = ceil(3 * 1 * 1.1) = ceil(3.3) = 4
    // wallThickness=120 > 70 → needDobor, doborWidth=50
    // doborLengthPerDoor = (2*2000+700)/1000 * 1.05 = 4.7*1.05 = 4.935
    // doborPcs = ceil(4.935/2.2) * 3 = 3 * 3 = 9
    // nalichnikLengthPerDoor = 4.935
    // nalichnikPcsPerDoor = ceil(4.935/2.2) = 3
    // totalNalichnikPcs = 3 * 3 * 2 = 18
    // glueCartridges = ceil(3*0.5) = 2
    // screwPacks = ceil(3*12/50) = ceil(0.72) = 1
    // dubelsPacks = ceil(3*6/20) = ceil(0.9) = 1
    const result = calc({
      doorCount: 3,
      doorType: 0,
      wallThickness: 120,
      withNalichnik: 1,
    });

    it("монтажная пена = 4 баллона", () => {
      const foam = findMaterial(result, "Монтажная пена");
      expect(foam?.purchaseQty).toBe(4);
    });

    it("доборы присутствуют (стена 120 > 70)", () => {
      const dobor = findMaterial(result, "Добор");
      expect(dobor).toBeDefined();
      expect(dobor!.purchaseQty).toBe(9);
    });

    it("наличники = 18 шт (3 двери × 3 шт/дверь × 2 стороны)", () => {
      const nalichnik = findMaterial(result, "Наличник");
      expect(nalichnik?.purchaseQty).toBe(18);
    });

    it("жидкие гвозди = 2 картриджа", () => {
      const glue = findMaterial(result, "Жидкие гвозди");
      expect(glue?.purchaseQty).toBe(2);
    });

    it("шурупы = 1 пачка", () => {
      const screws = findMaterial(result, "Шуруп");
      expect(screws?.purchaseQty).toBe(1);
    });

    it("дюбели = 1 пачка", () => {
      const dubels = findMaterial(result, "Дюбель");
      expect(dubels?.purchaseQty).toBe(1);
    });

    it("totals содержат doorCount и totalFoamCans", () => {
      expect(result.totals.doorCount).toBe(3);
      expect(result.totals.totalFoamCans).toBe(4);
    });

    it("инварианты", () => {
      checkInvariants(result);
    });
  });

  describe("1 входная дверь 860×2050, стена 250 мм", () => {
    // doorType=3 → w=860, h=2050
    // openingPerimeterM = 2*(860+2050)/1000 = 5.82
    // foamPerDoor = 5.82*0.1 = 0.582 → ceil(0.582/0.75) = 1
    // totalFoamCans = ceil(1*1*1.1) = ceil(1.1) = 2
    // doborWidth = 250 - 70 = 180
    // doborLengthPerDoor = (2*2050+860)/1000 * 1.05 = 4.96*1.05 = 5.208
    // doborPcs = ceil(5.208/2.2) * 1 = 3
    const result = calc({
      doorCount: 1,
      doorType: 3,
      wallThickness: 250,
      withNalichnik: 1,
    });

    it("предупреждение о входной двери", () => {
      expect(result.warnings.some((w) => w.includes("Входная дверь"))).toBe(true);
    });

    it("доборы 180 мм присутствуют", () => {
      const dobor = findMaterial(result, "Добор");
      expect(dobor).toBeDefined();
      expect(dobor!.name).toContain("180");
    });

    it("монтажная пена = 2 баллона", () => {
      const foam = findMaterial(result, "Монтажная пена");
      expect(foam?.purchaseQty).toBe(2);
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
      const nalichnik = findMaterial(result, "Наличник");
      expect(nalichnik).toBeUndefined();
    });

    it("жидкие гвозди отсутствуют", () => {
      const glue = findMaterial(result, "Жидкие гвозди");
      expect(glue).toBeUndefined();
    });

    it("доборы есть (80 > 70)", () => {
      // doborWidth = 80 - 70 = 10
      const dobor = findMaterial(result, "Добор");
      expect(dobor).toBeDefined();
      expect(dobor!.name).toContain("10 мм");
    });
  });

  describe("Стена 80 мм (тонкая, гипсокартон), дверь 800×2000", () => {
    // wallThickness=80 > 70 → needDobor=true, doborWidth=10
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
      const dobor = findMaterial(result, "Добор");
      expect(dobor).toBeDefined();
    });
  });
});
