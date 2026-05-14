import { describe, it, expect } from "vitest";
import { insulationDef } from "../formulas/insulation";
import { findMaterial, checkInvariants, withBasicAccuracy } from "./_helpers";

const calc = withBasicAccuracy(insulationDef.calculate.bind(insulationDef));

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

    it("плит минваты кратно упаковке (78 = 13 × 6)", () => {
      const insul = findMaterial(result, "Минеральная вата");
      // platesPhysical = 52.5/0.72 = 72.92, basePrimary = 72.92×1.0 (basic) = 72.92
      // REC = 72.92 × 1.06 = 77.29. С упаковкой size=6: ceil(77.29/6)=13 → 78 шт.
      expect(insul?.purchaseQty).toBe(78);
      expect(insul?.packageInfo?.count).toBe(13);
      expect(insul?.packageInfo?.size).toBe(6);
    });

    it("дюбели тарельчатые присутствуют", () => {
      expect(findMaterial(result, "Дюбели тарельчатые")).toBeDefined();
    });

    it("дюбелей = 368", () => {
      // dowels = ceil(50*7*1.05) = 368
      const dowels = findMaterial(result, "Дюбели тарельчатые");
      expect(dowels?.purchaseQty).toBe(368);
    });

    it("ветрозащитная мембрана для минваты (присутствует)", () => {
      // Гидроветрозащитная мембрана добавляется для всех систем монтажа минваты.
      expect(findMaterial(result, "мембрана")).toBeDefined();
    });

    it("площадь мембраны округлена до целых рулонов 30 м²: ceil(50×1.15/30)×30 = 60 м²", () => {
      const membrane = findMaterial(result, "мембрана");
      expect(membrane?.purchaseQty).toBe(60);
    });

    it("инварианты", () => {
      checkInvariants(result);
    });
  });

  describe("ЭППС / пеноплекс, 30 м², плита 1000×500 мм", () => {
    // plateArea = 0.5, areaWithReserve = 31.5, platesPhysical = 63
    // С упаковкой ЭППС size=4 (pack_height=400/thickness=100): REC=63×1.06=66.78
    // ceil(66.78/4)=17 упаковок → 68 шт.
    const result = calc({
      area: 30,
      insulationType: 1,
      thickness: 100,
      plateSize: 1,
    });

    it("плит пеноплекса кратно упаковке: 68 = 17 × 4", () => {
      const insul = findMaterial(result, "пеноплекс");
      expect(insul?.purchaseQty).toBe(68);
      expect(insul?.packageInfo?.size).toBe(4);
    });

    it("клей фасадный для плит присутствует", () => {
      // Раньше: «Клей для ЭППС». Сейчас в companion_materials — общий клей фасадный.
      expect(findMaterial(result, "Клей фасадный")).toBeDefined();
    });

    it("нет ветрозащитной мембраны у пеноплекса (только у минваты)", () => {
      expect(findMaterial(result, "мембрана")).toBeUndefined();
    });
  });

  describe("Эковата", () => {
    // density=35, volume=5 м³, kg=5×35×1.10=192.5, REC=192.5×1.06=204.05
    // ecowoolBags = ceil(204.05/15)=14 мешков → 210 кг
    const result = calc({
      area: 50,
      insulationType: 3,
      thickness: 100,
      plateSize: 0,
    });

    it("эковата присутствует", () => {
      expect(findMaterial(result, "Эковата")).toBeDefined();
    });

    it("эковата: 14 мешков × 15 кг = 210 кг", () => {
      const eco = findMaterial(result, "Эковата");
      expect(eco?.purchaseQty).toBe(210);
      expect(eco?.packageInfo?.count).toBe(14);
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
