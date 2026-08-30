import { describe, expect, it } from "vitest";
import { calculatePaverLayout } from "./paver-layout";
import {
  buildPaverLayoutHrefFromCalculatorResult,
  buildPavingCalculatorHrefFromLayout,
  PAVER_LAYOUT_TRANSFER_FROM,
  PAVING_CALCULATOR_TRANSFER_FROM,
  readPaverLayoutHints,
} from "./paver-layout-to-calc";

describe("paver layout calculator transfer", () => {
  it("passes calculator area and perimeter only as layout hints", () => {
    const href = buildPaverLayoutHrefFromCalculatorResult({ area: 15, perimeter: 16 });
    const url = new URL(href!, "https://getmasterok.ru");

    expect(url.pathname).toBe("/instrumenty/raskladka-trotuarnoy-plitki/");
    expect(url.searchParams.get("from")).toBe(PAVING_CALCULATOR_TRANSFER_FROM);
    expect(url.searchParams.get("areaHint")).toBe("15");
    expect(url.searchParams.get("perimeterHint")).toBe("16");
    expect(url.searchParams.has("surfaceWidthMm")).toBe(false);
    expect(url.searchParams.has("surfaceLengthMm")).toBe(false);
  });

  it("reads only complete and authorised hints", () => {
    const params = new URLSearchParams({
      from: PAVING_CALCULATOR_TRANSFER_FROM,
      areaHint: "15",
      perimeterHint: "16",
    });
    expect(readPaverLayoutHints(params)).toEqual({ areaM2: 15, perimeterM: 16 });

    params.delete("perimeterHint");
    expect(readPaverLayoutHints(params)).toBeNull();
    params.set("perimeterHint", "16");
    params.set("from", "unknown");
    expect(readPaverLayoutHints(params)).toBeNull();
  });

  it("passes exact rectangular area and perimeter from the layout to the calculator", () => {
    const result = calculatePaverLayout({
      surfaceWidthMm: 3000,
      surfaceLengthMm: 5000,
      paverWidthMm: 100,
      paverLengthMm: 200,
      jointMm: 3,
      pattern: "offset-half",
      reservePercent: 7,
    });
    const url = new URL(buildPavingCalculatorHrefFromLayout(result)!, "https://getmasterok.ru");

    expect(url.searchParams.get("from")).toBe(PAVER_LAYOUT_TRANSFER_FROM);
    expect(url.searchParams.get("area")).toBe("15");
    expect(url.searchParams.get("perimeter")).toBe("16");
    expect(url.searchParams.get("borderEnabled")).toBe("1");
    expect(url.searchParams.get("layoutPaversHint")).toBe(String(result.purchasePavers));
    expect(url.searchParams.has("foundationType")).toBe(false);
    expect(url.searchParams.has("tileThickness")).toBe(false);
  });

  it("refuses values the receiving page cannot represent", () => {
    const small = calculatePaverLayout({
      surfaceWidthMm: 300,
      surfaceLengthMm: 300,
      paverWidthMm: 100,
      paverLengthMm: 200,
      jointMm: 3,
      pattern: "straight",
      reservePercent: 7,
    });

    expect(buildPavingCalculatorHrefFromLayout(small)).toBeNull();
    expect(buildPaverLayoutHrefFromCalculatorResult({ area: 4.9, perimeter: 16 })).toBeNull();
  });
});
