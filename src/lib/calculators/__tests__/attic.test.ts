import { describe, it, expect } from "vitest";
import { atticDef } from "../formulas/attic";
import { findMaterial, checkInvariants } from "./_helpers";

const calc = atticDef.calculate.bind(atticDef);

describe("Калькулятор мансарды", () => {
  describe("Стандарт: 60 м², 200 мм, минвата плиты, вагонка, стандартная пароизоляция", () => {
    // plateThickness = 100 (минвата плиты), layerCount = ceil(200/100) = 2
    const result = calc({
      roofArea: 60,
      insulationThickness: 200,
      insulationType: 0,
      finishType: 0,
      withVapourBarrier: 1,
    });

    it("totals.roofArea = 60", () => {
      expect(result.totals.roofArea).toBe(60);
    });

    it("totals.layerCount = 2", () => {
      expect(result.totals.layerCount).toBe(2);
    });

    it("ветрозащитная мембрана: rolls = ceil(60*1.15/70) = 1", () => {
      // Engine: "Ветрозащитная мембрана (70 м²)"
      const membrane = findMaterial(result, "Ветрозащитная мембрана");
      expect(membrane).toBeDefined();
      expect(membrane?.purchaseQty).toBe(1);
    });

    it("минвата плиты (200 мм, 2 сл.) purchaseQty = ceil(recExactNeed)", () => {
      // Engine: "Минвата плиты (200 мм, 2 сл.)"
      // insPlates = ceil(60*1.05/0.6)*2 = 210, then REC scenario multiplier ~1.06
      // purchaseQty = ceil(recScenario.exact_need)
      const insulation = findMaterial(result, "Минвата плиты");
      expect(insulation).toBeDefined();
      // 210 * ~1.06 ≈ 222.6 → ceil = 223
      expect(insulation?.purchaseQty).toBeGreaterThanOrEqual(210);
      expect(insulation?.purchaseQty).toBeLessThanOrEqual(230);
    });

    it("пароизоляция Стандартная: rolls = ceil(60*1.15/70) = 1", () => {
      // Engine: "Пароизоляция Стандартная (70 м²)"
      const vb = findMaterial(result, "Пароизоляция Стандартная");
      expect(vb).toBeDefined();
      expect(vb?.purchaseQty).toBe(1);
    });

    it("скотч соединительный: rolls = ceil(60/40) = 2", () => {
      // Engine: "Скотч соединительный (25 м)"
      const tape = findMaterial(result, "Скотч соединительный");
      expect(tape).toBeDefined();
      expect(tape?.purchaseQty).toBe(2);
    });

    it("вагонка деревянная присутствует", () => {
      // Engine: "Вагонка деревянная"
      const panel = findMaterial(result, "Вагонка деревянная");
      expect(panel).toBeDefined();
      // panels = ceil(60*1.12/0.288) = ceil(233.33) = 234
      expect(panel?.purchaseQty).toBe(Math.ceil(60 * 1.12 / 0.288));
    });

    it("обрешётка (рейки) присутствует", () => {
      // Engine: "Обрешётка (рейки)"
      const lathen = findMaterial(result, "Обрешётка (рейки)");
      expect(lathen).toBeDefined();
      // battenPcs = ceil(60/0.4) = 150
      expect(lathen?.purchaseQty).toBe(150);
    });

    it("антисептик (5 л) присутствует", () => {
      // Engine: "Антисептик (5 л)"
      const anti = findMaterial(result, "Антисептик");
      expect(anti).toBeDefined();
      // antisepticCans = ceil(60 * 0.15 * 1.1 / 5) = ceil(1.98) = 2
      expect(anti?.purchaseQty).toBe(2);
    });

    it("инварианты", () => {
      checkInvariants(result);
    });
  });

  describe("Минвата рулоны, insulationThickness 150 мм", () => {
    // plateThickness = 150 (рулоны), layerCount = ceil(150/150) = 1
    const result = calc({
      roofArea: 60,
      insulationThickness: 150,
      insulationType: 1,
      finishType: 0,
      withVapourBarrier: 1,
    });

    it("layerCount = 1 (150/150)", () => {
      expect(result.totals.layerCount).toBe(1);
    });

    it("минвата рулоны: purchaseQty = ceil(recExactNeed)", () => {
      // Engine: "Минвата рулоны (150 мм, 1 сл.)"
      // insPlates = 105, then REC scenario multiplier ~1.06 → ceil(105*1.06) ≈ 112
      const insulation = findMaterial(result, "Минвата рулоны");
      expect(insulation).toBeDefined();
      expect(insulation?.purchaseQty).toBeGreaterThanOrEqual(105);
      expect(insulation?.purchaseQty).toBeLessThanOrEqual(115);
    });

    it("предупреждение о толщине < 200 мм", () => {
      // Engine: "Толщина утеплителя менее 200 мм — рекомендуется увеличить для средней полосы России"
      expect(result.warnings.some((w) => w.includes("менее 200 мм"))).toBe(true);
    });
  });

  describe("ЭППС, толщина 250 мм", () => {
    // plateThickness = 100, layerCount = ceil(250/100) = 3
    const result = calc({
      roofArea: 60,
      insulationThickness: 250,
      insulationType: 2,
      finishType: 0,
      withVapourBarrier: 1,
    });

    it("layerCount = 3 (250/100)", () => {
      expect(result.totals.layerCount).toBe(3);
    });

    it("ЭППС: purchaseQty = ceil(recExactNeed)", () => {
      // Engine: "ЭППС (250 мм, 3 сл.)"
      // insPlates = ceil(60*1.05/0.72)*3 = 264, then REC multiplier ~1.06 → ceil(264*1.06) ≈ 280
      const insulation = findMaterial(result, "ЭППС");
      expect(insulation).toBeDefined();
      expect(insulation?.purchaseQty).toBeGreaterThanOrEqual(264);
      expect(insulation?.purchaseQty).toBeLessThanOrEqual(285);
    });
  });

  describe("ГКЛ отделка (finishType = 1)", () => {
    const result = calc({
      roofArea: 60,
      insulationThickness: 200,
      insulationType: 0,
      finishType: 1,
      withVapourBarrier: 1,
    });

    it("ГКЛ (3 м²) присутствует", () => {
      // Engine: "ГКЛ (3 м²)"
      const gkl = findMaterial(result, "ГКЛ");
      expect(gkl).toBeDefined();
      // gklSheets = ceil(60*1.1/3) = ceil(22) = 22
      expect(gkl?.purchaseQty).toBe(Math.ceil(60 * 1.1 / 3));
    });

    it("профиль направляющий присутствует", () => {
      // Engine: "Профиль направляющий"
      const profile = findMaterial(result, "Профиль направляющий");
      expect(profile).toBeDefined();
      // profilePcs = ceil(60/0.6/3) = ceil(33.33) = 34
      expect(profile?.purchaseQty).toBe(Math.ceil(60 / 0.6 / 3));
    });

    it("шпаклёвка (25 кг) присутствует", () => {
      // Engine: "Шпаклёвка (25 кг)"
      const putty = findMaterial(result, "Шпаклёвка");
      expect(putty).toBeDefined();
      // puttyBags = ceil(60*0.5/25) = ceil(1.2) = 2
      expect(putty?.purchaseQty).toBe(Math.ceil(60 * 0.5 / 25));
    });

    it("нет вагонки и антисептика", () => {
      expect(findMaterial(result, "Вагонка деревянная")).toBeUndefined();
    });

    it("инварианты", () => {
      checkInvariants(result);
    });
  });

  describe("Без отделки (finishType = 2)", () => {
    const result = calc({
      roofArea: 60,
      insulationThickness: 200,
      insulationType: 0,
      finishType: 2,
      withVapourBarrier: 1,
    });

    it("нет вагонки, ГКЛ и обрешётки", () => {
      expect(findMaterial(result, "Вагонка деревянная")).toBeUndefined();
      expect(findMaterial(result, "ГКЛ")).toBeUndefined();
      expect(findMaterial(result, "Обрешётка")).toBeUndefined();
    });
  });

  describe("Без пароизоляции (withVapourBarrier = 0)", () => {
    const result = calc({
      roofArea: 60,
      insulationThickness: 200,
      insulationType: 0,
      finishType: 0,
      withVapourBarrier: 0,
    });

    it("нет пароизоляции", () => {
      expect(findMaterial(result, "Пароизоляция")).toBeUndefined();
    });

    it("предупреждение о пароизоляции", () => {
      // Engine: "Без пароизоляции утеплитель подвержен намоканию и потере свойств"
      expect(result.warnings.some((w) => w.includes("Без пароизоляции"))).toBe(true);
    });
  });

  describe("Армированная пароизоляция (withVapourBarrier = 2)", () => {
    const result = calc({
      roofArea: 60,
      insulationThickness: 200,
      insulationType: 0,
      finishType: 0,
      withVapourBarrier: 2,
    });

    it("пароизоляция Армированная присутствует", () => {
      // Engine: "Пароизоляция Армированная (70 м²)"
      expect(findMaterial(result, "Пароизоляция Армированная")).toBeDefined();
    });
  });

  describe("Предупреждения", () => {
    it("толщина < 200 мм → предупреждение", () => {
      const result = calc({ roofArea: 60, insulationThickness: 150, insulationType: 0, finishType: 0, withVapourBarrier: 1 });
      expect(result.warnings.some((w) => w.includes("менее 200 мм"))).toBe(true);
    });
  });

  describe("Минимальная площадь (clamped to 10)", () => {
    const result = calc({
      roofArea: 5,
      insulationThickness: 200,
      insulationType: 0,
      finishType: 0,
      withVapourBarrier: 1,
    });

    it("roofArea clamped to 10", () => {
      expect(result.totals.roofArea).toBe(10);
    });

    it("инварианты", () => {
      checkInvariants(result);
    });
  });
});
