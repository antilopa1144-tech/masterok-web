import { describe, it, expect } from "vitest";
import { formatWeightRu, formatWeightParts } from "../weight";

describe("formatWeightRu", () => {
  it.each([
    [0.005, "< 10 г"],
    [0.08, "80 г"],
    [0.1, "100 г"],
    [0.15, "150 г"],
    [0.25, "250 г"],
    [0.4, "400 г"],
    [0.95, "950 г"],
    [0.999, "999 г"],
    [1, "1 кг"],
    [2, "2 кг"],
    [10, "10 кг"],
  ])("formatWeightRu(%s) → '%s'", (kg, expected) => {
    expect(formatWeightRu(kg)).toBe(expected);
  });

  it("handles 1.25 кг with decimal", () => {
    const result = formatWeightRu(1.25);
    expect(result).toMatch(/1[,.]25 кг/);
  });

  it("handles 0 and negative", () => {
    expect(formatWeightRu(0)).toBe("0 г");
    expect(formatWeightRu(-1)).toBe("0 г");
  });

  it("handles NaN and Infinity", () => {
    expect(formatWeightRu(NaN)).toBe("0 г");
    expect(formatWeightRu(Infinity)).toBe("0 г");
  });
});

describe("formatWeightParts", () => {
  it("returns grams for < 1 kg", () => {
    expect(formatWeightParts(0.15)).toEqual(["150", "г"]);
    expect(formatWeightParts(0.4)).toEqual(["400", "г"]);
  });

  it("returns kg for >= 1 kg", () => {
    const [val, unit] = formatWeightParts(2);
    expect(unit).toBe("кг");
    expect(val).toBe("2");
  });

  it("returns grams tuple for small values", () => {
    const [val, unit] = formatWeightParts(0.005);
    expect(unit).toBe("г");
    expect(val).toBe("< 10");
  });
});
