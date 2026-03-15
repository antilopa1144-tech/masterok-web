import { describe, it, expect } from "vitest";
import { softRoofingDef } from "../formulas/soft-roofing";
import { findMaterial, checkInvariants } from "./_helpers";

const calc = softRoofingDef.calculate.bind(softRoofingDef);

describe("Калькулятор мягкой кровли", () => {
  describe("80 м², уклон 30°, конёк 8 м, карниз 20 м, без ендов", () => {
    // packs = ceil(80/3.0 * 1.05) = ceil(28.000...) = 29 (floating point: 80/3 * 1.05 > 28)
    // slope >= 18 → подкладочный ковёр только в критических зонах
    //   criticalArea = (20 + 0 + 8) * 1.0 * 1.15 = 32.2
    //   underlaymentRolls = ceil(32.2/15) = 3
    // valleyRolls = 0 (нет ендов)
    // masticKg = (8+20+0)*0.1 + 80*0.1 = 2.8 + 8 = 10.8 → masticBuckets = ceil(10.8/3) = 4
    // nailsKg = ceil(80*80/400*1.05) = ceil(16.8) = 17
    // eaveStrips = ceil(20/2 * 1.05) = ceil(10.5) = 11
    // windStrips = ceil(20*0.4/2 * 1.05) = ceil(4.2) = 5
    // ridgeShingles = ceil(8/0.5 * 1.05) = ceil(16.8) = 17
    // osbSheets = ceil(80/3.125 * 1.05) = ceil(26.88) = 27
    // ventOutputs = ceil(80/25) = 4
    const result = calc({
      roofArea: 80,
      slope: 30,
      ridgeLength: 8,
      eaveLength: 20,
      valleyLength: 0,
    });

    it("гибкая черепица = 29 упаковок (packs)", () => {
      // Engine: "Гибкая черепица (3 м²/уп)" — quantity is recScenario.exact_need
      // totals.packs = 29 (base before scenario)
      expect(result.totals.packs).toBe(29);
    });

    it("гибкая черепица purchaseQty = ceil(recExactNeed)", () => {
      const shingles = findMaterial(result, "Гибкая черепица");
      expect(shingles).toBeDefined();
      // purchaseQty = ceil(recScenario.exact_need) which includes ~1.06 factor
      expect(shingles!.purchaseQty).toBeGreaterThanOrEqual(29);
    });

    it("ОСП основание = 27 листов", () => {
      // Engine: "ОСП (3.125 м²)"
      const osb = findMaterial(result, "ОСП");
      expect(osb?.purchaseQty).toBe(27);
    });

    it("гвозди кровельные", () => {
      // Engine: "Гвозди кровельные"
      const nails = findMaterial(result, "Гвозди кровельные");
      expect(nails).toBeDefined();
      expect(nails!.unit).toBe("кг");
      expect(nails!.purchaseQty).toBe(17);
    });

    it("карнизные планки = 11 шт", () => {
      // Engine: "Карнизные планки (2 м)"
      const eave = findMaterial(result, "Карнизные планки");
      expect(eave?.purchaseQty).toBe(11);
    });

    it("ветровые планки = 5 шт", () => {
      // Engine: "Ветровые планки (2 м)"
      const wind = findMaterial(result, "Ветровые планки");
      expect(wind?.purchaseQty).toBe(5);
    });

    it("коньково-карнизная черепица = 17 шт", () => {
      // Engine: "Коньково-карнизная черепица"
      const ridge = findMaterial(result, "Коньково-карнизная черепица");
      expect(ridge?.purchaseQty).toBe(17);
    });

    it("мастика = 4 ведра", () => {
      // Engine: "Мастика (ведро 3 кг)"
      const mastic = findMaterial(result, "Мастика");
      expect(mastic?.purchaseQty).toBe(4);
    });

    it("подкладочный ковёр = 3 рулона (только критические зоны)", () => {
      // Engine: "Подкладочный ковёр (15 м²)"
      const underlayment = findMaterial(result, "Подкладочный ковёр");
      expect(underlayment?.purchaseQty).toBe(3);
    });

    it("ендовного ковра нет (valleyLength = 0)", () => {
      const valley = findMaterial(result, "Ендовный ковёр");
      expect(valley).toBeUndefined();
    });

    it("вентиляционные выходы = 4 шт", () => {
      // Engine: "Вентиляционные выходы"
      const vent = findMaterial(result, "Вентиляционные выходы");
      expect(vent?.purchaseQty).toBe(4);
    });

    it("totals содержат roofArea, packs, osbSheets", () => {
      expect(result.totals.roofArea).toBe(80);
      expect(result.totals.packs).toBe(29);
      expect(result.totals.osbSheets).toBe(27);
      expect(result.totals.underlaymentRolls).toBe(3);
    });

    it("нет предупреждений при уклоне 30° и без ендов", () => {
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
      // Engine: "Уклон менее 18° — подкладочный ковёр укладывается по всей площади"
      expect(result.warnings.some((w) => w.includes("18°") || w.includes("подкладочный ковёр"))).toBe(true);
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
      // Engine: "Ендовный ковёр (10 м)"
      const valley = findMaterial(result, "Ендовный ковёр");
      expect(valley).toBeDefined();
      expect(valley!.purchaseQty).toBe(1);
    });

    it("подкладочный ковёр учитывает ендовы в критических зонах", () => {
      // criticalArea = (20 + 5 + 8) * 1.0 * 1.15 = 37.95
      // underlaymentRolls = ceil(37.95/15) = ceil(2.53) = 3
      const underlayment = findMaterial(result, "Подкладочный ковёр");
      expect(underlayment?.purchaseQty).toBe(3);
    });

    it("мастика учитывает ендовы", () => {
      // masticKg = (8 + 20 + 5)*0.1 + 80*0.1 = 3.3 + 8 = 11.3 → ceil(11.3/3) = 4
      const mastic = findMaterial(result, "Мастика");
      expect(mastic?.purchaseQty).toBe(4);
    });

    it("предупреждение об ендовах", () => {
      // Engine: "Ендовы — наиболее уязвимые места, рекомендуется усиленная гидроизоляция"
      expect(result.warnings.some((w) => w.includes("Ендовы"))).toBe(true);
    });

    it("инварианты", () => {
      checkInvariants(result);
    });
  });

  describe("Уклон < 18° → предупреждение", () => {
    const result = calc({
      roofArea: 80,
      slope: 15,
      ridgeLength: 8,
      eaveLength: 20,
      valleyLength: 0,
    });

    it("предупреждение об уклоне < 18°", () => {
      expect(result.warnings.some((w) => w.includes("18°"))).toBe(true);
    });

    it("сплошной подкладочный ковёр (уклон < 18°)", () => {
      const underlayment = findMaterial(result, "Подкладочный ковёр");
      // ceil(80*1.15/15) = ceil(6.133) = 7
      expect(underlayment?.purchaseQty).toBe(7);
    });

    it("инварианты", () => {
      checkInvariants(result);
    });
  });
});
