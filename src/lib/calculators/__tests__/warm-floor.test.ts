import { describe, it, expect } from "vitest";
import { warmFloorDef } from "../formulas/warm-floor";
import { findMaterial, checkInvariants, withBasicAccuracy } from "./_helpers";

const calc = withBasicAccuracy(warmFloorDef.calculate.bind(warmFloorDef));

describe("Калькулятор тёплого пола", () => {
  describe("Нагревательный мат (heatingType=0), 10 м² комната, 2 м² мебель, 150 Вт/м²", () => {
    const result = calc({
      roomArea: 10,
      furnitureArea: 2,
      heatingType: 0,
      powerDensity: 150,
    });

    it("рабочая площадь = 8 м²", () => {
      expect(result.totals.heatingArea).toBeCloseTo(8, 2);
    });

    it("мощность = 1200 Вт", () => {
      expect(result.totals.totalPowerW).toBeCloseTo(1200, 1);
    });

    it("матов = ceil(8/2) = 4 шт", () => {
      // Engine: "Нагревательный мат"
      const mat = findMaterial(result, "Нагревательный мат");
      expect(mat).toBeDefined();
      expect(mat!.quantity).toBe(4);
    });

    it("терморегулятор присутствует", () => {
      // Engine: "Терморегулятор"
      expect(findMaterial(result, "Терморегулятор")).toBeDefined();
    });

    it("подложка (рулоны) присутствует", () => {
      // Engine: "Подложка (рулоны)"
      expect(findMaterial(result, "Подложка")).toBeDefined();
    });

    it("плиточный клей присутствует", () => {
      // Engine: "Плиточный клей (мешки 25 кг)"
      expect(findMaterial(result, "Плиточный клей")).toBeDefined();
    });

    it("инварианты", () => {
      checkInvariants(result);
    });
  });

  describe("Кабель в стяжке (heatingType=1)", () => {
    const result = calc({
      roomArea: 10,
      furnitureArea: 2,
      heatingType: 1,
      powerDensity: 150,
    });

    it("нагревательный кабель присутствует", () => {
      // Engine: "Нагревательный кабель"
      expect(findMaterial(result, "Нагревательный кабель")).toBeDefined();
    });

    it("длина кабеля в totals > 0", () => {
      expect(result.totals.cableLength).toBeGreaterThan(0);
    });

    it("стяжка ЦПС присутствует", () => {
      // Engine: "Стяжка ЦПС (мешки 50 кг)"
      expect(findMaterial(result, "Стяжка ЦПС")).toBeDefined();
    });

    it("утеплитель ЕПС присутствует", () => {
      // Engine: "Утеплитель ЕПС (листы 1200×600)"
      expect(findMaterial(result, "ЕПС")).toBeDefined();
    });

    it("монтажная лента присутствует", () => {
      // Engine: "Монтажная лента (рулоны)"
      expect(findMaterial(result, "Монтажная лента")).toBeDefined();
    });
  });

  describe("Водяной тёплый пол (heatingType=2)", () => {
    const result = calc({
      roomArea: 10,
      furnitureArea: 2,
      heatingType: 2,
      powerDensity: 150,
    });

    it("труба для тёплого пола присутствует", () => {
      // Engine: "Труба для тёплого пола"
      expect(findMaterial(result, "Труба для тёплого пола")).toBeDefined();
    });

    it("коллектор присутствует", () => {
      // Engine: "Коллектор"
      expect(findMaterial(result, "Коллектор")).toBeDefined();
    });

    it("армирующая сетка присутствует", () => {
      // Engine: "Армирующая сетка"
      expect(findMaterial(result, "Армирующая сетка")).toBeDefined();
    });
  });

  describe("Предупреждения", () => {
    it("мощность > 3.5 кВт → отдельный автомат", () => {
      const result = calc({
        roomArea: 30,
        furnitureArea: 2,
        heatingType: 0,
        powerDensity: 150,
      });
      // Engine: "Мощность более 3.5 кВт — требуется отдельный автомат"
      expect(result.warnings.some((w) => w.includes("автомат"))).toBe(true);
    });

    it("< 50% площади → неэффективное покрытие", () => {
      const result = calc({
        roomArea: 10,
        furnitureArea: 7,
        heatingType: 0,
        powerDensity: 150,
      });
      // Engine: "Обогреваемая площадь менее 50% — неэффективное покрытие"
      expect(result.warnings.some((w) => w.includes("50%"))).toBe(true);
    });
  });
});
