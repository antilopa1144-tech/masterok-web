import { describe, it, expect } from "vitest";
import { warmFloorPipesDef } from "../formulas/warm-floor-pipes";
import { findMaterial, checkInvariants } from "./_helpers";

const calc = warmFloorPipesDef.calculate.bind(warmFloorPipesDef);

describe("Калькулятор водяного тёплого пола", () => {
  describe("20 м², шаг 200, PEX-a", () => {
    const result = calc({
      inputMode: 0,
      length: 5,
      width: 4,
      pipeStep: 200,
      pipeType: 0,
    });

    it("длина трубы ~88 м.п.", () => {
      // Engine: usefulArea=20*0.85=17, pipeLength=17/0.2+3=88
      expect(result.totals.pipeLength).toBeCloseTo(88, 0);
    });

    it("контуров = 2 (88 > 80)", () => {
      expect(result.totals.circuits).toBe(2);
    });

    it("бухт = 1 (92.4 м <= 200)", () => {
      expect(result.totals.coils).toBe(1);
    });

    it("утеплитель ЭППС присутствует", () => {
      // Engine: "Утеплитель ЭППС (листы 1200×600)"
      const insul = findMaterial(result, "ЭППС");
      expect(insul).toBeDefined();
      // area*1.05/0.72 = 20*1.05/0.72 = 29.17 → ceil = 30
      expect(insul!.quantity).toBe(30);
    });

    it("демпферная лента присутствует", () => {
      // Engine: "Демпферная лента (рулоны)"
      const damper = findMaterial(result, "Демпферная");
      expect(damper).toBeDefined();
      // perimeter=2*(5+4)=18, 18*1.05/25=0.756 → ceil=1
      expect(damper!.quantity).toBe(1);
    });

    it("якорные клипсы присутствуют", () => {
      // Engine: "Якорные клипсы (упаковки по 100 шт)"
      const clips = findMaterial(result, "Якорные клипсы");
      expect(clips).toBeDefined();
    });

    it("коллектор на 2 контура", () => {
      // Engine: "Коллектор (2 контуров)"
      const coll = findMaterial(result, "Коллектор");
      expect(coll).toBeDefined();
      expect(coll!.name).toContain("2");
      expect(coll!.quantity).toBe(1);
    });

    it("стяжка полусухая присутствует", () => {
      // Engine: "Стяжка полусухая (мешки 25 кг)"
      const screed = findMaterial(result, "Стяжка полусухая");
      expect(screed).toBeDefined();
      // 20 * 0.05 * 1500 / 25 = 60 мешков
      expect(screed!.purchaseQty).toBe(60);
    });

    it("предупреждение о контурах (>80 м)", () => {
      // Engine: "Длина трубы более 80 м — рекомендуется несколько контуров"
      expect(result.warnings.some((w) => w.includes("контур"))).toBe(true);
    });

    it("труба PEX-a в названии", () => {
      // Engine: "Труба PEX-a (бухты 200 м)"
      const pipe = findMaterial(result, "PEX-a");
      expect(pipe).toBeDefined();
    });

    it("инварианты", () => {
      checkInvariants(result);
    });
  });

  describe("Большая площадь 60 м²", () => {
    const result = calc({
      inputMode: 0,
      length: 10,
      width: 6,
      pipeStep: 200,
      pipeType: 1,
    });

    it("контуров >= 4 для 60 м²", () => {
      expect(result.totals.circuits).toBeGreaterThanOrEqual(4);
    });

    it("бухт >= 2", () => {
      expect(result.totals.coils).toBeGreaterThanOrEqual(2);
    });

    it("предупреждение о площади > 40 м²", () => {
      // Engine: "Площадь более 40 м² — рекомендуется профессиональный расчёт теплопотерь"
      expect(result.warnings.some((w) => w.includes("40 м²"))).toBe(true);
    });

    it("труба PEX-b в названии", () => {
      // Engine: "Труба PEX-b (бухты 200 м)"
      const pipe = findMaterial(result, "PEX-b");
      expect(pipe).toBeDefined();
    });

    it("инварианты", () => {
      checkInvariants(result);
    });
  });

  describe("По площади inputMode=1", () => {
    const result = calc({
      inputMode: 1,
      area: 25,
      pipeStep: 150,
      pipeType: 2,
    });

    it("площадь = 25 м²", () => {
      expect(result.totals.area).toBe(25);
    });

    it("полезная площадь = 21.25 м²", () => {
      expect(result.totals.usefulArea).toBeCloseTo(21.25, 2);
    });

    it("труба PE-RT в названии", () => {
      // Engine: "Труба PE-RT (бухты 200 м)"
      const pipe = findMaterial(result, "PE-RT");
      expect(pipe).toBeDefined();
    });

    it("шаг 150 мм → больше трубы, чем при 200", () => {
      const result200 = calc({
        inputMode: 1,
        area: 25,
        pipeStep: 200,
        pipeType: 2,
      });
      expect(result.totals.pipeLength).toBeGreaterThan(result200.totals.pipeLength);
    });

    it("инварианты", () => {
      checkInvariants(result);
    });
  });
});
