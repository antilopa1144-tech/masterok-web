import { describe, it, expect } from "vitest";
import { fenceDef } from "../formulas/fence";
import { findMaterial, checkInvariants, withBasicAccuracy } from "./_helpers";

const calc = withBasicAccuracy(fenceDef.calculate.bind(fenceDef));

describe("Забор", () => {
  describe("Профнастил, 50 м, высота 2 м, шаг 2.5 м, 1 ворота, 1 калитка", () => {
    it("netLength = 50 - 4*1 - 1*1 = 45", () => {
      const r = calc({ fenceLength: 50, fenceHeight: 2, fenceType: 0, postStep: 2.5, gatesCount: 1, wicketsCount: 1 });
      checkInvariants(r);
      expect(r.totals.netLength).toBeCloseTo(45, 1);
    });

    it("столбы: ceil(45/2.5)+1 + 1*2 + 1*2 = 23", () => {
      const r = calc({ fenceLength: 50, fenceHeight: 2, fenceType: 0, postStep: 2.5, gatesCount: 1, wicketsCount: 1 });
      const postsCount = Math.ceil(45 / 2.5) + 1 + 1 * 2 + 1 * 2;
      expect(r.totals.postsCount).toBe(postsCount);
      // Engine: "Столбы 60×60 мм (2.9 м)"
      const posts = findMaterial(r, "Столбы 60×60");
      expect(posts).toBeDefined();
      expect(posts!.quantity).toBe(postsCount);
    });

    it("профнастил присутствует", () => {
      const r = calc({ fenceLength: 50, fenceHeight: 2, fenceType: 0, postStep: 2.5, gatesCount: 1, wicketsCount: 1 });
      // Engine: "Профнастил (2 м)"
      const sheets = findMaterial(r, "Профнастил");
      expect(sheets).toBeDefined();
    });

    it("лаги 40×20 мм: h=2 <= 2 → 2 лаги/пролёт", () => {
      const r = calc({ fenceLength: 50, fenceHeight: 2, fenceType: 0, postStep: 2.5, gatesCount: 1, wicketsCount: 1 });
      // Engine: "Лаги 40×20 мм"
      const lags = findMaterial(r, "Лаги 40×20");
      expect(lags).toBeDefined();
      const lagSpans = Math.ceil(45 / 2.5);
      const lagsCount = lagSpans * 2;
      expect(lags!.quantity).toBe(lagsCount);
    });

    it("саморезы кровельные присутствуют", () => {
      const r = calc({ fenceLength: 50, fenceHeight: 2, fenceType: 0, postStep: 2.5, gatesCount: 1, wicketsCount: 1 });
      // Engine: "Саморезы кровельные (упаковка 200 шт)"
      expect(findMaterial(r, "Саморезы кровельные")).toBeDefined();
    });

    it("грунт-спрей для срезов присутствует", () => {
      const r = calc({ fenceLength: 50, fenceHeight: 2, fenceType: 0, postStep: 2.5, gatesCount: 1, wicketsCount: 1 });
      // Engine: "Грунт-спрей для срезов"
      expect(findMaterial(r, "Грунт-спрей")).toBeDefined();
    });
  });

  describe("Высота > 2 м → 3 лаги", () => {
    it("h=2.5 → 3 лаги на пролёт", () => {
      const r = calc({ fenceLength: 50, fenceHeight: 2.5, fenceType: 0, postStep: 2.5, gatesCount: 1, wicketsCount: 1 });
      const netLength = 45;
      const lagSpans = Math.ceil(netLength / 2.5);
      const lagsCount = lagSpans * 3;
      const lags = findMaterial(r, "Лаги 40×20");
      expect(lags!.quantity).toBe(lagsCount);
    });
  });

  describe("Сетка-рабица (fenceType=1)", () => {
    it("сетка-рабица присутствует", () => {
      const r = calc({ fenceLength: 50, fenceHeight: 2, fenceType: 1, postStep: 2.5, gatesCount: 1, wicketsCount: 1 });
      checkInvariants(r);
      // Engine: "Сетка-рабица (2 м, рулон 10 м)"
      const mesh = findMaterial(r, "Сетка-рабица");
      expect(mesh).toBeDefined();
    });

    it("проволока натяжная присутствует", () => {
      const r = calc({ fenceLength: 50, fenceHeight: 2, fenceType: 1, postStep: 2.5, gatesCount: 1, wicketsCount: 1 });
      // Engine: "Проволока натяжная"
      const wire = findMaterial(r, "Проволока натяжная");
      expect(wire).toBeDefined();
    });
  });

  describe("Деревянный штакетник (fenceType=2)", () => {
    it("штакетник присутствует", () => {
      const r = calc({ fenceLength: 50, fenceHeight: 2, fenceType: 2, postStep: 2.5, gatesCount: 1, wicketsCount: 1 });
      checkInvariants(r);
      // Engine: "Деревянный штакетник (2 м)"
      const slats = findMaterial(r, "Деревянный штакетник");
      expect(slats).toBeDefined();
    });

    it("антисептик присутствует", () => {
      const r = calc({ fenceLength: 50, fenceHeight: 2, fenceType: 2, postStep: 2.5, gatesCount: 1, wicketsCount: 1 });
      // Engine: "Антисептик (5 л)"
      expect(findMaterial(r, "Антисептик")).toBeDefined();
    });
  });

  describe("Ворота и калитки", () => {
    it("ворота > 0 → предупреждение об усиленных столбах", () => {
      const r = calc({ fenceLength: 50, fenceHeight: 2, fenceType: 0, postStep: 2.5, gatesCount: 2, wicketsCount: 1 });
      // Engine: "При наличии ворот рекомендуются усиленные столбы 80×80 или 100×100 мм"
      expect(r.warnings.some(w => w.includes("усиленные столбы"))).toBe(true);
    });

    it("0 ворот → нет предупреждения", () => {
      const r = calc({ fenceLength: 50, fenceHeight: 2, fenceType: 0, postStep: 2.5, gatesCount: 0, wicketsCount: 1 });
      expect(r.warnings.some(w => w.includes("усиленные столбы"))).toBe(false);
    });
  });

  describe("Бетон и заглушки", () => {
    it("бетон для столбов присутствует", () => {
      const r = calc({ fenceLength: 50, fenceHeight: 2, fenceType: 0, postStep: 2.5, gatesCount: 1, wicketsCount: 1 });
      // Engine: "Бетон для столбов"
      const concrete = findMaterial(r, "Бетон для столбов");
      expect(concrete).toBeDefined();
    });

    it("заглушки: ceil(postsCount*1.05)", () => {
      const r = calc({ fenceLength: 50, fenceHeight: 2, fenceType: 0, postStep: 2.5, gatesCount: 1, wicketsCount: 1 });
      const postsCount = r.totals.postsCount;
      const expectedCaps = Math.ceil(postsCount * 1.05);
      // Engine: "Заглушки для столбов"
      const caps = findMaterial(r, "Заглушки для столбов");
      expect(caps).toBeDefined();
      expect(caps!.quantity).toBe(expectedCaps);
    });
  });
});
