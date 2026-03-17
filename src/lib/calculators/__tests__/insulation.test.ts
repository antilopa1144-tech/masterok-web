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

    it("плит минваты = 78 (REC ×1.06)", () => {
      const insul = findMaterial(result, "Минеральная вата");
      // platesNeeded=73, REC multiplier=1.06 → 77.38 → ceil=78
      expect(insul?.purchaseQty).toBe(78);
    });

    it("дюбели тарельчатые присутствуют", () => {
      expect(findMaterial(result, "Дюбели тарельчатые")).toBeDefined();
    });

    it("дюбелей = 368", () => {
      // dowels = ceil(50*7*1.05) = 368
      const dowels = findMaterial(result, "Дюбели тарельчатые");
      expect(dowels?.purchaseQty).toBe(368);
    });

    it("пароизоляционная мембрана для минваты", () => {
      expect(findMaterial(result, "мембрана")).toBeDefined();
    });

    it("площадь мембраны = ceil(50 * 1.15) = 58 м²", () => {
      const membrane = findMaterial(result, "мембрана");
      expect(membrane?.purchaseQty).toBe(58);
    });

    it("инварианты", () => {
      checkInvariants(result);
    });
  });

  describe("ЭППС / пеноплекс, 30 м², плита 1000×500 мм", () => {
    // plateArea = 0.5, areaWithReserve = 31.5
    // platesNeeded = ceil(31.5/0.5) = 63
    const result = calc({
      area: 30,
      insulationType: 1,
      thickness: 100,
      plateSize: 1,
    });

    it("плит пеноплекса = 67 (REC ×1.06)", () => {
      const insul = findMaterial(result, "пеноплекс");
      // platesNeeded=63, REC multiplier=1.06 → 66.78 → ceil=67
      expect(insul?.purchaseQty).toBe(67);
    });

    it("клей для ЭППС присутствует", () => {
      expect(findMaterial(result, "Клей для ЭППС")).toBeDefined();
    });

    it("нет мембраны у пеноплекса", () => {
      expect(findMaterial(result, "мембрана")).toBeUndefined();
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

    it("эковата: 193 кг → ceil(193/15) = 13 мешков × 15 кг = 195 кг", () => {
      const eco = findMaterial(result, "Эковата");
      expect(eco?.purchaseQty).toBe(195);
    });
  });

  describe("Эковата толщина > 150 мм → оседание", () => {
    const result = calc({
      area: 50,
      insulationType: 3,
      thickness: 200,
      plateSize: 0,
    });

    it("предупреждение об оседании эковаты", () => {
      expect(result.warnings.some((w) => w.includes("оседает"))).toBe(true);
    });
  });
});
