import { describe, it, expect } from "vitest";
import { frameHouseDef } from "../formulas/frame-house";
import { findMaterial, checkInvariants } from "./_helpers";

const calc = frameHouseDef.calculate.bind(frameHouseDef);

describe("Калькулятор каркасного дома", () => {
  describe("Периметр 30 м, h=2.7, проёмы 10 м², шаг 600, минвата 150, ОСБ/ОСБ", () => {
    // wallArea = 30 * 2.7 - 10 = 71 м²
    // studs = ceil(30/0.6) + 1 = 51
    // studTotalMeters = 51 * 2.7 * 1.05 = 144.585 → studBoards6m = ceil(144.585/6) = 25
    // strappingMeters = 30 * 2 * 1.05 = 63 → strappingBoards6m = ceil(63/6) = 11
    // outerSheets = ceil(71/3.125 * 1.08) = ceil(24.5376) = 25
    // innerSheets = ceil(71/3.125 * 1.08) = ceil(24.5376) = 25
    // minvata: layers=3, platesPerLayer=ceil(71/0.72*1.05)=104, total=312, packs=ceil(312/8)=39
    // vaporBarrier: ceil(71*1.15/75)=ceil(81.65/75)=2 рулона
    // windMembrane: ceil(71*1.15/75)=2 рулона
    // tape: (2+2)*2 = 8 рулонов
    // screws: (25*28 + 25*28)*1.05 = 1470, kg = ceil(1470/600*10)/10 = 2.5
    // nails: 51*20*1.05 = 1071, kg = ceil(1071/200*10)/10 = 5.4
    const result = calc({
      wallLength: 30,
      wallHeight: 2.7,
      openingsArea: 10,
      studStep: 600,
      insulationType: 0,
      outerSheathing: 0,
      innerSheathing: 0,
    });

    it("стойки = 25 досок 6 м", () => {
      const studs = findMaterial(result, "Стойки");
      expect(studs?.purchaseQty).toBe(25);
      expect(studs!.name).toContain("50×150");
    });

    it("обвязка = 11 досок 6 м", () => {
      const strapping = findMaterial(result, "Обвязка");
      expect(strapping?.purchaseQty).toBe(11);
    });

    it("наружная обшивка ОСБ = 25 листов", () => {
      const outer = findMaterial(result, "Наружная обшивка");
      expect(outer?.purchaseQty).toBe(25);
      expect(outer!.name).toContain("ОСБ-3 9 мм");
    });

    it("внутренняя обшивка ОСБ = 25 листов", () => {
      const inner = findMaterial(result, "Внутренняя обшивка");
      expect(inner?.purchaseQty).toBe(25);
      expect(inner!.name).toContain("ОСБ-3 9 мм");
    });

    it("утеплитель минвата = 39 упаковок", () => {
      const insul = findMaterial(result, "Минвата");
      expect(insul?.purchaseQty).toBe(39);
      expect(insul!.name).toContain("150");
      expect(insul!.name).toContain("3 слоя");
    });

    it("пароизоляция = 2 рулона", () => {
      const vapor = findMaterial(result, "Пароизоляция");
      expect(vapor?.purchaseQty).toBe(2);
    });

    it("ветрозащита = 2 рулона", () => {
      const wind = findMaterial(result, "Ветрозащитная");
      expect(wind?.purchaseQty).toBe(2);
    });

    it("скотч для мембран = 8 рулонов", () => {
      const tape = findMaterial(result, "Скотч для мембран");
      expect(tape?.purchaseQty).toBe(8);
    });

    it("саморезы = 3 кг", () => {
      const screws = findMaterial(result, "Саморезы");
      // screwsKg = 2.5, purchaseQty = ceil(2.5) = 3
      expect(screws?.purchaseQty).toBe(3);
      expect(screws!.unit).toBe("кг");
    });

    it("гвозди = 6 кг", () => {
      const nails = findMaterial(result, "Гвозди");
      // nailsKg = 5.4, purchaseQty = ceil(5.4) = 6
      expect(nails?.purchaseQty).toBe(6);
      expect(nails!.unit).toBe("кг");
    });

    it("totals содержат wallArea, studs, outerSheets", () => {
      expect(result.totals.wallArea).toBeCloseTo(71, 5);
      expect(result.totals.studs).toBe(51);
      expect(result.totals.outerSheets).toBe(25);
      expect(result.totals.innerSheets).toBe(25);
    });

    it("инварианты", () => {
      checkInvariants(result);
    });
  });

  describe("Шаг 400 → больше стоек + предупреждение", () => {
    // studs = ceil(30/0.4) + 1 = 76
    // studTotalMeters = 76 * 2.7 * 1.05 = 215.46 → studBoards6m = ceil(215.46/6) = 36
    const result = calc({
      wallLength: 30,
      wallHeight: 2.7,
      openingsArea: 10,
      studStep: 400,
      insulationType: 0,
      outerSheathing: 0,
      innerSheathing: 0,
    });

    it("стоек больше — 36 досок 6 м", () => {
      const studs = findMaterial(result, "Стойки");
      expect(studs?.purchaseQty).toBe(36);
    });

    it("предупреждение об усиленном каркасе", () => {
      expect(result.warnings.some((w) => w.includes("400 мм"))).toBe(true);
    });

    it("количество стоек в totals = 76", () => {
      expect(result.totals.studs).toBe(76);
    });

    it("инварианты", () => {
      checkInvariants(result);
    });
  });

  describe("ГКЛ внутренняя обшивка", () => {
    // wallArea = 71
    // innerSheetArea = 3.0 (ГКЛ 1200×2500)
    // innerSheets = ceil(71/3.0 * 1.08) = ceil(25.56) = 26
    const result = calc({
      wallLength: 30,
      wallHeight: 2.7,
      openingsArea: 10,
      studStep: 600,
      insulationType: 0,
      outerSheathing: 0,
      innerSheathing: 1,
    });

    it("внутренняя обшивка ГКЛ = 26 листов", () => {
      const inner = findMaterial(result, "Внутренняя обшивка");
      expect(inner?.purchaseQty).toBe(26);
      expect(inner!.name).toContain("ГКЛ 12.5 мм");
    });

    it("единица измерения — листов", () => {
      const inner = findMaterial(result, "Внутренняя обшивка");
      expect(inner!.unit).toBe("листов");
    });

    it("инварианты", () => {
      checkInvariants(result);
    });
  });

  describe("ППС утеплитель + высота > 3 м → предупреждение", () => {
    const result = calc({
      wallLength: 30,
      wallHeight: 3.2,
      openingsArea: 10,
      studStep: 600,
      insulationType: 2,
      outerSheathing: 0,
      innerSheathing: 0,
    });

    it("утеплитель ППС присутствует", () => {
      const insul = findMaterial(result, "ППС");
      expect(insul).toBeDefined();
      expect(insul!.name).toContain("150");
    });

    it("предупреждение о вентиляции", () => {
      expect(result.warnings.some((w) => w.includes("ППС") && w.includes("вентиляция"))).toBe(true);
    });
  });

  describe("Вагонка как внутренняя обшивка", () => {
    // wallArea = 71
    // innerSheets = ceil(71 * 1.10) = ceil(78.1) = 79 м²
    const result = calc({
      wallLength: 30,
      wallHeight: 2.7,
      openingsArea: 10,
      studStep: 600,
      insulationType: 0,
      outerSheathing: 0,
      innerSheathing: 2,
    });

    it("вагонка считается в м²", () => {
      const inner = findMaterial(result, "Вагонка");
      expect(inner?.unit).toBe("м²");
      expect(inner?.purchaseQty).toBe(79);
    });
  });

  describe("ЦСП наружная обшивка", () => {
    // wallArea = 71
    // ЦСП: sheetArea = 3.84
    // outerSheets = ceil(71/3.84 * 1.08) = ceil(18.489 * 1.08) = ceil(19.968) = 20
    const result = calc({
      wallLength: 30,
      wallHeight: 2.7,
      openingsArea: 10,
      studStep: 600,
      insulationType: 0,
      outerSheathing: 2,
      innerSheathing: 0,
    });

    it("ЦСП = 20 листов", () => {
      const outer = findMaterial(result, "Наружная обшивка");
      expect(outer?.purchaseQty).toBe(20);
      expect(outer!.name).toContain("ЦСП 12 мм");
    });
  });
});
