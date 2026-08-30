import { describe, expect, it } from "vitest";
import { calculateLightingLayout } from "./lighting-layout";
import {
  buildCeilingStretchHrefFromLightingLayout,
  buildLightingLayoutHrefFromCeilingCalculator,
  CEILING_STRETCH_TRANSFER_FROM,
  LIGHTING_LAYOUT_TRANSFER_FROM,
  readCeilingCalculatorLightingTransfer,
  readLightingLayoutCeilingTransfer,
} from "./lighting-layout-to-ceiling";

function makeLayout(overrides: Partial<Parameters<typeof calculateLightingLayout>[0]> = {}) {
  return calculateLightingLayout({
    roomWidthMm: 4000,
    roomLengthMm: 6000,
    columns: 3,
    rows: 4,
    wallOffsetXmm: 600,
    wallOffsetYmm: 600,
    pattern: "grid",
    ...overrides,
  });
}

describe("lighting-layout-to-ceiling", () => {
  it("передаёт точную площадь, прямоугольные углы и число точек в натяжной потолок", () => {
    const href = buildCeilingStretchHrefFromLightingLayout(makeLayout());
    const url = new URL(href!, "https://getmasterok.ru");

    expect(url.pathname).toBe("/kalkulyatory/potolki/natyazhnoj-potolok/");
    expect(Object.fromEntries(url.searchParams)).toEqual({
      from: LIGHTING_LAYOUT_TRANSFER_FROM,
      area: "24",
      corners: "4",
      fixtures: "12",
      roomWidthMm: "4000",
      roomLengthMm: "6000",
    });
  });

  it("не подрезает площадь и число точек до диапазона калькулятора", () => {
    expect(buildCeilingStretchHrefFromLightingLayout(makeLayout({ roomWidthMm: 500, roomLengthMm: 500 })))
      .toBeNull();
    expect(buildCeilingStretchHrefFromLightingLayout(makeLayout({ columns: 10, rows: 6 })))
      .toBeNull();
  });

  it("проверяет согласованность размеров и площади входящего URL", () => {
    const valid = new URLSearchParams({
      from: LIGHTING_LAYOUT_TRANSFER_FROM,
      area: "24",
      fixtures: "12",
      roomWidthMm: "4000",
      roomLengthMm: "6000",
    });
    expect(readLightingLayoutCeilingTransfer(valid)).toEqual({
      roomWidthMm: 4000,
      roomLengthMm: 6000,
      areaM2: 24,
      fixtures: 12,
      exactPerimeterM: 20,
    });

    valid.set("area", "25");
    expect(readLightingLayoutCeilingTransfer(valid)).toBeNull();
  });

  it("из калькулятора передаёт только подсказки, не выдумывая стороны и сетку", () => {
    const href = buildLightingLayoutHrefFromCeilingCalculator({ area: 20, fixtures: 6 });
    const url = new URL(href!, "https://getmasterok.ru");

    expect(url.pathname).toBe("/instrumenty/rasstanovka-svetilnikov/");
    expect(Object.fromEntries(url.searchParams)).toEqual({
      from: CEILING_STRETCH_TRANSFER_FROM,
      areaHint: "20",
      fixturesHint: "6",
    });
    expect(url.searchParams.has("roomWidthMm")).toBe(false);
    expect(url.searchParams.has("columns")).toBe(false);
    expect(url.searchParams.has("rows")).toBe(false);
  });

  it("принимает ноль светильников как ориентир для новой схемы", () => {
    const params = new URLSearchParams({
      from: CEILING_STRETCH_TRANSFER_FROM,
      areaHint: "18",
      fixturesHint: "0",
    });
    expect(readCeilingCalculatorLightingTransfer(params)).toEqual({ areaM2: 18, fixtures: 0 });
  });

  it("отклоняет неверный источник и дробное число светильников", () => {
    expect(readCeilingCalculatorLightingTransfer(new URLSearchParams({
      from: "other",
      areaHint: "18",
      fixturesHint: "6",
    }))).toBeNull();
    expect(buildLightingLayoutHrefFromCeilingCalculator({ area: 18, fixtures: 6.5 })).toBeNull();
  });
});
