import { describe, it, expect } from "vitest";
import { warmFloorPipesDef } from "../formulas/warm-floor-pipes";
import { findMaterial, checkInvariants } from "./_helpers";

const calc = warmFloorPipesDef.calculate.bind(warmFloorPipesDef);

describe("Калькулятор водяного тёплого пола", () => {
  describe("20 м², шаг 200, PEX-a", () => {
    // area=20, usefulArea=20*0.85=17, pipeStep=200mm=0.2m
    // pipeLength = 17/0.2 + 3 = 85 + 3 = 88
    // totalPipe = 88 * 1.05 = 92.4
    // circuits = ceil(88/80) = 2
    // coils = ceil(92.4/200) = 1
    const result = calc({
      inputMode: 0,
      length: 5,
      width: 4,
      pipeStep: 200,
      pipeType: 0,
    });

    it("длина трубы ~88 м.п.", () => {
      expect(result.totals.pipeLength).toBeCloseTo(88, 0);
    });

    it("контуров = 2 (88 > 80)", () => {
      expect(result.totals.circuits).toBe(2);
    });

    it("бухт = 1 (92.4 м ≤ 200)", () => {
      expect(result.totals.coils).toBe(1);
    });

    it("утеплитель ЭППС присутствует", () => {
      const insul = findMaterial(result, "ЭППС");
      expect(insul).toBeDefined();
      // area*1.05/0.72 = 20*1.05/0.72 = 29.17 → ceil = 30
      expect(insul!.purchaseQty).toBe(30);
    });

    it("демпферная лента присутствует", () => {
      const damper = findMaterial(result, "Демпферная");
      expect(damper).toBeDefined();
      // perimeter = 2*(5+4) = 18, 18*1.05/25 = 0.756 → ceil = 1
      expect(damper!.purchaseQty).toBe(1);
    });

    it("якорные скобы присутствуют", () => {
      const clips = findMaterial(result, "Якорные скобы");
      expect(clips).toBeDefined();
      // totalPipe=92.4, 92.4/0.3=308, *1.05=323.4 → ceil/100*100 = 400
      expect(clips!.purchaseQty).toBeGreaterThanOrEqual(300);
    });

    it("коллекторная группа на 2 контура", () => {
      const coll = findMaterial(result, "Коллекторная");
      expect(coll).toBeDefined();
      expect(coll!.name).toContain("2");
      expect(coll!.purchaseQty).toBe(1);
    });

    it("стяжка ЦПС присутствует", () => {
      const screed = findMaterial(result, "Стяжка");
      expect(screed).toBeDefined();
      // 20 * 0.05 * 1500 / 25 = 60 мешков
      expect(screed!.purchaseQty).toBe(60);
    });

    it("предупреждение о контурах", () => {
      expect(result.warnings.some((w) => w.includes("контур"))).toBe(true);
    });

    it("инварианты", () => {
      checkInvariants(result);
    });
  });

  describe("Большая площадь 60 м² → несколько контуров", () => {
    // area=60, usefulArea=60*0.85=51, pipeStep=200mm=0.2m
    // pipeLength = 51/0.2 + 3 = 255 + 3 = 258
    // circuits = ceil(258/80) = 4
    // totalPipe = 258 * 1.05 = 270.9
    // coils = ceil(270.9/200) = 2
    const result = calc({
      inputMode: 0,
      length: 10,
      width: 6,
      pipeStep: 200,
      pipeType: 1,
    });

    it("контуров ≥ 4 для 60 м²", () => {
      expect(result.totals.circuits).toBeGreaterThanOrEqual(4);
    });

    it("бухт ≥ 2", () => {
      expect(result.totals.coils).toBeGreaterThanOrEqual(2);
    });

    it("предупреждение о площади > 40 м²", () => {
      expect(result.warnings.some((w) => w.includes("40 м²"))).toBe(true);
    });

    it("труба PEX-b в названии", () => {
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
