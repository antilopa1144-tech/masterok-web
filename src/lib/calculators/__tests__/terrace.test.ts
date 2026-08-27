import { describe, expect, it } from "vitest";
import { terraceDef } from "../formulas/terrace";
import { checkInvariants, findMaterial, withBasicAccuracy } from "./_helpers";

const calc = withBasicAccuracy(terraceDef.calculate.bind(terraceDef));

describe("Калькулятор террасной доски v2", () => {
  it("разделяет безопасный раскрой, один явный запас и покупку", () => {
    const result = calc({});
    const board = findMaterial(result, "Террасная доска из ДПК");

    expect(result.formulaVersion).toBe("terrace-canonical-v2");
    expect(result.totals.area).toBe(15);
    expect(result.totals.rowCount).toBe(20);
    expect(result.totals.safeBaseBoards).toBe(40);
    expect(result.totals.baseBoardExact).toBe(40);
    expect(result.totals.baseCutWasteM).toBe(20);
    expect(result.scenarios?.MIN.exact_need).toBe(40);
    expect(result.scenarios?.REC.exact_need).toBe(44);
    expect(result.scenarios?.REC.purchase_quantity).toBe(44);
    expect(result.scenarios?.MAX.exact_need).toBe(46);
    expect(board?.quantity).toBe(40);
    expect(board?.withReserve).toBe(44);
    expect(board?.purchaseQty).toBe(44);
    expect(result.accuracyExplanation?.combinedMultiplier).toBe(1);
    checkInvariants(result);
  });

  it("оптимистичный режим переиспользования обрезков требует меньше досок", () => {
    const result = calc({ offcutReuseMode: 1 });

    expect(result.totals.baseBoardExact).toBeCloseTo(100 / 3, 5);
    expect(result.totals.baseBoardPurchase).toBe(34);
    expect(result.totals.baseCutWasteM).toBe(2);
    expect(result.scenarios?.REC.exact_need).toBeCloseTo(110 / 3, 5);
    expect(result.scenarios?.REC.purchase_quantity).toBe(37);
    expect(result.practicalNotes?.[0]).toContain("подтверждённой схеме");
  });

  it("считает лаги и крепёж по введённой монтажной схеме и фасовкам", () => {
    const result = calc({});
    const lags = findMaterial(result, "Лаги выбранной системы");
    const clips = findMaterial(result, "Монтажные клипсы");
    const screws = findMaterial(result, "Саморезы");
    const geotextile = findMaterial(result, "Геотекстиль");

    expect(result.totals.lagRowCount).toBe(14);
    expect(result.totals.lagBaseM).toBe(42);
    expect(lags?.quantity).toBe(14);
    expect(lags?.withReserve).toBe(14.7);
    expect(lags?.purchaseQty).toBe(15);
    expect(result.totals.clipBaseCount).toBe(320);
    expect(clips?.withReserve).toBe(336);
    expect(clips?.packageInfo).toEqual({ count: 4, size: 100, packageUnit: "упаковок" });
    expect(clips?.purchaseQty).toBe(400);
    expect(screws?.purchaseQty).toBe(400);
    expect(geotextile?.quantity).toBe(15);
    expect(geotextile?.withReserve).toBe(15.75);
    expect(geotextile?.purchaseQty).toBe(50);
    checkInvariants(result);
  });

  it("использует пользовательские фасовки и расход обработки с этикетки", () => {
    const result = calc({
      length: 4,
      width: 2,
      boardType: 1,
      boardLength: 4000,
      boardWidthMm: 120,
      gapMm: 6,
      lagStep: 500,
      lagLengthM: 4,
      clipsPerIntersection: 2,
      starterClipsPerRow: 1,
      clipPackCount: 50,
      fastenersPerClip: 2,
      fastenerPackCount: 200,
      withTreatment: 1,
      treatmentRateLPerM2PerLayer: 0.12,
      treatmentLayers: 2,
      treatmentCanL: 2.5,
      treatmentReservePercent: 10,
      withGeotextile: 0,
    });
    const oil = findMaterial(result, "Масло для дерева");
    const clips = findMaterial(result, "Скрытый крепёж");
    const screws = findMaterial(result, "Саморезы");

    expect(oil?.quantity).toBeCloseTo(1.92, 5);
    expect(oil?.withReserve).toBeCloseTo(2.112, 5);
    expect(oil?.purchaseQty).toBe(2.5);
    expect(oil?.packageInfo).toEqual({ count: 1, size: 2.5, packageUnit: "банок" });
    expect(clips?.packageInfo?.size).toBe(50);
    expect(screws?.packageInfo?.size).toBe(200);
    expect(findMaterial(result, "Геотекстиль")).toBeUndefined();
    checkInvariants(result);
  });

  it("не подменяет паспорт системы универсальными сечениями и килограммами саморезов", () => {
    const result = calc({});
    const rendered = JSON.stringify(result);

    expect(rendered).not.toContain("50×50");
    expect(rendered).not.toContain("600 шт./кг");
    expect(findMaterial(result, "Саморезы")?.unit).toBe("шт");
  });

  it("объясняет стыки, деревянную доску без обработки и большую площадь", () => {
    const result = calc({ length: 10, width: 6, boardType: 1, withTreatment: 0 });

    expect(result.warnings.some((warning) => warning.includes("стыков"))).toBe(true);
    expect(result.warnings.some((warning) => warning.includes("не выбрана обработка"))).toBe(true);
    expect(result.warnings.some((warning) => warning.includes("более 50 м²"))).toBe(true);
  });

  it("показывает в SEO-примере те же 44 и 37 досок", () => {
    const html = terraceDef.seoContent?.faq.map((item) => item.answer).join(" ") ?? "";

    expect(html).toContain("<strong>44 доски</strong>");
    expect(html).toContain("<strong>37 досок</strong>");
    expect(html).not.toContain("42 доски");
  });
});
