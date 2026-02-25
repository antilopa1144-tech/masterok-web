import { describe, it, expect } from "vitest";
import { fenceDef } from "../formulas/fence";
import { findMaterial, checkInvariants } from "./_helpers";

const calc = fenceDef.calculate.bind(fenceDef);

describe("Забор", () => {
  describe("Профнастил, 50 м, высота 2 м, шаг 2.5 м, 1 ворота, 1 калитка", () => {
    it("netLength = 50 - 4*1 - 1*1 = 45", () => {
      const r = calc({ fenceLength: 50, fenceHeight: 2, fenceType: 0, postStep: 2.5, gatesCount: 1, wicketsCount: 1 });
      checkInvariants(r);
      expect(r.totals.netLength).toBe(45);
    });

    it("столбы: ceil(45/2.5)+1 + 1*2 + 1*2 = 19+1+2+2 = 23", () => {
      // Note: ceil(45/2.5) = ceil(18) = 18, +1 = 19, +gates*2(2)+wickets*2(2) = 23
      const r = calc({ fenceLength: 50, fenceHeight: 2, fenceType: 0, postStep: 2.5, gatesCount: 1, wicketsCount: 1 });
      const netLength = 45;
      const postsCount = Math.ceil(netLength / 2.5) + 1 + 1 * 2 + 1 * 2;
      expect(r.totals.postsCount).toBe(postsCount);
      const posts = findMaterial(r, "Столб профтруба");
      expect(posts).toBeDefined();
      expect(posts!.purchaseQty).toBe(postsCount);
    });

    it("профлист: ceil(45/1.15*1.02)", () => {
      const r = calc({ fenceLength: 50, fenceHeight: 2, fenceType: 0, postStep: 2.5, gatesCount: 1, wicketsCount: 1 });
      const netLength = 45;
      const expectedSheets = Math.ceil((netLength / 1.15) * 1.02);
      const sheets = findMaterial(r, "Профнастил");
      expect(sheets).toBeDefined();
      expect(sheets!.purchaseQty).toBe(expectedSheets);
    });

    it("лаги: h=2 ≤ 2 → 2 лаги/пролёт, lagSpans = ceil(45/2.5) = 18", () => {
      const r = calc({ fenceLength: 50, fenceHeight: 2, fenceType: 0, postStep: 2.5, gatesCount: 1, wicketsCount: 1 });
      const lagSpans = Math.ceil(45 / 2.5);
      const lagsCount = lagSpans * 2;
      const lagsLm = lagsCount * 2.5;
      const lags = findMaterial(r, "Лага профтруба");
      expect(lags).toBeDefined();
      expect(lags!.purchaseQty).toBe(Math.ceil(lagsLm * 1.05));
    });

    it("саморезы кровельные: sheets*7, purchaseQty кратно 200", () => {
      const r = calc({ fenceLength: 50, fenceHeight: 2, fenceType: 0, postStep: 2.5, gatesCount: 1, wicketsCount: 1 });
      const netLength = 45;
      const sheetsNeeded = Math.ceil((netLength / 1.15) * 1.02);
      const screws = sheetsNeeded * 7;
      const screwMat = findMaterial(r, "Саморезы кровельные");
      expect(screwMat).toBeDefined();
      expect(screwMat!.purchaseQty).toBe(Math.ceil(screws / 200) * 200);
    });

    it("грунтовка по металлу: ceil(50/20)", () => {
      const r = calc({ fenceLength: 50, fenceHeight: 2, fenceType: 0, postStep: 2.5, gatesCount: 1, wicketsCount: 1 });
      const primer = findMaterial(r, "Грунтовка по металлу");
      expect(primer).toBeDefined();
      expect(primer!.purchaseQty).toBe(Math.ceil(50 / 20));
    });
  });

  describe("Высота > 2 м → 3 лаги", () => {
    it("h=2.5 → 3 лаги на пролёт", () => {
      const r = calc({ fenceLength: 50, fenceHeight: 2.5, fenceType: 0, postStep: 2.5, gatesCount: 1, wicketsCount: 1 });
      const netLength = 45;
      const lagSpans = Math.ceil(netLength / 2.5);
      const lagsCount = lagSpans * 3;
      const lagsLm = lagsCount * 2.5;
      const lags = findMaterial(r, "Лага профтруба");
      expect(lags!.purchaseQty).toBe(Math.ceil(lagsLm * 1.05));
    });
  });

  describe("Сетка-рабица", () => {
    it("рулоны: ceil(netLength/10)", () => {
      const r = calc({ fenceLength: 50, fenceHeight: 2, fenceType: 1, postStep: 2.5, gatesCount: 1, wicketsCount: 1 });
      checkInvariants(r);
      const netLength = 45;
      const expectedRolls = Math.ceil(netLength / 10);
      const mesh = findMaterial(r, "Сетка-рабица");
      expect(mesh).toBeDefined();
      expect(mesh!.purchaseQty).toBe(expectedRolls);
    });

    it("натяжная проволока: netLength * lagsPerSpan (2) * 1.05", () => {
      const r = calc({ fenceLength: 50, fenceHeight: 2, fenceType: 1, postStep: 2.5, gatesCount: 1, wicketsCount: 1 });
      const netLength = 45;
      const wire = findMaterial(r, "Натяжная проволока");
      expect(wire).toBeDefined();
      expect(wire!.purchaseQty).toBe(Math.ceil(netLength * 2 * 1.05));
    });

    it("сетка-рабица НЕ имеет лаг", () => {
      const r = calc({ fenceLength: 50, fenceHeight: 2, fenceType: 1, postStep: 2.5, gatesCount: 1, wicketsCount: 1 });
      expect(findMaterial(r, "Лага профтруба")).toBeUndefined();
    });
  });

  describe("Деревянный штакетник", () => {
    it("штакетины: ceil(netLength/(0.1+0.03)*1.05)", () => {
      const r = calc({ fenceLength: 50, fenceHeight: 2, fenceType: 2, postStep: 2.5, gatesCount: 1, wicketsCount: 1 });
      checkInvariants(r);
      const netLength = 45;
      const expectedSlats = Math.ceil((netLength / (0.1 + 0.03)) * 1.05);
      const slats = findMaterial(r, "Штакетник деревянный");
      expect(slats).toBeDefined();
      expect(slats!.purchaseQty).toBe(expectedSlats);
    });

    it("антисептик: woodArea=netLength*h*2, liters=woodArea*0.15*1.15, cans=ceil(liters/5)", () => {
      const r = calc({ fenceLength: 50, fenceHeight: 2, fenceType: 2, postStep: 2.5, gatesCount: 1, wicketsCount: 1 });
      const netLength = 45;
      const woodArea = netLength * 2 * 2;
      const liters = woodArea * 0.15 * 1.15;
      const expectedCans = Math.ceil(liters / 5);
      const antiseptic = findMaterial(r, "Антисептик для дерева");
      expect(antiseptic).toBeDefined();
      expect(antiseptic!.purchaseQty).toBe(expectedCans);
    });

    it("предупреждение об обработке антисептиком", () => {
      const r = calc({ fenceLength: 50, fenceHeight: 2, fenceType: 2, postStep: 2.5, gatesCount: 1, wicketsCount: 1 });
      expect(r.warnings.some(w => w.includes("антисептиком"))).toBe(true);
    });
  });

  describe("Ворота и калитки", () => {
    it("ворота > 0 → предупреждение об усиленных столбах", () => {
      const r = calc({ fenceLength: 50, fenceHeight: 2, fenceType: 0, postStep: 2.5, gatesCount: 2, wicketsCount: 1 });
      expect(r.warnings.some(w => w.includes("усиленных столбов"))).toBe(true);
    });

    it("0 ворот → нет предупреждения о столбах", () => {
      const r = calc({ fenceLength: 50, fenceHeight: 2, fenceType: 0, postStep: 2.5, gatesCount: 0, wicketsCount: 1 });
      expect(r.warnings.some(w => w.includes("усиленных столбов"))).toBe(false);
    });
  });

  describe("Бетон и заглушки", () => {
    it("бетон: postsCount*0.03 м³, запас 10%", () => {
      const r = calc({ fenceLength: 50, fenceHeight: 2, fenceType: 0, postStep: 2.5, gatesCount: 1, wicketsCount: 1 });
      const postsCount = r.totals.postsCount;
      const concreteM3 = postsCount * 0.03;
      const expectedConcrete = Math.ceil(concreteM3 * 1.1 * 10) / 10;
      const concrete = findMaterial(r, "Бетон М200");
      expect(concrete).toBeDefined();
      expect(concrete!.purchaseQty).toBe(expectedConcrete);
    });

    it("заглушки: ceil(postsCount*1.05)", () => {
      const r = calc({ fenceLength: 50, fenceHeight: 2, fenceType: 0, postStep: 2.5, gatesCount: 1, wicketsCount: 1 });
      const postsCount = r.totals.postsCount;
      const expectedCaps = Math.ceil(postsCount * 1.05);
      const caps = findMaterial(r, "Заглушки для столбов");
      expect(caps).toBeDefined();
      expect(caps!.purchaseQty).toBe(expectedCaps);
    });
  });
});
