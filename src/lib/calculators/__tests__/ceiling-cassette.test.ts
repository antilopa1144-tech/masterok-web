import { describe, it, expect } from "vitest";
import { ceilingCassetteDef } from "../formulas/ceiling-cassette";
import { findMaterial, checkInvariants } from "./_helpers";

const calc = ceilingCassetteDef.calculate.bind(ceilingCassetteDef);

describe("Кассетный потолок", () => {
  describe("595×595 мм (cassetteSize=0), 30 м², длина 6 м", () => {
    it("кассеты рассчитаны", () => {
      const r = calc({ area: 30, cassetteSize: 0, roomLength: 6 });
      checkInvariants(r);
      // Engine: roomWidth=30/6=5, cassPerRow=ceil(6/0.595), rows=ceil(5/0.595)
      // totalCass = ceil(rows*cassPerRow*1.1)
      // Engine: "Кассета 595×595 мм"
      expect(findMaterial(r, "Кассета 595")).toBeDefined();
      expect(r.totals.totalCass).toBeGreaterThan(0);
    });
  });

  describe("600×600 мм (cassetteSize=1)", () => {
    it("30 м²", () => {
      const r = calc({ area: 30, cassetteSize: 1, roomLength: 6 });
      checkInvariants(r);
      // Engine: "Кассета 600×600 мм"
      expect(findMaterial(r, "Кассета 600")).toBeDefined();
    });
  });

  describe("300×300 мм (cassetteSize=2)", () => {
    it("30 м²", () => {
      const r = calc({ area: 30, cassetteSize: 2, roomLength: 6 });
      checkInvariants(r);
      // Engine: "Кассета 300×300 мм"
      expect(findMaterial(r, "Кассета 300")).toBeDefined();
    });
  });

  describe("Профили и крепёж", () => {
    it("главный профиль Т-образный, поперечный профиль, подвес, угловой профиль", () => {
      const r = calc({ area: 30, cassetteSize: 0, roomLength: 6 });
      // Engine names
      expect(findMaterial(r, "Главный профиль Т-образный")).toBeDefined();
      expect(findMaterial(r, "Поперечный профиль")).toBeDefined();
      expect(findMaterial(r, "Подвес")).toBeDefined();
      expect(findMaterial(r, "Угловой профиль")).toBeDefined();
    });
  });

  describe("Большая площадь", () => {
    it("предупреждение о профессиональном монтаже", () => {
      const r = calc({ area: 250, cassetteSize: 0, roomLength: 25 });
      // Engine: "Большая площадь — рекомендуется профессиональный монтаж"
      expect(r.warnings.some(w => w.includes("профессиональный монтаж"))).toBe(true);
    });
  });
});
