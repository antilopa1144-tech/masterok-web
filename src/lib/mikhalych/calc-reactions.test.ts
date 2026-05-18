import { describe, expect, it } from "vitest";
import { buildInstantCalcReaction } from "./calc-reactions";

describe("buildInstantCalcReaction", () => {
  it("упоминает warning", () => {
    const text = buildInstantCalcReaction(
      {
        materials: [{ name: "A", quantity: 1, unit: "шт" }],
        totals: {},
        warnings: ["Площадь слишком мала"],
      },
      1,
    );
    expect(text).toContain("Площадь слишком мала");
  });
});
