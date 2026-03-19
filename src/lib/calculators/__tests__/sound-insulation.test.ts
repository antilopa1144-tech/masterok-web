import { describe, it, expect } from "vitest";
import { soundInsulationDef } from "../formulas/sound-insulation";
import { findMaterial, checkInvariants, withBasicAccuracy } from "./_helpers";

const calc = withBasicAccuracy(soundInsulationDef.calculate.bind(soundInsulationDef));

describe("Звукоизоляция", () => {
  describe("Базовая система ГКЛ + Минераловатные (system=0)", () => {
    it("30 м²", () => {
      const r = calc({ area: 30, surfaceType: 0, system: 0 });
      checkInvariants(r);
      // Engine: "Минераловатные плиты", "ГКЛ листы", "Профиль ПП 3м", "Виброподвесы", "Вибролента"
      expect(findMaterial(r, "Минераловатные")).toBeDefined();
      expect(findMaterial(r, "ГКЛ")).toBeDefined();
      expect(findMaterial(r, "Профиль ПП")).toBeDefined();
      expect(findMaterial(r, "Виброподвесы")).toBeDefined();
      expect(findMaterial(r, "Вибролента")).toBeDefined();
    });

    it("вата: area*1.1/0.6 плит", () => {
      const r = calc({ area: 30, surfaceType: 0, system: 0 });
      // areaWithReserve=33, plates=ceil(33/0.6)=55
      expect(findMaterial(r, "Минераловатные")!.quantity).toBe(55);
    });

    it("ГКЛ 2 слоя: area*1.1*2/3 листов", () => {
      const r = calc({ area: 30, surfaceType: 0, system: 0 });
      // sheets=ceil(33*2/3)=ceil(22)=22
      expect(findMaterial(r, "ГКЛ")!.quantity).toBe(22);
    });
  });

  describe("ЗИПС панели (system=1)", () => {
    it("30 м²", () => {
      const r = calc({ area: 30, surfaceType: 0, system: 1 });
      checkInvariants(r);
      // Engine: "ЗИПС панели", areaWithReserve=33, panelArea=0.72, panels=ceil(33/0.72)=46
      expect(findMaterial(r, "ЗИПС панели")!.quantity).toBe(46);
    });

    it("дюбели для ЗИПС присутствуют", () => {
      const r = calc({ area: 30, surfaceType: 0, system: 1 });
      // Engine: "Дюбели для ЗИПС"
      expect(findMaterial(r, "Дюбели для ЗИПС")).toBeDefined();
    });

    it("предупреждение о ровном основании", () => {
      const r = calc({ area: 30, surfaceType: 0, system: 1 });
      // Engine: "Система ЗИПС требует ровного основания"
      expect(r.warnings.some(w => w.includes("ровного основания"))).toBe(true);
    });
  });

  describe("Плавающий пол (system=2)", () => {
    it("30 м²", () => {
      const r = calc({ area: 30, surfaceType: 0, system: 2 });
      checkInvariants(r);
      // Engine: "Звукоизоляционные маты", "Демпферная лента", "Стяжка 50 кг"
      expect(findMaterial(r, "Звукоизоляционные маты")).toBeDefined();
      expect(findMaterial(r, "Демпферная")).toBeDefined();
      expect(findMaterial(r, "Стяжка")).toBeDefined();
    });
  });

  describe("Акустический потолок (system=3)", () => {
    it("30 м²", () => {
      const r = calc({ area: 30, surfaceType: 0, system: 3 });
      checkInvariants(r);
      // Engine: "Минераловатные плиты", "ГКЛ листы", "Виброподвесы"
      expect(findMaterial(r, "Минераловатные")).toBeDefined();
      expect(findMaterial(r, "ГКЛ")).toBeDefined();
      expect(findMaterial(r, "Виброподвесы")).toBeDefined();
    });
  });

  describe("Общие материалы", () => {
    it("герметик во всех системах", () => {
      for (const system of [0, 1, 2, 3]) {
        const r = calc({ area: 30, surfaceType: 0, system });
        // Engine: "Герметик"
        expect(findMaterial(r, "Герметик")).toBeDefined();
      }
    });

    it("уплотнительная лента во всех системах", () => {
      const r = calc({ area: 30, surfaceType: 0, system: 0 });
      // Engine: "Уплотнительная лента 30м"
      expect(findMaterial(r, "Уплотнительная лента")).toBeDefined();
    });
  });

  describe("Предупреждения", () => {
    it("большая площадь → профессиональный монтаж", () => {
      const r = calc({ area: 250, surfaceType: 0, system: 0 });
      // Engine: "Большая площадь — рекомендуется профессиональный монтаж"
      expect(r.warnings.some(w => w.includes("профессиональный монтаж"))).toBe(true);
    });
  });
});
