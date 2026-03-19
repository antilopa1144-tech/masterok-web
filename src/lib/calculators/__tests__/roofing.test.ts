import { describe, it, expect } from "vitest";
import { roofingDef } from "../formulas/roofing";
import { findMaterial, checkInvariants, withBasicAccuracy } from "./_helpers";

const calc = withBasicAccuracy(roofingDef.calculate.bind(roofingDef));

describe("Калькулятор кровли", () => {
  describe("Металлочерепица: 80 м² (в плане), уклон 30°, лист 1.18×2.5 м", () => {
    // slopeFactor = 1/cos(30°) ≈ 1.1547
    // realArea = 80 * 1.1547 ≈ 92.376
    // effectiveWidth = 1.18 - 0.08 = 1.10
    // sheetArea = 1.10 * (2.5 - 0.15) = 1.10 * 2.35 = 2.585
    // sheetsNeeded = ceil((92.376/2.585)*1.05) = ceil(37.53) = 38
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

    it("реальная площадь ≈ 92.376 м²", () => {
      expect(result.totals.realArea).toBeCloseTo(92.376, 1);
    });

    it("листов металлочерепицы ≈ 38", () => {
      // Engine: "Металлочерепица (1.18×2.5 м)"
      const sheets = findMaterial(result, "Металлочерепица");
      expect(sheets?.purchaseQty).toBe(38);
    });

    it("коньковые элементы присутствуют", () => {
      // Engine: "Коньковые элементы (2 м)"
      expect(findMaterial(result, "Коньковые элементы")).toBeDefined();
    });

    it("снегозадержатели присутствуют", () => {
      expect(findMaterial(result, "Снегозадержатели")).toBeDefined();
    });

    it("кровельные саморезы в шт", () => {
      // Engine: "Кровельные саморезы"
      const screws = findMaterial(result, "Кровельные саморезы");
      expect(screws).toBeDefined();
      expect(screws?.unit).toBe("шт");
    });

    it("гидроизоляция присутствует", () => {
      // Engine: "Гидроизоляция (рулон 75 м²)"
      expect(findMaterial(result, "Гидроизоляция")).toBeDefined();
    });

    it("обрешётка присутствует", () => {
      // Engine: "Обрешётка (доска 25×100, шаг ~350 мм)"
      expect(findMaterial(result, "Обрешётка")).toBeDefined();
    });

    it("контробрешётка присутствует", () => {
      // Engine: "Контробрешётка (брусок 50×50)"
      expect(findMaterial(result, "Контробрешётка")).toBeDefined();
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

  describe("Мягкая черепица (через roofing calc)", () => {
    // realArea ≈ 92.376, packArea=3.0
    // packs = ceil((92.376/3.0)*1.05) = ceil(32.33) = 33
    const result = calc({
      roofingType: 1,
      area: 80,
      slope: 30,
      ridgeLength: 8,
      sheetWidth: 1.18,
      sheetLength: 2.5,
    });

    it("мягкая кровля в упаковках", () => {
      // Engine: "Мягкая кровля (упаковка 3 м²)"
      const packs = findMaterial(result, "Мягкая кровля");
      expect(packs?.purchaseQty).toBe(33);
    });

    it("ОСБ для сплошной обрешётки присутствует", () => {
      // Engine: "Плиты OSB (1250×2500=3.125 м²)"
      expect(findMaterial(result, "ОСП")).toBeDefined();
    });

    it("гвозди кровельные в кг", () => {
      // Engine: "Кровельные гвозди"
      const nails = findMaterial(result, "Кровельные гвозди");
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
      // Engine: "Профнастил (1.18×2.5 м)"
      expect(findMaterial(result, "Профнастил")).toBeDefined();
    });

    it("крепеж присутствует", () => {
      // Engine: "Крепёж кровельный"
      const screws = findMaterial(result, "Крепёж кровельный");
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
      // Engine: "Шифер (лист 1.13×1.75 м)"
      expect(findMaterial(result, "Шифер")).toBeDefined();
    });

    it("крепеж присутствует", () => {
      // Engine: "Крепёж кровельный"
      const nails = findMaterial(result, "Крепёж кровельный");
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
