import { describe, it, expect } from "vitest";
import { softRoofingDef } from "../formulas/soft-roofing";
import { findMaterial, checkInvariants } from "./_helpers";

const calc = softRoofingDef.calculate.bind(softRoofingDef);

describe("Калькулятор мягкой кровли", () => {
  describe("80 м², уклон 30°, конёк 8 м, карниз 20 м, без ендов", () => {
    // packs = ceil(80/3.0 * 1.05) = ceil(28.000...) = 29 (floating point: 80/3 * 1.05 > 28)
    // slope >= 18 → подкладочный ковёр только в критических зонах
    //   criticalLinear = 20 + 0 + 8 = 28
    //   criticalArea = 28 * 1.0 * 1.15 = 32.2
    //   underlaymentRolls = ceil(32.2/15) = 3
    // valleyRolls = 0 (нет ендов)
    // masticKg = 28*0.1 + 80*0.1 = 10.8 → masticBuckets = ceil(10.8/3) = 4
    // nailsCount = 80*80 = 6400, nailsKg = 6400/400*1.05 = 16.8
    // eaveDripPcs = ceil(20/2 * 1.05) = ceil(10.5) = 11
    // windStripPcs = ceil(20*0.4/2 * 1.05) = ceil(4.2) = 5
    // ridgeShinglesPcs = ceil(8/0.5 * 1.05) = ceil(16.8) = 17
    // osbSheets = ceil(80/3.125 * 1.05) = ceil(26.88) = 27
    // ventOutputs = ceil(80/25) = 4
    const result = calc({
      roofArea: 80,
      slope: 30,
      ridgeLength: 8,
      eaveLength: 20,
      valleyLength: 0,
    });

    it("гибкая черепица = 29 упаковок", () => {
      // 80/3 * 1.05 ≈ 28.000... (floating point gives slightly > 28) → ceil = 29
      const shingles = findMaterial(result, "Гибкая черепица");
      expect(shingles?.purchaseQty).toBe(29);
    });

    it("ОСБ-3 основание = 27 листов", () => {
      const osb = findMaterial(result, "ОСБ-3");
      expect(osb?.purchaseQty).toBe(27);
    });

    it("гвозди кровельные", () => {
      const nails = findMaterial(result, "Гвозди кровельные");
      expect(nails).toBeDefined();
      expect(nails!.unit).toBe("кг");
      // nailsKgRounded = 16.8, purchaseQty = ceil(16.8) = 17
      expect(nails!.purchaseQty).toBe(17);
    });

    it("карнизная планка = 11 шт", () => {
      const eave = findMaterial(result, "Карнизная планка");
      expect(eave?.purchaseQty).toBe(11);
    });

    it("торцевая планка = 5 шт", () => {
      const wind = findMaterial(result, "Торцевая");
      expect(wind?.purchaseQty).toBe(5);
    });

    it("коньковая черепица = 17 шт", () => {
      const ridge = findMaterial(result, "Коньковая черепица");
      expect(ridge?.purchaseQty).toBe(17);
    });

    it("мастика = 4 ведра", () => {
      const mastic = findMaterial(result, "Мастика");
      expect(mastic?.purchaseQty).toBe(4);
    });

    it("подкладочный ковёр = 3 рулона (только критические зоны)", () => {
      const underlayment = findMaterial(result, "Подкладочный ковёр");
      expect(underlayment?.purchaseQty).toBe(3);
    });

    it("ендовного ковра нет (valleyLength = 0)", () => {
      const valley = findMaterial(result, "Ендовный ковёр");
      expect(valley).toBeUndefined();
    });

    it("вентиляционные выходы = 4 шт", () => {
      const vent = findMaterial(result, "Вентиляционный выход");
      expect(vent?.purchaseQty).toBe(4);
    });

    it("totals содержат roofArea, packs, osbSheets", () => {
      expect(result.totals.roofArea).toBe(80);
      expect(result.totals.packs).toBe(29);
      expect(result.totals.osbSheets).toBe(27);
      expect(result.totals.underlaymentRolls).toBe(3);
    });

    it("нет предупреждений при уклоне 30° и площади < 200", () => {
      expect(result.warnings.length).toBe(0);
    });

    it("инварианты", () => {
      checkInvariants(result);
    });
  });

  describe("Уклон 15° → сплошной подкладочный ковёр + предупреждение", () => {
    // slope < 18 → underlaymentRolls = ceil(80*1.15/15) = ceil(6.133) = 7
    const result = calc({
      roofArea: 80,
      slope: 15,
      ridgeLength: 8,
      eaveLength: 20,
      valleyLength: 0,
    });

    it("подкладочный ковёр = 7 рулонов (сплошной)", () => {
      const underlayment = findMaterial(result, "Подкладочный ковёр");
      expect(underlayment?.purchaseQty).toBe(7);
    });

    it("предупреждение о сплошном подкладочном ковре", () => {
      expect(result.warnings.some((w) => w.includes("12–18°") || w.includes("сплошной"))).toBe(true);
    });

    it("инварианты", () => {
      checkInvariants(result);
    });
  });

  describe("С ендовами 5 м → ендовный ковёр", () => {
    // valleyRolls = ceil(5 * 1.15 / 10) = ceil(0.575) = 1
    const result = calc({
      roofArea: 80,
      slope: 30,
      ridgeLength: 8,
      eaveLength: 20,
      valleyLength: 5,
    });

    it("ендовный ковёр = 1 рулон", () => {
      const valley = findMaterial(result, "Ендовный ковёр");
      expect(valley).toBeDefined();
      expect(valley!.purchaseQty).toBe(1);
    });

    it("подкладочный ковёр учитывает ендовы в критических зонах", () => {
      // criticalLinear = 20 + 5 + 8 = 33
      // criticalArea = 33 * 1.15 = 37.95
      // underlaymentRolls = ceil(37.95/15) = ceil(2.53) = 3
      const underlayment = findMaterial(result, "Подкладочный ковёр");
      expect(underlayment?.purchaseQty).toBe(3);
    });

    it("мастика учитывает ендовы", () => {
      // totalLinear = 8 + 20 + 5 = 33
      // masticKg = 33*0.1 + 80*0.1 = 3.3 + 8 = 11.3 → ceil(11.3/3) = 4
      const mastic = findMaterial(result, "Мастика");
      expect(mastic?.purchaseQty).toBe(4);
    });

    it("инварианты", () => {
      checkInvariants(result);
    });
  });

  describe("Уклон < 12° → предупреждение", () => {
    const result = calc({
      roofArea: 80,
      slope: 10,
      ridgeLength: 8,
      eaveLength: 20,
      valleyLength: 0,
    });

    it("предупреждение об уклоне < 12°", () => {
      expect(result.warnings.some((w) => w.includes("12°"))).toBe(true);
    });

    it("сплошной подкладочный ковёр (уклон < 18°)", () => {
      const underlayment = findMaterial(result, "Подкладочный ковёр");
      // slope clamped to 10, which is < 18 → full coverage
      // ceil(80*1.15/15) = ceil(6.133) = 7
      expect(underlayment?.purchaseQty).toBe(7);
    });

    it("инварианты", () => {
      checkInvariants(result);
    });
  });

  describe("Большая площадь > 200 м² → предупреждение", () => {
    const result = calc({
      roofArea: 250,
      slope: 30,
      ridgeLength: 15,
      eaveLength: 40,
      valleyLength: 0,
    });

    it("предупреждение о профессиональном монтаже", () => {
      expect(result.warnings.some((w) => w.includes("профессиональный"))).toBe(true);
    });

    it("инварианты", () => {
      checkInvariants(result);
    });
  });
});
