import { describe, expect, it } from "vitest";
import { calculateDirectionalLaminateLayout } from "./laminate-layout";
import { getLaminateExportCopy, getLaminateExportGeometry } from "./laminate-layout-export";

describe("laminate layout PNG report", () => {
  it("makes a readable image for the default plan", () => {
    const geometry = getLaminateExportGeometry(518, 534);
    expect(geometry.width).toBe(1600);
    expect(geometry.planWidth).toBeGreaterThan(1000);
    expect(geometry.planHeight).toBeLessThanOrEqual(1400);
    expect(geometry.height).toBeGreaterThan(1200);
  });

  it("fits a long corridor without clipping the plan", () => {
    const geometry = getLaminateExportGeometry(203, 534);
    expect(geometry.planHeight).toBeLessThanOrEqual(1400);
    expect(geometry.planX).toBeGreaterThan(0);
    expect(geometry.summaryY).toBeGreaterThan(geometry.planY + geometry.planHeight);
    expect(() => getLaminateExportGeometry(0, 534)).toThrow();
  });

  it("labels the purchase breakdown without treating pieces on the plan as packs", () => {
    const result = calculateDirectionalLaminateLayout(3000, 4000, 1285, 192, "deck-third", "along-width");
    const copy = getLaminateExportCopy(result, "along-width");
    expect(copy.baseLabel).toBe("На схему");
    expect(copy.parameters).toContain("3000 × 4000 мм");
    expect(result.purchaseBoards).toBe(result.basePurchaseBoards + result.purchaseReserveBoards);
  });

  it("identifies herringbone purchase as an area-based estimate", () => {
    const result = calculateDirectionalLaminateLayout(3000, 4000, 1200, 100, "herringbone", "along-width");
    const copy = getLaminateExportCopy(result, "along-width");
    expect(copy.baseLabel).toBe("По площади");
    expect(copy.caveat).toContain("ориентировочная");
  });
});
