import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { ALL_CALCULATORS } from "../index";
import { PUBLIC_ADAPTER_RECONCILIATION_QUEUE } from "../public-adapter-registry";
import { CALCULATOR_RISK_REGISTRY } from "../risk-registry";

const ROOT = process.cwd();

function readCanonicalSpec(canonicalId: string): {
  calculator_id: string;
  formula_version: string;
} {
  return JSON.parse(readFileSync(
    path.join(ROOT, "configs", "calculators", `${canonicalId}-canonical.v1.json`),
    "utf8",
  ));
}

describe("public calculator adapter contract", () => {
  it("явно фиксирует каждый публичный адаптер, который ещё расходится с canonical", () => {
    const riskBySlug = new Map(
      CALCULATOR_RISK_REGISTRY.map((entry) => [entry.slug, entry]),
    );
    const mismatches: string[] = [];

    for (const calculator of ALL_CALCULATORS) {
      const risk = riskBySlug.get(calculator.slug);
      expect(risk, `${calculator.slug}: risk entry missing`).toBeDefined();
      const spec = readCanonicalSpec(risk!.canonicalId);
      const defaults = Object.fromEntries(
        calculator.fields.map((field) => [field.key, field.defaultValue]),
      );
      const publicResult = calculator.calculate(defaults);

      expect(publicResult.formulaVersion, `${calculator.slug}: public formula_version missing`)
        .toBeTruthy();

      if (publicResult.formulaVersion === spec.formula_version) {
        expect(publicResult.canonicalSpecId, `${calculator.slug}: canonical id missing`)
          .toBe(spec.calculator_id);
      } else {
        mismatches.push(calculator.slug);
        expect(risk!.implementationAudit, `${calculator.slug}: mismatch marked completed`)
          .toBe("pending");
      }
    }

    const registered = [...PUBLIC_ADAPTER_RECONCILIATION_QUEUE];
    expect(new Set(registered).size).toBe(registered.length);
    expect(mismatches.sort()).toEqual(registered.sort());
  });
});
