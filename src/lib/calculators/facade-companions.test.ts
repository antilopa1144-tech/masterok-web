import { describe, expect, it } from "vitest";
import { CALCULATOR_COMPANIONS } from "./companions";

describe("facade calculator companions", () => {
  it("routes siding and facade panels to the frame-capable insulation calculator", () => {
    expect(CALCULATOR_COMPANIONS.sayding?.[0]).toEqual({
      slug: "uteplenie",
      reason: "Утеплитель для каркаса под сайдингом",
    });
    expect(CALCULATOR_COMPANIONS["fasadnye-paneli"]?.[0]).toEqual({
      slug: "uteplenie",
      reason: "Утеплитель для каркаса под панелями",
    });
  });

  it("does not present vent cladding as a continuation of a wet facade", () => {
    const wetFacadeTargets = CALCULATOR_COMPANIONS["uteplenie-fasada-minvatoj"]?.map(
      (item) => item.slug,
    ) ?? [];

    expect(wetFacadeTargets).not.toContain("sayding");
    expect(wetFacadeTargets).not.toContain("fasadnye-paneli");
  });
});
