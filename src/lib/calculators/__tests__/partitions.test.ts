import { describe, it, expect } from "vitest";
import { partitionsDef } from "../formulas/partitions";
import { findMaterial, checkInvariants, withBasicAccuracy } from "./_helpers";

const calc = withBasicAccuracy(partitionsDef.calculate.bind(partitionsDef));

describe("Калькулятор перегородок из блоков", () => {
  describe("Газобетон D500 (blockType=0), 5x2.7 м, толщина 100 мм", () => {
    const result = calc({
      length: 5,
      height: 2.7,
      thickness: 100,
      blockType: 0,
    });

    it("блоки перегородочные присутствуют", () => {
      // Engine: "Блоки перегородочные"
      const blocks = findMaterial(result, "Блоки перегородочные");
      expect(blocks).toBeDefined();
    });

    it("клей для блоков 25кг присутствует", () => {
      // Engine: "Клей для блоков 25кг"
      const glue = findMaterial(result, "Клей для блоков");
      expect(glue).toBeDefined();
    });

    it("армирующая сетка (рулон 50 м) присутствует", () => {
      // Engine: "Армирующая сетка (рулон 50 м)"
      const arm = findMaterial(result, "Армирующая сетка");
      expect(arm).toBeDefined();
    });

    it("монтажная пена 750мл присутствует", () => {
      // Engine: "Монтажная пена 750мл"
      const foam = findMaterial(result, "Монтажная пена");
      expect(foam).toBeDefined();
    });

    it("грунтовка (канистра 10 л) присутствует", () => {
      // Engine: "Грунтовка (канистра 10 л)"
      expect(findMaterial(result, "Грунтовка")).toBeDefined();
    });

    it("уплотнительная лента присутствует", () => {
      // Engine: "Уплотнительная лента"
      expect(findMaterial(result, "Уплотнительная лента")).toBeDefined();
    });

    it("totals содержат wallArea, blocks, length, height", () => {
      // wallArea=5*2.7=13.5
      expect(result.totals.wallArea).toBeCloseTo(13.5, 2);
      expect(result.totals.blocks).toBeGreaterThan(0);
    });

    it("инварианты", () => {
      checkInvariants(result);
    });
  });

  describe("Пенобетон D600 (blockType=1), 3x3.0 м, толщина 150 мм", () => {
    const result = calc({
      length: 3,
      height: 3.0,
      thickness: 150,
      blockType: 1,
    });

    it("блоки перегородочные присутствуют", () => {
      expect(findMaterial(result, "Блоки перегородочные")).toBeDefined();
    });

    it("клей для блоков присутствует", () => {
      expect(findMaterial(result, "Клей для блоков")).toBeDefined();
    });

    it("нет гипсового молочка (не ПГП)", () => {
      expect(findMaterial(result, "Гипсовое молочко")).toBeUndefined();
    });
  });

  describe("ПГП гипсовые (blockType=2), 4x2.7 м, 100 мм", () => {
    const result = calc({
      length: 4,
      height: 2.7,
      thickness: 100,
      blockType: 2,
    });

    it("блоки перегородочные присутствуют", () => {
      expect(findMaterial(result, "Блоки перегородочные")).toBeDefined();
    });

    it("гипсовое молочко 20кг присутствует (вместо клея)", () => {
      // Engine: "Гипсовое молочко 20кг"
      const gypsum = findMaterial(result, "Гипсовое молочко");
      expect(gypsum).toBeDefined();
    });

    it("клей для блоков отсутствует", () => {
      expect(findMaterial(result, "Клей для блоков")).toBeUndefined();
    });

    it("ПГП толще 100 мм → предупреждение", () => {
      const r2 = calc({ length: 4, height: 2.7, thickness: 150, blockType: 2 });
      // Engine: "Гипсовые ПГП толще 100 мм — проверьте наличие нужного размера"
      expect(r2.warnings.some((w) => w.includes("ПГП"))).toBe(true);
    });
  });

  describe("Высота > 3.5 м → предупреждение", () => {
    const result = calc({
      length: 5,
      height: 3.8,
      thickness: 100,
      blockType: 0,
    });

    it("предупреждение об усиленном армировании", () => {
      // Engine: "Высота перегородки более 3.5 м — рекомендуется усиленное армирование"
      expect(result.warnings.some((w) => w.includes("3.5 м"))).toBe(true);
    });
  });

  describe("Минимальные размеры", () => {
    const result = calc({
      length: 1,
      height: 2,
      thickness: 75,
      blockType: 0,
    });

    it("расчёт корректен при минимальных размерах", () => {
      checkInvariants(result);
    });
  });
});
