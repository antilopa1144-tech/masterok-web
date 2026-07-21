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
      expect(findMaterial(r, "Акустическая минеральная")).toBeDefined();
      expect(findMaterial(r, "ГКЛ")).toBeDefined();
      expect(findMaterial(r, "Потолочный профиль ПП")).toBeDefined();
      expect(findMaterial(r, "Виброподвес")).toBeDefined();
      expect(findMaterial(r, "Вибролента")).toBeDefined();
    });

    it("вата: area*1.1/0.6 плит", () => {
      const r = calc({ area: 30, surfaceType: 0, system: 0 });
      // areaWithReserve=33, plates=ceil(33/0.6)=55
      expect(findMaterial(r, "Акустическая минеральная")!.quantity).toBe(55);
    });

    it("ГКЛ 2 слоя: area*1.1*2/3 листов", () => {
      const r = calc({ area: 30, surfaceType: 0, system: 0 });
      // sheets=ceil(33*2/3)=ceil(22)=22
      expect(findMaterial(r, "ГКЛ")!.quantity).toBe(22);
    });

    it("саморезы первого и второго слоя округляются отдельными упаковками", () => {
      const r = calc({ area: 30, surfaceType: 0, system: 0 });
      const screws = findMaterial(r, "саморезы для гипсокартона по металлу 3,5×25 и 3,5×35")!;
      expect(screws.purchaseQty).toBe(4);
      expect(screws.subtitle).toContain("2 уп. 3,5×25 мм");
      expect(screws.subtitle).toContain("2 уп. 3,5×35 мм");
      expect(screws.subtitle).toContain("275 шт");
    });
  });

  describe("ЗИПС панели (system=1)", () => {
    it("30 м²", () => {
      const r = calc({ area: 30, surfaceType: 0, system: 1 });
      checkInvariants(r);
      // Engine: "ЗИПС панели", areaWithReserve=33, panelArea=0.72, panels=ceil(33/0.72)=46
      expect(findMaterial(r, "Звукоизоляционные сэндвич-панели (ЗИПС)")!.quantity).toBe(46);
    });

    it("дюбели для ЗИПС присутствуют", () => {
      const r = calc({ area: 30, surfaceType: 0, system: 1 });
      // Engine: "Дюбели для ЗИПС"
      const fastener = findMaterial(r, "Фирменный крепёжный комплект");
      expect(fastener?.subtitle).toContain("штатные виброузлы");
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
      expect(findMaterial(r, "Рулонный звукоизоляционный материал")).toBeDefined();
      expect(findMaterial(r, "Кромочная демпферная")).toBeDefined();
      expect(findMaterial(r, "Сухая смесь для стяжки")).toBeDefined();
    });
  });

  describe("Акустический потолок (system=3)", () => {
    it("30 м²", () => {
      const r = calc({ area: 30, surfaceType: 0, system: 3 });
      checkInvariants(r);
      // Engine: "Минераловатные плиты", "ГКЛ листы", "Виброподвесы"
      expect(findMaterial(r, "Акустическая минеральная")).toBeDefined();
      expect(findMaterial(r, "ГКЛ")).toBeDefined();
      expect(findMaterial(r, "Виброподвес")).toBeDefined();
      expect(findMaterial(r, "саморезы для гипсокартона по металлу 3,5×25 и 3,5×35")).toBeDefined();
    });
  });

  describe("Общие материалы", () => {
    it("герметик во всех системах", () => {
      for (const system of [0, 1, 2, 3]) {
        const r = calc({ area: 30, surfaceType: 0, system });
        // Engine: "Герметик"
        expect(findMaterial(r, "акустический герметик")).toBeDefined();
      }
    });

    it("уплотнительная лента во всех системах", () => {
      const r = calc({ area: 30, surfaceType: 0, system: 0 });
      // Engine: "Уплотнительная лента 30м"
      expect(findMaterial(r, "Уплотнительная виброизоляционная лента")).toBeDefined();
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
