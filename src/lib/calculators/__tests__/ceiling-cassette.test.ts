import { describe, it, expect } from "vitest";
import { ceilingCassetteDef } from "../formulas/ceiling-cassette";
import { findMaterial, checkInvariants } from "./_helpers";

const calc = ceilingCassetteDef.calculate.bind(ceilingCassetteDef);

describe("Кассетный потолок", () => {
  describe("Стандарт 600×600", () => {
    it("20 м², длина 5 м", () => {
      const r = calc({ area: 20, cassetteSize: 600, roomLength: 5 });
      checkInvariants(r);
      // roomWidth=4, cassettesPerRow=ceil(5/0.6)=9, rows=ceil(4/0.6)=7
      // totalCassettes=63, withReserve=ceil(63*1.1)=70
      expect(r.totals.totalCassettes).toBe(63);
      expect(findMaterial(r, "Кассета")!.purchaseQty).toBe(70);
    });
  });

  describe("Кассеты 595×595", () => {
    it("20 м²", () => {
      const r = calc({ area: 20, cassetteSize: 595, roomLength: 5 });
      checkInvariants(r);
      // cassetteSizeM=0.595, cassettesPerRow=ceil(5/0.595)=9, rows=ceil(4/0.595)=7
      expect(r.totals.totalCassettes).toBe(63);
    });
  });

  describe("Кассеты 300×300 (декоративные)", () => {
    it("предупреждение о сдвоенной решётке", () => {
      const r = calc({ area: 20, cassetteSize: 300, roomLength: 5 });
      expect(r.warnings.some(w => w.includes("сдвоенной"))).toBe(true);
    });
  });

  describe("Профили и крепёж", () => {
    it("несущий, поперечный, подвесы, пристенный", () => {
      const r = calc({ area: 20, cassetteSize: 600, roomLength: 5 });
      expect(findMaterial(r, "несущий")).toBeDefined();
      expect(findMaterial(r, "поперечный")).toBeDefined();
      expect(findMaterial(r, "Подвес")).toBeDefined();
      expect(findMaterial(r, "пристенный")).toBeDefined();
    });
  });

  describe("Большая площадь", () => {
    it("> 50 м² → предупреждение о жёсткости", () => {
      const r = calc({ area: 60, cassetteSize: 600, roomLength: 10 });
      expect(r.warnings.some(w => w.includes("жёсткости"))).toBe(true);
    });
  });
});
