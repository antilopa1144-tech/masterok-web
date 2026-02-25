import { describe, it, expect } from "vitest";
import { heatingDef } from "../formulas/heating";
import { findMaterial, checkInvariants } from "./_helpers";

const calc = heatingDef.calculate.bind(heatingDef);

describe("Отопление и радиаторы", () => {
  describe("Биметаллический радиатор", () => {
    it("80 м², Москва, квартира угловая, 2.7 м, 4 комнаты", () => {
      const r = calc({ totalArea: 80, ceilingHeight: 270, climateZone: 1, buildingType: 0, radiatorType: 0, roomCount: 4 });
      checkInvariants(r);
      // powerPerM2=100, buildingCoeff=1.3, heightCoeff=2.7/2.7=1
      // totalPowerW=80*100*1.3*1=10400, sections=ceil(10400/180)=58
      expect(r.totals.totalPowerW).toBe(10400);
      const rad = findMaterial(r, "Биметаллический");
      expect(rad!.purchaseQty).toBe(58);
    });

    it("алюминиевый — 200 Вт/секция", () => {
      const r = calc({ totalArea: 80, ceilingHeight: 270, climateZone: 1, buildingType: 0, radiatorType: 1, roomCount: 4 });
      // totalPower=10400, sections=ceil(10400/200)=52
      expect(findMaterial(r, "Алюминиевый")!.purchaseQty).toBe(52);
    });
  });

  describe("Климатические зоны", () => {
    it("юг — 80 Вт/м²", () => {
      const r = calc({ totalArea: 80, ceilingHeight: 270, climateZone: 0, buildingType: 1, radiatorType: 0, roomCount: 4 });
      // 80*80*1.0*1=6400
      expect(r.totals.totalPowerW).toBe(6400);
    });

    it("Сибирь — 130 Вт/м²", () => {
      const r = calc({ totalArea: 80, ceilingHeight: 270, climateZone: 2, buildingType: 1, radiatorType: 0, roomCount: 4 });
      expect(r.totals.totalPowerW).toBe(10400); // 80*130*1.0
    });
  });

  describe("Тип здания", () => {
    it("средний этаж — коэфф. 1.0", () => {
      const r = calc({ totalArea: 80, ceilingHeight: 270, climateZone: 1, buildingType: 1, radiatorType: 0, roomCount: 4 });
      expect(r.totals.totalPowerW).toBe(8000); // 80*100*1.0
    });

    it("частный дом слабое утепление — коэфф. 1.4", () => {
      const r = calc({ totalArea: 80, ceilingHeight: 270, climateZone: 1, buildingType: 3, radiatorType: 0, roomCount: 4 });
      expect(r.totals.totalPowerW).toBe(11200); // 80*100*1.4
    });
  });

  describe("Сопутствующие материалы", () => {
    it("трубы ПП, фитинги, кронштейны, термоголовки, кран Маевского", () => {
      const r = calc({ totalArea: 80, ceilingHeight: 270, climateZone: 1, buildingType: 0, radiatorType: 0, roomCount: 4 });
      expect(findMaterial(r, "Труба")).toBeDefined();
      expect(findMaterial(r, "Фитинги")).toBeDefined();
      expect(findMaterial(r, "Кронштейн")).toBeDefined();
      expect(findMaterial(r, "Термостатическая")).toBeDefined();
      expect(findMaterial(r, "Маевского")).toBeDefined();
    });

    it("радиаторы в сборе для биметалла", () => {
      const r = calc({ totalArea: 80, ceilingHeight: 270, climateZone: 1, buildingType: 0, radiatorType: 0, roomCount: 4 });
      // 58 sections / 8 per rad = ceil(7.25) = 8
      expect(findMaterial(r, "в сборе")!.purchaseQty).toBe(8);
    });
  });

  describe("Предупреждения", () => {
    it("> 20 кВт → рекомендация котла", () => {
      const r = calc({ totalArea: 200, ceilingHeight: 270, climateZone: 1, buildingType: 0, radiatorType: 0, roomCount: 8 });
      // totalPowerW=200*100*1.3=26000=26kW
      expect(r.warnings.some(w => w.includes("котёл"))).toBe(true);
    });

    it("частный дом + Сибирь → рекомендация специалиста", () => {
      const r = calc({ totalArea: 80, ceilingHeight: 270, climateZone: 2, buildingType: 2, radiatorType: 0, roomCount: 4 });
      expect(r.warnings.some(w => w.includes("специалист"))).toBe(true);
    });
  });
});
