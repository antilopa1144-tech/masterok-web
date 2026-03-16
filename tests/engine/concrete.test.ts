import { describe, expect, it } from "vitest";
import { computeCanonicalConcrete } from "../../engine/concrete";
import type { ConcreteCanonicalSpec } from "../../engine/canonical";
import type { FactorTable } from "../../engine/factors";
import concreteSpec from "../../configs/calculators/concrete-canonical.v1.json";
import factorTablesJson from "../../configs/factor-tables.json";

const spec = concreteSpec as unknown as ConcreteCanonicalSpec;
const factorTable = factorTablesJson.factors as unknown as FactorTable;

// ─── 1. Positive tests (стандартные входные данные) ───

describe("computeCanonicalConcrete — стандартные входные данные", () => {
  it("Объём 5 м³, марка M200 (grade=3), запас 10%, без ручного замеса → totalVolume = 5.5, материал «Бетон М200»", () => {
    const result = computeCanonicalConcrete(spec, {
      concreteVolume: 5,
      concreteGrade: 3,
      reserve: 10,
      manualMix: 0,
      inputMode: 0,
    }, factorTable);

    expect(result.totals.totalVolume).toBe(5.5);
    expect(result.totals.sourceVolume).toBe(5);

    const mainMaterial = result.materials.find((m) => m.name.includes("Бетон М200"));
    expect(mainMaterial).toBeDefined();
    expect(mainMaterial!.category).toBe("Основное");
  });

  it("Объём 5 м³, марка M200, ручной замес → цемент, песок, щебень, вода в materials", () => {
    const result = computeCanonicalConcrete(spec, {
      concreteVolume: 5,
      concreteGrade: 3,
      reserve: 10,
      manualMix: 1,
      inputMode: 0,
    }, factorTable);

    const names = result.materials.map((m) => m.name);
    expect(names.some((n) => n.includes("Цемент"))).toBe(true);
    expect(names.some((n) => n.includes("Песок"))).toBe(true);
    expect(names.some((n) => n.includes("Щебень"))).toBe(true);
    expect(names.some((n) => n.includes("Вода"))).toBe(true);
  });

  it("Площадь 20 м², толщина 200 мм (inputMode=1) → sourceVolume = 4.0", () => {
    const result = computeCanonicalConcrete(spec, {
      inputMode: 1,
      area: 20,
      thickness: 200,
    }, factorTable);

    expect(result.totals.sourceVolume).toBe(4);
    expect(result.totals.inputMode).toBe(1);
  });

  describe("Разные марки бетона (M100..M400) — пропорции различаются", () => {
    const gradeResults: Record<number, ReturnType<typeof computeCanonicalConcrete>> = {};

    for (let grade = 1; grade <= 7; grade++) {
      gradeResults[grade] = computeCanonicalConcrete(spec, {
        concreteVolume: 10,
        concreteGrade: grade,
        reserve: 0,
        manualMix: 1,
        inputMode: 0,
      }, factorTable);
    }

    it("цемент кг/м³ растёт с повышением марки", () => {
      for (let grade = 2; grade <= 7; grade++) {
        expect(gradeResults[grade].totals.cementKgPerM3).toBeGreaterThan(
          gradeResults[grade - 1].totals.cementKgPerM3,
        );
      }
    });

    it("вода л/м³ уменьшается с повышением марки", () => {
      for (let grade = 2; grade <= 7; grade++) {
        expect(gradeResults[grade].totals.waterLPerM3).toBeLessThan(
          gradeResults[grade - 1].totals.waterLPerM3,
        );
      }
    });
  });
});

// ─── 2. Нулевые / граничные входные данные ───

describe("computeCanonicalConcrete — нулевые и граничные значения", () => {
  it("Объём 0 → clamp до 0.1", () => {
    const result = computeCanonicalConcrete(spec, {
      concreteVolume: 0,
      inputMode: 0,
    }, factorTable);

    expect(result.totals.sourceVolume).toBeGreaterThanOrEqual(0.1);
  });

  it("Площадь 0 → clamp до 0.1", () => {
    const result = computeCanonicalConcrete(spec, {
      area: 0,
      inputMode: 1,
      thickness: 200,
    }, factorTable);

    // area is clamped to 0.1, sourceVolume = 0.1 * 0.2 = 0.02 (or clamped further)
    expect(result.totals.sourceVolume).toBeGreaterThan(0);
  });

  it("Запас 0 → totalVolume === sourceVolume", () => {
    const result = computeCanonicalConcrete(spec, {
      concreteVolume: 5,
      reserve: 0,
      inputMode: 0,
    }, factorTable);

    expect(result.totals.totalVolume).toBe(result.totals.sourceVolume);
  });

  it("Запас 50 (максимум) → totalVolume = sourceVolume * 1.5", () => {
    const result = computeCanonicalConcrete(spec, {
      concreteVolume: 10,
      reserve: 50,
      inputMode: 0,
    }, factorTable);

    expect(result.totals.totalVolume).toBe(15);
  });
});

// ─── 3. Отрицательные входные данные ───

describe("computeCanonicalConcrete — отрицательные входные данные", () => {
  it("Объём -10 → clamp до 0.1", () => {
    const result = computeCanonicalConcrete(spec, {
      concreteVolume: -10,
      inputMode: 0,
    }, factorTable);

    expect(result.totals.sourceVolume).toBeGreaterThanOrEqual(0.1);
  });

  it("Площадь -5 → clamp до 0.1", () => {
    const result = computeCanonicalConcrete(spec, {
      area: -5,
      inputMode: 1,
      thickness: 200,
    }, factorTable);

    expect(result.totals.sourceVolume).toBeGreaterThan(0);
  });

  it("Марка -1 → clamp до 1", () => {
    const result = computeCanonicalConcrete(spec, {
      concreteGrade: -1,
      inputMode: 0,
    }, factorTable);

    expect(result.totals.concreteGrade).toBe(1);
  });

  it("Марка 99 → clamp до 7", () => {
    const result = computeCanonicalConcrete(spec, {
      concreteGrade: 99,
      inputMode: 0,
    }, factorTable);

    expect(result.totals.concreteGrade).toBe(7);
  });
});

// ─── 4. Тесты округления ───

describe("computeCanonicalConcrete — округление", () => {
  const result = computeCanonicalConcrete(spec, {
    concreteVolume: 7.777,
    concreteGrade: 4,
    reserve: 13,
    manualMix: 1,
    inputMode: 0,
  }, factorTable);

  it("все purchaseQty — целые числа (Math.ceil)", () => {
    for (const mat of result.materials) {
      if (mat.purchaseQty !== undefined) {
        expect(Number.isInteger(mat.purchaseQty)).toBe(true);
      }
    }
  });

  it("totalVolume округлён до не более 6 знаков", () => {
    const decimalPlaces = (result.totals.totalVolume.toString().split(".")[1] || "").length;
    expect(decimalPlaces).toBeLessThanOrEqual(6);
  });

  it("quantity материалов — не NaN и не Infinity", () => {
    for (const mat of result.materials) {
      expect(Number.isNaN(mat.quantity)).toBe(false);
      expect(Number.isFinite(mat.quantity)).toBe(true);
      if (mat.purchaseQty !== undefined) {
        expect(Number.isNaN(mat.purchaseQty)).toBe(false);
        expect(Number.isFinite(mat.purchaseQty)).toBe(true);
      }
    }
  });
});

// ─── 5. Тесты структуры ───

describe("computeCanonicalConcrete — структура результата", () => {
  const result = computeCanonicalConcrete(spec, {
    concreteVolume: 5,
    concreteGrade: 3,
    reserve: 10,
    manualMix: 0,
    inputMode: 0,
  }, factorTable);

  it("результат содержит canonicalSpecId, formulaVersion, materials, totals, warnings, scenarios, practicalNotes", () => {
    expect(result).toHaveProperty("canonicalSpecId");
    expect(result).toHaveProperty("formulaVersion");
    expect(result).toHaveProperty("materials");
    expect(result).toHaveProperty("totals");
    expect(result).toHaveProperty("warnings");
    expect(result).toHaveProperty("scenarios");
    expect(result).toHaveProperty("practicalNotes");
  });

  it("scenarios содержит ключи MIN, REC, MAX", () => {
    expect(Object.keys(result.scenarios)).toEqual(expect.arrayContaining(["MIN", "REC", "MAX"]));
  });

  it("каждый сценарий содержит exact_need, purchase_quantity, leftover, key_factors, buy_plan", () => {
    for (const key of ["MIN", "REC", "MAX"] as const) {
      const scenario = result.scenarios[key];
      expect(scenario).toHaveProperty("exact_need");
      expect(scenario).toHaveProperty("purchase_quantity");
      expect(scenario).toHaveProperty("leftover");
      expect(scenario).toHaveProperty("key_factors");
      expect(scenario).toHaveProperty("buy_plan");
    }
  });

  it("MIN.purchase_quantity <= REC.purchase_quantity <= MAX.purchase_quantity", () => {
    expect(result.scenarios.MIN.purchase_quantity).toBeLessThanOrEqual(result.scenarios.REC.purchase_quantity);
    expect(result.scenarios.REC.purchase_quantity).toBeLessThanOrEqual(result.scenarios.MAX.purchase_quantity);
  });

  it("canonicalSpecId = 'concrete'", () => {
    expect(result.canonicalSpecId).toBe("concrete");
  });

  it("formulaVersion = 'concrete-canonical-v1'", () => {
    expect(result.formulaVersion).toBe("concrete-canonical-v1");
  });
});
