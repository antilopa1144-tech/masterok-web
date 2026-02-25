import { describe, it, expect } from "vitest";
import { tileGroutDef } from "../formulas/tile-grout";
import { findMaterial, checkInvariants } from "./_helpers";

const calc = tileGroutDef.calculate.bind(tileGroutDef);

describe("Затирка для плитки", () => {
  describe("Цементная затирка (стандарт)", () => {
    it("20 м², плитка 300×300, шов 3 мм, толщина 8 мм, уп. 2 кг", () => {
      const r = calc({ area: 20, tileWidth: 300, tileHeight: 300, tileThickness: 8, jointWidth: 3, groutType: 0, bagSize: 2 });
      checkInvariants(r);
      // jointLength=1000/300+1000/300=6.667 пм/м²
      // volume=6.667*(3/1000)*(8/1000)*1000=0.16 л/м²
      // kgPerSqm=0.16*1.6=0.2560 кг/м²
      // totalKg=20*0.256*1.1=5.632, bags=ceil(5.632/2)=3
      const grout = findMaterial(r, "Затирка");
      expect(grout).toBeDefined();
      expect(grout!.purchaseQty).toBe(3);
    });

    it("большая площадь 100 м²", () => {
      const r = calc({ area: 100, tileWidth: 300, tileHeight: 300, tileThickness: 8, jointWidth: 3, groutType: 0, bagSize: 5 });
      checkInvariants(r);
      // totalKg=100*0.256*1.1=28.16, bags=ceil(28.16/5)=6
      expect(findMaterial(r, "Затирка")!.purchaseQty).toBe(6);
    });
  });

  describe("Эпоксидная затирка", () => {
    it("плотность 1400 кг/м³", () => {
      const r = calc({ area: 20, tileWidth: 300, tileHeight: 300, tileThickness: 8, jointWidth: 3, groutType: 1, bagSize: 2 });
      // kgPerSqm=0.16*1.4=0.224, totalKg=20*0.224*1.1=4.928, bags=ceil(4.928/2)=3
      checkInvariants(r);
      expect(findMaterial(r, "эпоксидная")!.purchaseQty).toBe(3);
    });
  });

  describe("Полиуретановая затирка", () => {
    it("плотность 1200 кг/м³", () => {
      const r = calc({ area: 20, tileWidth: 300, tileHeight: 300, tileThickness: 8, jointWidth: 3, groutType: 2, bagSize: 2 });
      // kgPerSqm=0.16*1.2=0.192, totalKg=20*0.192*1.1=4.224, bags=ceil(4.224/2)=3
      checkInvariants(r);
      expect(findMaterial(r, "полиуретановая")!.purchaseQty).toBe(3);
    });
  });

  describe("Размер плитки", () => {
    it("крупноформат 600×1200 — меньше швов → меньше затирки", () => {
      const r = calc({ area: 20, tileWidth: 600, tileHeight: 1200, tileThickness: 8, jointWidth: 3, groutType: 0, bagSize: 2 });
      // jointLength=1000/600+1000/1200≈2.5, volume=2.5*0.003*0.008*1000=0.06 л/м²
      // kgPerSqm=0.06*1.6=0.096, totalKg=20*0.096*1.1=2.112, bags=ceil(2.112/2)=2
      expect(findMaterial(r, "Затирка")!.purchaseQty).toBe(2);
    });

    it("мозаика 50×50 — много швов → много затирки", () => {
      const r = calc({ area: 10, tileWidth: 50, tileHeight: 50, tileThickness: 6, jointWidth: 2, groutType: 0, bagSize: 2 });
      // jointLength=1000/50+1000/50=40, volume=40*0.002*0.006*1000=0.48
      // kgPerSqm=0.48*1.6=0.768, totalKg=10*0.768*1.1=8.448, bags=ceil(8.448/2)=5
      expect(findMaterial(r, "Затирка")!.purchaseQty).toBe(5);
    });
  });

  describe("Предупреждения", () => {
    it("эпоксидная → предупреждение о смешивании A+B", () => {
      const r = calc({ area: 20, tileWidth: 300, tileHeight: 300, tileThickness: 8, jointWidth: 3, groutType: 1, bagSize: 2 });
      expect(r.warnings.some(w => w.includes("A+B"))).toBe(true);
    });

    it("эпоксидная + шов < 2 мм → не рекомендуется", () => {
      const r = calc({ area: 20, tileWidth: 300, tileHeight: 300, tileThickness: 8, jointWidth: 1, groutType: 1, bagSize: 2 });
      expect(r.warnings.some(w => w.includes("< 2 мм"))).toBe(true);
    });

    it("крупноформат > 600 мм → предупреждение о шве от 3 мм", () => {
      const r = calc({ area: 20, tileWidth: 700, tileHeight: 300, tileThickness: 8, jointWidth: 2, groutType: 0, bagSize: 2 });
      expect(r.warnings.some(w => w.includes("от 3 мм"))).toBe(true);
    });
  });

  describe("Граничные условия", () => {
    it("минимальная площадь 1 м²", () => {
      const r = calc({ area: 0.5, tileWidth: 300, tileHeight: 300, tileThickness: 8, jointWidth: 3, groutType: 0, bagSize: 1 });
      checkInvariants(r);
      // area clamped to 1
    });
  });
});
