import { describe, it, expect } from "vitest";
import { soundInsulationDef } from "../formulas/sound-insulation";
import { findMaterial, checkInvariants } from "./_helpers";

const calc = soundInsulationDef.calculate.bind(soundInsulationDef);

describe("Звукоизоляция", () => {
  describe("Базовая система (ГКЛ + вата)", () => {
    it("25 м² стена", () => {
      const r = calc({ area: 25, surface: 0, systemType: 0 });
      checkInvariants(r);
      expect(findMaterial(r, "Rockwool")).toBeDefined();
      expect(findMaterial(r, "ГКЛ")).toBeDefined();
      expect(findMaterial(r, "Профиль")).toBeDefined();
      expect(findMaterial(r, "Виброподвес")).toBeDefined();
    });

    it("вата: area*1.1/0.6 плит", () => {
      const r = calc({ area: 25, surface: 0, systemType: 0 });
      // areaWithReserve=27.5, plates=ceil(27.5/0.6)=46
      expect(findMaterial(r, "Rockwool")!.purchaseQty).toBe(46);
    });

    it("ГКЛ 2 слоя: area*1.1*2/3 листов", () => {
      const r = calc({ area: 25, surface: 0, systemType: 0 });
      // sheets=ceil(27.5*2/3)=ceil(18.33)=19
      expect(findMaterial(r, "ГКЛ")!.purchaseQty).toBe(19);
    });
  });

  describe("ЗИПС панели", () => {
    it("25 м²", () => {
      const r = calc({ area: 25, surface: 0, systemType: 1 });
      checkInvariants(r);
      // areaWithReserve=27.5, panelArea=0.72, panels=ceil(27.5/0.72)=39
      expect(findMaterial(r, "ЗИПС")!.purchaseQty).toBe(39);
    });

    it("дюбели для ЗИПС: panels*6*1.05", () => {
      const r = calc({ area: 25, surface: 0, systemType: 1 });
      expect(findMaterial(r, "Дюбель")).toBeDefined();
    });
  });

  describe("Плавающий пол", () => {
    it("25 м²", () => {
      const r = calc({ area: 25, surface: 1, systemType: 2 });
      checkInvariants(r);
      expect(findMaterial(r, "Виброизол")).toBeDefined();
      expect(findMaterial(r, "Демпферная")).toBeDefined();
      expect(findMaterial(r, "ЦПС")).toBeDefined();
    });

    it("предупреждение о демпферной ленте", () => {
      const r = calc({ area: 25, surface: 1, systemType: 2 });
      expect(r.warnings.some(w => w.includes("демпферная"))).toBe(true);
    });
  });

  describe("Акустический потолок", () => {
    it("25 м²", () => {
      const r = calc({ area: 25, surface: 2, systemType: 3 });
      checkInvariants(r);
      expect(findMaterial(r, "Rockwool")).toBeDefined();
      expect(findMaterial(r, "Виброподвес")).toBeDefined();
      expect(findMaterial(r, "ГКЛ")).toBeDefined();
    });
  });

  describe("Общие материалы", () => {
    it("герметик акриловый во всех системах", () => {
      for (const systemType of [0, 1, 2, 3]) {
        const r = calc({ area: 25, surface: 0, systemType });
        expect(findMaterial(r, "Герметик")).toBeDefined();
      }
    });

    it("уплотнительная лента во всех системах", () => {
      const r = calc({ area: 25, surface: 0, systemType: 0 });
      expect(findMaterial(r, "Уплотнительная")).toBeDefined();
    });
  });

  describe("Предупреждения", () => {
    it("стена → предупреждение об уменьшении площади", () => {
      const r = calc({ area: 25, surface: 0, systemType: 0 });
      expect(r.warnings.some(w => w.includes("площадь комнаты"))).toBe(true);
    });

    it("всегда — герметик для стыков", () => {
      const r = calc({ area: 25, surface: 0, systemType: 0 });
      expect(r.warnings.some(w => w.includes("герметиком"))).toBe(true);
    });
  });
});
