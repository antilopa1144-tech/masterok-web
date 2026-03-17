import { describe, expect, it } from "vitest";
import { computeCanonicalConcrete } from "../../engine/concrete";
import { computeCanonicalBrick } from "../../engine/brick";
import { computeCanonicalTile } from "../../engine/tile";
import { computeCanonicalScreed } from "../../engine/screed";
import { computeCanonicalDrywall } from "../../engine/drywall";
import type {
  ConcreteCanonicalSpec,
  BrickCanonicalSpec,
  TileCanonicalSpec,
  ScreedCanonicalSpec,
  DrywallCanonicalSpec,
  CanonicalCalculatorResult,
} from "../../engine/canonical";
import type { FactorTable } from "../../engine/factors";

import concreteSpecJson from "../../configs/calculators/concrete-canonical.v1.json";
import brickSpecJson from "../../configs/calculators/brick-canonical.v1.json";
import tileSpecJson from "../../configs/calculators/tile-canonical.v1.json";
import screedSpecJson from "../../configs/calculators/screed-canonical.v1.json";
import drywallSpecJson from "../../configs/calculators/drywall-canonical.v1.json";
import factorTablesJson from "../../configs/factor-tables.json";

const factorTable = factorTablesJson.factors as unknown as FactorTable;

const concreteSpec = concreteSpecJson as unknown as ConcreteCanonicalSpec;
const brickSpec = brickSpecJson as unknown as BrickCanonicalSpec;
const tileSpec = tileSpecJson as unknown as TileCanonicalSpec;
const screedSpec = screedSpecJson as unknown as ScreedCanonicalSpec;
const drywallSpec = drywallSpecJson as unknown as DrywallCanonicalSpec;

interface CalculatorEntry {
  name: string;
  compute: (inputs: Record<string, unknown>) => CanonicalCalculatorResult;
}

const calculators: CalculatorEntry[] = [
  {
    name: "concrete (бетон)",
    compute: (inputs) => computeCanonicalConcrete(concreteSpec, inputs as any, factorTable),
  },
  {
    name: "brick (кирпич)",
    compute: (inputs) => computeCanonicalBrick(brickSpec, inputs as any, factorTable),
  },
  {
    name: "tile (плитка)",
    compute: (inputs) => computeCanonicalTile(tileSpec, inputs as any, factorTable),
  },
  {
    name: "screed (стяжка)",
    compute: (inputs) => computeCanonicalScreed(screedSpec, inputs as any, factorTable),
  },
  {
    name: "drywall (гипсокартон)",
    compute: (inputs) => computeCanonicalDrywall(drywallSpec, inputs as any, factorTable),
  },
];

const zeroInputs: Record<string, number> = {
  concreteVolume: 0, area: 0, length: 0, width: 0, height: 0,
  thickness: 0, reserve: 0, manualMix: 0, inputMode: 0, concreteGrade: 0,
  brickType: 0, wallThickness: 0, workingConditions: 0, wasteMode: 0,
  tileWidthCm: 0, tileHeightCm: 0, jointWidth: 0, groutDepth: 0,
  layoutPattern: 0, roomComplexity: 0, screedType: 0, workType: 0,
  layers: 0, sheetSize: 0, profileStep: 0, wallWidth: 0, wallHeight: 0,
};

// ─── Пустой inputs {} — не падает и возвращает валидную структуру ───

describe("Все калькуляторы — пустой inputs {} не вызывает ошибку", () => {
  for (const calc of calculators) {
    it(`${calc.name}: не выбрасывает исключение`, () => {
      expect(() => calc.compute({})).not.toThrow();
    });
  }
});

describe("Все калькуляторы — пустой inputs {} → обязательные поля в результате", () => {
  for (const calc of calculators) {
    describe(calc.name, () => {
      const result = calc.compute({});

      it("содержит canonicalSpecId, formulaVersion, materials, totals, warnings, scenarios", () => {
        expect(result).toHaveProperty("canonicalSpecId");
        expect(result).toHaveProperty("formulaVersion");
        expect(result).toHaveProperty("materials");
        expect(result).toHaveProperty("totals");
        expect(result).toHaveProperty("warnings");
        expect(result).toHaveProperty("scenarios");
      });

      it("scenarios содержит MIN, REC, MAX", () => {
        expect(result.scenarios).toHaveProperty("MIN");
        expect(result.scenarios).toHaveProperty("REC");
        expect(result.scenarios).toHaveProperty("MAX");
      });

      it("MIN.purchase_quantity <= REC.purchase_quantity <= MAX.purchase_quantity", () => {
        expect(result.scenarios.MIN.purchase_quantity).toBeLessThanOrEqual(
          result.scenarios.REC.purchase_quantity,
        );
        expect(result.scenarios.REC.purchase_quantity).toBeLessThanOrEqual(
          result.scenarios.MAX.purchase_quantity,
        );
      });

      it("materials.quantity — нет NaN или Infinity", () => {
        for (const mat of result.materials) {
          expect(Number.isNaN(mat.quantity)).toBe(false);
          expect(Number.isFinite(mat.quantity)).toBe(true);
        }
      });

      it("totals — нет NaN или Infinity", () => {
        for (const [, value] of Object.entries(result.totals)) {
          expect(Number.isNaN(value)).toBe(false);
          expect(Number.isFinite(value)).toBe(true);
        }
      });

      it("scenarios exact_need/purchase_quantity/leftover — конечные числа", () => {
        for (const key of ["MIN", "REC", "MAX"] as const) {
          expect(Number.isFinite(result.scenarios[key].exact_need)).toBe(true);
          expect(Number.isFinite(result.scenarios[key].purchase_quantity)).toBe(true);
          expect(Number.isFinite(result.scenarios[key].leftover)).toBe(true);
        }
      });
    });
  }
});

// ─── Все нули — не падает и без NaN/Infinity ───

describe("Все калькуляторы — все нули → не вызывает ошибку", () => {
  for (const calc of calculators) {
    it(`${calc.name}: не выбрасывает исключение с нулями`, () => {
      expect(() => calc.compute(zeroInputs)).not.toThrow();
    });
  }
});

describe("Все калькуляторы — все нули → без NaN/Infinity в materials", () => {
  for (const calc of calculators) {
    it(`${calc.name}: materials.quantity — нет NaN или Infinity`, () => {
      const result = calc.compute(zeroInputs);
      for (const mat of result.materials) {
        expect(Number.isNaN(mat.quantity)).toBe(false);
        expect(Number.isFinite(mat.quantity)).toBe(true);
      }
    });
  }
});

describe("Все калькуляторы — все нули → без NaN/Infinity в totals", () => {
  for (const calc of calculators) {
    it(`${calc.name}: totals — нет NaN или Infinity`, () => {
      const result = calc.compute(zeroInputs);
      for (const [key, value] of Object.entries(result.totals)) {
        expect(Number.isFinite(value)).toBe(true);
      }
    });
  }
});

describe("Все калькуляторы — все нули → без NaN/Infinity в scenarios", () => {
  for (const calc of calculators) {
    it(`${calc.name}: scenarios exact_need/purchase_quantity/leftover — конечные числа`, () => {
      const result = calc.compute(zeroInputs);
      for (const key of ["MIN", "REC", "MAX"] as const) {
        expect(Number.isFinite(result.scenarios[key].exact_need)).toBe(true);
        expect(Number.isFinite(result.scenarios[key].purchase_quantity)).toBe(true);
        expect(Number.isFinite(result.scenarios[key].leftover)).toBe(true);
      }
    });
  }
});

// ─── Все нули → purchaseQty неотрицательные ───

describe("Все калькуляторы — все нули → purchaseQty >= 0", () => {
  for (const calc of calculators) {
    it(`${calc.name}: purchaseQty неотрицательные`, () => {
      const result = calc.compute(zeroInputs);
      for (const mat of result.materials) {
        if (mat.purchaseQty !== undefined) {
          expect(mat.purchaseQty).toBeGreaterThanOrEqual(0);
        }
      }
    });
  }
});

// ─── Все нули → MIN <= REC <= MAX ───

describe("Все калькуляторы — все нули → MIN <= REC <= MAX", () => {
  for (const calc of calculators) {
    it(`${calc.name}: MIN.purchase_quantity <= REC <= MAX`, () => {
      const result = calc.compute(zeroInputs);
      expect(result.scenarios.MIN.purchase_quantity).toBeLessThanOrEqual(
        result.scenarios.REC.purchase_quantity,
      );
      expect(result.scenarios.REC.purchase_quantity).toBeLessThanOrEqual(
        result.scenarios.MAX.purchase_quantity,
      );
    });
  }
});

// ─── Стандартные входные данные (defaults) → purchaseQty целые ───
// Примечание: drywall engine передаёт scenario exact_need как purchaseQty для ГКЛ листов,
// что может быть нецелым числом. Это проверяется отдельно для каждого калькулятора, кроме drywall.

describe("Все калькуляторы — defaults → все purchaseQty целые числа (кроме scenario-derived)", () => {
  // concrete and drywall may have non-integer purchaseQty (e.g., м³ concrete, ГКЛ листы)
  const nonIntegerPurchaseQtyCalcs = ["drywall (гипсокартон)", "concrete (бетон)"];
  const calcsMostlyIntegerPurchaseQty = calculators.filter((c) => !nonIntegerPurchaseQtyCalcs.includes(c.name));

  for (const calc of calcsMostlyIntegerPurchaseQty) {
    it(`${calc.name}: purchaseQty — целые`, () => {
      const result = calc.compute({});
      for (const mat of result.materials) {
        if (mat.purchaseQty !== undefined) {
          expect(Number.isInteger(mat.purchaseQty)).toBe(true);
        }
      }
    });
  }

  for (const name of nonIntegerPurchaseQtyCalcs) {
    it(`${name}: purchaseQty — конечные числа >= 0`, () => {
      const result = calculators.find((c) => c.name === name)!.compute({});
      for (const mat of result.materials) {
        if (mat.purchaseQty !== undefined) {
          expect(mat.purchaseQty).toBeGreaterThanOrEqual(0);
          expect(Number.isFinite(mat.purchaseQty)).toBe(true);
        }
      }
    });
  }
});
