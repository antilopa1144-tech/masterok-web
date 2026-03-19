import { describe, it, expect } from "vitest";
import { ventilationDef } from "../formulas/ventilation";
import { findMaterial, checkInvariants, withBasicAccuracy } from "./_helpers";

const calc = withBasicAccuracy(ventilationDef.calculate.bind(ventilationDef));

describe("Вентиляция", () => {
  describe("Квартира (buildingType=0)", () => {
    it("80 м², 2.7 м, 3 чел, круглый воздуховод", () => {
      const r = calc({ totalArea: 80, ceilingHeight: 2.7, buildingType: 0, peopleCount: 3, ductType: 0 });
      checkInvariants(r);
      // Engine: volume=80*2.7=216, airByVolume=216*1.5=324
      // airByPeople=3*30=90, required=max(324,90)=324→rounded=ceil(324/50)*50=350
      expect(r.totals.requiredAirflowRounded).toBe(350);
    });
  });

  describe("Частный дом (buildingType=1)", () => {
    it("кратность 2.0×", () => {
      const r = calc({ totalArea: 80, ceilingHeight: 2.7, buildingType: 1, peopleCount: 3, ductType: 0 });
      // volume=216, airByVolume=216*2.0=432, airByPeople=90, required=max(432,90)=432→450
      expect(r.totals.requiredAirflowRounded).toBe(450);
    });
  });

  describe("Офис (buildingType=2)", () => {
    it("кратность 3.0×, больше людей", () => {
      const r = calc({ totalArea: 100, ceilingHeight: 2.7, buildingType: 2, peopleCount: 15, ductType: 0 });
      // volume=270, airByVolume=270*3=810, airByPeople=15*30=450, required=max(810,450)=810→850
      expect(r.totals.requiredAirflowRounded).toBe(850);
    });
  });

  describe("Материалы", () => {
    it("вентилятор, воздуховод, фасонные элементы, решётки, хомуты", () => {
      const r = calc({ totalArea: 80, ceilingHeight: 2.7, buildingType: 0, peopleCount: 3, ductType: 0 });
      // Engine names
      expect(findMaterial(r, "Вентилятор канальный")).toBeDefined();
      expect(findMaterial(r, "Воздуховод")).toBeDefined();
      expect(findMaterial(r, "Фасонные элементы")).toBeDefined();
      expect(findMaterial(r, "решётки")).toBeDefined();
      expect(findMaterial(r, "Хомуты")).toBeDefined();
    });

    it("шумоглушитель для жилых помещений (buildingType<=1)", () => {
      const r = calc({ totalArea: 80, ceilingHeight: 2.7, buildingType: 0, peopleCount: 3, ductType: 0 });
      // Engine: "Шумоглушитель"
      expect(findMaterial(r, "Шумоглушитель")).toBeDefined();
    });

    it("нет шумоглушителя для производства (buildingType=3)", () => {
      const r = calc({ totalArea: 80, ceilingHeight: 2.7, buildingType: 3, peopleCount: 3, ductType: 0 });
      expect(findMaterial(r, "Шумоглушитель")).toBeUndefined();
    });
  });

  describe("Тип воздуховода", () => {
    it("гибкий ø125 — ductType=2", () => {
      const r = calc({ totalArea: 80, ceilingHeight: 2.7, buildingType: 0, peopleCount: 3, ductType: 2 });
      // Engine: "Воздуховод Гибкий ø125 (10 м)"
      expect(findMaterial(r, "Гибкий")).toBeDefined();
    });

    it("прямоугольный 200×100 — ductType=1", () => {
      const r = calc({ totalArea: 80, ceilingHeight: 2.7, buildingType: 0, peopleCount: 3, ductType: 1 });
      // Engine: "Воздуховод Прямоугольный 200×100 (3 м)"
      expect(findMaterial(r, "Прямоугольный")).toBeDefined();
    });
  });

  describe("Предупреждения", () => {
    it("квартира > 6 чел → приточно-вытяжная установка", () => {
      const r = calc({ totalArea: 80, ceilingHeight: 2.7, buildingType: 0, peopleCount: 8, ductType: 0 });
      // Engine: "Для квартиры с числом жильцов более 6 рекомендуется приточно-вытяжная установка"
      expect(r.warnings.some(w => w.includes("приточно-вытяжная"))).toBe(true);
    });
  });
});
