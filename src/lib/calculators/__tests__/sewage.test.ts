import { describe, it, expect } from "vitest";
import { sewageDef } from "../formulas/sewage";
import { findMaterial, checkInvariants } from "./_helpers";

const calc = sewageDef.calculate.bind(sewageDef);

describe("Калькулятор септика", () => {
  describe("4 человека, бетонные кольца, 2 камеры, песок", () => {
    // dailyVolume = 4 * 0.2 = 0.8 м³/сут
    // totalVolume = 0.8 * 3 = 2.4 м³
    // volumePerChamber = 2.4 / 2 = 1.2 м³
    // ringsPerChamber = ceil(1.2 / 0.71) = 2
    // totalRings = 2 * 2 = 4
    const result = calc({
      residents: 4,
      septikType: 0,
      chambersCount: 2,
      pipeLength: 10,
      groundType: 0,
    });

    it("объём септика = 2.4 м³", () => {
      expect(result.totals.totalVolume).toBeCloseTo(2.4, 2);
    });

    it("4 бетонных кольца (2 камеры × 2 кольца)", () => {
      const rings = findMaterial(result, "КС 10-9");
      expect(rings).toBeDefined();
      expect(rings!.purchaseQty).toBe(4);
    });

    it("2 днища КЦД-10", () => {
      const bottoms = findMaterial(result, "КЦД-10");
      expect(bottoms).toBeDefined();
      expect(bottoms!.purchaseQty).toBe(2);
    });

    it("2 крышки КЦП 1-10", () => {
      const lids = findMaterial(result, "КЦП 1-10");
      expect(lids).toBeDefined();
      expect(lids!.purchaseQty).toBe(2);
    });

    it("2 люка", () => {
      const manholes = findMaterial(result, "Люк");
      expect(manholes).toBeDefined();
      expect(manholes!.purchaseQty).toBe(2);
    });

    it("4 уплотнительных кольца", () => {
      const seals = findMaterial(result, "уплотнительное");
      expect(seals).toBeDefined();
      expect(seals!.purchaseQty).toBe(4);
    });

    it("трубы 110 мм присутствуют", () => {
      const pipes = findMaterial(result, "110 мм (3 м)");
      expect(pipes).toBeDefined();
      // 10 * 1.05 / 3 = 3.5 → ceil = 4
      expect(pipes!.purchaseQty).toBe(4);
    });

    it("отводы = 3 шт", () => {
      const elbows = findMaterial(result, "Отвод");
      expect(elbows).toBeDefined();
      expect(elbows!.purchaseQty).toBe(3);
    });

    it("тройники = 2 шт", () => {
      const tees = findMaterial(result, "Тройник");
      expect(tees).toBeDefined();
      expect(tees!.purchaseQty).toBe(2);
    });

    it("нет щебня для песчаного грунта", () => {
      const gravel = findMaterial(result, "Щебень");
      expect(gravel).toBeUndefined();
    });

    it("нет предупреждения о глине", () => {
      expect(result.warnings.some((w) => w.includes("Глинистый"))).toBe(false);
    });

    it("инварианты", () => {
      checkInvariants(result);
    });
  });

  describe("Пластиковый септик", () => {
    // dailyVolume = 4 * 0.2 = 0.8 м³/сут
    // totalVolume = 0.8 * 3 = 2.4 м³ → ~2400 л
    const result = calc({
      residents: 4,
      septikType: 1,
      chambersCount: 2,
      pipeLength: 8,
      groundType: 0,
    });

    it("1 пластиковый септик", () => {
      const septik = findMaterial(result, "Септик пластиковый");
      expect(septik).toBeDefined();
      expect(septik!.purchaseQty).toBe(1);
    });

    it("объём в названии ≥ 2400 л", () => {
      const septik = findMaterial(result, "Септик пластиковый");
      expect(septik!.name).toContain("2400");
    });

    it("песок для обсыпки присутствует", () => {
      const sand = findMaterial(result, "Песок");
      expect(sand).toBeDefined();
    });

    it("нет бетонных колец", () => {
      const rings = findMaterial(result, "КС 10-9");
      expect(rings).toBeUndefined();
    });

    it("инварианты", () => {
      checkInvariants(result);
    });
  });

  describe("Еврокубы", () => {
    // totalVolume = 4 * 0.2 * 3 = 2.4 → ceil(2.4 / 0.8) = 3
    const result = calc({
      residents: 4,
      septikType: 2,
      chambersCount: 2,
      pipeLength: 10,
      groundType: 0,
    });

    it("еврокубов = 3 шт", () => {
      const cubes = findMaterial(result, "Еврокуб");
      expect(cubes).toBeDefined();
      expect(cubes!.purchaseQty).toBe(3);
    });

    it("инварианты", () => {
      checkInvariants(result);
    });
  });

  describe("Глинистый грунт → предупреждение + щебень", () => {
    const result = calc({
      residents: 4,
      septikType: 0,
      chambersCount: 2,
      pipeLength: 10,
      groundType: 2,
    });

    it("предупреждение о глинистом грунте", () => {
      expect(result.warnings.some((w) => w.includes("Глинистый грунт"))).toBe(true);
    });

    it("щебень = 4 м³ для глины", () => {
      const gravel = findMaterial(result, "Щебень");
      expect(gravel).toBeDefined();
      expect(gravel!.purchaseQty).toBe(4);
    });

    it("геотекстиль присутствует", () => {
      const geo = findMaterial(result, "Геотекстиль");
      expect(geo).toBeDefined();
    });

    it("инварианты", () => {
      checkInvariants(result);
    });
  });

  describe("Суглинок → щебень 2 м³ + геотекстиль", () => {
    const result = calc({
      residents: 4,
      septikType: 0,
      chambersCount: 2,
      pipeLength: 10,
      groundType: 1,
    });

    it("щебень = 2 м³ для суглинка", () => {
      const gravel = findMaterial(result, "Щебень");
      expect(gravel).toBeDefined();
      expect(gravel!.purchaseQty).toBe(2);
    });

    it("геотекстиль присутствует", () => {
      const geo = findMaterial(result, "Геотекстиль");
      expect(geo).toBeDefined();
    });
  });

  describe("Однокамерный → предупреждение", () => {
    const result = calc({
      residents: 4,
      septikType: 0,
      chambersCount: 1,
      pipeLength: 10,
      groundType: 0,
    });

    it("предупреждение о минимальной очистке", () => {
      expect(result.warnings.some((w) => w.includes("Однокамерный"))).toBe(true);
    });

    it("кольца только для 1 камеры", () => {
      const rings = findMaterial(result, "КС 10-9");
      expect(rings).toBeDefined();
      // totalVolume=2.4 / 1 = 2.4, ceil(2.4/0.71) = 4 rings
      expect(rings!.purchaseQty).toBe(4);
    });

    it("1 днище", () => {
      const bottoms = findMaterial(result, "КЦД-10");
      expect(bottoms!.purchaseQty).toBe(1);
    });

    it("инварианты", () => {
      checkInvariants(result);
    });
  });

  describe("> 10 человек → предупреждение о ЛОС", () => {
    const result = calc({
      residents: 12,
      septikType: 0,
      chambersCount: 3,
      pipeLength: 15,
      groundType: 0,
    });

    it("предупреждение о ЛОС", () => {
      expect(result.warnings.some((w) => w.includes("ЛОС"))).toBe(true);
    });

    it("объём = 12 * 0.2 * 3 = 7.2 м³", () => {
      expect(result.totals.totalVolume).toBeCloseTo(7.2, 2);
    });

    it("инварианты", () => {
      checkInvariants(result);
    });
  });
});
