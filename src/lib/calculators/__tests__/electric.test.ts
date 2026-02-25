import { describe, it, expect } from "vitest";
import { electricDef } from "../formulas/electric";
import { findMaterial, checkInvariants } from "./_helpers";

const calc = electricDef.calculate.bind(electricDef);

describe("Электропроводка", () => {
  describe("Стандартная квартира", () => {
    it("60 м², 3 комнаты, высота 2.7 м, с плитой", () => {
      const r = calc({ apartmentArea: 60, roomsCount: 3, ceilingHeight: 2.7, wiringType: 0, hasKitchen: 1 });
      checkInvariants(r);
      // lightingGroups=4, outletGroups=5, acGroups=2, breakersCount=4+5+2+1=12
      expect(r.totals.breakersCount).toBe(12);
      expect(findMaterial(r, "1.5")).toBeDefined();
      expect(findMaterial(r, "2.5")).toBeDefined();
      expect(findMaterial(r, "3×6")).toBeDefined();
    });

    it("без электроплиты → нет кабеля 6 мм²", () => {
      const r = calc({ apartmentArea: 60, roomsCount: 3, ceilingHeight: 2.7, wiringType: 0, hasKitchen: 0 });
      expect(findMaterial(r, "3×6")).toBeUndefined();
    });
  });

  describe("Розетки и выключатели", () => {
    it("~0.5 розетки/м²", () => {
      const r = calc({ apartmentArea: 60, roomsCount: 3, ceilingHeight: 2.7, hasKitchen: 1 });
      const outlets = findMaterial(r, "Розетки");
      expect(outlets!.quantity).toBe(30); // ceil(60*0.5)
    });

    it("выключатели: rooms*2+2", () => {
      const r = calc({ apartmentArea: 60, roomsCount: 3, ceilingHeight: 2.7, hasKitchen: 1 });
      expect(findMaterial(r, "Выключатели")!.quantity).toBe(8); // 3*2+2
    });
  });

  describe("Щиток", () => {
    it("автоматы: группы + запас 2 шт", () => {
      const r = calc({ apartmentArea: 60, roomsCount: 3, ceilingHeight: 2.7, hasKitchen: 1 });
      const breakers = findMaterial(r, "Автоматический");
      // breakersCount=12, purchaseQty=12+2=14
      expect(breakers!.purchaseQty).toBe(14);
    });

    it("УЗО: ceil(outletGroups/2) + kitchen", () => {
      const r = calc({ apartmentArea: 60, roomsCount: 3, ceilingHeight: 2.7, hasKitchen: 1 });
      // outletGroups=5, uzo=ceil(5/2)+1=4
      expect(findMaterial(r, "УЗО")!.quantity).toBe(4);
    });
  });

  describe("Предупреждения", () => {
    it("> 100 м² → трёхфазный ввод", () => {
      const r = calc({ apartmentArea: 120, roomsCount: 5, ceilingHeight: 2.7, hasKitchen: 1 });
      expect(r.warnings.some(w => w.includes("трёхфазный"))).toBe(true);
    });

    it("электроплита → предупреждение о линии", () => {
      const r = calc({ apartmentArea: 60, roomsCount: 3, ceilingHeight: 2.7, hasKitchen: 1 });
      expect(r.warnings.some(w => w.includes("32А"))).toBe(true);
    });
  });

  describe("Гофра и крепёж", () => {
    it("гофра включена", () => {
      const r = calc({ apartmentArea: 60, roomsCount: 3, ceilingHeight: 2.7, hasKitchen: 1 });
      expect(findMaterial(r, "Гофра")).toBeDefined();
    });

    it("распределительные коробки", () => {
      const r = calc({ apartmentArea: 60, roomsCount: 3, ceilingHeight: 2.7, hasKitchen: 1 });
      expect(findMaterial(r, "Распределительная")).toBeDefined();
    });
  });
});
