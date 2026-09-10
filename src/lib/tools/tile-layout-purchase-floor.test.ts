import { describe, expect, it } from "vitest";
import type { CalculatorResult } from "@/lib/calculators/types";
import { applyTileLayoutPurchaseFloor } from "./tile-layout-purchase-floor";

const result: CalculatorResult = {
  materials: [{
    name: "Плитка 600×300 мм",
    quantity: 42.99,
    withReserve: 48,
    purchaseQty: 48,
    unit: "шт",
    category: "Основное",
    packageInfo: { count: 6, size: 8, packageUnit: "упаковок" },
  }],
  totals: {
    minExactNeedTiles: 39,
    recExactNeedTiles: 42.99,
    maxExactNeedTiles: 58,
    minPurchaseTiles: 40,
    recPurchaseTiles: 48,
    maxPurchaseTiles: 64,
  },
  warnings: [],
  scenarios: {
    MIN: { exact_need: 39, purchase_quantity: 40, leftover: 1, assumptions: [], key_factors: {}, buy_plan: { package_label: "tile-box-8", package_size: 8, packages_count: 5, unit: "шт" } },
    REC: { exact_need: 42.99, purchase_quantity: 48, leftover: 5.01, assumptions: [], key_factors: {}, buy_plan: { package_label: "tile-box-8", package_size: 8, packages_count: 6, unit: "шт" } },
    MAX: { exact_need: 58, purchase_quantity: 64, leftover: 6, assumptions: [], key_factors: {}, buy_plan: { package_label: "tile-box-8", package_size: 8, packages_count: 8, unit: "шт" } },
  },
};

describe("applyTileLayoutPurchaseFloor", () => {
  it("does not let the area estimate buy fewer boxes than the selected layout", () => {
    const adjusted = applyTileLayoutPurchaseFloor(
      "plitka",
      new URLSearchParams("from=raskladka&tilesHint=50&layoutTilesPerBox=8"),
      result,
    );

    expect(adjusted.materials[0]).toMatchObject({ quantity: 50, purchaseQty: 56, withReserve: 56 });
    expect(adjusted.materials[0].packageInfo).toEqual({ count: 7, size: 8, packageUnit: "упаковок" });
    expect(adjusted.scenarios?.MIN.purchase_quantity).toBe(56);
    expect(adjusted.scenarios?.REC).toMatchObject({ exact_need: 50, purchase_quantity: 56, leftover: 6 });
    expect(adjusted.scenarios?.MAX.purchase_quantity).toBe(64);
    expect(adjusted.totals.recPurchaseTiles).toBe(56);
    expect(adjusted.warnings[0]).toContain("50 шт.");
  });

  it("leaves unrelated calculator URLs and already safer results unchanged", () => {
    expect(applyTileLayoutPurchaseFloor("plitka", new URLSearchParams("tilesHint=50&layoutTilesPerBox=8"), result)).toBe(result);
    expect(applyTileLayoutPurchaseFloor("laminat", new URLSearchParams("from=raskladka&tilesHint=50&layoutTilesPerBox=8"), result)).toBe(result);
    const alreadySafe = {
      ...result,
      materials: [{ ...result.materials[0], purchaseQty: 64 }],
    };
    expect(applyTileLayoutPurchaseFloor("plitka", new URLSearchParams("from=raskladka&tilesHint=50&layoutTilesPerBox=8"), alreadySafe)).toBe(alreadySafe);
  });

  it("stops using the old layout after the user changes its geometry in the calculator", () => {
    const resultWithGeometry: CalculatorResult = {
      ...result,
      totals: { ...result.totals, area: 6.5, tileWidthCm: 60, tileHeightCm: 30, layoutPattern: 1 },
    };

    expect(applyTileLayoutPurchaseFloor(
      "plitka",
      new URLSearchParams("from=raskladka&tilesHint=50&layoutTilesPerBox=8&area=7&tileWidth=600&tileHeight=300&layingMethod=0"),
      resultWithGeometry,
    )).toBe(resultWithGeometry);
  });
});
