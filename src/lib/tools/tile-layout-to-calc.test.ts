import { describe, expect, it } from "vitest";
import {
  buildPlitkaCalculatorHref,
  buildPlitkaTransferValues,
  buildTileLayoutHref,
  parseTileLayoutFromSearchParams,
  mapLayoutModeToLayingMethod,
} from "./tile-layout-to-calc";

const base = {
  surfaceW: 1700,
  surfaceH: 2500,
  tileW: 300,
  tileH: 600,
  groutMm: 2,
  layoutMode: "straight" as const,
};

describe("mapLayoutModeToLayingMethod", () => {
  it("maps straight to 0", () => {
    expect(mapLayoutModeToLayingMethod("straight")).toBe(0);
  });
  it("maps diagonal to 1", () => {
    expect(mapLayoutModeToLayingMethod("diagonal")).toBe(1);
  });
  it("maps offset modes to 2", () => {
    expect(mapLayoutModeToLayingMethod("offset-half")).toBe(2);
    expect(mapLayoutModeToLayingMethod("offset-third")).toBe(2);
  });
});

describe("buildPlitkaTransferValues", () => {
  it("converts mm surface to m² area mode", () => {
    const v = buildPlitkaTransferValues(base);
    expect(v.inputMode).toBe(1);
    expect(v.area).toBe(4.25);
    expect(v.tileWidth).toBe(300);
    expect(v.tileHeight).toBe(600);
    expect(v.jointWidth).toBe(2);
    expect(v.layingMethod).toBe(0);
  });
});

describe("buildPlitkaCalculatorHref", () => {
  it("includes from=raskladka and field params", () => {
    const href = buildPlitkaCalculatorHref({ ...base, layoutMode: "diagonal" });
    expect(href).toContain("/kalkulyatory/poly/plitka/");
    expect(href).toContain("from=raskladka");
    expect(href).toContain("area=4.25");
    expect(href).toContain("layingMethod=1");
  });

  it("includes tilesHint when provided", () => {
    const href = buildPlitkaCalculatorHref(base, { tilesTotal: 42 });
    expect(href).toContain("tilesHint=42");
  });
});

describe("buildTileLayoutHref", () => {
  it("round-trips via parseTileLayoutFromSearchParams", () => {
    const href = buildTileLayoutHref(base);
    const params = new URLSearchParams(href.split("?")[1]);
    const parsed = parseTileLayoutFromSearchParams(params);
    expect(parsed?.surfaceW).toBe(1700);
    expect(parsed?.surfaceH).toBe(2500);
    expect(parsed?.layoutMode).toBe("straight");
  });
});
