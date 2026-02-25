import { describe, it, expect } from "vitest";
import { decorPlasterDef } from "../formulas/decor-plaster";
import { findMaterial, checkInvariants } from "./_helpers";

const calc = decorPlasterDef.calculate.bind(decorPlasterDef);

describe("Калькулятор декоративной штукатурки", () => {
  describe("Короед 2 мм, фасад, 50 м², мешки 25 кг", () => {
    // textureType=0 → kgPerSqm=2.5
    // totalKg = 50*2.5*1.05 = 131.25
    // bags = ceil(131.25/25) = ceil(5.25) = 6
    // deepPrimerLiters = 50*0.2*1.15 = 11.5 → deepPrimerCans = ceil(11.5/10) = 2
    // primerCans = ceil(50*0.15/5) = ceil(1.5) = 2
    // colorBanks = ceil(131.25/25) = 6
    // waxCans = 0 (not venetian)
    const result = calc({
      area: 50,
      textureType: 0,
      surface: 0,
      bagWeight: 25,
    });

    it("короед = 6 мешков", () => {
      const plaster = findMaterial(result, "Короед");
      expect(plaster?.purchaseQty).toBe(6);
      expect(plaster!.unit).toBe("мешков");
    });

    it("грунтовка глубокого проникновения = 2 канистры", () => {
      const primer = findMaterial(result, "глубокого проникновения");
      expect(primer?.purchaseQty).toBe(2);
    });

    it("грунтовка тонированная = 2 шт", () => {
      const primer = findMaterial(result, "тонированная");
      expect(primer?.purchaseQty).toBe(2);
    });

    it("колер = 6 банок", () => {
      const color = findMaterial(result, "Колер");
      expect(color?.purchaseQty).toBe(6);
    });

    it("воск отсутствует (не венецианская)", () => {
      expect(findMaterial(result, "Воск")).toBeUndefined();
    });

    it("предупреждение о фасаде и UV", () => {
      expect(result.warnings.some((w) => w.includes("фасад"))).toBe(true);
    });

    it("totals содержат area, kgPerSqm, totalKg", () => {
      expect(result.totals.area).toBe(50);
      expect(result.totals.kgPerSqm).toBe(2.5);
      expect(result.totals.totalKg).toBeCloseTo(131.25, 5);
    });

    it("инварианты", () => {
      checkInvariants(result);
    });
  });

  describe("Короед 3 мм, интерьер, 30 м², вёдра 15 кг", () => {
    // textureType=1 → kgPerSqm=3.5
    // totalKg = 30*3.5*1.05 = 110.25
    // bags = ceil(110.25/15) = ceil(7.35) = 8
    const result = calc({
      area: 30,
      textureType: 1,
      surface: 1,
      bagWeight: 15,
    });

    it("короед 3 мм = 8 вёдер", () => {
      const plaster = findMaterial(result, "Короед");
      expect(plaster?.purchaseQty).toBe(8);
      expect(plaster!.unit).toBe("вёдер");
    });

    it("нет предупреждения о фасаде (интерьер)", () => {
      expect(result.warnings.some((w) => w.includes("фасад"))).toBe(false);
    });
  });

  describe("Камешковая, 100 м², мешки 25 кг", () => {
    // textureType=2 → kgPerSqm=3.0
    // totalKg = 100*3.0*1.05 = 315.0
    // bags = ceil(315/25) = ceil(12.6) = 13
    const result = calc({
      area: 100,
      textureType: 2,
      surface: 0,
      bagWeight: 25,
    });

    it("камешковая = 13 мешков", () => {
      const plaster = findMaterial(result, "Камешковая");
      expect(plaster?.purchaseQty).toBe(13);
    });
  });

  describe("Шуба, 20 м²", () => {
    // textureType=3 → kgPerSqm=4.0
    // totalKg = 20*4.0*1.05 = 84.0
    // bags = ceil(84/25) = ceil(3.36) = 4
    const result = calc({
      area: 20,
      textureType: 3,
      surface: 1,
      bagWeight: 25,
    });

    it("шуба = 4 мешка", () => {
      const plaster = findMaterial(result, "Шуба");
      expect(plaster?.purchaseQty).toBe(4);
    });
  });

  describe("Венецианская, интерьер, 40 м², вёдра 15 кг", () => {
    // textureType=4 → kgPerSqm=1.2
    // totalKg = 40*1.2*1.05 = 50.4
    // bags = ceil(50.4/15) = ceil(3.36) = 4
    // waxCans = ceil(40*0.1/1) = ceil(4) = 4
    const result = calc({
      area: 40,
      textureType: 4,
      surface: 1,
      bagWeight: 15,
    });

    it("венецианская = 4 ведра", () => {
      const plaster = findMaterial(result, "Венецианская");
      expect(plaster?.purchaseQty).toBe(4);
      expect(plaster!.unit).toBe("вёдер");
    });

    it("воск финишный = 4 шт", () => {
      const wax = findMaterial(result, "Воск");
      expect(wax).toBeDefined();
      expect(wax!.purchaseQty).toBe(4);
    });

    it("нет предупреждения о фасаде (интерьер)", () => {
      expect(result.warnings.some((w) => w.includes("не предназначена для фасадов"))).toBe(false);
    });
  });

  describe("Венецианская на фасаде → предупреждение", () => {
    const result = calc({
      area: 50,
      textureType: 4,
      surface: 0,
      bagWeight: 25,
    });

    it("предупреждение: венецианская не для фасадов", () => {
      expect(result.warnings.some((w) => w.includes("не предназначена для фасадов"))).toBe(true);
    });

    it("также предупреждение о UV-защите", () => {
      expect(result.warnings.some((w) => w.includes("UV"))).toBe(true);
    });
  });

  describe("Минимальная площадь 1 м²", () => {
    const result = calc({
      area: 1,
      textureType: 0,
      surface: 1,
      bagWeight: 25,
    });

    it("расчёт корректен при 1 м²", () => {
      checkInvariants(result);
      // totalKg = 1*2.5*1.05 = 2.625 → bags = ceil(2.625/25) = 1
      const plaster = findMaterial(result, "Короед");
      expect(plaster?.purchaseQty).toBe(1);
    });
  });

  describe("IEEE 754: 100 м² × 3.5 кг/м² × 1.05 = 367.5 → ceil(367.5/25) = 15", () => {
    // This tests potential floating point issues
    const result = calc({
      area: 100,
      textureType: 1,
      surface: 0,
      bagWeight: 25,
    });

    it("короед 3 мм 100 м² = 15 мешков", () => {
      const plaster = findMaterial(result, "Короед");
      // 100*3.5*1.05 = 367.5, ceil(367.5/25) = ceil(14.7) = 15
      expect(plaster?.purchaseQty).toBe(15);
    });
  });
});
