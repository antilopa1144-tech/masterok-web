import { describe, it, expect } from "vitest";
import { atticDef } from "../formulas/attic";
import { findMaterial, checkInvariants } from "./_helpers";

const calc = atticDef.calculate.bind(atticDef);

describe("Калькулятор мансарды", () => {
  describe("Стандарт: 60 м², 200 мм, Rockwool, вагонка, Изоспан Б", () => {
    // plateThickness = 100 (Rockwool), layerCount = ceil(200/100) = 2
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

    it("ветрозащитная мембрана TYVEK: rolls = ceil(60*1.15/70) = ceil(0.986) = 1", () => {
      const membrane = findMaterial(result, "TYVEK");
      expect(membrane).toBeDefined();
      expect(membrane?.purchaseQty).toBe(1);
    });

    it("Rockwool: plates = ceil(60*1.05/0.6)*2 = ceil(105)*2 = 105*2 = 210", () => {
      const insulation = findMaterial(result, "Rockwool");
      expect(insulation).toBeDefined();
      const singleLayer = Math.ceil(60 * 1.05 / 0.6);
      expect(insulation?.purchaseQty).toBe(singleLayer * 2);
    });

    it("Изоспан Б присутствует: rolls = ceil(60*1.15/70) = 1", () => {
      const vb = findMaterial(result, "Изоспан Б");
      expect(vb).toBeDefined();
      expect(vb?.purchaseQty).toBe(1);
    });

    it("лента соединительная для пароизоляции: rolls = ceil(60/40) = 2", () => {
      const tape = findMaterial(result, "Лента соединительная");
      expect(tape).toBeDefined();
      expect(tape?.purchaseQty).toBe(2);
    });

    it("вагонка сосна присутствует", () => {
      const panel = findMaterial(result, "Вагонка сосна");
      expect(panel).toBeDefined();
      // panelArea = (96/1000)*3 = 0.288
      // panelCount = ceil(60*1.12/0.288) = ceil(233.33) = 234
      expect(panel?.purchaseQty).toBe(Math.ceil(60 * 1.12 / 0.288));
    });

    it("обрешётка 30×40 мм присутствует", () => {
      const lathen = findMaterial(result, "Брусок обрешётки");
      expect(lathen).toBeDefined();
      // lathenRows = ceil(60/0.4) = 150, pcs = ceil(150*2.5/2) = ceil(187.5) = 188
      expect(lathen?.purchaseQty).toBe(Math.ceil(Math.ceil(60 / 0.4) * 2.5 / 2));
    });

    it("антисептик для дерева присутствует", () => {
      const anti = findMaterial(result, "Антисептик для дерева");
      expect(anti).toBeDefined();
      // antisepticLiters = ceil(60 * 0.1) = 6, cans = ceil(6/5) = 2
      expect(anti?.purchaseQty).toBe(Math.ceil(60 * 0.1 / 5));
    });

    it("инварианты", () => {
      checkInvariants(result);
    });
  });

  describe("URSA ROOF 150 мм, insulationThickness 150 мм", () => {
    // plateThickness = 150 (URSA), layerCount = ceil(150/150) = 1
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

    it("URSA ROOF: plates = ceil(60*1.05/0.6)*1 = 105", () => {
      const insulation = findMaterial(result, "URSA");
      expect(insulation).toBeDefined();
      expect(insulation?.purchaseQty).toBe(Math.ceil(60 * 1.05 / 0.6));
    });

    it("предупреждение о толщине < 200 мм", () => {
      expect(result.warnings.some((w) => w.includes("150 мм"))).toBe(true);
    });
  });

  describe("Knauf Insulation Roof 100 мм, толщина 250 мм", () => {
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

    it("Knauf Insulation: plates = ceil(60*1.05/0.72)*3 = ceil(87.5)*3 = 88*3 = 264", () => {
      const insulation = findMaterial(result, "Knauf");
      expect(insulation).toBeDefined();
      expect(insulation?.purchaseQty).toBe(Math.ceil(60 * 1.05 / 0.72) * 3);
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

    it("ГКЛ влагостойкий присутствует", () => {
      const gkl = findMaterial(result, "ГКЛ влагостойкий");
      expect(gkl).toBeDefined();
      // gklSheets = ceil(60*1.1/3) = ceil(22) = 22
      expect(gkl?.purchaseQty).toBe(Math.ceil(60 * 1.1 / 3));
    });

    it("профиль ПП 60×27 присутствует", () => {
      const profile = findMaterial(result, "Профиль ПП");
      expect(profile).toBeDefined();
      // profileRows = ceil(60/0.6) = 100, pcs = ceil(100*2.5/3) = ceil(83.33) = 84
      expect(profile?.purchaseQty).toBe(Math.ceil(Math.ceil(60 / 0.6) * 2.5 / 3));
    });

    it("шпаклёвка Knauf Фуген присутствует", () => {
      const putty = findMaterial(result, "Шпаклёвка Knauf");
      expect(putty).toBeDefined();
      // puttyBags = ceil(60*0.5/25) = ceil(1.2) = 2
      expect(putty?.purchaseQty).toBe(Math.max(1, Math.ceil(60 * 0.5 / 25)));
    });

    it("нет вагонки и антисептика", () => {
      expect(findMaterial(result, "Вагонка сосна")).toBeUndefined();
      expect(findMaterial(result, "Антисептик")).toBeUndefined();
    });

    it("инварианты", () => {
      checkInvariants(result);
    });
  });

  describe("Имитация бруса (finishType = 2)", () => {
    const result = calc({
      roofArea: 60,
      insulationThickness: 200,
      insulationType: 0,
      finishType: 2,
      withVapourBarrier: 1,
    });

    it("имитация бруса присутствует", () => {
      expect(findMaterial(result, "Имитация бруса")).toBeDefined();
    });

    it("обрешётка присутствует", () => {
      expect(findMaterial(result, "Брусок обрешётки")).toBeDefined();
    });

    it("антисептик присутствует", () => {
      expect(findMaterial(result, "Антисептик")).toBeDefined();
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

    it("нет Изоспан", () => {
      expect(findMaterial(result, "Изоспан")).toBeUndefined();
    });

    it("нет ленты соединительной для пароизоляции", () => {
      expect(findMaterial(result, "Лента соединительная")).toBeUndefined();
    });

    it("предупреждение о конденсате", () => {
      expect(result.warnings.some((w) => w.includes("пароизоляция обязательна"))).toBe(true);
    });
  });

  describe("Армированная пароизоляция Изоспан С (withVapourBarrier = 2)", () => {
    const result = calc({
      roofArea: 60,
      insulationThickness: 200,
      insulationType: 0,
      finishType: 0,
      withVapourBarrier: 2,
    });

    it("Изоспан С присутствует", () => {
      expect(findMaterial(result, "Изоспан С")).toBeDefined();
    });
  });

  describe("Предупреждения", () => {
    it("всегда предупреждение о вентиляционном зазоре", () => {
      const result = calc({ roofArea: 60, insulationThickness: 200, insulationType: 0, finishType: 0, withVapourBarrier: 1 });
      expect(result.warnings.some((w) => w.includes("вентиляционный зазор"))).toBe(true);
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
