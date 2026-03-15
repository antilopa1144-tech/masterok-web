import { describe, it, expect } from "vitest";
import { heatingDef } from "../formulas/heating";
import { findMaterial, checkInvariants } from "./_helpers";

const calc = heatingDef.calculate.bind(heatingDef);

describe("Отопление и радиаторы", () => {
  describe("Секционный радиатор (radiatorType=0)", () => {
    it("80 м², Москва (zone=1), угловая квартира (buildingType=0, coeff=1.3), 2.7 м, 4 комнаты", () => {
      const r = calc({ totalArea: 80, ceilingHeight: 2.7, climateZone: 1, buildingType: 0, radiatorType: 0, roomCount: 4 });
      checkInvariants(r);
      // Engine: powerPerM2=100, buildingCoeff=1.3, heightCoeff=2.7/2.7=1
      // totalPowerW=80*100*1.3*1=10400
      expect(r.totals.totalPowerW).toBeCloseTo(10400, 0);
      // Engine: "Радиаторы (секции)", totalUnits=ceil(10400/180)=58
      const rad = findMaterial(r, "Радиаторы (секции)");
      expect(rad).toBeDefined();
      expect(rad!.quantity).toBe(58);
    });

    it("radiatorType=1 — 200 Вт/секция", () => {
      const r = calc({ totalArea: 80, ceilingHeight: 2.7, climateZone: 1, buildingType: 0, radiatorType: 1, roomCount: 4 });
      // totalPower=10400, sections=ceil(10400/200)=52
      const rad = findMaterial(r, "Радиаторы (секции)");
      expect(rad).toBeDefined();
      expect(rad!.quantity).toBe(52);
    });
  });

  describe("Панельные радиаторы (radiatorType>=2)", () => {
    it("radiatorType=2 — 700 Вт/панель", () => {
      const r = calc({ totalArea: 80, ceilingHeight: 2.7, climateZone: 1, buildingType: 1, radiatorType: 2, roomCount: 4 });
      // Engine: "Радиаторы (панели/приборы)", totalPowerW=80*100*1.0*1=8000, units=ceil(8000/700)=12
      const rad = findMaterial(r, "панели");
      expect(rad).toBeDefined();
      expect(rad!.quantity).toBe(12);
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
    it("трубы ПП, фитинги, кронштейны, термоголовки, краны Маевского", () => {
      const r = calc({ totalArea: 80, ceilingHeight: 2.7, climateZone: 1, buildingType: 0, radiatorType: 0, roomCount: 4 });
      // Engine material names
      expect(findMaterial(r, "Труба ПП")).toBeDefined();
      expect(findMaterial(r, "Фитинги")).toBeDefined();
      expect(findMaterial(r, "Кронштейны")).toBeDefined();
      expect(findMaterial(r, "Термоголовки")).toBeDefined();
      expect(findMaterial(r, "Маевского")).toBeDefined();
    });
  });

  describe("Предупреждения", () => {
    it("> 20 кВт → газовый котёл", () => {
      const r = calc({ totalArea: 200, ceilingHeight: 2.7, climateZone: 1, buildingType: 0, radiatorType: 0, roomCount: 8 });
      // Engine: "Мощность более 20 кВт — газовый котёл с запасом 15-20%"
      expect(r.warnings.some(w => w.includes("котёл"))).toBe(true);
    });

    it("слабая изоляция + холодная зона → теплотехнический расчёт", () => {
      const r = calc({ totalArea: 80, ceilingHeight: 2.7, climateZone: 2, buildingType: 2, radiatorType: 0, roomCount: 4 });
      // Engine: "Слабая изоляция + холодная зона — рекомендуется профессиональный теплотехнический расчёт"
      expect(r.warnings.some(w => w.includes("теплотехнический"))).toBe(true);
    });
  });
});
