import { describe, it, expect } from "vitest";
import { guttersDef } from "../formulas/gutters";
import { findMaterial, checkInvariants } from "./_helpers";

const calc = guttersDef.calculate.bind(guttersDef);

describe("Водосточная система", () => {
  describe("Стандарт: 40 м периметр, 5 м высота, 4 воронки, 90 мм, 3 м элементы", () => {
    it("желоба: ceil(40/3*1.05) = ceil(14) = 14", () => {
      const r = calc({ roofPerimeter: 40, roofHeight: 5, funnels: 4, gutterDia: 90, gutterLength: 3 });
      checkInvariants(r);
      const expectedGutterPcs = Math.ceil((40 / 3) * 1.05);
      const gutters = findMaterial(r, "Желоб 90 мм");
      expect(gutters).toBeDefined();
      expect(gutters!.purchaseQty).toBe(expectedGutterPcs);
      expect(r.totals.gutterPcs).toBe(expectedGutterPcs);
    });

    it("трубы: pipePerFunnel = ceil(5/3)+1 = 3, pipePcs = 3*4 = 12", () => {
      const r = calc({ roofPerimeter: 40, roofHeight: 5, funnels: 4, gutterDia: 90, gutterLength: 3 });
      const pipePerFunnel = Math.ceil(5 / 3) + 1;
      const expectedPipePcs = pipePerFunnel * 4;
      const pipes = findMaterial(r, "Труба водосточная 90 мм");
      expect(pipes).toBeDefined();
      expect(pipes!.purchaseQty).toBe(expectedPipePcs);
      expect(r.totals.pipePcs).toBe(expectedPipePcs);
    });

    it("воронки: 4 шт", () => {
      const r = calc({ roofPerimeter: 40, roofHeight: 5, funnels: 4, gutterDia: 90, gutterLength: 3 });
      const funnelMat = findMaterial(r, "Воронка");
      expect(funnelMat).toBeDefined();
      expect(funnelMat!.purchaseQty).toBe(4);
      expect(r.totals.funnels).toBe(4);
    });

    it("соединители желобов: ceil(40/3)-1 = 13-1 = 12, withReserve=ceil(12*1.05)=13", () => {
      const r = calc({ roofPerimeter: 40, roofHeight: 5, funnels: 4, gutterDia: 90, gutterLength: 3 });
      const gutterJoints = Math.ceil(40 / 3) - 1;
      const joints = findMaterial(r, "Соединитель желобов");
      expect(joints).toBeDefined();
      expect(joints!.quantity).toBe(gutterJoints);
      expect(joints!.purchaseQty).toBe(Math.ceil(gutterJoints * 1.05));
    });

    it("держатели желоба: ceil(40/0.6*1.05)", () => {
      const r = calc({ roofPerimeter: 40, roofHeight: 5, funnels: 4, gutterDia: 90, gutterLength: 3 });
      const expectedHooks = Math.ceil((40 / 0.6) * 1.05);
      const hooks = findMaterial(r, "Держатель желоба");
      expect(hooks).toBeDefined();
      expect(hooks!.purchaseQty).toBe(expectedHooks);
    });

    it("хомуты трубы: ceil(5/1.5*4*1.05)", () => {
      const r = calc({ roofPerimeter: 40, roofHeight: 5, funnels: 4, gutterDia: 90, gutterLength: 3 });
      const expectedClamps = Math.ceil((5 / 1.5) * 4 * 1.05);
      const clamps = findMaterial(r, "Хомут трубы");
      expect(clamps).toBeDefined();
      expect(clamps!.purchaseQty).toBe(expectedClamps);
    });
  });

  describe("Элементы 4 м", () => {
    it("желоба: ceil(40/4*1.05) = ceil(10.5) = 11", () => {
      const r = calc({ roofPerimeter: 40, roofHeight: 5, funnels: 4, gutterDia: 90, gutterLength: 4 });
      checkInvariants(r);
      const expectedGutterPcs = Math.ceil((40 / 4) * 1.05);
      const gutters = findMaterial(r, "Желоб 90 мм");
      expect(gutters!.purchaseQty).toBe(expectedGutterPcs);
    });

    it("трубы: pipePerFunnel = ceil(5/4)+1 = 3, pipePcs = 3*4 = 12", () => {
      const r = calc({ roofPerimeter: 40, roofHeight: 5, funnels: 4, gutterDia: 90, gutterLength: 4 });
      const pipePerFunnel = Math.ceil(5 / 4) + 1;
      const expectedPipePcs = pipePerFunnel * 4;
      const pipes = findMaterial(r, "Труба водосточная 90 мм");
      expect(pipes!.purchaseQty).toBe(expectedPipePcs);
    });
  });

  describe("Диаметры системы", () => {
    it("75 мм — название содержит '75 мм'", () => {
      const r = calc({ roofPerimeter: 40, roofHeight: 5, funnels: 4, gutterDia: 75, gutterLength: 3 });
      checkInvariants(r);
      const gutters = findMaterial(r, "Желоб 75 мм");
      expect(gutters).toBeDefined();
      const pipes = findMaterial(r, "Труба водосточная 75 мм");
      expect(pipes).toBeDefined();
    });

    it("125 мм — название содержит '125 мм'", () => {
      const r = calc({ roofPerimeter: 40, roofHeight: 5, funnels: 4, gutterDia: 125, gutterLength: 3 });
      const gutters = findMaterial(r, "Желоб 125 мм");
      expect(gutters).toBeDefined();
    });
  });

  describe("Предупреждения о воронках", () => {
    it("1 воронка на 40 м → рекомендуется 4 (ceil(40/11)=4), 2 воронки < 4 → предупреждение", () => {
      const r = calc({ roofPerimeter: 40, roofHeight: 5, funnels: 2, gutterDia: 90, gutterLength: 3 });
      const recommendedFunnels = Math.ceil(40 / 11);
      expect(recommendedFunnels).toBe(4);
      expect(r.warnings.some(w => w.includes("Рекомендуется"))).toBe(true);
    });

    it("4 воронки на 40 м — достаточно, нет предупреждения", () => {
      const r = calc({ roofPerimeter: 40, roofHeight: 5, funnels: 4, gutterDia: 90, gutterLength: 3 });
      expect(r.warnings.some(w => w.includes("Рекомендуется"))).toBe(false);
    });
  });

  describe("Угловые элементы и фитинги", () => {
    it("угловые элементы: 8 шт (4 угла × 2)", () => {
      const r = calc({ roofPerimeter: 40, roofHeight: 5, funnels: 4, gutterDia: 90, gutterLength: 3 });
      const corners = findMaterial(r, "Угловой элемент");
      expect(corners).toBeDefined();
      expect(corners!.purchaseQty).toBe(8);
    });

    it("колено сливное: количество = funnels", () => {
      const r = calc({ roofPerimeter: 40, roofHeight: 5, funnels: 4, gutterDia: 90, gutterLength: 3 });
      const elbow = findMaterial(r, "Колено сливное");
      expect(elbow).toBeDefined();
      expect(elbow!.purchaseQty).toBe(4);
    });

    it("заглушки торцевые: количество = funnels", () => {
      const r = calc({ roofPerimeter: 40, roofHeight: 5, funnels: 4, gutterDia: 90, gutterLength: 3 });
      const caps = findMaterial(r, "Заглушки торцевые");
      expect(caps).toBeDefined();
      expect(caps!.purchaseQty).toBe(4);
    });
  });

  describe("Герметик", () => {
    it("герметик: max(1, ceil((gutterJoints + funnels*2)/20))", () => {
      const r = calc({ roofPerimeter: 40, roofHeight: 5, funnels: 4, gutterDia: 90, gutterLength: 3 });
      const gutterJoints = Math.ceil(40 / 3) - 1;
      const expectedTubes = Math.max(1, Math.ceil((gutterJoints + 4 * 2) / 20));
      const sealant = findMaterial(r, "Герметик");
      expect(sealant).toBeDefined();
      expect(sealant!.purchaseQty).toBe(expectedTubes);
    });
  });

  describe("Минимальные значения", () => {
    it("perimeter=5, height=2, funnels=1 → расчёт без ошибок", () => {
      const r = calc({ roofPerimeter: 5, roofHeight: 2, funnels: 1, gutterDia: 90, gutterLength: 3 });
      checkInvariants(r);
      expect(r.totals.perimeter).toBe(5);
    });
  });
});
