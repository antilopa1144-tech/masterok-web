import { describe, it } from "vitest";
import type { CalculatorResult } from "../types";

export interface CanonicalFixtureCase<TExpected> {
  id: string;
  inputs: Record<string, number>;
  expected: TExpected;
}

interface CanonicalParitySuiteOptions<TExpected> {
  suiteName: string;
  cases: Array<CanonicalFixtureCase<TExpected>>;
  calculate: (inputs: Record<string, number>) => CalculatorResult;
  assertCase: (result: CalculatorResult, expected: TExpected, fixtureCase: CanonicalFixtureCase<TExpected>) => void;
}

export function runCanonicalParitySuite<TExpected>({
  suiteName,
  cases,
  calculate,
  assertCase,
}: CanonicalParitySuiteOptions<TExpected>) {
  describe(suiteName, () => {
    for (const fixtureCase of cases) {
      it(fixtureCase.id, () => {
        const result = calculate(fixtureCase.inputs);
        assertCase(result, fixtureCase.expected, fixtureCase);
      });
    }
  });
}
