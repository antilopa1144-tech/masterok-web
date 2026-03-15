import { describe, it, expect } from "vitest";
import { basementDef } from "../formulas/basement";
import { findMaterial, checkInvariants } from "./_helpers";

const calc = basementDef.calculate.bind(basementDef);

describe("Калькулятор подвала и цоколя", () => {
  describe("Стандарт: 8×6 м, глубина 2.5 м, стены 200 мм, пол 150 мм, обмазочная гидро", () => {
    // floorArea = 8 * 6 = 48
    // wallPerim = 2 * (8 + 6) = 28
    // wallArea = 28 * 2.5 = 70
    // floorVol = 48 * 0.15 = 7.2
    // wallVol = 70 * 0.2 = 14
    const result = calc({
      length: 8,
      width: 6,
      depth: 2.5,
      wallThickness: 200,
      floorThickness: 150,
      waterproofType: 0,
    });

    it("totals.floorArea = 48", () => {
      expect(result.totals.floorArea).toBeCloseTo(48, 2);
    });

    it("totals.wallArea = 70", () => {
      expect(result.totals.wallArea).toBeCloseTo(70, 2);
    });

    it("totals.floorVol = 7.2", () => {
      // Engine uses totals.floorVol
      expect(result.totals.floorVol).toBeCloseTo(7.2, 2);
    });

    it("totals.wallVol = 14", () => {
      // Engine uses totals.wallVol
      expect(result.totals.wallVol).toBeCloseTo(14, 2);
    });

    it("бетон на пол присутствует", () => {
      // Engine: "Бетон на пол (150 мм)"
      const floorConcrete = findMaterial(result, "Бетон на пол");
      expect(floorConcrete).toBeDefined();
    });

    it("бетон на стены присутствует", () => {
      // Engine: "Бетон на стены (200 мм)"
      const wallConcrete = findMaterial(result, "Бетон на стены");
      expect(wallConcrete).toBeDefined();
    });

    it("арматура на пол присутствует", () => {
      // Engine: "Арматура на пол"
      const floorRebar = findMaterial(result, "Арматура на пол");
      expect(floorRebar).toBeDefined();
    });

    it("арматура на стены присутствует", () => {
      // Engine: "Арматура на стены"
      const wallRebar = findMaterial(result, "Арматура на стены");
      expect(wallRebar).toBeDefined();
    });

    it("вязальная проволока присутствует", () => {
      // Engine: "Вязальная проволока"
      const wire = findMaterial(result, "Вязальная проволока");
      expect(wire).toBeDefined();
    });

    it("обмазочная гидроизоляция (мастика) при waterproofType=0", () => {
      // Engine: "Обмазочная (мастика)"
      const mastic = findMaterial(result, "Обмазочная");
      expect(mastic).toBeDefined();
    });

    it("продухи (вент. отверстия): max(4, ceil(48/10)) = 5 шт", () => {
      // Engine: "Продухи (вент. отверстия)"
      const vent = findMaterial(result, "Продухи");
      expect(vent?.purchaseQty).toBe(5);
    });

    it("инварианты", () => {
      checkInvariants(result);
    });
  });

  describe("Рулонная гидроизоляция (waterproofType = 1)", () => {
    const result = calc({
      length: 8,
      width: 6,
      depth: 2.5,
      wallThickness: 200,
      floorThickness: 150,
      waterproofType: 1,
    });

    it("рулонная гидроизоляция присутствует", () => {
      // Engine: "Рулонная (наплавляемая) (10 м²/рулон)"
      const roll = findMaterial(result, "Рулонная");
      expect(roll).toBeDefined();
    });

    it("нет обмазочной гидроизоляции", () => {
      expect(findMaterial(result, "Обмазочная")).toBeUndefined();
    });
  });

  describe("Проникающая гидроизоляция (waterproofType = 2)", () => {
    const result = calc({
      length: 8,
      width: 6,
      depth: 2.5,
      wallThickness: 200,
      floorThickness: 150,
      waterproofType: 2,
    });

    it("проникающая гидроизоляция присутствует", () => {
      // Engine: "Проникающая"
      const pen = findMaterial(result, "Проникающая");
      expect(pen).toBeDefined();
    });
  });

  describe("Предупреждения", () => {
    it("глубина > 3 м → предупреждение", () => {
      const result = calc({
        length: 8,
        width: 6,
        depth: 3.5,
        wallThickness: 200,
        floorThickness: 150,
        waterproofType: 1,
      });
      // Engine: "Глубина подвала более 3 м — требуется проект и расчёт несущей способности"
      expect(result.warnings.some((w) => w.includes("более 3 м"))).toBe(true);
    });

    it("стены < 200 мм → предупреждение", () => {
      const result = calc({
        length: 8,
        width: 6,
        depth: 2.5,
        wallThickness: 150,
        floorThickness: 150,
        waterproofType: 1,
      });
      // Engine: "Толщина стен менее 200 мм — допустима только для неглубоких погребов"
      expect(result.warnings.some((w) => w.includes("менее 200 мм"))).toBe(true);
    });
  });

  describe("Минимальные размеры (clamped)", () => {
    const result = calc({
      length: 1,
      width: 1,
      depth: 0.5,
      wallThickness: 200,
      floorThickness: 150,
      waterproofType: 1,
    });

    it("length clamped to 3, width clamped to 3, depth clamped to 1.5", () => {
      expect(result.totals.floorArea).toBeCloseTo(9, 2); // 3 * 3
      expect(result.totals.wallArea).toBeCloseTo(18, 2); // 2 * (3+3) * 1.5
    });

    it("инварианты", () => {
      checkInvariants(result);
    });
  });
});
