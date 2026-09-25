import { describe, expect, it } from "vitest";
import { calculateSheetLayout, type SheetLayoutInput } from "./sheet-layout";
import { getSheetExportCopy, getSheetExportGeometry } from "./sheet-layout-export";

const input: SheetLayoutInput = {
  surfaceWidthMm: 5000,
  surfaceHeightMm: 2700,
  sheetWidthMm: 1200,
  sheetLengthMm: 2500,
  material: "drywall",
  surface: "wall",
  orientation: "portrait",
  stagger: "half",
  layers: 1,
  jointGapMm: 0,
  reservePercent: 5,
};

describe("sheet layout PNG report", () => {
  it("uses a readable export size for the default wall", () => {
    const geometry = getSheetExportGeometry([{ width: 6100, height: 3900 }]);
    expect(geometry.width).toBe(1600);
    expect(geometry.plans[0].width).toBeGreaterThan(1000);
    expect(geometry.summaryY).toBeGreaterThan(geometry.plans[0].y + geometry.plans[0].height);
  });

  it("includes both layers without claiming their shared purchase is per layer", () => {
    const geometry = getSheetExportGeometry([{ width: 6100, height: 3900 }, { width: 6100, height: 3900 }]);
    const result = calculateSheetLayout({ ...input, layers: 2 });
    expect(geometry.plans[1].y).toBeGreaterThan(geometry.plans[0].y + geometry.plans[0].height);
    expect(getSheetExportCopy(result).scope).toContain("суммарные");
    expect(result.purchaseSheets).toBe(result.baseSheets + result.reserveSheets);
  });

  it("rejects missing or invalid layers", () => {
    expect(() => getSheetExportGeometry([])).toThrow();
    expect(() => getSheetExportGeometry([{ width: 0, height: 100 }])).toThrow();
    expect(() => getSheetExportGeometry(Array(3).fill({ width: 100, height: 100 }))).toThrow();
  });
});
