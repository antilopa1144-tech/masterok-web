import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { ALL_CALCULATORS } from "../index";
import { CALCULATOR_RISK_REGISTRY } from "../risk-registry";

const ROOT = process.cwd();

describe("calculator risk registry", () => {
  it("покрывает каждый опубликованный калькулятор ровно один раз", () => {
    const publishedSlugs = ALL_CALCULATORS.map((calculator) => calculator.slug).sort();
    const registeredSlugs = CALCULATOR_RISK_REGISTRY.map((entry) => entry.slug).sort();

    expect(new Set(registeredSlugs).size).toBe(registeredSlugs.length);
    expect(registeredSlugs).toEqual(publishedSlugs);
  });

  it("связывает каждую запись с canonical, engine, parity и предметным тестом", () => {
    for (const entry of CALCULATOR_RISK_REGISTRY) {
      const specPath = path.join(
        ROOT,
        "configs",
        "calculators",
        `${entry.canonicalId}-canonical.v1.json`,
      );
      const spec = JSON.parse(readFileSync(specPath, "utf8"));
      const enginePath = path.join(ROOT, "engine", `${entry.canonicalId}.ts`);
      const parityPath = path.join(
        ROOT,
        "tests",
        "fixtures",
        "parity",
        `${entry.canonicalId}.parity.json`,
      );
      const calculatorTestPath = path.join(
        ROOT,
        "src",
        "lib",
        "calculators",
        "__tests__",
        `${entry.canonicalId}.test.ts`,
      );
      const engineTestPath = path.join(ROOT, "tests", "engine", `${entry.canonicalId}.test.ts`);

      expect(spec.calculator_id, entry.slug).toBe(entry.canonicalId);
      expect(spec.scenario_policy, `${entry.slug}: scenario_policy`).toBeTypeOf("object");
      expect(spec.packaging_rules, `${entry.slug}: packaging_rules`).toBeTypeOf("object");
      expect(() => readFileSync(enginePath, "utf8"), `${entry.slug}: engine`).not.toThrow();
      expect(() => readFileSync(parityPath, "utf8"), `${entry.slug}: parity`).not.toThrow();

      const hasDedicatedTest = [calculatorTestPath, engineTestPath].some((testPath) => {
        try {
          readFileSync(testPath, "utf8");
          return true;
        } catch {
          return false;
        }
      });
      expect(hasDedicatedTest, `${entry.slug}: dedicated test`).toBe(true);
    }
  });

  it("не выдаёт структурную готовность за независимое предметное ревью", () => {
    for (const entry of CALCULATOR_RISK_REGISTRY) {
      expect(entry.drivers.length, `${entry.slug}: risk drivers`).toBeGreaterThan(0);
      expect(entry.independentReview, `${entry.slug}: independent review`).toBe("pending");
      if (entry.tier === "P0") {
        expect(
          entry.drivers.some((driver) =>
            ["structural_safety", "engineering_safety"].includes(driver),
          ),
          `${entry.slug}: P0 safety driver`,
        ).toBe(true);
      }
    }
  });

  it("держит сгенерированный markdown синхронным с реестром", () => {
    const report = readFileSync(
      path.join(ROOT, "docs", "calculator-risk-register.md"),
      "utf8",
    );

    expect(report).toContain(
      `| Опубликованные калькуляторы в реестре | ${ALL_CALCULATORS.length}/${ALL_CALCULATORS.length} |`,
    );
    for (const entry of CALCULATOR_RISK_REGISTRY) {
      expect(report, entry.slug).toContain(
        `| ${entry.tier} |`,
      );
      expect(report, entry.slug).toContain(`| \`${entry.slug}\` | \`${entry.canonicalId}\` |`);
    }
  });
});
