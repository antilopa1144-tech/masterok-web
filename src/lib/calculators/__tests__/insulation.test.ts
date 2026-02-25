import { describe, it, expect } from "vitest";
import { insulationDef } from "../formulas/insulation";
import { findMaterial, checkInvariants } from "./_helpers";

const calc = insulationDef.calculate.bind(insulationDef);

describe("Калькулятор утеплителя", () => {
  describe("Минвата 100 мм, 50 м², плита 1200×600 мм", () => {
    // plateArea = 0.72, areaWithReserve = 52.5
    // platesNeeded = ceil(52.5/0.72) = ceil(72.9) = 73
    // dowels = ceil(50 * 7 * 1.05) = ceil(367.5) = 368
    const result = calc({
      area: 50,
      insulationType: 0,
      thickness: 100,
      plateSize: 0,
    });

    it("плит минваты = 73", () => {
      const insul = findMaterial(result, "Минвата 100");
      expect(insul?.purchaseQty).toBe(73);
    });

    it("дюбели-зонтики присутствуют", () => {
      expect(findMaterial(result, "Дюбели-зонтики")).toBeDefined();
    });

    it("дюбелей = 400 (ceil(368/100)*100)", () => {
      // dowels = ceil(50*7*1.05) = 368, purchaseQty rounds to nearest 100 = 400
      const dowels = findMaterial(result, "Дюбели-зонтики");
      expect(dowels?.purchaseQty).toBe(400);
    });

    it("мембрана гидроветрозащитная для минваты", () => {
      expect(findMaterial(result, "мембрана") ?? findMaterial(result, "Мембрана")).toBeDefined();
    });

    it("предупреждение о мембране", () => {
      expect(result.warnings.some((w) => w.includes("мембран"))).toBe(true);
    });

    it("инварианты", () => {
      checkInvariants(result);
    });
  });

  describe("Пеноплекс, 30 м², плита 1000×500 мм", () => {
    // plateArea = 0.5, areaWithReserve = 31.5
    // platesNeeded = ceil(31.5/0.5) = 63
    const result = calc({
      area: 30,
      insulationType: 1,
      thickness: 100,
      plateSize: 1,
    });

    it("плит пеноплекса = 63", () => {
      const insul = findMaterial(result, "Пеноплекс");
      expect(insul?.purchaseQty).toBe(63);
    });

    it("клей для пенополистирола присутствует", () => {
      expect(findMaterial(result, "Клей для пенополистирола")).toBeDefined();
    });

    it("нет мембраны у пеноплекса", () => {
      expect(findMaterial(result, "Мембрана") ?? findMaterial(result, "мембрана")).toBeUndefined();
    });
  });

  describe("Эковата", () => {
    // density=35, volume = 50*(100/1000) = 5, ecoWoolKg = ceil(5*35*1.1) = ceil(192.5) = 193
    const result = calc({
      area: 50,
      insulationType: 3,
      thickness: 100,
      plateSize: 0,
    });

    it("эковата присутствует", () => {
      expect(findMaterial(result, "Эковата")).toBeDefined();
    });

    it("предупреждение о профоборудовании", () => {
      expect(result.warnings.some((w) => w.includes("оборудования"))).toBe(true);
    });
  });
});
