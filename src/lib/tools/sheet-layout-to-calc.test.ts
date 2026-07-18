import { describe, expect, it } from "vitest";
import { buildDrywallCalculatorHref, buildSheetLayoutHref, buildSheetLayoutHrefFromDrywall } from "./sheet-layout-to-calc";
import type { SheetLayoutInput } from "./sheet-layout";

const input: SheetLayoutInput = {
  surfaceWidthMm: 5000,
  surfaceHeightMm: 2700,
  sheetWidthMm: 1200,
  sheetLengthMm: 2500,
  material: "drywall",
  surface: "wall",
  orientation: "portrait",
  stagger: "half",
  layers: 2,
  jointGapMm: 0,
  reservePercent: 5,
};

describe("sheet-layout-to-calc", () => {
  it("переносит размеры, слой и формат листа в калькулятор ГКЛ", () => {
    const url = new URL(buildDrywallCalculatorHref(input, 12), "https://getmasterok.ru");

    expect(url.pathname).toBe("/kalkulyatory/steny/gipsokarton/");
    expect(url.searchParams.get("length")).toBe("5");
    expect(url.searchParams.get("height")).toBe("2.7");
    expect(url.searchParams.get("layers")).toBe("2");
    expect(url.searchParams.get("sheetSize")).toBe("0");
    expect(url.searchParams.get("sheetsHint")).toBe("12");
  });

  it("строит обратную ссылку из калькулятора", () => {
    const href = buildSheetLayoutHref({
      surfaceWidthMm: 5000,
      surfaceHeightMm: 2700,
      sheetWidthMm: 1200,
      sheetLengthMm: 2500,
      layers: 1,
    });

    expect(href).toContain("/instrumenty/raskladka-listov/?");
    expect(href).toContain("surfaceWidthMm=5000");
  });

  it("переводит метры и индекс формата из калькулятора в раскладку", () => {
    const url = new URL(buildSheetLayoutHrefFromDrywall({ length: 5, height: 2.7, layers: 2, sheetSize: 1 }), "https://getmasterok.ru");

    expect(url.searchParams.get("surfaceWidthMm")).toBe("5000");
    expect(url.searchParams.get("surfaceHeightMm")).toBe("2700");
    expect(url.searchParams.get("sheetLengthMm")).toBe("3000");
    expect(url.searchParams.get("layers")).toBe("2");
  });
});
