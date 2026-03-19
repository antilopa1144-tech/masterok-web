import { describe, it, expect } from "vitest";
import { guttersDef } from "../formulas/gutters";
import { findMaterial, checkInvariants, withBasicAccuracy } from "./_helpers";

const calc = withBasicAccuracy(guttersDef.calculate.bind(guttersDef));

describe("Водосточная система", () => {
  describe("Стандарт: 40 м периметр, 5 м высота, 4 воронки, 90 мм, 3 м элементы", () => {
    it("желоба: ceil(40/3*1.05) = 14", () => {
      const r = calc({ roofPerimeter: 40, roofHeight: 5, funnels: 4, gutterDia: 90, gutterLength: 3 });
      checkInvariants(r);
      const expectedGutterPcs = Math.ceil(40 / 3 * 1.05);
      // Engine: "Желоб водосточный (ø90 мм, 3 м)"
      const gutters = findMaterial(r, "Желоб водосточный");
      expect(gutters).toBeDefined();
      expect(gutters!.quantity).toBe(expectedGutterPcs);
    });

    it("трубы: pipePerFunnel = ceil(5/3)+1 = 3, pipePcs = 3*4 = 12", () => {
      const r = calc({ roofPerimeter: 40, roofHeight: 5, funnels: 4, gutterDia: 90, gutterLength: 3 });
      const pipePerFunnel = Math.ceil(5 / 3) + 1;
      const expectedPipePcs = pipePerFunnel * 4;
      // Engine: "Труба водосточная (ø90 мм, 3 м)"
      const pipes = findMaterial(r, "Труба водосточная");
      expect(pipes).toBeDefined();
      expect(pipes!.quantity).toBe(expectedPipePcs);
    });

    it("воронки водосборные: 4 шт", () => {
      const r = calc({ roofPerimeter: 40, roofHeight: 5, funnels: 4, gutterDia: 90, gutterLength: 3 });
      // Engine: "Воронки водосборные"
      const funnelMat = findMaterial(r, "Воронки");
      expect(funnelMat).toBeDefined();
      expect(funnelMat!.quantity).toBe(4);
    });

    it("соединители желобов: ceil(12*1.05)=13", () => {
      const r = calc({ roofPerimeter: 40, roofHeight: 5, funnels: 4, gutterDia: 90, gutterLength: 3 });
      const gutterJoints = Math.ceil(40 / 3) - 1; // 12
      const connectors = Math.ceil(gutterJoints * 1.05); // 13
      // Engine: "Соединители желобов"
      const joints = findMaterial(r, "Соединители желобов");
      expect(joints).toBeDefined();
      expect(joints!.quantity).toBe(connectors);
    });

    it("кронштейны желоба: ceil(40/0.6*1.05)", () => {
      const r = calc({ roofPerimeter: 40, roofHeight: 5, funnels: 4, gutterDia: 90, gutterLength: 3 });
      const expectedHooks = Math.ceil(40 / 0.6 * 1.05);
      // Engine: "Кронштейны желоба"
      const hooks = findMaterial(r, "Кронштейны желоба");
      expect(hooks).toBeDefined();
      expect(hooks!.quantity).toBe(expectedHooks);
    });

    it("хомуты трубы: ceil(5/1.5*4*1.05)", () => {
      const r = calc({ roofPerimeter: 40, roofHeight: 5, funnels: 4, gutterDia: 90, gutterLength: 3 });
      const expectedClamps = Math.ceil(5 / 1.5 * 4 * 1.05);
      // Engine: "Хомуты трубы"
      const clamps = findMaterial(r, "Хомуты трубы");
      expect(clamps).toBeDefined();
      expect(clamps!.quantity).toBe(expectedClamps);
    });

    it("угловые элементы: 8 шт", () => {
      const r = calc({ roofPerimeter: 40, roofHeight: 5, funnels: 4, gutterDia: 90, gutterLength: 3 });
      // Engine: "Угловые элементы", corners = 8
      const corners = findMaterial(r, "Угловые элементы");
      expect(corners).toBeDefined();
      expect(corners!.quantity).toBe(8);
    });

    it("колена водосточные: количество = funnels", () => {
      const r = calc({ roofPerimeter: 40, roofHeight: 5, funnels: 4, gutterDia: 90, gutterLength: 3 });
      // Engine: "Колена водосточные"
      const elbow = findMaterial(r, "Колена водосточные");
      expect(elbow).toBeDefined();
      expect(elbow!.quantity).toBe(4);
    });

    it("заглушки желоба (пары): количество = funnels", () => {
      const r = calc({ roofPerimeter: 40, roofHeight: 5, funnels: 4, gutterDia: 90, gutterLength: 3 });
      // Engine: "Заглушки желоба (пары)"
      const caps = findMaterial(r, "Заглушки желоба");
      expect(caps).toBeDefined();
      expect(caps!.quantity).toBe(4);
    });

    it("герметик", () => {
      const r = calc({ roofPerimeter: 40, roofHeight: 5, funnels: 4, gutterDia: 90, gutterLength: 3 });
      const gutterJoints = Math.ceil(40 / 3) - 1;
      const expectedTubes = Math.ceil((gutterJoints + 4 * 2) / 20);
      // Engine: "Герметик (310 мл)"
      const sealant = findMaterial(r, "Герметик");
      expect(sealant).toBeDefined();
      expect(sealant!.quantity).toBe(expectedTubes);
    });
  });

  describe("Предупреждения о воронках", () => {
    it("2 воронки на 40 м → рекомендуется 4, предупреждение", () => {
      const r = calc({ roofPerimeter: 40, roofHeight: 5, funnels: 2, gutterDia: 90, gutterLength: 3 });
      // Engine: "Недостаточно воронок: рекомендуется минимум N шт."
      expect(r.warnings.some(w => w.includes("Недостаточно воронок"))).toBe(true);
    });

    it("4 воронки на 40 м — достаточно, нет предупреждения", () => {
      const r = calc({ roofPerimeter: 40, roofHeight: 5, funnels: 4, gutterDia: 90, gutterLength: 3 });
      expect(r.warnings.some(w => w.includes("Недостаточно воронок"))).toBe(false);
    });
  });

  describe("Минимальные значения", () => {
    it("perimeter=5, height=2, funnels=1 → расчёт без ошибок", () => {
      const r = calc({ roofPerimeter: 5, roofHeight: 2, funnels: 1, gutterDia: 90, gutterLength: 3 });
      checkInvariants(r);
    });
  });
});
