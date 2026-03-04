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
    it("розетки присутствуют и количество по формуле", () => {
      const r = calc({ apartmentArea: 60, roomsCount: 3, ceilingHeight: 2.7, hasKitchen: 1 });
      const outlets = findMaterial(r, "Розетки");
      expect(outlets).toBeDefined();
      // outletsCount = ceil(60 * 0.6) + (3 * 2) = 42
      expect(outlets!.quantity).toBe(42);
    });

    it("выключатели присутствуют и количество по формуле", () => {
      const r = calc({ apartmentArea: 60, roomsCount: 3, ceilingHeight: 2.7, hasKitchen: 1 });
      const switches = findMaterial(r, "Выключатели");
      expect(switches).toBeDefined();
      // switchesCount = rooms + 2 = 5
      expect(switches!.quantity).toBe(5);
    });

    it("розетки и выключатели не зависят от hasKitchen", () => {
      const withKitchen = calc({ apartmentArea: 60, roomsCount: 3, ceilingHeight: 2.7, hasKitchen: 1 });
      const withoutKitchen = calc({ apartmentArea: 60, roomsCount: 3, ceilingHeight: 2.7, hasKitchen: 0 });

      expect(findMaterial(withKitchen, "Розетки")!.quantity).toBe(42);
      expect(findMaterial(withoutKitchen, "Розетки")!.quantity).toBe(42);
      expect(findMaterial(withKitchen, "Выключатели")!.quantity).toBe(5);
      expect(findMaterial(withoutKitchen, "Выключатели")!.quantity).toBe(5);
    });
  });

  describe("Щиток", () => {
    it("автоматы: группы + запас 2 шт", () => {
      const r = calc({ apartmentArea: 60, roomsCount: 3, ceilingHeight: 2.7, hasKitchen: 1 });
      const breakers = findMaterial(r, "Автоматический");
      // lightingGroups=4, outletGroups=5, acGroups=2, kitchen=1 -> 12
      // purchaseQty = 12 + 2 = 14
      expect(breakers!.purchaseQty).toBe(14);
    });

    it("УЗО: ceil(outletGroups/2) + kitchen + 1", () => {
      const r = calc({ apartmentArea: 60, roomsCount: 3, ceilingHeight: 2.7, hasKitchen: 1 });
      // outletGroups=5, kitchen=1 -> ceil(5/2) + 1 + 1 = 5
      expect(findMaterial(r, "УЗО")!.quantity).toBe(5);
    });
  });

  describe("Предупреждения", () => {
    it("> 100 м² → трёхфазный ввод", () => {
      const r = calc({ apartmentArea: 120, roomsCount: 5, ceilingHeight: 2.7, hasKitchen: 1 });
      expect(r.warnings.some(w => w.includes("трёхфазный"))).toBe(true);
    });

    it("электроплита → предупреждение о линии", () => {
      const r = calc({ apartmentArea: 60, roomsCount: 3, ceilingHeight: 2.7, hasKitchen: 1 });
      expect(r.warnings.some(w => w.includes("3×6"))).toBe(true);
    });
  });

  describe("Гофра и крепёж", () => {
    it("гофра включена", () => {
      const r = calc({ apartmentArea: 60, roomsCount: 3, ceilingHeight: 2.7, hasKitchen: 1 });
      expect(findMaterial(r, "Гофра")).toBeDefined();
    });

    it("подрозетники присутствуют", () => {
      const r = calc({ apartmentArea: 60, roomsCount: 3, ceilingHeight: 2.7, hasKitchen: 1 });
      const boxes = findMaterial(r, "Подрозетники");
      expect(boxes).toBeDefined();
      // outletsCount + switchesCount = 42 + 5 = 47
      expect(boxes!.quantity).toBe(47);
    });
  });
});
