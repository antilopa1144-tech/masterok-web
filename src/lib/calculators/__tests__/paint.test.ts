import { describe, it, expect } from "vitest";
import { paintDef } from "../formulas/paint";
import { findMaterial, checkInvariants } from "./_helpers";

const calc = paintDef.calculate.bind(paintDef);

describe("Калькулятор краски", () => {
  describe("Стандарт: 40 м², 2 слоя, гладкая, расход 10 м²/л", () => {
    // litersNeeded = (40/10) * 2 * 1.0 = 8
    // litersWithReserve = 8 * 1.1 = 8.8
    const result = calc({ area: 40, coats: 2, surfaceType: 0, consumption: 10 });

    it("литров нужно = 8", () => {
      expect(result.totals.litersNeeded).toBeCloseTo(8, 3);
    });

    it("с запасом 8.8 л", () => {
      expect(result.totals.litersWithReserve).toBeCloseTo(8.8, 1);
    });

    it("краска (литры) присутствует", () => {
      expect(findMaterial(result, "литры")).toBeDefined();
    });

    it("грунтовка присутствует", () => {
      expect(findMaterial(result, "Грунтовка")).toBeDefined();
    });

    it("инварианты", () => {
      checkInvariants(result);
    });
  });

  describe("Пористая поверхность: коэффициент 1.30", () => {
    // litersNeeded = (40/10) * 2 * 1.30 = 10.4
    const result = calc({ area: 40, coats: 2, surfaceType: 2, consumption: 10 });

    it("литров = 10.4 (коэф. 1.30)", () => {
      expect(result.totals.litersNeeded).toBeCloseTo(10.4, 1);
    });

    it("предупреждение о грунтовании пористых поверхностей", () => {
      expect(result.warnings.some((w) => w.includes("пористых"))).toBe(true);
    });
  });

  describe("1 слой → предупреждение", () => {
    it("предупреждение о недостаточном покрытии", () => {
      const result = calc({ area: 40, coats: 1, surfaceType: 0, consumption: 10 });
      expect(result.warnings.some((w) => w.includes("Один слой"))).toBe(true);
    });
  });

  describe("3 слоя", () => {
    // litersNeeded = (40/10) * 3 * 1.0 = 12
    const result = calc({ area: 40, coats: 3, surfaceType: 0, consumption: 10 });

    it("литров = 12", () => {
      expect(result.totals.litersNeeded).toBeCloseTo(12, 3);
    });
  });

  describe("Штукатурка/бетон: коэффициент 1.15", () => {
    // litersNeeded = (40/10) * 2 * 1.15 = 9.2
    const result = calc({ area: 40, coats: 2, surfaceType: 1, consumption: 10 });

    it("литров = 9.2", () => {
      expect(result.totals.litersNeeded).toBeCloseTo(9.2, 1);
    });
  });
});
