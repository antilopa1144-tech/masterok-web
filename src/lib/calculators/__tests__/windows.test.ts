import { describe, it, expect } from "vitest";
import { windowsDef } from "../formulas/windows";
import { findMaterial, checkInvariants } from "./_helpers";

const calc = windowsDef.calculate.bind(windowsDef);

describe("Калькулятор установки окон", () => {
  describe("5 стандартных окон 1200×1400, стена 500 мм, пластиковые откосы", () => {
    // perimeterM = 2*(1.2+1.4) = 5.2
    // ПСУЛ: psulLengthPerWindow = 5.2*1.1 = 5.72, total = 5.72*5 = 28.6
    //   psulRolls = ceil(28.6/5.6) = ceil(5.107) = 6
    // Пена: foamPerWindow = 5.2/3 ≈ 1.7333, total = 1.7333*5 = 8.6667
    //   foamCans = ceil(8.6667*1.1) = ceil(9.5333) = 10
    // ИФУЛ: iflulLengthPerWindow = 5.72, total = 28.6
    //   iflulRolls = ceil(28.6/8.5) = ceil(3.365) = 4
    // Анкеры: anchorsPerWindow = ceil(5.2/0.7) = ceil(7.43) = 8
    //   totalAnchors = ceil(8*5*1.05) = ceil(42) = 42
    // Шурупы: ceil(42*2*1.05) = ceil(88.2) = 89
    // Подоконник: windowsillWidth = 0.5+0.15 = 0.65
    //   windowsillWidthCm = ceil(65/5)*5 = 65
    //   windowsillLengthM = (1.2+0.1)*5 = 6.5
    //   windowsillPcs = ceil(6.5/6) = 2
    // Sill foam: ceil(5*0.5) = 3
    // Откосы (slopeType=0):
    //   slopeSideArea = 2*1.4*0.5 = 1.4
    //   slopeTopArea = 1.2*0.5 = 0.6
    //   totalSlopeArea = (1.4+0.6)*5 = 10.0
    //   sandwichPanelArea = 3.6
    //   sandwichPcs = ceil(10.0*1.1/3.6) = ceil(3.056) = 4
    //   fProfileLength = 5.2*0.75*5*1.1 = 21.45
    //   fProfilePcs = ceil(21.45/3) = ceil(7.15) = 8
    const result = calc({
      windowCount: 5,
      windowWidth: 1200,
      windowHeight: 1400,
      wallThickness: 500,
      slopeType: 0,
    });

    it("ПСУЛ = 6 рулонов", () => {
      const psul = findMaterial(result, "ПСУЛ");
      expect(psul?.purchaseQty).toBe(6);
    });

    it("монтажная пена (основная) = 10 баллонов", () => {
      const foam = findMaterial(result, "профессиональная");
      expect(foam?.purchaseQty).toBe(10);
    });

    it("ИФУЛ = 4 рулона", () => {
      const iful = findMaterial(result, "ИФУЛ");
      expect(iful?.purchaseQty).toBe(4);
    });

    it("анкерные пластины = 42 шт", () => {
      const anchors = findMaterial(result, "Анкерная");
      expect(anchors?.purchaseQty).toBe(42);
    });

    it("шурупы = 89 шт", () => {
      const screws = findMaterial(result, "Шуруп");
      expect(screws?.purchaseQty).toBe(89);
    });

    it("подоконник ширина 65 см = 2 плиты", () => {
      const sill = findMaterial(result, "Подоконник");
      expect(sill).toBeDefined();
      expect(sill!.name).toContain("65");
      expect(sill!.purchaseQty).toBe(2);
    });

    it("пена под подоконник = 3 баллона", () => {
      const sillFoam = findMaterial(result, "под подоконник");
      expect(sillFoam?.purchaseQty).toBe(3);
    });

    it("сэндвич-панели для откосов = 4 листа", () => {
      const panels = findMaterial(result, "Сэндвич");
      expect(panels?.purchaseQty).toBe(4);
    });

    it("F-профиль = 8 шт", () => {
      const fProfile = findMaterial(result, "F-профиль");
      expect(fProfile?.purchaseQty).toBe(8);
    });

    it("предупреждение о ПСУЛ есть всегда", () => {
      expect(result.warnings.some((w) => w.includes("ПСУЛ"))).toBe(true);
    });

    it("totals содержат windowCount и totalPerimeter", () => {
      expect(result.totals.windowCount).toBe(5);
      expect(result.totals.totalPerimeter).toBeCloseTo(5.2 * 5, 5);
    });

    it("инварианты", () => {
      checkInvariants(result);
    });
  });

  describe("Штукатурные откосы (slopeType=1)", () => {
    // 3 окна 900×1200, стена 380
    // perimeterM = 2*(0.9+1.2) = 4.2
    // slopeArea = (2*1.2 + 0.9) * 0.4 * 3 = 3.3 * 0.4 * 3 = 3.96
    // plasterKg = 3.96 * 10 = 39.6, plasterBags = ceil(39.6/25) = 2
    // cornerProfile = (2*1.2+0.9)*3*1.1 = 3.3*3.3 = 10.89
    // cornerPcs = ceil(10.89/3) = 4
    const result = calc({
      windowCount: 3,
      windowWidth: 900,
      windowHeight: 1200,
      wallThickness: 380,
      slopeType: 1,
    });

    it("штукатурная смесь = 2 мешка", () => {
      const plaster = findMaterial(result, "Штукатурная смесь");
      expect(plaster?.purchaseQty).toBe(2);
    });

    it("уголок перфорированный = 4 шт", () => {
      const corner = findMaterial(result, "Уголок");
      expect(corner?.purchaseQty).toBe(4);
    });

    it("сэндвич-панели отсутствуют", () => {
      const panels = findMaterial(result, "Сэндвич");
      expect(panels).toBeUndefined();
    });
  });

  describe("Без откосов (slopeType=2)", () => {
    const result = calc({
      windowCount: 2,
      windowWidth: 1500,
      windowHeight: 1600,
      wallThickness: 300,
      slopeType: 2,
    });

    it("нет сэндвич-панелей и штукатурки для откосов", () => {
      expect(findMaterial(result, "Сэндвич")).toBeUndefined();
      expect(findMaterial(result, "Штукатурная смесь")).toBeUndefined();
    });

    it("основные материалы (пена, ПСУЛ) присутствуют", () => {
      expect(findMaterial(result, "ПСУЛ")).toBeDefined();
      expect(findMaterial(result, "профессиональная")).toBeDefined();
    });

    it("инварианты", () => {
      checkInvariants(result);
    });
  });

  describe("Толстая стена > 500 мм → предупреждение", () => {
    const result = calc({
      windowCount: 1,
      windowWidth: 1200,
      windowHeight: 1400,
      wallThickness: 600,
      slopeType: 0,
    });

    it("предупреждение о толстых стенах", () => {
      expect(result.warnings.some((w) => w.includes("Толстые стены"))).toBe(true);
    });

    // Подоконник: windowsillWidth = 0.6+0.15=0.75 → 75 см
    it("подоконник ширина 75 см", () => {
      const sill = findMaterial(result, "Подоконник");
      expect(sill!.name).toContain("75");
    });
  });
});
