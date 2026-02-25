import { describe, it, expect } from "vitest";
import { selfLevelingDef } from "../formulas/self-leveling";
import { findMaterial, checkInvariants } from "./_helpers";

const calc = selfLevelingDef.calculate.bind(selfLevelingDef);

describe("Наливной пол", () => {
  describe("По размерам помещения", () => {
    it("5×4 м, 10 мм, выравнивающая, мешки 25 кг", () => {
      const r = calc({ inputMode: 0, length: 5, width: 4, thickness: 10, mixtureType: 0, bagWeight: 25 });
      checkInvariants(r);
      // area=20, kgPerSqm=1.6*10=16, totalKg=20*16*1.05=336, bags=ceil(336/25)=14
      const mix = findMaterial(r, "Выравнивающая");
      expect(mix).toBeDefined();
      expect(mix!.purchaseQty).toBe(14);
      expect(r.totals.area).toBe(20);
    });
  });

  describe("По площади", () => {
    it("inputMode=1, area=20", () => {
      const r = calc({ inputMode: 1, area: 20, thickness: 10, mixtureType: 0, bagWeight: 25 });
      expect(r.totals.area).toBe(20);
      expect(findMaterial(r, "мешки")!.purchaseQty).toBe(14);
    });
  });

  describe("Тип смеси", () => {
    it("финишная — 1.4 кг/м²/мм", () => {
      const r = calc({ inputMode: 1, area: 20, thickness: 10, mixtureType: 1, bagWeight: 25 });
      // kgPerSqm=1.4*10=14, totalKg=20*14*1.05=294, bags=ceil(294/25)=12
      expect(findMaterial(r, "Финишная")!.purchaseQty).toBe(12);
    });

    it("быстросхватывающаяся — 1.8 кг/м²/мм", () => {
      const r = calc({ inputMode: 1, area: 20, thickness: 10, mixtureType: 2, bagWeight: 25 });
      // kgPerSqm=1.8*10=18, totalKg=20*18*1.05=378, bags=ceil(378/25)=16
      expect(findMaterial(r, "Быстросхватывающ")!.purchaseQty).toBe(16);
    });
  });

  describe("Сопутствующие материалы", () => {
    it("грунтовка включена", () => {
      const r = calc({ inputMode: 1, area: 20, thickness: 10, mixtureType: 0, bagWeight: 25 });
      const primer = findMaterial(r, "Грунтовка");
      expect(primer).toBeDefined();
      // primerL=20*0.15=3, cans=ceil(3/5)=1
      expect(primer!.purchaseQty).toBe(1);
    });

    it("демпферная лента включена", () => {
      const r = calc({ inputMode: 1, area: 20, thickness: 10, mixtureType: 0, bagWeight: 25 });
      const tape = findMaterial(r, "Демпферная");
      expect(tape).toBeDefined();
      // perimeter=ceil(sqrt(20)*4)=ceil(17.89)=18, rolls=ceil(18/25)=1
      expect(tape!.purchaseQty).toBe(1);
    });
  });

  describe("Предупреждения", () => {
    it("толщина < 5 мм + выравнивающая → предупреждение", () => {
      const r = calc({ inputMode: 1, area: 20, thickness: 4, mixtureType: 0, bagWeight: 25 });
      expect(r.warnings.some(w => w.includes("5 мм"))).toBe(true);
    });

    it("толщина > 30 мм + финишная → предупреждение", () => {
      const r = calc({ inputMode: 1, area: 20, thickness: 35, mixtureType: 1, bagWeight: 25 });
      expect(r.warnings.some(w => w.includes("30 мм"))).toBe(true);
    });

    it("площадь > 30 м² → деформационные швы", () => {
      const r = calc({ inputMode: 1, area: 40, thickness: 10, mixtureType: 0, bagWeight: 25 });
      expect(r.warnings.some(w => w.includes("деформационных швов"))).toBe(true);
    });
  });

  describe("Фасовка", () => {
    it("мешки 20 кг → больше мешков", () => {
      const r = calc({ inputMode: 1, area: 20, thickness: 10, mixtureType: 0, bagWeight: 20 });
      // totalKg=336, bags=ceil(336/20)=17
      expect(findMaterial(r, "мешки")!.purchaseQty).toBe(17);
    });
  });
});
