import { describe, it, expect } from "vitest";
import { waterproofingDef } from "../formulas/waterproofing";
import { findMaterial, checkInvariants } from "./_helpers";

const calc = waterproofingDef.calculate.bind(waterproofingDef);

describe("Гидроизоляция", () => {
  describe("Цементная мастика (стандарт)", () => {
    it("6 м² пол, 200 мм стены, периметр 10 м, 2 слоя", () => {
      const r = calc({ floorArea: 6, wallHeight: 200, roomPerimeter: 10, masticType: 0, layers: 2 });
      checkInvariants(r);
      // wallArea=10*0.2=2, totalArea=8
      // masticKg=8*1.0*2=16, buckets=ceil(16/15)=2
      expect(r.totals.totalArea).toBe(8);
      const mastic = findMaterial(r, "Гидроизоляционная мастика");
      expect(mastic).toBeDefined();
      expect(mastic!.purchaseQty).toBe(2);
    });
  });

  describe("Жидкая резина", () => {
    it("расход 1.2 кг/м², ведро 20 кг", () => {
      const r = calc({ floorArea: 6, wallHeight: 200, roomPerimeter: 10, masticType: 1, layers: 2 });
      // totalArea=8, masticKg=8*1.2*2=19.2, buckets=ceil(19.2/20)=1
      const mastic = findMaterial(r, "Жидкая резина");
      expect(mastic).toBeDefined();
      expect(mastic!.purchaseQty).toBe(1);
    });

    it("праймер битумный для жидкой резины", () => {
      const r = calc({ floorArea: 6, wallHeight: 200, roomPerimeter: 10, masticType: 1, layers: 2 });
      const primer = findMaterial(r, "Праймер битумный");
      expect(primer).toBeDefined();
    });
  });

  describe("Полимерная обмазочная", () => {
    it("расход 0.8 кг/м², ведро 15 кг", () => {
      const r = calc({ floorArea: 6, wallHeight: 200, roomPerimeter: 10, masticType: 2, layers: 2 });
      // totalArea=8, masticKg=8*0.8*2=12.8, buckets=ceil(12.8/15)=1
      const mastic = findMaterial(r, "Полимерная");
      expect(mastic).toBeDefined();
      expect(mastic!.purchaseQty).toBe(1);
    });
  });

  describe("Высота обработки стен", () => {
    it("только пол — wallHeight=0", () => {
      const r = calc({ floorArea: 6, wallHeight: 0, roomPerimeter: 10, masticType: 0, layers: 2 });
      expect(r.totals.wallArea).toBe(0);
      expect(r.totals.totalArea).toBe(6);
      expect(r.warnings.some(w => w.includes("200 мм"))).toBe(true);
    });

    it("полная стена — wallHeight=2000 (душевая)", () => {
      const r = calc({ floorArea: 6, wallHeight: 2000, roomPerimeter: 10, masticType: 0, layers: 2 });
      // wallArea=10*2=20, totalArea=26, masticKg=26*1.0*2=52, buckets=ceil(52/15)=4
      expect(r.totals.wallArea).toBe(20);
      expect(findMaterial(r, "мастика")!.purchaseQty).toBe(4);
    });
  });

  describe("Количество слоёв", () => {
    it("1 слой → предупреждение о минимуме 2", () => {
      const r = calc({ floorArea: 6, wallHeight: 200, roomPerimeter: 10, masticType: 0, layers: 1 });
      expect(r.warnings.some(w => w.includes("минимум 2 слоя"))).toBe(true);
    });

    it("3 слоя → больше расход", () => {
      const r = calc({ floorArea: 6, wallHeight: 200, roomPerimeter: 10, masticType: 0, layers: 3 });
      // masticKg=8*1.0*3=24, buckets=ceil(24/15)=2
      expect(findMaterial(r, "мастика")!.purchaseQty).toBe(2);
    });
  });

  describe("Сопутствующие материалы", () => {
    it("лента гидроизоляционная", () => {
      const r = calc({ floorArea: 6, wallHeight: 200, roomPerimeter: 10, masticType: 0, layers: 2 });
      const tape = findMaterial(r, "лента");
      expect(tape).toBeDefined();
      // tapeLength=10+(10*1.2)=22
      expect(tape!.quantity).toBeCloseTo(22, 0);
    });

    it("герметик силиконовый", () => {
      const r = calc({ floorArea: 6, wallHeight: 200, roomPerimeter: 10, masticType: 0, layers: 2 });
      const sealant = findMaterial(r, "силиконовый");
      expect(sealant).toBeDefined();
      // sealantCartridges=ceil(10/6)=2, +1=3
      expect(sealant!.purchaseQty).toBe(3);
    });

    it("грунтовка адгезионная для цементной мастики", () => {
      const r = calc({ floorArea: 6, wallHeight: 200, roomPerimeter: 10, masticType: 0, layers: 2 });
      const primer = findMaterial(r, "Грунтовка адгезионная");
      expect(primer).toBeDefined();
    });
  });

  describe("Стандартные предупреждения", () => {
    it("всегда содержит рекомендацию о высыхании", () => {
      const r = calc({ floorArea: 6, wallHeight: 200, roomPerimeter: 10, masticType: 0, layers: 2 });
      expect(r.warnings.some(w => w.includes("4–6 часов"))).toBe(true);
      expect(r.warnings.some(w => w.includes("24–72 часа"))).toBe(true);
    });
  });
});
