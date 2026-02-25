import { describe, it, expect } from "vitest";
import { ceilingInsulationDef } from "../formulas/ceiling-insulation";
import { findMaterial, checkInvariants } from "./_helpers";

const calc = ceilingInsulationDef.calculate.bind(ceilingInsulationDef);

describe("Утепление потолка", () => {
  describe("Минвата плиты", () => {
    it("30 м², 100 мм, 1 слой", () => {
      const r = calc({ area: 30, thickness: 100, insulationType: 0, layers: 1 });
      checkInvariants(r);
      // areaWithReserve=31.5, packs=ceil(31.5/6)*1=6
      expect(findMaterial(r, "Минвата плиты")!.purchaseQty).toBe(6);
    });

    it("2 слоя → удвоение", () => {
      const r = calc({ area: 30, thickness: 100, insulationType: 0, layers: 2 });
      // packs=ceil(31.5/6)*2=12
      expect(findMaterial(r, "Минвата плиты")!.purchaseQty).toBe(12);
    });

    it("пароизоляция включена", () => {
      const r = calc({ area: 30, thickness: 100, insulationType: 0, layers: 1 });
      expect(findMaterial(r, "Пароизоляция")).toBeDefined();
      expect(findMaterial(r, "Лента бутиловая")).toBeDefined();
    });
  });

  describe("Минвата рулон", () => {
    it("30 м², 100 мм → рулон 5 м²", () => {
      const r = calc({ area: 30, thickness: 100, insulationType: 1, layers: 1 });
      // areaWithReserve=31.5, rolls=ceil(31.5/5)=7
      expect(findMaterial(r, "Минвата рулон")!.purchaseQty).toBe(7);
    });

    it("50 мм → рулон 9 м²", () => {
      const r = calc({ area: 30, thickness: 50, insulationType: 1, layers: 1 });
      // rolls=ceil(31.5/9)=4
      expect(findMaterial(r, "Минвата рулон")!.purchaseQty).toBe(4);
    });
  });

  describe("ЭППС", () => {
    it("30 м², 100 мм", () => {
      const r = calc({ area: 30, thickness: 100, insulationType: 2, layers: 1 });
      // plates=ceil(31.5/0.72)=44
      expect(findMaterial(r, "ЭППС")!.purchaseQty).toBe(44);
    });

    it("< 100 мм → предупреждение", () => {
      const r = calc({ area: 30, thickness: 50, insulationType: 2, layers: 1 });
      expect(r.warnings.some(w => w.includes("100 мм"))).toBe(true);
    });

    it("нет пароизоляции, но предупреждение о вентиляции", () => {
      const r = calc({ area: 30, thickness: 100, insulationType: 2, layers: 1 });
      expect(findMaterial(r, "Пароизоляция")).toBeUndefined();
      expect(r.warnings.some(w => w.includes("вентиляц"))).toBe(true);
    });
  });

  describe("Эковата", () => {
    it("30 м², 100 мм → мешки 15 кг", () => {
      const r = calc({ area: 30, thickness: 100, insulationType: 3, layers: 1 });
      // volume=30*0.1=3 м³, kg=3*35=105, bags=ceil(105/15)=7
      expect(findMaterial(r, "Эковата")!.purchaseQty).toBe(7);
    });

    it("предупреждение о задувке", () => {
      const r = calc({ area: 30, thickness: 100, insulationType: 3, layers: 1 });
      expect(r.warnings.some(w => w.includes("задувк"))).toBe(true);
    });
  });
});
