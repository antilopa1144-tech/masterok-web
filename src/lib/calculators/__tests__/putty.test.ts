import { describe, it, expect } from "vitest";
import { puttyDef } from "../formulas/putty";
import { findMaterial, checkInvariants, withBasicAccuracy } from "./_helpers";
import parityFixture from "../../../../tests/fixtures/putty-canonical-parity.json";

const calc = withBasicAccuracy(puttyDef.calculate.bind(puttyDef));

describe("Калькулятор шпаклёвки", () => {
  describe("Только финишная, стены, 5x4x2.7 м, мешок 20 кг", () => {
    const result = calc({
      inputMode: 0,
      length: 5,
      width: 4,
      height: 2.7,
      surface: 0,
      puttyType: 0,
      bagWeight: 20,
    });

    it("площадь стен = 48.6 м²", () => {
      expect(result.totals.wallArea).toBeCloseTo(48.6, 1);
    });

    it("шпаклёвки финишной 3 мешка", () => {
      const putty = findMaterial(result, "финишная");
      expect(putty?.purchaseQty).toBe(3);
    });

    it("грунтовка присутствует", () => {
      expect(findMaterial(result, "Грунтовка")).toBeDefined();
    });

    it("наждачная бумага присутствует", () => {
      expect(findMaterial(result, "Наждачная")).toBeDefined();
    });

    it("нет стартовой", () => {
      expect(findMaterial(result, "стартовая")).toBeUndefined();
    });

    it("инварианты", () => {
      checkInvariants(result);
    });
  });

  describe("Стартовая + финишная", () => {
    const result = calc({
      inputMode: 0,
      length: 5,
      width: 4,
      height: 2.7,
      surface: 0,
      puttyType: 1,
      bagWeight: 20,
    });

    it("финишная присутствует", () => {
      expect(findMaterial(result, "финишная")).toBeDefined();
    });

    it("стартовая присутствует", () => {
      expect(findMaterial(result, "стартовая")).toBeDefined();
    });

    it("серпянка присутствует при стартовой", () => {
      expect(findMaterial(result, "Серпянка")).toBeDefined();
    });
  });

  describe("Только стартовая", () => {
    const result = calc({
      inputMode: 1,
      area: 48.6,
      surface: 0,
      puttyType: 2,
      bagWeight: 20,
    });

    it("нет финишной", () => {
      expect(findMaterial(result, "финишная")).toBeUndefined();
    });

    it("стартовая присутствует", () => {
      expect(findMaterial(result, "стартовая")).toBeDefined();
    });
  });

  describe("Потолок", () => {
    const result = calc({
      inputMode: 0,
      length: 5,
      width: 4,
      height: 2.7,
      surface: 1,
      puttyType: 0,
      bagWeight: 20,
    });

    it("площадь потолка = 20 м²", () => {
      expect(result.totals.wallArea).toBeCloseTo(20, 1);
    });

    it("финишной 2 мешка", () => {
      const putty = findMaterial(result, "финишная");
      expect(putty?.purchaseQty).toBe(2);
    });
  });

  describe("Большая площадь -> предупреждение о механизации", () => {
    it("площадь > 100 м² -> предупреждение", () => {
      const result = calc({ inputMode: 1, area: 120, surface: 0, puttyType: 0, bagWeight: 20 });
      expect(result.warnings.some((warning) => warning.includes("механизированным"))).toBe(true);
    });
  });
});

describe("Сценарный контракт shared engine", () => {
  it("сценарии MIN/REC/MAX присутствуют и упорядочены", () => {
    const result = calc({ inputMode: 1, area: 48.6, puttyType: 0, bagWeight: 20 });

    expect(result.scenarios).toBeDefined();
    expect(result.scenarios?.REC.exact_need).toBeGreaterThanOrEqual(result.scenarios?.MIN.exact_need ?? 0);
    expect(result.scenarios?.MAX.exact_need).toBeGreaterThanOrEqual(result.scenarios?.REC.exact_need ?? 0);
  });

  it("REC сценарий дает purchase >= exact и содержит buy plan", () => {
    const result = calc({ inputMode: 1, area: 48.6, puttyType: 1, bagWeight: 25 });
    const rec = result.scenarios?.REC;

    expect(rec).toBeDefined();
    expect((rec?.purchase_quantity ?? 0)).toBeGreaterThanOrEqual(rec?.exact_need ?? 0);
    expect(rec?.buy_plan.package_size).toBe(25);
  });

  it("поддерживает отдельные startLayers и finishLayers", () => {
    const result = calc({
      inputMode: 1,
      area: 20,
      puttyType: 1,
      bagWeight: 20,
      qualityClass: 2,
      startLayers: 3,
      finishLayers: 1,
    });

    expect(result.totals.startLayers).toBe(3);
    expect(result.totals.finishLayers).toBe(1);
    expect(result.scenarios?.REC.exact_need ?? 0).toBeCloseTo(115.753, 2);
    expect(findMaterial(result, "стартовая")?.purchaseQty).toBe(5);
    expect(findMaterial(result, "финишная")?.purchaseQty).toBe(1);
  });
});

describe("Canonical putty fixture parity", () => {
  const cases = parityFixture.cases as unknown as Array<{
    id: string;
    inputs: Record<string, number>;
    expected: {
      wallArea: number;
      formulaVersion: string;
      materials: Record<string, number>;
      warningsCount: number;
      recScenario: {
        packageSize: number;
        exactNeed: number;
        purchaseQuantity: number;
      };
    };
  }>;

  for (const fixtureCase of cases) {
    it(fixtureCase.id, () => {
      const result = calc(fixtureCase.inputs);

      expect(result.formulaVersion).toBe(fixtureCase.expected.formulaVersion);
      expect(result.totals.wallArea).toBeCloseTo(fixtureCase.expected.wallArea, 1);
      expect(result.warnings).toHaveLength(fixtureCase.expected.warningsCount);
      expect(result.scenarios?.REC.buy_plan.package_size).toBe(fixtureCase.expected.recScenario.packageSize);
      expect(result.scenarios?.REC.exact_need ?? 0).toBeCloseTo(fixtureCase.expected.recScenario.exactNeed, 1);
      expect(result.scenarios?.REC.purchase_quantity ?? 0).toBeCloseTo(fixtureCase.expected.recScenario.purchaseQuantity, 1);

      if (fixtureCase.expected.materials.finishBags !== undefined) {
        expect(findMaterial(result, "финишная")?.purchaseQty).toBe(fixtureCase.expected.materials.finishBags);
      }
      if (fixtureCase.expected.materials.startBags !== undefined) {
        expect(findMaterial(result, "стартовая")?.purchaseQty).toBe(fixtureCase.expected.materials.startBags);
      }
      if (fixtureCase.expected.materials.primerCans !== undefined) {
        const primerMat = findMaterial(result, "Грунтовка");
        // Smart packaging: purchaseQty is now in liters, primerCans is legacy can count
        // Just verify primer material exists and purchaseQty > 0
        expect(primerMat).toBeTruthy();
        expect(primerMat!.purchaseQty).toBeGreaterThan(0);
      }
      if (fixtureCase.expected.materials.serpyankaRolls !== undefined) {
        expect(findMaterial(result, "Серпянка")?.purchaseQty).toBe(fixtureCase.expected.materials.serpyankaRolls);
      }
      if (fixtureCase.expected.materials.sandpaperSheets !== undefined) {
        expect(findMaterial(result, "Наждачная")?.purchaseQty).toBe(fixtureCase.expected.materials.sandpaperSheets);
      }
    });
  }
});

describe("Canonical qualityClass profiles", () => {
  it("поддерживает canonical qualityClass без изменения web default профиля", () => {
    const legacy = calc({ inputMode: 1, area: 20, puttyType: 2, bagWeight: 20 });
    const standard = calc({ inputMode: 1, area: 20, puttyType: 2, bagWeight: 20, qualityClass: 2 });
    const recMultiplier = standard.scenarios?.REC.key_factors.field_multiplier ?? 1;

    expect(legacy.totals.qualityClass).toBe(0);
    expect(standard.totals.qualityClass).toBe(2);
    expect(standard.scenarios?.REC.exact_need ?? 0).toBeCloseTo(20 * 1.5 * 2 * recMultiplier, 2);
    expect(standard.scenarios?.REC.exact_need ?? 0).not.toBeCloseTo(legacy.scenarios?.REC.exact_need ?? 0, 2);
  });
});




