import { describe, expect, it } from "vitest";
import spec from "../../configs/calculators/facade-panels-canonical.v1.json";
import { computeCanonicalFacadePanels } from "../../engine/facade-panels";

const calc = (inputs: Record<string, number>) => computeCanonicalFacadePanels(spec as any, inputs);

describe("facade panels canonical v3", () => {
  it("subtracts openings in dimensions mode", () => {
    const result = calc({ inputMode: 0, houseLength: 10, houseWidth: 8, wallHeight: 3, openingsArea: 12 });
    expect(result.totals.wallLength).toBe(36);
    expect(result.totals.grossArea).toBe(108);
    expect(result.totals.wallArea).toBe(96);
  });

  it("uses ready area without subtracting openings twice", () => {
    const result = calc({ inputMode: 1, area: 80, openingsArea: 12 });
    expect(result.totals.wallArea).toBe(80);
  });

  it("applies reserve once before purchase rounding", () => {
    const result = calc({ inputMode: 1, area: 10, panelUsefulArea: 0.75, reservePercent: 10, needProfile: 0, externalCorners: 0 });
    expect(result.scenarios.MIN.exact_need).toBeCloseTo(13.333333, 6);
    expect(result.scenarios.REC.exact_need).toBeCloseTo(14.666667, 6);
    expect(result.scenarios.REC.purchase_quantity).toBe(15);
    expect(result.scenarios.MAX.exact_need).toBeCloseTo(15.333333, 6);
  });

  it("rounds passport packaging and accessories to purchase units", () => {
    const result = calc({ inputMode: 0, houseLength: 10, houseWidth: 8, wallHeight: 3, openingsArea: 12, panelUsefulArea: 1, reservePercent: 10, needProfile: 1, profileStep: 0.6, profilePieceLength: 3, fastenersPerPanel: 6, needInsulation: 1, insulationPackArea: 5.76, externalCorners: 4, cornerPieceLength: 3, starterPieceLength: 3 });
    expect(result.totals.panelsCount).toBe(106);
    expect(result.totals.profileLength).toBe(180);
    expect(result.totals.profilePieces).toBe(60);
    expect(result.totals.fasteners).toBe(636);
    expect(result.totals.insulationPacks).toBe(17);
    expect(result.totals.cornersCount).toBe(4);
    expect(result.totals.startersCount).toBe(12);
  });

  it("does not invent fastening quantities when passport rate is absent", () => {
    const result = calc({ inputMode: 1, area: 100, fastenersPerPanel: 0 });
    expect(result.totals.fasteners).toBe(0);
    expect(result.materials.some((item) => item.name === "Крепёж панелей")).toBe(false);
    expect(result.warnings.some((warning) => warning.includes("Крепёж не добавлен"))).toBe(true);
  });
});
