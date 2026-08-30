import { describe, expect, it } from "vitest";
import {
  buildDrywallCalculatorHref,
  buildFastenersCalculatorHref,
  buildSheetLayoutHref,
  buildSheetLayoutHrefFromDrywall,
  buildSheetLayoutHrefFromFasteners,
} from "./sheet-layout-to-calc";
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

    expect(url.searchParams.get("from")).toBe("gipsokarton");
    expect(url.searchParams.get("material")).toBe("drywall");
    expect(url.searchParams.get("surfaceWidthMm")).toBe("5000");
    expect(url.searchParams.get("surfaceHeightMm")).toBe("2700");
    expect(url.searchParams.get("sheetLengthMm")).toBe("3000");
    expect(url.searchParams.get("layers")).toBe("2");
  });

  it("переносит точное количество ГКЛ из раскладки в крепёж", () => {
    const href = buildFastenersCalculatorHref(input, 12);
    const url = new URL(href!, "https://getmasterok.ru");

    expect(url.pathname).toBe("/kalkulyatory/otdelka/krepezh/");
    expect(url.searchParams.get("from")).toBe("raskladka-listov");
    expect(url.searchParams.get("materialType")).toBe("0");
    expect(url.searchParams.get("sheetCount")).toBe("12");
    expect(url.searchParams.get("fastenerStep")).toBe("250");
    expect(url.searchParams.get("withFrameScrews")).toBe("1");
  });

  it("выбирает режим ОСП и его базовый шаг крепления", () => {
    const href = buildFastenersCalculatorHref({ ...input, material: "osb" }, 18);
    const url = new URL(href!, "https://getmasterok.ru");

    expect(url.searchParams.get("materialType")).toBe("1");
    expect(url.searchParams.get("sheetCount")).toBe("18");
    expect(url.searchParams.get("fastenerStep")).toBe("200");
    expect(url.searchParams.get("withFrameScrews")).toBe("0");
  });

  it("не строит ссылку на крепёж для своего листа и объёма вне диапазона", () => {
    expect(buildFastenersCalculatorHref({ ...input, material: "custom" }, 12)).toBeNull();
    expect(buildFastenersCalculatorHref(input, 201)).toBeNull();
  });

  it("возвращает из крепежа только к безопасному стартовому формату листа", () => {
    const url = new URL(buildSheetLayoutHrefFromFasteners({ materialType: 1 })!, "https://getmasterok.ru");

    expect(url.searchParams.get("from")).toBe("krepezh");
    expect(url.searchParams.get("material")).toBe("osb");
    expect(url.searchParams.get("sheetWidthMm")).toBe("1250");
    expect(url.searchParams.get("sheetLengthMm")).toBe("2500");
    expect(url.searchParams.get("jointGapMm")).toBe("3");
    expect(url.searchParams.has("surfaceWidthMm")).toBe(false);
    expect(url.searchParams.has("surfaceHeightMm")).toBe(false);
    expect(buildSheetLayoutHrefFromFasteners({ materialType: 3 })).toBeNull();
  });
});
