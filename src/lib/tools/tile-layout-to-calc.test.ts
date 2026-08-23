import { describe, expect, it } from "vitest";
import {
  buildTileAdhesiveCalculatorHref,
  buildTileGroutCalculatorHref,
  buildPlitkaCalculatorHref,
  buildPlitkaTransferValues,
  buildTileLayoutHref,
  buildTileLayoutHrefFromCalculatorValues,
  parseTileLayoutFromSearchParams,
  mapLayoutModeToLayingMethod,
  mapTileSizeToAdhesiveOption,
} from "./tile-layout-to-calc";

const base = {
  surfaceW: 1700,
  surfaceH: 2500,
  tileW: 300,
  tileH: 600,
  groutMm: 2,
  layoutMode: "straight" as const,
  packAreaM2: 1.44,
  tilesPerBox: 8,
  packagingSource: "estimated" as const,
  reservePercent: 10,
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
    expect(v.packArea).toBe(1.44);
    expect(v.packagingMode).toBe(0);
  });

  it("передаёт подтверждённое количество плиток с этикетки", () => {
    const v = buildPlitkaTransferValues({
      ...base,
      packagingSource: "label",
      tilesPerBox: 10,
      packAreaM2: 1.8,
    });
    expect(v.packagingMode).toBe(1);
    expect(v.tilesPerPackage).toBe(10);
    expect(v.packArea).toBe(1.8);
  });

  it("не выдаёт некорректную фасовку за данные этикетки", () => {
    const v = buildPlitkaTransferValues({
      ...base,
      packagingSource: "label",
      tilesPerBox: 10.5,
    });
    expect(v.packagingMode).toBe(0);
    expect(v.tilesPerPackage).toBeUndefined();
  });
});

describe("buildPlitkaCalculatorHref", () => {
  it("includes from=raskladka and field params", () => {
    const href = buildPlitkaCalculatorHref({ ...base, layoutMode: "diagonal" });
    expect(href).toContain("/kalkulyatory/poly/plitka/");
    expect(href).toContain("from=raskladka");
    expect(href).toContain("area=4.25");
    expect(href).toContain("layingMethod=1");
    expect(href).toContain("packArea=1.44");
    expect(href).toContain("packagingMode=0");
    expect(href).toContain("reserveHint=10");
    expect(href).toContain("layoutSurfaceW=1700");
    expect(href).toContain("layoutSurfaceH=2500");
  });

  it("передаёт фасовку с этикетки в поля калькулятора", () => {
    const href = buildPlitkaCalculatorHref({
      ...base,
      packagingSource: "label",
      tilesPerBox: 10,
      packAreaM2: 1.8,
    });
    expect(href).toContain("packagingMode=1");
    expect(href).toContain("tilesPerPackage=10");
    expect(href).toContain("packagingSource=label");
  });

  it("сохраняет проём для возврата в ту же раскладку", () => {
    const href = buildPlitkaCalculatorHref({
      ...base,
      hasOpening: true,
      openingW: 800,
      openingH: 2000,
      openingOffsetLeft: 450,
    });
    expect(href).toContain("layoutHasOpening=1");
    expect(href).toContain("layoutOpeningW=800");
    expect(href).toContain("layoutOpeningH=2000");
    expect(href).toContain("layoutOpeningOffsetLeft=450");
  });

  it("includes tilesHint when provided", () => {
    const href = buildPlitkaCalculatorHref(base, { tilesTotal: 42 });
    expect(href).toContain("tilesHint=42");
  });

  it("передаёт чистую площадь после вычета проёма", () => {
    const href = buildPlitkaCalculatorHref(base, { areaM2: 2.36 });
    expect(href).toContain("area=2.36");
  });

  it("не передаёт недопустимую площадь коробки", () => {
    const href = buildPlitkaCalculatorHref({ ...base, packAreaM2: 0.01 });
    expect(href).not.toContain("packArea=");
  });
});

describe("mapTileSizeToAdhesiveOption", () => {
  it("выбирает категорию формата для калькулятора клея", () => {
    expect(mapTileSizeToAdhesiveOption(300, 300)).toBe(0);
    expect(mapTileSizeToAdhesiveOption(600, 300)).toBe(1);
    expect(mapTileSizeToAdhesiveOption(600, 600)).toBe(2);
    expect(mapTileSizeToAdhesiveOption(1200, 600)).toBe(3);
  });
});

describe("сопутствующие калькуляторы", () => {
  it("передаёт площадь, формат и стену в калькулятор клея", () => {
    const href = buildTileAdhesiveCalculatorHref(base, { areaM2: 4.61, surfaceView: "wall" });
    expect(href).toContain("/kalkulyatory/poly/klej-dlya-plitki/");
    expect(href).toContain("from=raskladka");
    expect(href).toContain("area=4.61");
    expect(href).toContain("tileSize=1");
    expect(href).toContain("layingType=1");
  });

  it("передаёт площадь, размеры и шов в калькулятор затирки", () => {
    const href = buildTileGroutCalculatorHref(base, { areaM2: 4.61 });
    expect(href).toContain("/kalkulyatory/poly/zatirka/");
    expect(href).toContain("from=raskladka");
    expect(href).toContain("area=4.61");
    expect(href).toContain("tileWidth=300");
    expect(href).toContain("tileHeight=600");
    expect(href).toContain("jointWidth=2");
  });
});

describe("buildTileLayoutHref", () => {
  it("round-trips via parseTileLayoutFromSearchParams", () => {
    const href = buildTileLayoutHref({
      ...base,
      hasOpening: true,
      openingW: 800,
      openingH: 2000,
      openingOffsetLeft: 450,
    });
    const params = new URLSearchParams(href.split("?")[1]);
    const parsed = parseTileLayoutFromSearchParams(params);
    expect(parsed?.surfaceW).toBe(1700);
    expect(parsed?.surfaceH).toBe(2500);
    expect(parsed?.layoutMode).toBe("straight");
    expect(parsed?.packAreaM2).toBe(1.44);
    expect(parsed?.tilesPerBox).toBe(8);
    expect(parsed?.packagingSource).toBe("estimated");
    expect(parsed?.reservePercent).toBe(10);
    expect(parsed?.hasOpening).toBe(true);
    expect(parsed?.openingW).toBe(800);
    expect(parsed?.openingOffsetLeft).toBe(450);
  });

  it("переносит точные размеры и фасовку из калькулятора", () => {
    const href = buildTileLayoutHrefFromCalculatorValues({
      inputMode: 0,
      length: 4,
      width: 3,
      area: 12,
      tileWidth: 600,
      tileHeight: 300,
      jointWidth: 2,
      layingMethod: 2,
      packagingMode: 1,
      packArea: 1.8,
      tilesPerPackage: 10,
    });
    const params = new URLSearchParams(href.split("?")[1]);
    expect(params.get("from")).toBe("calculator");
    expect(params.get("surfaceSource")).toBe("exact");
    expect(params.get("surfaceW")).toBe("4000");
    expect(params.get("surfaceH")).toBe("3000");
    expect(params.get("tilesPerBox")).toBe("10");
    expect(params.get("packagingSource")).toBe("label");
    expect(params.get("layoutMode")).toBe("offset-half");
  });

  it("строит помеченную предварительную поверхность, если известна только площадь", () => {
    const href = buildTileLayoutHrefFromCalculatorValues({
      inputMode: 1,
      length: 4,
      width: 3,
      area: 12,
      tileWidth: 600,
      tileHeight: 300,
      jointWidth: 2,
      layingMethod: 0,
      packagingMode: 0,
      packArea: 1.44,
      tilesPerPackage: 8,
    });
    const params = new URLSearchParams(href.split("?")[1]);
    const surfaceW = Number(params.get("surfaceW"));
    const surfaceH = Number(params.get("surfaceH"));
    expect(params.get("surfaceSource")).toBe("area-derived");
    expect((surfaceW * surfaceH) / 1_000_000).toBeCloseTo(12, 2);
    expect(params.get("packagingSource")).toBe("estimated");
  });
});
