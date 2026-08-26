import { describe, expect, it } from "vitest";
import {
  getCalculatorCategoryRedirect,
  getCanonicalCalculatorPath,
} from "./canonical-path";

const tileCalculator = { categorySlug: "poly", slug: "plitka" };

describe("calculator canonical paths", () => {
  it("builds the canonical calculator path", () => {
    expect(getCanonicalCalculatorPath(tileCalculator)).toBe("/kalkulyatory/poly/plitka/");
  });

  it("redirects a known calculator from a wrong category", () => {
    expect(getCalculatorCategoryRedirect("steny", tileCalculator)).toBe(
      "/kalkulyatory/poly/plitka/",
    );
  });

  it("does not redirect an already canonical category", () => {
    expect(getCalculatorCategoryRedirect("poly", tileCalculator)).toBeNull();
  });
});
