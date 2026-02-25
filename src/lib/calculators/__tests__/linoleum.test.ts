import { describe, it, expect } from "vitest";
import { linoleumDef } from "../formulas/linoleum";
import { findMaterial, checkInvariants } from "./_helpers";

const calc = linoleumDef.calculate.bind(linoleumDef);

describe("Линолеум", () => {
  describe("Без стыка", () => {
    it("5×4 м, рулон 4 м — укладка без стыка", () => {
      const r = calc({ roomLength: 5, roomWidth: 4, rollWidth: 4.0, hasPattern: 0 });
      checkInvariants(r);
      // longerSide=5, shorterSide=4, strips=ceil(4/4)=1, stripLength=5.1
      // totalLinearM=5.1, usefulArea=20
      expect(r.totals.stripsNeeded).toBe(1);
      const lino = findMaterial(r, "Линолеум");
      expect(lino).toBeDefined();
      expect(lino!.quantity).toBeCloseTo(5.1, 1);
    });
  });

  describe("Со стыком", () => {
    it("5×4 м, рулон 2.5 м → 2 полосы", () => {
      const r = calc({ roomLength: 5, roomWidth: 4, rollWidth: 2.5, hasPattern: 0 });
      // longerSide=5, shorterSide=4, strips=ceil(4/2.5)=2
      // totalLinearM=5.1*2=10.2
      expect(r.totals.stripsNeeded).toBe(2);
      expect(r.warnings.some(w => w.includes("2 полосы"))).toBe(true);
    });

    it("5×4 м, рулон 1.5 м → 3 полосы", () => {
      const r = calc({ roomLength: 5, roomWidth: 4, rollWidth: 1.5, hasPattern: 0 });
      expect(r.totals.stripsNeeded).toBe(3);
    });
  });

  describe("Раппорт", () => {
    it("с раппортом 30 см — дополнительный расход", () => {
      const r = calc({ roomLength: 5, roomWidth: 4, rollWidth: 2.5, hasPattern: 1, patternRepeat: 30 });
      // strips=2, first=5.1, second=5.1+0.3=5.4, total=10.5
      expect(findMaterial(r, "Линолеум")!.quantity).toBeCloseTo(10.5, 1);
    });

    it("без раппорта при 1 полосе — раппорт не влияет", () => {
      const r = calc({ roomLength: 5, roomWidth: 4, rollWidth: 4.0, hasPattern: 1, patternRepeat: 50 });
      // strips=1, hasPattern but stripsNeeded=1 → no pattern effect
      expect(findMaterial(r, "Линолеум")!.quantity).toBeCloseTo(5.1, 1);
    });
  });

  describe("Сопутствующие материалы", () => {
    it("плинтус ПВХ включён", () => {
      const r = calc({ roomLength: 5, roomWidth: 4, rollWidth: 3.5, hasPattern: 0 });
      const plinth = findMaterial(r, "Плинтус");
      expect(plinth).toBeDefined();
      // perimeter=18, pcs=ceil(18*1.05/2.5)=ceil(7.56)=8
      expect(plinth!.purchaseQty).toBe(8);
    });

    it("скотч/клей и порог включены", () => {
      const r = calc({ roomLength: 5, roomWidth: 4, rollWidth: 3.5, hasPattern: 0 });
      expect(findMaterial(r, "скотч")).toBeDefined();
      expect(findMaterial(r, "Порог")).toBeDefined();
    });
  });

  describe("Отходы", () => {
    it("предупреждение при отходах > 25%", () => {
      // 3×2 м, рулон 3.5 м → strips=1, area=6, totalArea=3.1*3.5=10.85
      // wastePercent=round((10.85-6)/6*100)=round(80.8)=81%
      const r = calc({ roomLength: 3, roomWidth: 2, rollWidth: 3.5, hasPattern: 0 });
      expect(r.warnings.some(w => w.includes("Отходы"))).toBe(true);
    });
  });

  describe("Ориентация", () => {
    it("рулон вдоль длинной стороны", () => {
      // 3×6 м → longer=6, shorter=3
      const r = calc({ roomLength: 3, roomWidth: 6, rollWidth: 3.5, hasPattern: 0 });
      // strips=ceil(3/3.5)=1, stripLength=6.1
      expect(r.totals.stripsNeeded).toBe(1);
      expect(findMaterial(r, "Линолеум")!.quantity).toBeCloseTo(6.1, 1);
    });
  });
});
