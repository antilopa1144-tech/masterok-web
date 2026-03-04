import { describe, it, expect } from "vitest";
import { roofingDef } from "../formulas/roofing";
import { findMaterial, checkInvariants } from "./_helpers";

const calc = roofingDef.calculate.bind(roofingDef);

describe("Калькулятор кровли", () => {
  describe("Металлочерепица: 80 м² (в плане), уклон 30°, лист 1.18×2.5 м", () => {
    // slopeFactor = 1/cos(30°) ≈ 1.1547
    // realArea = 80 * 1.1547 ≈ 92.38
    // effectiveWidth = 1.18 * 0.92 = 1.0856
    // sheetArea = 1.0856 * 2.5 = 2.714
    // sheetsNeeded = ceil((92.38/2.714)*1.10) = ceil(37.44) = 38
    const result = calc({
      roofingType: 0,
      area: 80,
      slope: 30,
      ridgeLength: 8,
      sheetWidth: 1.18,
      sheetLength: 2.5,
    });

    it("реальная площадь с уклоном > 80 м²", () => {
      expect(result.totals.realArea).toBeGreaterThan(80);
    });

    it("реальная площадь ≈ 92.38 м²", () => {
      expect(result.totals.realArea).toBeCloseTo(92.38, 1);
    });

    it("листов металлочерепицы = 38", () => {
      const sheets = findMaterial(result, "Металлочерепица");
      expect(sheets?.purchaseQty).toBe(38);
    });

    it("конёк присутствует", () => {
      expect(findMaterial(result, "Конёк")).toBeDefined();
    });

    it("снегозадержатели присутствуют", () => {
      expect(findMaterial(result, "Снегозадержатели")).toBeDefined();
    });

    it("саморезы кровельные в шт", () => {
      const screws = findMaterial(result, "Саморезы кровельные");
      expect(screws).toBeDefined();
      expect(screws?.unit).toBe("шт");
    });

    it("гидроизоляция присутствует", () => {
      expect(findMaterial(result, "мембрана")).toBeDefined();
    });

    it("обрешётка присутствует", () => {
      expect(findMaterial(result, "Обрешётка")).toBeDefined();
    });

    it("инварианты", () => {
      checkInvariants(result);
    });
  });

  describe("Уклон корректно влияет на реальную площадь", () => {
    it("уклон 45° даёт реальную площадь больше плановой в √2 раз", () => {
      const result = calc({
        roofingType: 0,
        area: 100,
        slope: 45,
        ridgeLength: 10,
        sheetWidth: 1.18,
        sheetLength: 2.5,
      });
      expect(result.totals.realArea).toBeCloseTo(141.42, 0);
    });
  });

  describe("Мягкая черепица", () => {
    // realArea ≈ 92.38, packArea=3.0
    // packs = ceil((92.38/3.0)*1.10) = ceil(33.87) = 34
    const result = calc({
      roofingType: 1,
      area: 80,
      slope: 30,
      ridgeLength: 8,
      sheetWidth: 1.18,
      sheetLength: 2.5,
    });

    it("мягкая черепица в упаковках", () => {
      const packs = findMaterial(result, "Мягкая черепица");
      // realArea ≈ 92.38, wasteCoeff=1.05 (простая)
      // packs = ceil(92.38 / 3.0 * 1.05) = ceil(32.33) = 33
      expect(packs?.purchaseQty).toBe(33);
    });

    it("ОСБ для сплошной обрешётки присутствует", () => {
      expect(findMaterial(result, "ОСБ")).toBeDefined();
    });

    it("гвозди кровельные в кг", () => {
      const nails = findMaterial(result, "Гвозди ершёные");
      expect(nails).toBeDefined();
      expect(nails?.unit).toBe("кг");
    });
  });

  describe("Профнастил", () => {
    const result = calc({
      roofingType: 2,
      area: 80,
      slope: 30,
      ridgeLength: 8,
      sheetWidth: 1.18,
      sheetLength: 2.5,
    });

    it("кровельный материал присутствует", () => {
      expect(findMaterial(result, "Кровельный материал")).toBeDefined();
    });

    it("крепеж присутствует", () => {
      const screws = findMaterial(result, "Крепёж");
      expect(screws).toBeDefined();
    });
  });

  describe("Шифер", () => {
    const result = calc({
      roofingType: 4,
      area: 80,
      slope: 30,
      ridgeLength: 8,
      sheetWidth: 1.18,
      sheetLength: 2.5,
    });

    it("кровельный материал присутствует", () => {
      expect(findMaterial(result, "Кровельный материал")).toBeDefined();
    });

    it("крепеж присутствует", () => {
      const nails = findMaterial(result, "Крепёж");
      expect(nails).toBeDefined();
    });
  });

  describe("Предупреждения", () => {
    it("металлочерепица при уклоне < 14° → предупреждение", () => {
      const result = calc({
        roofingType: 0,
        area: 80,
        slope: 10,
        ridgeLength: 8,
        sheetWidth: 1.18,
        sheetLength: 2.5,
      });
      expect(result.warnings.some((w) => w.includes("14°"))).toBe(true);
    });

    it("мягкая черепица при уклоне < 12° → предупреждение", () => {
      const result = calc({
        roofingType: 1,
        area: 80,
        slope: 10,
        ridgeLength: 8,
        sheetWidth: 1.18,
        sheetLength: 2.5,
      });
      expect(result.warnings.some((w) => w.includes("12°"))).toBe(true);
    });
  });
});
