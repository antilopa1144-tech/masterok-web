import { describe, it, expect } from "vitest";
import { pavingTilesDef } from "../formulas/paving-tiles";
import { findMaterial, checkInvariants, withBasicAccuracy } from "./_helpers";

const calc = withBasicAccuracy(pavingTilesDef.calculate.bind(pavingTilesDef));

describe("Калькулятор тротуарной плитки", () => {
  describe("ЦПС основание (defaults): 50 м², 30 м, 60 мм, с бордюром", () => {
    const result = calc({
      area: 50,
      perimeter: 30,
      foundationType: 1,
      tileThickness: 60,
      borderEnabled: 1,
    });

    it("плитка tileM2 = ceil(50 × 1.07) = 54 м²", () => {
      expect(result.totals.tileM2).toBe(54);
    });

    it("щебень = 50 × 0.15 × 1.25 = 9.375 м³", () => {
      expect(result.totals.gravelM3).toBeCloseTo(9.375, 3);
    });

    it("ЦПС объём = 50 × 0.03 × 1.10 = 1.65 м³", () => {
      expect(result.totals.cementSandMixM3).toBeCloseTo(1.65, 3);
    });

    it("цемент мешков = ceil(1.65 × 1800 × 0.2 / 50) = 12", () => {
      expect(result.totals.cementBags).toBe(12);
    });

    it("кварцевый песок для швов = ceil(50 × 5 × 1.1 / 25) = 11 мешков", () => {
      const sand = findMaterial(result, "Кварцевый песок");
      expect(sand?.purchaseQty).toBe(11);
    });

    it("бордюр = ceil(30 / 1.0 × 1.05) = 32 шт", () => {
      const border = findMaterial(result, "Бордюрный камень");
      expect(border?.purchaseQty).toBe(32);
    });

    it("геотекстиль = ceil(50 × 1.15 / 50) = 2 рулона", () => {
      const geo = findMaterial(result, "Геотекстиль");
      expect(geo?.purchaseQty).toBe(2);
    });

    it("нет бетона при ЦПС основании", () => {
      expect(result.totals.concreteM3).toBe(0);
    });

    it("инварианты", () => {
      checkInvariants(result);
    });
  });

  describe("Песчаное основание: 30 м² пешеходная дорожка, 40 мм", () => {
    const result = calc({
      area: 30,
      perimeter: 22,
      foundationType: 0,
      tileThickness: 40,
      borderEnabled: 1,
    });

    it("плитка = ceil(30 × 1.07) = 33 м²", () => {
      expect(result.totals.tileM2).toBe(33);
    });

    it("без щебня (только песчаная подушка)", () => {
      expect(result.totals.gravelM3).toBe(0);
    });

    it("песок подушки увеличен (100 мм × 1.20) = 3.6 м³", () => {
      expect(result.totals.sandBeddingM3).toBeCloseTo(3.6, 2);
    });

    it("без ЦПС и бетона", () => {
      expect(result.totals.cementSandMixM3).toBe(0);
      expect(result.totals.concreteM3).toBe(0);
      expect(result.totals.cementBags).toBe(0);
    });

    it("инварианты", () => {
      checkInvariants(result);
    });
  });

  describe("Бетонное основание под автомобиль: 80 м², 80 мм", () => {
    const result = calc({
      area: 80,
      perimeter: 36,
      foundationType: 2,
      tileThickness: 80,
      borderEnabled: 1,
    });

    it("плитка = ceil(80 × 1.07) = 86 м²", () => {
      expect(result.totals.tileM2).toBe(86);
    });

    it("бетон М200 плита = 80 × 0.10 × 1.05 = 8.4 м³", () => {
      expect(result.totals.concreteM3).toBeCloseTo(8.4, 2);
    });

    it("щебневая подушка 80 × 0.15 × 1.25 = 15 м³", () => {
      expect(result.totals.gravelM3).toBeCloseTo(15, 2);
    });

    it("нет ЦПС в материалах при бетонном основании (отдельный слой не считается)", () => {
      expect(result.totals.cementSandMixM3).toBe(0);
    });

    it("бетон М200 присутствует среди материалов", () => {
      expect(findMaterial(result, "Бетон М200 (плита")).toBeDefined();
    });

    it("инварианты", () => {
      checkInvariants(result);
    });
  });

  describe("Без бордюра: borderEnabled=0", () => {
    const result = calc({
      area: 50,
      perimeter: 30,
      foundationType: 1,
      tileThickness: 60,
      borderEnabled: 0,
    });

    it("бордюр не считается", () => {
      expect(result.totals.borderPcs).toBe(0);
      expect(result.totals.borderConcreteM3).toBe(0);
      expect(findMaterial(result, "Бордюрный")).toBeUndefined();
    });

    it("предупреждение про бордюр", () => {
      expect(result.warnings.some((w) => w.includes("без бордюра") || w.includes("Без бордюра"))).toBe(true);
    });
  });

  describe("Предупреждения", () => {
    it("тонкая плитка под авто → предупреждение", () => {
      const result = calc({
        area: 60,
        perimeter: 32,
        foundationType: 2,
        tileThickness: 40,
        borderEnabled: 1,
      });
      expect(result.warnings.some((w) => w.includes("автомобильной"))).toBe(true);
    });

    it("толстая плитка на песчаном основании → предупреждение", () => {
      const result = calc({
        area: 30,
        perimeter: 22,
        foundationType: 0,
        tileThickness: 60,
        borderEnabled: 1,
      });
      expect(result.warnings.some((w) => w.includes("песчаная подушка"))).toBe(true);
    });
  });

  describe("Сценарии MIN ≤ REC ≤ MAX", () => {
    const result = calc({
      area: 50,
      perimeter: 30,
      foundationType: 1,
      tileThickness: 60,
      borderEnabled: 1,
    });

    it("MIN ≤ REC ≤ MAX по exact_need", () => {
      expect(result.scenarios!.MIN.exact_need).toBeLessThanOrEqual(result.scenarios!.REC.exact_need);
      expect(result.scenarios!.REC.exact_need).toBeLessThanOrEqual(result.scenarios!.MAX.exact_need);
    });

    it("REC примерно совпадает с покупкой плитки (целое число м²)", () => {
      expect(result.scenarios!.REC.purchase_quantity).toBeGreaterThanOrEqual(result.totals.tileM2);
    });
  });
});
