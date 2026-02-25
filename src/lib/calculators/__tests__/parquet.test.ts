import { describe, it, expect } from "vitest";
import { parquetDef } from "../formulas/parquet";
import { findMaterial, checkInvariants } from "./_helpers";

const calc = parquetDef.calculate.bind(parquetDef);

describe("Паркетная доска", () => {
  describe("Прямая укладка (+5%)", () => {
    it("5×4 м, упак. 1.892 м²", () => {
      const r = calc({ roomLength: 5, roomWidth: 4, layingMethod: 0, packArea: 1.892 });
      checkInvariants(r);
      // area=20, waste=1.05, areaWithWaste=21, packs=ceil(21/1.892)=ceil(11.10)=12
      const parq = findMaterial(r, "Паркетная");
      expect(parq).toBeDefined();
      expect(parq!.purchaseQty).toBe(12);
      expect(r.totals.wastePercent).toBeCloseTo(5);
    });
  });

  describe("Диагональная (+15%)", () => {
    it("5×4 м", () => {
      const r = calc({ roomLength: 5, roomWidth: 4, layingMethod: 1, packArea: 1.892 });
      // areaWithWaste=20*1.15=23, packs=ceil(23/1.892)=ceil(12.16)=13
      expect(findMaterial(r, "Паркетная")!.purchaseQty).toBe(13);
      expect(r.totals.wastePercent).toBeCloseTo(15);
    });
  });

  describe("Ёлочка (+20%)", () => {
    it("5×4 м", () => {
      const r = calc({ roomLength: 5, roomWidth: 4, layingMethod: 2, packArea: 1.892 });
      // areaWithWaste=20*1.20=24, packs=ceil(24/1.892)=ceil(12.68)=13
      expect(findMaterial(r, "Паркетная")!.purchaseQty).toBe(13);
      expect(r.totals.wastePercent).toBeCloseTo(20);
    });
  });

  describe("Сопутствующие материалы", () => {
    it("подложка с нахлёстом 10%", () => {
      const r = calc({ roomLength: 5, roomWidth: 4, layingMethod: 0, packArea: 1.892 });
      // underlayArea=20*1.10=22, rolls=ceil(22/10)=3
      const underlay = findMaterial(r, "Подложка");
      expect(underlay).toBeDefined();
      expect(underlay!.purchaseQty).toBe(3);
    });

    it("плинтус — периметр минус дверной проём", () => {
      const r = calc({ roomLength: 5, roomWidth: 4, layingMethod: 0, packArea: 1.892 });
      // perimeter=18, plinthLength=(18-0.9)*1.05=17.955, pcs=ceil(17.955/2.5)=ceil(7.182)=8
      const plinth = findMaterial(r, "Плинтус");
      expect(plinth).toBeDefined();
      expect(plinth!.purchaseQty).toBe(8);
    });

    it("клинья распорные", () => {
      const r = calc({ roomLength: 5, roomWidth: 4, layingMethod: 0, packArea: 1.892 });
      // wedges=ceil(18/0.5)=36, purchaseQty=ceil(36/10)*10=40
      const wedges = findMaterial(r, "Клинья");
      expect(wedges).toBeDefined();
      expect(wedges!.purchaseQty).toBe(40);
    });

    it("масло/лак включён", () => {
      const r = calc({ roomLength: 5, roomWidth: 4, layingMethod: 0, packArea: 1.892 });
      expect(findMaterial(r, "Масло")).toBeDefined();
    });

    it("скотч и порожек", () => {
      const r = calc({ roomLength: 5, roomWidth: 4, layingMethod: 0, packArea: 1.892 });
      expect(findMaterial(r, "Скотч")).toBeDefined();
      expect(findMaterial(r, "Порожек")).toBeDefined();
    });
  });

  describe("Предупреждения", () => {
    it("площадь < 5 м² → предупреждение об отходах", () => {
      const r = calc({ roomLength: 2, roomWidth: 2, layingMethod: 0, packArea: 1.892 });
      expect(r.warnings.some(w => w.includes("Маленькая площадь"))).toBe(true);
    });

    it("ёлочка → предупреждение", () => {
      const r = calc({ roomLength: 5, roomWidth: 4, layingMethod: 2, packArea: 1.892 });
      expect(r.warnings.some(w => w.includes("ёлочкой"))).toBe(true);
    });
  });
});
