import { describe, it, expect } from "vitest";
import { electricDef } from "../formulas/electric";
import { findMaterial, checkInvariants, withBasicAccuracy } from "./_helpers";

const calc = withBasicAccuracy(electricDef.calculate.bind(electricDef));

describe("Электропроводка", () => {
  describe("Стандартная квартира", () => {
    it("60 м², 3 комнаты, высота 2.7 м, с плитой", () => {
      const r = calc({ apartmentArea: 60, roomsCount: 3, ceilingHeight: 2.7, wiringType: 0, hasKitchen: 1 });
      checkInvariants(r);
      // Engine: lightingGroups=4, outletGroups=5, acGroups=2, breakersCount=4+5+2+1=12
      expect(r.totals.breakersCount).toBe(12);
      // Engine material names: "Кабель ВВГнг 3×1.5", "Кабель ВВГнг 3×2.5", "Кабель ВВГнг 3×6"
      expect(findMaterial(r, "3×1.5")).toBeDefined();
      expect(findMaterial(r, "3×2.5")).toBeDefined();
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
      // Engine: "Розетки"
      const outlets = findMaterial(r, "Розетки");
      expect(outlets).toBeDefined();
      // outletsCount = ceil(60 * 0.6) + (3 * 2) = 36 + 6 = 42
      expect(outlets!.quantity).toBe(42);
    });

    it("выключатели присутствуют и количество по формуле", () => {
      const r = calc({ apartmentArea: 60, roomsCount: 3, ceilingHeight: 2.7, hasKitchen: 1 });
      // Engine: "Выключатели"
      const switches = findMaterial(r, "Выключатели");
      expect(switches).toBeDefined();
      // switchesCount = rooms + 2 = 5
      expect(switches!.quantity).toBe(5);
    });
  });

  describe("Щиток", () => {
    it("автоматы: breakersCount = 12", () => {
      const r = calc({ apartmentArea: 60, roomsCount: 3, ceilingHeight: 2.7, hasKitchen: 1 });
      // Engine: "Автоматы"
      const breakers = findMaterial(r, "Автоматы");
      expect(breakers).toBeDefined();
      expect(breakers!.quantity).toBe(12);
    });

    it("УЗО: ceil(outletGroups/2) + kitchen + 1 = 5", () => {
      const r = calc({ apartmentArea: 60, roomsCount: 3, ceilingHeight: 2.7, hasKitchen: 1 });
      // Engine: "УЗО/дифавтоматы"
      expect(findMaterial(r, "УЗО")!.quantity).toBe(5);
    });
  });

  describe("Предупреждения", () => {
    it("> 100 м² → 380В (3 фазы)", () => {
      const r = calc({ apartmentArea: 120, roomsCount: 5, ceilingHeight: 2.7, hasKitchen: 1 });
      // Engine: "Площадь более 100 м² — рекомендуется ввод 380В (3 фазы)"
      expect(r.warnings.some(w => w.includes("380В"))).toBe(true);
    });

    it("электроплита → предупреждение о кабеле 3×6", () => {
      const r = calc({ apartmentArea: 60, roomsCount: 3, ceilingHeight: 2.7, hasKitchen: 1 });
      // Engine: "Кухня: кабель 3×6 мм², автомат 32А, УЗО 40А/30мА"
      expect(r.warnings.some(w => w.includes("3×6"))).toBe(true);
    });

    it("всегда: розетки через УЗО", () => {
      const r = calc({ apartmentArea: 60, roomsCount: 3, ceilingHeight: 2.7, hasKitchen: 1 });
      // Engine: "Все розетки в ванной и кухне — через УЗО 10-30 мА"
      expect(r.warnings.some(w => w.includes("УЗО"))).toBe(true);
    });
  });

  describe("Гофра и крепёж", () => {
    it("гофра/кабель-канал включена", () => {
      const r = calc({ apartmentArea: 60, roomsCount: 3, ceilingHeight: 2.7, hasKitchen: 1 });
      // Engine: "Гофра/кабель-канал"
      expect(findMaterial(r, "Гофра")).toBeDefined();
    });

    it("подрозетники присутствуют", () => {
      const r = calc({ apartmentArea: 60, roomsCount: 3, ceilingHeight: 2.7, hasKitchen: 1 });
      // Engine: "Подрозетники", quantity = socketBoxes = ceil((42+5)*1.1) = ceil(51.7) = 52
      const boxes = findMaterial(r, "Подрозетники");
      expect(boxes).toBeDefined();
      expect(boxes!.quantity).toBe(52);
    });

    it("гипс/алебастр присутствует", () => {
      const r = calc({ apartmentArea: 60, roomsCount: 3, ceilingHeight: 2.7, hasKitchen: 1 });
      // Engine: "Гипс/алебастр", quantity = ceil((42+5)/5) = ceil(9.4) = 10
      const gypsum = findMaterial(r, "Гипс");
      expect(gypsum).toBeDefined();
      expect(gypsum!.quantity).toBe(10);
    });

    it("инварианты", () => {
      const r = calc({ apartmentArea: 60, roomsCount: 3, ceilingHeight: 2.7, hasKitchen: 1 });
      checkInvariants(r);
    });
  });
});
