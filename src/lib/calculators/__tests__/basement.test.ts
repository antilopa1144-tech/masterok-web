import { describe, it, expect } from "vitest";
import { basementDef } from "../formulas/basement";
import { findMaterial, checkInvariants } from "./_helpers";

const calc = basementDef.calculate.bind(basementDef);

describe("Калькулятор подвала и цоколя", () => {
  describe("Стандарт: 8×6 м, глубина 2.5 м, стены 200 мм, пол 150 мм, гидро рулонная", () => {
    // floorArea = 8 * 6 = 48
    // wallPerimeter = 2 * (8 + 6) = 28
    // wallArea = 28 * 2.5 = 70
    // floorVolume = 48 * 0.15 = 7.2
    // wallVolume = 70 * 0.2 = 14
    const result = calc({
      length: 8,
      width: 6,
      depth: 2.5,
      wallThickness: 200,
      floorThickness: 150,
      waterproofType: 1,
    });

    it("totals.floorArea = 48", () => {
      expect(result.totals.floorArea).toBeCloseTo(48, 2);
    });

    it("totals.wallArea = 70", () => {
      expect(result.totals.wallArea).toBeCloseTo(70, 2);
    });

    it("totals.floorVolume = 7.2", () => {
      expect(result.totals.floorVolume).toBeCloseTo(7.2, 2);
    });

    it("totals.wallVolume = 14", () => {
      expect(result.totals.wallVolume).toBeCloseTo(14, 2);
    });

    it("бетон для плиты пола: floorConcreteM3 = ceil(7.2 * 1.05 * 10) / 10 = ceil(75.6)/10 = 7.6", () => {
      const floorConcrete = findMaterial(result, "плиты пола");
      expect(floorConcrete?.purchaseQty).toBeCloseTo(7.6, 1);
    });

    it("бетон для стен: wallConcreteM3 = ceil(14 * 1.03 * 10) / 10 = ceil(144.2)/10 = 14.5", () => {
      const wallConcrete = findMaterial(result, "стен подвала");
      expect(wallConcrete?.purchaseQty).toBeCloseTo(14.5, 1);
    });

    it("арматура для плиты пола: floorRebarKg = 48 * 22 = 1056, T = ceil(1056/1000*10)/10 = ceil(10.56)/10 = 1.1", () => {
      const floorRebar = findMaterial(result, "Арматура А500С")!;
      // First rebar is for floor
      const floorRebarItem = result.materials.find((m) => m.name.includes("плиты пола") && m.name.includes("Арматура"));
      expect(floorRebarItem?.purchaseQty).toBeCloseTo(1.1, 1);
    });

    it("арматура для стен: wallRebarKg = 70 * 18 = 1260, T = ceil(1260/1000*10)/10 = ceil(12.6)/10 = 1.3", () => {
      const wallRebar = result.materials.find((m) => m.name.includes("стен") && m.name.includes("Арматура"));
      expect(wallRebar?.purchaseQty).toBeCloseTo(1.3, 1);
    });

    it("проволока вязальная = ceil((1056 + 1260) * 0.01) = ceil(23.16) = 24 кг", () => {
      const wire = findMaterial(result, "Проволока вязальная");
      expect(wire?.purchaseQty).toBe(24);
    });

    it("гидроизоляция рулонная (тип 1)", () => {
      const hydro = findMaterial(result, "рулонная");
      expect(hydro).toBeDefined();
    });

    it("праймер / мастика под рулонную (тип 1)", () => {
      const primer = findMaterial(result, "Праймер");
      expect(primer).toBeDefined();
    });

    it("ЭППС для стен снаружи всегда присутствует", () => {
      expect(findMaterial(result, "ЭППС")).toBeDefined();
    });

    it("вентиляция: продухи = max(4, ceil(48/10)) = max(4, 5) = 5 шт", () => {
      const vent = findMaterial(result, "гильзы для продухов");
      expect(vent?.purchaseQty).toBe(5);
    });

    it("инварианты", () => {
      checkInvariants(result);
    });
  });

  describe("Обмазочная гидроизоляция (waterproofType = 0)", () => {
    const result = calc({
      length: 8,
      width: 6,
      depth: 2.5,
      wallThickness: 200,
      floorThickness: 150,
      waterproofType: 0,
    });

    it("мастика битумно-полимерная присутствует", () => {
      const mastic = findMaterial(result, "Мастика битумно-полимерная");
      expect(mastic).toBeDefined();
    });

    it("мастика: (70+48)*2*1.5 = 354 кг, вёдер = ceil(354/20) = 18", () => {
      const mastic = findMaterial(result, "Мастика битумно-полимерная");
      expect(mastic?.purchaseQty).toBe(18);
    });

    it("нет рулонной гидроизоляции", () => {
      const roll = result.materials.find((m) => m.name.includes("рулонная") && m.name.includes("Гидроизоляция"));
      expect(roll).toBeUndefined();
    });

    it("предупреждение о грунтовых водах", () => {
      expect(result.warnings.some((w) => w.includes("обмазочная гидроизоляция"))).toBe(true);
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
      const pen = findMaterial(result, "Пенетрон");
      expect(pen).toBeDefined();
    });

    it("penKg = (70+48)*0.4*1.1 = 51.92, bags = ceil(51.92/10) = 6", () => {
      const pen = findMaterial(result, "Пенетрон");
      expect(pen?.purchaseQty).toBe(6);
    });
  });

  describe("Предупреждения", () => {
    it("глубина > 3 м → предупреждение о давлении грунта", () => {
      const result = calc({
        length: 8,
        width: 6,
        depth: 3.5,
        wallThickness: 200,
        floorThickness: 150,
        waterproofType: 1,
      });
      expect(result.warnings.some((w) => w.includes("давления грунта"))).toBe(true);
    });

    it("всегда предупреждение о дренажной системе", () => {
      const result = calc({
        length: 8,
        width: 6,
        depth: 2.5,
        wallThickness: 200,
        floorThickness: 150,
        waterproofType: 1,
      });
      expect(result.warnings.some((w) => w.includes("дренажная система"))).toBe(true);
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
