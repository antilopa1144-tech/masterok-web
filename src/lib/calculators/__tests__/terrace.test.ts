import { describe, expect, it } from "vitest";
import { terraceDef } from "../formulas/terrace";
import { checkInvariants, findMaterial, withBasicAccuracy } from "./_helpers";

const calc = withBasicAccuracy(terraceDef.calculate.bind(terraceDef));

describe("Террасная доска — web purchase contract", () => {
  it("default считает только доску по безопасному раскрою", () => {
    const result = calc({});
    const board = findMaterial(result, "Террасная доска из ДПК");

    expect(result.formulaVersion).toBe("terrace-web-purchase-v1");
    expect(result.materials).toHaveLength(1);
    expect(result.totals.area).toBe(15);
    expect(result.totals.rowCount).toBe(20);
    expect(result.totals.safeBaseBoards).toBe(40);
    expect(result.totals.baseBoardExact).toBe(40);
    expect(result.totals.baseCutWasteM).toBe(20);
    expect(result.totals.boardReservedNeed).toBe(40);
    expect(result.totals.boardPacks).toBe(40);
    expect(result.totals.boardPurchaseCount).toBe(40);
    expect(board?.quantity).toBe(40);
    expect(board?.withReserve).toBe(40);
    expect(board?.purchaseQty).toBe(40);
    checkInvariants(result);
  });

  it("применяет явный запас один раз и округляет до фактической пачки", () => {
    const result = calc({ boardReservePercent: 10, boardsPerPack: 6 });
    const board = findMaterial(result, "Террасная доска из ДПК");

    expect(result.totals.baseBoardExact).toBe(40);
    expect(result.totals.boardReservedNeed).toBe(44);
    expect(result.totals.boardPacks).toBe(8);
    expect(result.totals.boardPurchaseCount).toBe(48);
    expect(result.totals.boardLeftoverCount).toBe(4);
    expect(board?.packageInfo).toEqual({
      count: 8,
      size: 6,
      packageUnit: "упаковок",
    });
    expect(board?.purchaseQty).toBe(48);
  });

  it("оптимистичный перенос обрезков не маскирует необходимость схемы", () => {
    const result = calc({ offcutReuseMode: 1 });

    expect(result.totals.baseBoardExact).toBeCloseTo(100 / 3, 5);
    expect(result.totals.boardPurchaseCount).toBe(34);
    expect(result.totals.baseCutWasteM).toBe(2);
    expect(result.warnings.some((warning) => warning.includes("раскладк"))).toBe(true);
  });

  it("использует направление рядов, рабочую ширину, зазор и длину товара", () => {
    const result = calc({
      length: 4,
      width: 2,
      boardType: 1,
      boardLength: 4000,
      boardWidthMm: 120,
      gapMm: 6,
    });

    expect(result.totals.area).toBe(8);
    expect(result.totals.rowCount).toBe(16);
    expect(result.totals.boardsPerRow).toBe(1);
    expect(result.totals.baseBoardExact).toBe(16);
    expect(findMaterial(result, "лиственницы")?.purchaseQty).toBe(16);
  });

  it("лаги добавляет только по готовой проектной длине и товарной длине", () => {
    const result = calc({
      substructureEnabled: 1,
      projectLagLengthM: 42,
      lagReservePercent: 5,
      lagLengthM: 3,
    });
    const lags = findMaterial(result, "Лаги выбранной системы");

    expect(result.totals.projectLagLengthM).toBe(42);
    expect(result.totals.lagRequiredM).toBe(44.1);
    expect(result.totals.lagPieces).toBe(15);
    expect(result.totals.lagPurchaseM).toBe(45);
    expect(lags?.quantity).toBe(42);
    expect(lags?.withReserve).toBe(44.1);
    expect(lags?.purchaseQty).toBe(45);
  });

  it("клипсы и саморезы берёт только из проектной ведомости", () => {
    const result = calc({
      fastenersEnabled: 1,
      projectClipCount: 320,
      projectScrewCount: 280,
      fastenerReservePercent: 5,
      clipPackCount: 100,
      fastenerPackCount: 200,
    });
    const clips = findMaterial(result, "Монтажные клипсы");
    const screws = findMaterial(result, "Саморезы");

    expect(clips?.withReserve).toBe(336);
    expect(clips?.purchaseQty).toBe(400);
    expect(clips?.packageInfo).toEqual({ count: 4, size: 100, packageUnit: "упаковок" });
    expect(screws?.withReserve).toBe(294);
    expect(screws?.purchaseQty).toBe(400);
    expect(screws?.packageInfo).toEqual({ count: 2, size: 200, packageUnit: "упаковок" });
  });

  it("обработку дерева считает по паспортному расходу и фактической банке", () => {
    const result = calc({
      boardType: 1,
      withTreatment: 1,
      treatmentRateLPerM2PerLayer: 0.12,
      treatmentLayers: 2,
      treatmentCanL: 2.5,
      treatmentReservePercent: 10,
    });
    const oil = findMaterial(result, "Масло для дерева");

    expect(oil?.quantity).toBe(3.6);
    expect(oil?.withReserve).toBe(3.96);
    expect(oil?.purchaseQty).toBe(5);
    expect(oil?.packageInfo).toEqual({ count: 2, size: 2.5, packageUnit: "банок" });
  });

  it("геотекстиль считает только по проектной площади и рулону", () => {
    const result = calc({
      geotextileEnabled: 1,
      projectGeotextileAreaM2: 18,
      geotextileReservePercent: 10,
      geotextileRollM2: 12.5,
    });
    const geotextile = findMaterial(result, "Геотекстиль по проекту");

    expect(geotextile?.quantity).toBe(18);
    expect(geotextile?.withReserve).toBe(19.8);
    expect(geotextile?.purchaseQty).toBe(25);
    expect(geotextile?.packageInfo).toEqual({ count: 2, size: 12.5, packageUnit: "рулонов" });
  });

  it("не создаёт универсальную террасную систему в default", () => {
    const result = calc({});
    const names = result.materials.map((material) => material.name).join(" | ");

    expect(names).not.toContain("Лаги");
    expect(names).not.toContain("клипс");
    expect(names).not.toContain("Саморезы");
    expect(names).not.toContain("Геотекстиль");
    expect(names).not.toContain("Масло");
    expect(names).not.toContain("Антисептик");
  });

  it("MIN/REC/MAX и режим точности не добавляют скрытый множитель", () => {
    const basic = terraceDef.calculate({
      boardReservePercent: 10,
      boardsPerPack: 6,
      accuracyMode: "basic",
    });
    const professional = terraceDef.calculate({
      boardReservePercent: 10,
      boardsPerPack: 6,
      accuracyMode: "professional",
    });

    for (const result of [basic, professional]) {
      expect(result.scenarios?.MIN.exact_need).toBe(44);
      expect(result.scenarios?.REC.exact_need).toBe(44);
      expect(result.scenarios?.MAX.exact_need).toBe(44);
      expect(result.scenarios?.MIN.purchase_quantity).toBe(48);
      expect(result.scenarios?.REC.purchase_quantity).toBe(48);
      expect(result.scenarios?.MAX.purchase_quantity).toBe(48);
      expect(result.accuracyExplanation?.combinedMultiplier).toBe(1);
    }
  });

  it("скрывает поля выключенной проектной ведомости", () => {
    const byKey = new Map(terraceDef.fields.map((field) => [field.key, field]));

    expect(byKey.get("projectLagLengthM")?.hideIf).toEqual({
      key: "substructureEnabled",
      op: "eq",
      value: 0,
    });
    expect(byKey.get("projectClipCount")?.hideIf).toEqual({
      key: "fastenersEnabled",
      op: "eq",
      value: 0,
    });
    expect(byKey.get("projectGeotextileAreaM2")?.hideIf).toEqual({
      key: "geotextileEnabled",
      op: "eq",
      value: 0,
    });
  });

  it("удаляет поля, которые восстанавливали проект по универсальному шагу", () => {
    const keys = terraceDef.fields.map((field) => field.key);

    expect(keys).not.toContain("lagStep");
    expect(keys).not.toContain("clipsPerIntersection");
    expect(keys).not.toContain("starterClipsPerRow");
    expect(keys).not.toContain("fastenersPerClip");
    expect(keys).not.toContain("withGeotextile");
  });

  it("предупреждает о несущей схеме, воде, стыках и паспорте системы", () => {
    const result = calc({});
    const warnings = result.warnings.join(" ");

    expect(warnings).toContain("не проектирует");
    expect(warnings).toContain("несущ");
    expect(warnings).toContain("водоотвод");
    expect(warnings).toContain("Стыки");
    expect(warnings).toContain("производителя");
  });

  it("SEO-контент ведёт на первичные источники и инструмент раскладки", () => {
    const seo = `${terraceDef.formulaDescription ?? ""} ${terraceDef.seoContent?.descriptionHtml ?? ""} ${terraceDef.seoContent?.faq.map((item) => item.answer).join(" ") ?? ""}`;

    expect(seo).toContain("https://protect.gost.ru/gost/details/173319f4-ea75-4a7f-baca-76851db03644");
    expect(seo).toContain("https://protect.gost.ru/sp/details/cbac2ac8-70ea-4899-9b3b-1c402a1260d0");
    expect(seo).toContain("https://nav.tn.ru/documents/installinstructions/ast_decking_board_velvet_install_instr/");
    expect(seo).toContain("/instrumenty/raskladka-terrasnoy-doski/");
    expect(seo).not.toContain("универсальный шаг 400");
  });
});
