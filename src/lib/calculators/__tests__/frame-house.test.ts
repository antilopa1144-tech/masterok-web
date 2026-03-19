import { describe, it, expect } from "vitest";
import { frameHouseDef } from "../formulas/frame-house";
import { findMaterial, checkInvariants, withBasicAccuracy } from "./_helpers";

const calc = withBasicAccuracy(frameHouseDef.calculate.bind(frameHouseDef));

describe("Калькулятор каркасного дома", () => {
  describe("Периметр 30 м, h=2.7, проёмы 10 м², шаг 600, минвата 150, OSB/OSB", () => {
    // wallArea = 30 * 2.7 - 10 = 71 м²
    // studs = ceil(30/0.6) + 1 = 51
    // studMeters = 51 * 2.7 * 1.05 = 144.585 → studBoards = ceil(144.585/6) = 25
    // strappingM = 30 * 2 * 1.05 = 63 → strappingBoards = ceil(63/6) = 11
    // outerSheets = ceil(71/3.125 * 1.08) = ceil(24.5376) = 25
    // innerSheets = ceil(71*1.10/3.125) = ceil(24.992) = 25
    // insul: layers=3, platesPerLayer=ceil(71/0.72*1.05)=104, total=312, packs=ceil(312/8)=39
    // vaporRolls: ceil(71*1.15/75) = ceil(1.0887) = 2
    // windRolls: ceil(71*1.15/75) = 2
    // tapeRolls: (2+2)*2 = 8
    const result = calc({
      wallLength: 30,
      wallHeight: 2.7,
      openingsArea: 10,
      studStep: 600,
      insulationType: 0,
      outerSheathing: 0,
      innerSheathing: 0,
    });

    it("стойки каркаса = 25 досок × 6 м = 150 п.м.", () => {
      // Engine: "Стойки каркаса (шаг 600 мм)" — purchaseQty = boards * boardLength
      const studs = findMaterial(result, "Стойки каркаса");
      expect(studs?.purchaseQty).toBe(150);
    });

    it("обвязка = 11 досок × 6 м = 66 м", () => {
      // Engine: "Обвязка (доски 6 м)" — purchaseQty = boards * boardLength
      const strapping = findMaterial(result, "Обвязка");
      expect(strapping?.purchaseQty).toBe(66);
    });

    it("наружная обшивка ОСП-9 мм = 25 листов", () => {
      // Engine: "Наружная обшивка — ОСП-9 мм"
      const outer = findMaterial(result, "Наружная обшивка");
      expect(outer?.purchaseQty).toBe(25);
      expect(outer!.name).toContain("ОСП-9 мм");
    });

    it("внутренняя обшивка ОСП-9 мм = 25 листов", () => {
      // Engine: "Внутренняя обшивка — ОСП-9 мм"
      const inner = findMaterial(result, "Внутренняя обшивка");
      expect(inner?.purchaseQty).toBe(25);
      expect(inner!.name).toContain("ОСП-9 мм");
    });

    it("утеплитель минвата = 39 упаковок", () => {
      // Engine: "Утеплитель (упаковки по 8 шт)"
      const insul = findMaterial(result, "Утеплитель (упаковки");
      expect(insul?.purchaseQty).toBe(39);
    });

    it("пароизоляция = 2 рулона", () => {
      // Engine: "Пароизоляция (рулон 75 м²)"
      const vapor = findMaterial(result, "Пароизоляция");
      expect(vapor?.purchaseQty).toBe(2);
    });

    it("ветрозащита = 2 рулона", () => {
      // Engine: "Ветрозащита (рулон 75 м²)"
      const wind = findMaterial(result, "Ветрозащита");
      expect(wind?.purchaseQty).toBe(2);
    });

    it("скотч для мембран = 8 рулонов", () => {
      // Engine: "Скотч для мембран"
      const tape = findMaterial(result, "Скотч для мембран");
      expect(tape?.purchaseQty).toBe(8);
    });

    it("саморезы в кг", () => {
      // Engine: "Саморезы"
      const screws = findMaterial(result, "Саморезы");
      expect(screws).toBeDefined();
      expect(screws!.unit).toBe("кг");
    });

    it("гвозди в кг", () => {
      // Engine: "Гвозди"
      const nails = findMaterial(result, "Гвозди");
      expect(nails).toBeDefined();
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

  describe("Шаг 400 → больше стоек", () => {
    // studs = ceil(30/0.4) + 1 = 76
    // studMeters = 76 * 2.7 * 1.05 = 215.46 → studBoards = ceil(215.46/6) = 36
    const result = calc({
      wallLength: 30,
      wallHeight: 2.7,
      openingsArea: 10,
      studStep: 400,
      insulationType: 0,
      outerSheathing: 0,
      innerSheathing: 0,
    });

    it("стоек больше — 36 досок × 6 м = 216 п.м.", () => {
      const studs = findMaterial(result, "Стойки каркаса");
      expect(studs?.purchaseQty).toBe(216);
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
    // innerSheetArea = 3.0 (ГКЛ)
    // innerSheets = ceil(71*1.10/3.0) = ceil(26.03) = 27
    const result = calc({
      wallLength: 30,
      wallHeight: 2.7,
      openingsArea: 10,
      studStep: 600,
      insulationType: 0,
      outerSheathing: 0,
      innerSheathing: 1,
    });

    it("внутренняя обшивка ГКЛ", () => {
      // Engine: "Внутренняя обшивка — ГКЛ"
      const inner = findMaterial(result, "Внутренняя обшивка");
      expect(inner).toBeDefined();
      expect(inner!.name).toContain("ГКЛ");
    });

    it("единица измерения — листов", () => {
      const inner = findMaterial(result, "Внутренняя обшивка");
      expect(inner!.unit).toBe("листов");
    });

    it("инварианты", () => {
      checkInvariants(result);
    });
  });

  describe("Предупреждения", () => {
    it("wallArea > 200 → предупреждение", () => {
      // Engine: "Большая площадь стен — рассмотрите усиление каркаса"
      const result = calc({
        wallLength: 100,
        wallHeight: 4,
        openingsArea: 10,
        studStep: 600,
        insulationType: 0,
        outerSheathing: 0,
        innerSheathing: 0,
      });
      expect(result.warnings.some((w) => w.includes("Большая площадь стен"))).toBe(true);
    });

    it("ПСБ + высота > 3 → предупреждение", () => {
      // Engine: "Для высоких стен рекомендуется минеральная вата вместо ПСБ"
      const result = calc({
        wallLength: 30,
        wallHeight: 3.2,
        openingsArea: 10,
        studStep: 600,
        insulationType: 2,
        outerSheathing: 0,
        innerSheathing: 0,
      });
      expect(result.warnings.some((w) => w.includes("минеральная вата"))).toBe(true);
    });
  });

  describe("Вагонка как внутренняя обшивка", () => {
    // innerSheathing=2 → Вагонка, innerSheetArea=1.0 м²
    // innerSheets = ceil(71 * 1.10 / 1.0) = ceil(78.1) = 79
    const result = calc({
      wallLength: 30,
      wallHeight: 2.7,
      openingsArea: 10,
      studStep: 600,
      insulationType: 0,
      outerSheathing: 0,
      innerSheathing: 2,
    });

    it("вагонка единица — шт", () => {
      // Engine: unit = innerSheathing === 2 ? "шт" : "листов"
      const inner = findMaterial(result, "Внутренняя обшивка");
      expect(inner?.unit).toBe("шт");
      expect(inner?.purchaseQty).toBe(79);
    });
  });

  describe("ЦСП наружная обшивка", () => {
    // wallArea = 71
    // ЦСП: sheetArea = 3.84
    // outerSheets = ceil(71/3.84 * 1.08) = ceil(19.968) = 20
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
      // Engine: "Наружная обшивка — ЦСП-12 мм"
      const outer = findMaterial(result, "Наружная обшивка");
      expect(outer?.purchaseQty).toBe(20);
      expect(outer!.name).toContain("ЦСП-12 мм");
    });
  });
});
