import { describe, it, expect } from "vitest";
import { heatingDef } from "../formulas/heating";
import { findMaterial, checkInvariants, withBasicAccuracy } from "./_helpers";

const calc = withBasicAccuracy(heatingDef.calculate.bind(heatingDef));

describe("Отопление и радиаторы", () => {
  describe("Секционный радиатор (radiatorType=0)", () => {
    it("80 м², Москва (zone=1), угловая квартира (buildingType=0, coeff=1.3), 2.7 м, 4 комнаты", () => {
      const r = calc({ totalArea: 80, ceilingHeight: 2.7, climateZone: 1, buildingType: 0, radiatorType: 0, roomCount: 4 });
      checkInvariants(r);
      // Engine: powerPerM2=100, buildingCoeff=1.3, heightCoeff=2.7/2.7=1
      // totalPowerW=80*100*1.3*1=10400
      expect(r.totals.totalPowerW).toBeCloseTo(10400, 0);
      const rad = findMaterial(r, "Биметаллический радиатор");
      expect(rad).toBeDefined();
      expect(rad!.quantity).toBe(58);
    });

    it("radiatorType=1 — 200 Вт/секция", () => {
      const r = calc({ totalArea: 80, ceilingHeight: 2.7, climateZone: 1, buildingType: 0, radiatorType: 1, roomCount: 4 });
      // totalPower=10400, sections=ceil(10400/200)=52
      const rad = findMaterial(r, "Алюминиевый радиатор");
      expect(rad).toBeDefined();
      expect(rad!.quantity).toBe(52);
    });
  });

  describe("Панельные радиаторы (radiatorType>=2)", () => {
    it("radiatorType=2 — 700 Вт/панель", () => {
      const r = calc({ totalArea: 80, ceilingHeight: 2.7, climateZone: 1, buildingType: 1, radiatorType: 2, roomCount: 4 });
      const rad = findMaterial(r, "Чугунный радиатор");
      expect(rad).toBeDefined();
      expect(rad!.quantity).toBe(12);
      expect(r.totals.radiatorCount).toBe(12);
      expect(findMaterial(r, "термоголовкой")?.purchaseQty).toBe(12);
    });
  });

  describe("Климатические зоны", () => {
    it("юг (zone=0) — 80 Вт/м²", () => {
      const r = calc({ totalArea: 80, ceilingHeight: 2.7, climateZone: 0, buildingType: 1, radiatorType: 0, roomCount: 4 });
      // 80*80*1.0*1=6400
      expect(r.totals.totalPowerW).toBeCloseTo(6400, 0);
    });

    it("Сибирь (zone=2) — 130 Вт/м²", () => {
      const r = calc({ totalArea: 80, ceilingHeight: 2.7, climateZone: 2, buildingType: 1, radiatorType: 0, roomCount: 4 });
      // 80*130*1.0=10400
      expect(r.totals.totalPowerW).toBeCloseTo(10400, 0);
    });
  });

  describe("Сопутствующие материалы", () => {
    it("трубы PP-R, фитинги, кронштейны, термостатические клапаны и краны Маевского", () => {
      const r = calc({ totalArea: 80, ceilingHeight: 2.7, climateZone: 1, buildingType: 0, radiatorType: 0, roomCount: 4 });
      expect(findMaterial(r, "труба PP-R")).toBeDefined();
      expect(findMaterial(r, "Фитинги")).toBeDefined();
      expect(findMaterial(r, "Кронштейны")).toBeDefined();
      expect(findMaterial(r, "термоголовкой")).toBeDefined();
      expect(findMaterial(r, "Маевского")).toBeDefined();
    });
  });

  it("понимает старое значение высоты 270 см и не зажимает его до 3,5 м", () => {
    const r = calc({ totalArea: 80, ceilingHeight: 270, climateZone: 1, buildingType: 1, radiatorType: 0, roomCount: 4 });
    expect(r.totals.ceilingHeight).toBe(2.7);
    expect(r.totals.totalPowerW).toBeCloseTo(8000, 0);
  });

  describe("Предупреждения", () => {
    it("> 20 кВт → требуется расчёт теплопотерь и подбор источника тепла", () => {
      const r = calc({ totalArea: 200, ceilingHeight: 2.7, climateZone: 1, buildingType: 0, radiatorType: 0, roomCount: 8 });
      expect(r.warnings.some(w => w.includes("источника тепла"))).toBe(true);
    });

    it("слабая изоляция + холодная зона → теплотехнический расчёт", () => {
      const r = calc({ totalArea: 80, ceilingHeight: 2.7, climateZone: 2, buildingType: 3, radiatorType: 0, roomCount: 4 });
      expect(r.warnings.some(w => w.includes("теплотехнический"))).toBe(true);
    });

    it("хорошее утепление не называется слабым", () => {
      const r = calc({ totalArea: 80, ceilingHeight: 2.7, climateZone: 2, buildingType: 2, radiatorType: 0, roomCount: 4 });
      expect(r.warnings.some(w => w.includes("Слабая изоляция"))).toBe(false);
    });
  });
});
