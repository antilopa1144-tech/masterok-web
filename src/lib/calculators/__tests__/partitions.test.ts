import { describe, it, expect } from "vitest";
import { partitionsDef } from "../formulas/partitions";
import { findMaterial, checkInvariants } from "./_helpers";

const calc = partitionsDef.calculate.bind(partitionsDef);

describe("Калькулятор перегородок из блоков", () => {
  describe("Газобетон D500, 5×2.7 м, толщина 100 мм", () => {
    // wallArea = 5 * 2.7 = 13.5
    // blockType=0 → газобетон, l=625, h=250, w=100
    // blockAreaM2 = 0.625 * 0.25 = 0.15625
    // blocksNeeded = ceil(13.5 / 0.15625 * 1.05) = ceil(86.4 * 1.05) = ceil(90.72) = 91
    // glueKg = 13.5 * 1.5 = 20.25 → glueBags = ceil(20.25/25) = 1
    // armRows = ceil(2.7/0.75) = 4
    // armLength = 5 * 4 * 1.05 = 21.0 → armRolls = ceil(21/50) = 1
    // foamBottles = ceil((5+2.7*2)/5) = ceil(10.4/5) = ceil(2.08) = 3
    // gruntLiters = 13.5*2*0.15 = 4.05, withReserve = 4.05*1.15 = 4.6575
    //   purchaseQty = ceil(4.6575/10) = 1
    // sealLength = 5*2+2.7*2 = 15.4
    //   withReserve = ceil(15.4*1.1) = ceil(16.94) = 17
    //   purchaseQty = ceil(17/30) = 1
    const result = calc({
      length: 5,
      height: 2.7,
      thickness: 100,
      blockType: 0,
    });

    it("газоблоки = 91 шт", () => {
      const blocks = findMaterial(result, "Газобетон");
      expect(blocks?.purchaseQty).toBe(91);
      expect(blocks!.name).toContain("625×250×100");
    });

    it("клей для газобетона = 1 мешок", () => {
      const glue = findMaterial(result, "Клей для газобетона");
      expect(glue?.purchaseQty).toBe(1);
    });

    it("армирующая сетка = 1 рулон", () => {
      const arm = findMaterial(result, "Сетка армирующая");
      expect(arm?.purchaseQty).toBe(1);
    });

    it("монтажная пена = 3 баллона", () => {
      const foam = findMaterial(result, "Монтажная пена");
      expect(foam?.purchaseQty).toBe(3);
    });

    it("грунтовка = 1 канистра", () => {
      const primer = findMaterial(result, "Грунтовка");
      expect(primer?.purchaseQty).toBe(1);
    });

    it("уплотнительная лента = 1 рулон", () => {
      const seal = findMaterial(result, "Уплотнительная лента");
      expect(seal?.purchaseQty).toBe(1);
    });

    it("totals содержат wallArea, blocksNeeded, length, height", () => {
      expect(result.totals.wallArea).toBeCloseTo(13.5, 5);
      expect(result.totals.blocksNeeded).toBe(91);
      expect(result.totals.length).toBe(5);
      expect(result.totals.height).toBe(2.7);
    });

    it("предупреждение о первом ряде", () => {
      expect(result.warnings.some((w) => w.includes("Первый ряд"))).toBe(true);
    });

    it("инварианты", () => {
      checkInvariants(result);
    });
  });

  describe("Пенобетон D600, 3×3.0 м, толщина 150 мм", () => {
    // wallArea = 3 * 3 = 9
    // blockType=1 → пенобетон, l=625, h=250
    // blockAreaM2 = 0.15625
    // blocksNeeded = ceil(9/0.15625*1.05) = ceil(57.6*1.05) = ceil(60.48) = 61
    // glueKg = 9 * 1.5 = 13.5 → glueBags = ceil(13.5/25) = 1
    const result = calc({
      length: 3,
      height: 3.0,
      thickness: 150,
      blockType: 1,
    });

    it("пеноблоки = 61 шт", () => {
      const blocks = findMaterial(result, "Пенобетон");
      expect(blocks?.purchaseQty).toBe(61);
      expect(blocks!.name).toContain("625×250×150");
    });

    it("клей = 1 мешок", () => {
      const glue = findMaterial(result, "Клей для газобетона");
      expect(glue?.purchaseQty).toBe(1);
    });

    it("нет гипсового молочка (не ПГП)", () => {
      expect(findMaterial(result, "Гипсовое молочко")).toBeUndefined();
    });
  });

  describe("ПГП (гипсовые пазогребневые плиты), 4×2.7 м, 100 мм", () => {
    // blockType=2 → ПГП, l=667, h=500
    // blockAreaM2 = 0.667*0.5 = 0.3335
    // wallArea = 4*2.7 = 10.8
    // blocksNeeded = ceil(10.8/0.3335*1.05) = ceil(32.384*1.05) = ceil(34.003) = 35
    // glueKg = 0 (ПГП — на гипсовое молочко)
    // glueBags = 0
    // гипсовое молочко: wallArea*0.8/20 = 10.8*0.8/20 = 0.432
    //   purchaseQty = ceil(0.432) = 1
    const result = calc({
      length: 4,
      height: 2.7,
      thickness: 100,
      blockType: 2,
    });

    it("ПГП блоки = 35 шт", () => {
      const blocks = findMaterial(result, "ПГП");
      expect(blocks?.purchaseQty).toBe(35);
      expect(blocks!.name).toContain("667×500×100");
    });

    it("гипсовое молочко = 1 мешок (вместо клея)", () => {
      const gypsum = findMaterial(result, "Гипсовое молочко");
      expect(gypsum).toBeDefined();
      expect(gypsum!.purchaseQty).toBe(1);
    });

    it("клей для газобетона отсутствует", () => {
      expect(findMaterial(result, "Клей для газобетона")).toBeUndefined();
    });

    it("предупреждение о ПГП гипсовом молочке", () => {
      expect(result.warnings.some((w) => w.includes("ПГП"))).toBe(true);
    });
  });

  describe("Высота > 3 м → предупреждение об анкерах", () => {
    const result = calc({
      length: 5,
      height: 3.5,
      thickness: 100,
      blockType: 0,
    });

    it("предупреждение о связи с несущими конструкциями", () => {
      expect(result.warnings.some((w) => w.includes("3 м"))).toBe(true);
    });
  });

  describe("Большая перегородка 50×4 м", () => {
    // wallArea = 50*4 = 200
    // blocksNeeded = ceil(200/0.15625*1.05) = ceil(1280*1.05) = ceil(1344) = 1344
    // glueKg = 200*1.5 = 300 → glueBags = ceil(300/25) = 12
    // armRows = ceil(4/0.75) = ceil(5.333) = 6
    // armLength = 50*6*1.05 = 315 → armRolls = ceil(315/50) = 7
    const result = calc({
      length: 50,
      height: 4,
      thickness: 100,
      blockType: 0,
    });

    it("клей = 12 мешков", () => {
      const glue = findMaterial(result, "Клей для газобетона");
      expect(glue?.purchaseQty).toBe(12);
    });

    it("армирующая сетка = 7 рулонов", () => {
      const arm = findMaterial(result, "Сетка армирующая");
      expect(arm?.purchaseQty).toBe(7);
    });

    it("инварианты", () => {
      checkInvariants(result);
    });
  });

  describe("Минимальные размеры (1×2 м)", () => {
    const result = calc({
      length: 1,
      height: 2,
      thickness: 75,
      blockType: 0,
    });

    it("расчёт корректен при минимальных размерах", () => {
      checkInvariants(result);
      const blocks = findMaterial(result, "Газобетон");
      expect(blocks).toBeDefined();
      expect(blocks!.purchaseQty).toBeGreaterThan(0);
    });
  });
});
