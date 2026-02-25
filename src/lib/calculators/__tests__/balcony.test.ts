import { describe, it, expect } from "vitest";
import { balconyDef } from "../formulas/balcony";
import { findMaterial, checkInvariants } from "./_helpers";

const calc = balconyDef.calculate.bind(balconyDef);

describe("Калькулятор отделки балкона", () => {
  describe("Стандарт: 3×1.2 м, высота 2.5 м, вагонка, пенополистирол", () => {
    // floorArea = 3 * 1.2 = 3.6
    // frontWallArea = 3 * 2.5 = 7.5
    // sideWallsArea = 2 * 1.2 * 2.5 = 6
    // backWallArea = 3 * 2.5 = 7.5
    // ceilingArea = 3 * 1.2 = 3.6
    // wallArea = 7.5 + 6 + 7.5 = 21
    // totalFinishArea = 21 + 3.6 = 24.6
    const result = calc({
      length: 3.0,
      width: 1.2,
      height: 2.5,
      finishType: 0,
      insulationType: 1,
    });

    it("totals.floorArea = 3.6", () => {
      expect(result.totals.floorArea).toBeCloseTo(3.6, 2);
    });

    it("totals.wallArea = 21", () => {
      expect(result.totals.wallArea).toBeCloseTo(21, 2);
    });

    it("totals.totalFinishArea = 24.6", () => {
      expect(result.totals.totalFinishArea).toBeCloseTo(24.6, 2);
    });

    it("пенополистирол: plates = ceil(24.6 * 1.05 / 0.72) = ceil(35.875) = 36", () => {
      const ps = findMaterial(result, "Пенополистирол");
      expect(ps).toBeDefined();
      expect(ps?.purchaseQty).toBe(Math.ceil(24.6 * 1.05 / 0.72));
    });

    it("дюбель-грибок: count = ceil(36 * 4 * 1.05) = ceil(151.2) = 152", () => {
      const ps = findMaterial(result, "Пенополистирол");
      const psPlates = ps!.purchaseQty;
      const kreps = findMaterial(result, "Дюбель-грибок");
      expect(kreps).toBeDefined();
      expect(kreps?.purchaseQty).toBe(Math.ceil(psPlates * 4 * 1.05));
    });

    it("вагонка деревянная присутствует", () => {
      const panel = findMaterial(result, "Вагонка деревянная");
      expect(panel).toBeDefined();
      // panelArea = (96/1000) * 3 = 0.288
      // panelCount = ceil(24.6 * 1.1 / 0.288) = ceil(93.96) = 94
      expect(panel?.purchaseQty).toBe(Math.ceil(24.6 * 1.1 / 0.288));
    });

    it("обрешётка присутствует", () => {
      expect(findMaterial(result, "Брусок обрешётки")).toBeDefined();
    });

    it("кляймер для вагонки присутствует", () => {
      expect(findMaterial(result, "Кляймер для вагонки")).toBeDefined();
    });

    it("линолеум или ламинат (пол) присутствует", () => {
      const floor = findMaterial(result, "Линолеум");
      expect(floor).toBeDefined();
      expect(floor?.quantity).toBeCloseTo(3.6, 2);
    });

    it("подоконник присутствует", () => {
      expect(findMaterial(result, "Подоконник")).toBeDefined();
    });

    it("монтажная пена присутствует", () => {
      // foamCans = ceil((3+1.2)*2*0.3) = ceil(2.52) = 3
      const foam = findMaterial(result, "Монтажная пена");
      expect(foam?.purchaseQty).toBe(3);
    });

    it("герметик силиконовый присутствует", () => {
      // sealantTubes = ceil((3+1.2)*2/6) = ceil(1.4) = 2
      const sealant = findMaterial(result, "Герметик силиконовый");
      expect(sealant?.purchaseQty).toBe(2);
    });

    it("инварианты", () => {
      checkInvariants(result);
    });
  });

  describe("Панели ПВХ + пенофол (finishType=1, insulationType=2)", () => {
    const result = calc({
      length: 3.0,
      width: 1.2,
      height: 2.5,
      finishType: 1,
      insulationType: 2,
    });

    it("панель ПВХ присутствует", () => {
      expect(findMaterial(result, "Панель ПВХ")).toBeDefined();
    });

    it("кляймер ПВХ (не для вагонки)", () => {
      expect(findMaterial(result, "Кляймер ПВХ")).toBeDefined();
    });

    it("пенофол присутствует (insulationType >= 2)", () => {
      expect(findMaterial(result, "Пенофол")).toBeDefined();
    });

    it("лента фольгированная присутствует", () => {
      expect(findMaterial(result, "Лента фольгированная")).toBeDefined();
    });

    it("нет пенополистирола (insulationType = 2 — только пенофол)", () => {
      expect(findMaterial(result, "Пенополистирол")).toBeUndefined();
    });

    it("инварианты", () => {
      checkInvariants(result);
    });
  });

  describe("ЭППС + пенофол (insulationType = 3)", () => {
    const result = calc({
      length: 3.0,
      width: 1.2,
      height: 2.5,
      finishType: 0,
      insulationType: 3,
    });

    it("пенополистирол присутствует (insulationType 1 or 3)", () => {
      expect(findMaterial(result, "Пенополистирол")).toBeDefined();
    });

    it("пенофол присутствует (insulationType >= 2)", () => {
      expect(findMaterial(result, "Пенофол")).toBeDefined();
    });

    it("дюбель-грибок присутствует", () => {
      expect(findMaterial(result, "Дюбель-грибок")).toBeDefined();
    });

    it("лента фольгированная присутствует", () => {
      expect(findMaterial(result, "Лента фольгированная")).toBeDefined();
    });
  });

  describe("Без утепления (insulationType = 0)", () => {
    const result = calc({
      length: 3.0,
      width: 1.2,
      height: 2.5,
      finishType: 0,
      insulationType: 0,
    });

    it("нет пенополистирола", () => {
      expect(findMaterial(result, "Пенополистирол")).toBeUndefined();
    });

    it("нет пенофола", () => {
      expect(findMaterial(result, "Пенофол")).toBeUndefined();
    });

    it("предупреждение о холодном балконе", () => {
      expect(result.warnings.some((w) => w.includes("Без утепления"))).toBe(true);
    });

    it("инварианты", () => {
      checkInvariants(result);
    });
  });

  describe("Имитация бруса (finishType = 2)", () => {
    const result = calc({
      length: 3.0,
      width: 1.2,
      height: 2.5,
      finishType: 2,
      insulationType: 1,
    });

    it("имитация бруса присутствует", () => {
      expect(findMaterial(result, "Имитация бруса")).toBeDefined();
    });

    it("предупреждение о деревянной вагонке (finishType 0 или 2)", () => {
      expect(result.warnings.some((w) => w.includes("антисептиком"))).toBe(true);
    });
  });

  describe("МДФ панели (finishType = 3)", () => {
    const result = calc({
      length: 3.0,
      width: 1.2,
      height: 2.5,
      finishType: 3,
      insulationType: 1,
    });

    it("панель МДФ присутствует", () => {
      expect(findMaterial(result, "Панель МДФ")).toBeDefined();
    });

    it("МДФ: panelArea = (240/1000)*2.7 = 0.648, count = ceil(24.6*1.1/0.648) = ceil(41.76) = 42", () => {
      const totalFinishArea = 24.6;
      const panelArea = (240 / 1000) * 2.7;
      const expected = Math.ceil(totalFinishArea * 1.1 / panelArea);
      const mdf = findMaterial(result, "Панель МДФ");
      expect(mdf?.purchaseQty).toBe(expected);
    });

    it("инварианты", () => {
      checkInvariants(result);
    });
  });

  describe("Угловые планки", () => {
    it("уголок/стартовая планка рассчитаны", () => {
      const result = calc({ length: 3.0, width: 1.2, height: 2.5, finishType: 0, insulationType: 1 });
      const corner = findMaterial(result, "Уголок/стартовая планка");
      expect(corner).toBeDefined();
      // cornerTrimLength = (4*2.5 + (3+1.2)*2)*1.1 = (10 + 8.4)*1.1 = 20.24
      // pcs = ceil(20.24/3) = 7
      const cornerTrimLength = (4 * 2.5 + (3.0 + 1.2) * 2) * 1.1;
      expect(corner?.purchaseQty).toBe(Math.ceil(cornerTrimLength / 3));
    });
  });
});
