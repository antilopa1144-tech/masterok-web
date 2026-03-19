import { describe, it, expect } from "vitest";
import { plasterDef } from "../formulas/plaster";
import { findMaterial, checkInvariants, withBasicAccuracy } from "./_helpers";

const calc = withBasicAccuracy(plasterDef.calculate.bind(plasterDef));

describe("Калькулятор штукатурки", () => {
  describe("По размерам: 5×4 м, h=2.7 м, проёмы 5 м², гипсовая 15 мм, мешок 30 кг", () => {
    // wallArea = 2*(5+4)*2.7 = 48.6
    // netArea = 48.6 - 5 = 43.6
    // kgPer10mm = 8.5, kgPerSqm = 8.5 * 1.5 = 12.75
    // totalKg = 43.6 * 12.75 * 1.1 = 611.49
    // bags = ceil(611.49/30) = ceil(20.38) = 21
    const result = calc({
      inputMode: 0,
      length: 5,
      width: 4,
      height: 2.7,
      openingsArea: 5,
      plasterType: 0,
      thickness: 15,
      bagWeight: 30,
    });

    it("площадь стен = 48.6 м²", () => {
      expect(result.totals.wallArea).toBeCloseTo(48.6, 1);
    });

    it("чистая площадь = 43.6 м²", () => {
      expect(result.totals.netArea).toBeCloseTo(43.6, 1);
    });

    it("мешков гипсовой штукатурки = 21", () => {
      const plaster = findMaterial(result, "Гипсовая штукатурка");
      expect(plaster?.purchaseQty).toBe(21);
    });

    it("грунтовка присутствует", () => {
      expect(findMaterial(result, "Грунтовка")).toBeDefined();
    });

    it("маяки присутствуют", () => {
      expect(findMaterial(result, "Маяки")).toBeDefined();
    });

    it("инварианты", () => {
      checkInvariants(result);
    });
  });

  describe("Цементная штукатурка: canonical расход 17 кг/м² на 10 мм", () => {
    // netArea ≈ 43.6, thickness=15, kgPerSqm=15*1.5=22.5
    // totalKg = 43.6*22.5*1.1 = 1079.1 → bags=ceil(1079.1/30)=36
    const result = calc({
      inputMode: 0,
      length: 5,
      width: 4,
      height: 2.7,
      openingsArea: 5,
      plasterType: 1,
      thickness: 15,
      bagWeight: 30,
    });

    it("цементной штукатурки больше, чем гипсовой", () => {
      const cement = findMaterial(result, "Цементная штукатурка");
      expect(cement?.purchaseQty).toBeGreaterThan(21);
    });
  });

  describe("Предупреждения", () => {
    it("гипс толще 20 мм → армирование", () => {
      const result = calc({
        inputMode: 1,
        area: 40,
        openingsArea: 0,
        plasterType: 0,
        thickness: 25,
        bagWeight: 30,
      });
      expect(result.warnings.some((w) => w.includes("2 слоя"))).toBe(true);
    });

    it("толщина > 30 мм → сетка обязательна", () => {
      const result = calc({
        inputMode: 1,
        area: 40,
        openingsArea: 0,
        plasterType: 0,
        thickness: 35,
        bagWeight: 30,
      });
      expect(result.warnings.some((w) => w.includes("армирование"))).toBe(true);
    });

    it("площадь < 5 м² → использовать готовую", () => {
      const result = calc({
        inputMode: 1,
        area: 3,
        openingsArea: 0,
        plasterType: 0,
        thickness: 15,
        bagWeight: 30,
      });
      expect(result.warnings.some((w) => w.includes("ведра"))).toBe(true);
    });
  });
});

it("декларирует formulaVersion для canonical plaster", () => {
  expect(plasterDef.formulaVersion).toBe("plaster-canonical-v1");
});

describe("Canonical plaster fixture parity", () => {
  const parityFixture = require("../../../../tests/fixtures/plaster-canonical-parity.json") as {
    cases: Array<{
      id: string;
      inputs: Record<string, number>;
      expected: {
        formulaVersion: string;
        netArea: number;
        totalKg: number;
        warningsCount: number;
        materials: {
          plasterBags: number;
          primerPackages: number;
          beacons: number;
          hasMesh: number;
        };
        recScenario: {
          packageSize: number;
          exactNeed: number;
          purchaseQuantity: number;
        };
      };
    }>;
  };

  for (const fixtureCase of parityFixture.cases) {
    it(fixtureCase.id, () => {
      const result = calc(fixtureCase.inputs);
      expect(result.formulaVersion).toBe(fixtureCase.expected.formulaVersion);
      expect(result.totals.netArea).toBeCloseTo(fixtureCase.expected.netArea, 2);
      expect(result.totals.totalKg).toBeCloseTo(fixtureCase.expected.totalKg, 2);
      expect(result.warnings).toHaveLength(fixtureCase.expected.warningsCount);
      expect(result.scenarios?.REC.buy_plan.package_size).toBe(fixtureCase.expected.recScenario.packageSize);
      expect(result.scenarios?.REC.exact_need ?? 0).toBeCloseTo(fixtureCase.expected.recScenario.exactNeed, 2);
      expect(result.scenarios?.REC.purchase_quantity ?? 0).toBeCloseTo(fixtureCase.expected.recScenario.purchaseQuantity, 2);
      expect(result.materials.find((material) => material.category === "Основное")?.purchaseQty).toBe(fixtureCase.expected.materials.plasterBags);
      expect(findMaterial(result, "Грунтовка")?.purchaseQty).toBe(fixtureCase.expected.materials.primerPackages);
      expect(findMaterial(result, "Маяки")?.purchaseQty).toBe(fixtureCase.expected.materials.beacons);
      expect(Boolean(findMaterial(result, "Стеклосетка"))).toBe(Boolean(fixtureCase.expected.materials.hasMesh));
    });
  }
});

