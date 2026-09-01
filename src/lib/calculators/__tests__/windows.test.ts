import { describe, expect, it } from "vitest";
import { windowsDef } from "../formulas/windows";
import { checkInvariants, findMaterial, withBasicAccuracy } from "./_helpers";

const calc = withBasicAccuracy(windowsDef.calculate.bind(windowsDef));

describe("Монтаж окон — web joint contract", () => {
  it("default считает только пену по геометрии шва и полезному выходу баллона", () => {
    const result = calc({});

    checkInvariants(result);
    expect(result.formulaVersion).toBe("windows-web-joint-v1");
    expect(result.materials).toHaveLength(1);
    expect(result.totals.windowCount).toBe(5);
    expect(result.totals.perimeterPerWindowM).toBe(5.2);
    expect(result.totals.totalJointLengthM).toBe(26);
    expect(result.totals.foamJointVolumeL).toBe(36.4);
    expect(result.totals.foamCleanCans).toBe(1.04);
    expect(result.totals.foamReservedCans).toBe(1.04);
    expect(result.totals.foamPurchaseCans).toBe(2);

    const foam = result.materials[0];
    expect(foam.name).toContain("Монтажная пена выбранного типа");
    expect(foam.quantity).toBe(1.04);
    expect(foam.withReserve).toBe(1.04);
    expect(foam.purchaseQty).toBe(2);
  });

  it("применяет явный запас пены ровно один раз", () => {
    const result = calc({ foamReservePercent: 10 });

    expect(result.totals.foamCleanCans).toBe(1.04);
    expect(result.totals.foamReservedCans).toBe(1.144);
    expect(result.totals.foamPurchaseCans).toBe(2);
  });

  it("использует фактические ширину, глубину шва и полезный выход продукта", () => {
    const result = calc({
      windowCount: 3,
      windowWidth: 900,
      windowHeight: 1200,
      jointGapWidthMm: 30,
      foamLayerDepthMm: 80,
      foamUsableYieldLPerCan: 60,
      foamReservePercent: 20,
    });

    expect(result.totals.totalJointLengthM).toBe(12.6);
    expect(result.totals.foamJointVolumeL).toBe(30.24);
    expect(result.totals.foamCleanCans).toBe(0.504);
    expect(result.totals.foamReservedCans).toBe(0.6048);
    expect(result.totals.foamPurchaseCans).toBe(1);
    expect(result.materials[0].subtitle).toContain(
      "к расчёту с запасом 0,6 баллона (20%)",
    );
  });

  it("наружный и внутренний слои считает только по проектной длине и рулону", () => {
    const result = calc({
      outerSealEnabled: 1,
      projectOuterSealLengthM: 28,
      outerSealReservePercent: 10,
      outerSealRollLengthM: 5.6,
      innerSealEnabled: 1,
      projectInnerSealLengthM: 26,
      innerSealReservePercent: 5,
      innerSealRollLengthM: 8.5,
    });

    const outer = findMaterial(result, "Наружный материал монтажного шва")!;
    expect(outer.quantity).toBe(28);
    expect(outer.withReserve).toBe(30.8);
    expect(outer.purchaseQty).toBe(33.6);
    expect(outer.packageInfo).toEqual({ count: 6, size: 5.6, packageUnit: "рулонов" });

    const inner = findMaterial(result, "Внутренний материал монтажного шва")!;
    expect(inner.quantity).toBe(26);
    expect(inner.withReserve).toBe(27.3);
    expect(inner.purchaseQty).toBe(34);
    expect(inner.packageInfo).toEqual({ count: 4, size: 8.5, packageUnit: "рулонов" });
  });

  it("крепёж добавляет только по готовому проектному количеству", () => {
    const result = calc({
      fastenersEnabled: 1,
      projectFastenerCount: 42,
      fastenersPerPack: 50,
    });

    const fasteners = findMaterial(result, "Крепёж по проектной ведомости")!;
    expect(fasteners.quantity).toBe(42);
    expect(fasteners.purchaseQty).toBe(50);
    expect(fasteners.packageInfo).toEqual({ count: 1, size: 50, packageUnit: "упаковок" });
  });

  it("панели откосов считает по готовой площади и площади упаковки", () => {
    const result = calc({
      slopeFinishType: 1,
      projectSlopeAreaM2: 10,
      slopeReservePercent: 10,
      slopePanelPackCoverageM2: 3.6,
    });

    const slopes = findMaterial(result, "Панели для откосов")!;
    expect(slopes.quantity).toBe(10);
    expect(slopes.withReserve).toBe(11);
    expect(slopes.purchaseQty).toBe(14.4);
    expect(slopes.packageInfo).toEqual({ count: 4, size: 3.6, packageUnit: "упаковок" });
  });

  it("листовые откосы считает по фактическим размерам листа", () => {
    const result = calc({
      slopeFinishType: 2,
      projectSlopeAreaM2: 10,
      slopeReservePercent: 10,
      slopeSheetLengthM: 2.5,
      slopeSheetWidthM: 1.2,
    });

    const slopes = findMaterial(result, "Листы для откосов")!;
    expect(slopes.quantity).toBeCloseTo(3.333333, 5);
    expect(slopes.withReserve).toBeCloseTo(3.666667, 5);
    expect(slopes.purchaseQty).toBe(4);
  });

  it("штукатурку откосов считает только по паспортному расходу", () => {
    const result = calc({
      slopeFinishType: 3,
      projectSlopeAreaM2: 10,
      slopePlasterConsumptionKgM2: 8,
      slopeReservePercent: 5,
      slopePlasterBagKg: 25,
    });

    const plaster = findMaterial(result, "Штукатурка по паспортному расходу")!;
    expect(plaster.quantity).toBe(80);
    expect(plaster.withReserve).toBe(84);
    expect(plaster.purchaseQty).toBe(100);
    expect(plaster.packageInfo).toEqual({ count: 4, size: 25, packageUnit: "мешков" });
  });

  it("не добавляет старую универсальную оконную систему", () => {
    const result = calc({});
    const names = result.materials.map((material) => material.name).join(" | ");

    expect(names).not.toContain("ПСУЛ");
    expect(names).not.toContain("Внутренняя лента");
    expect(names).not.toContain("Анкерные пластины");
    expect(names).not.toContain("Саморезы");
    expect(names).not.toContain("Подоконник");
    expect(names).not.toContain("Сэндвич-панели");
    expect(names).not.toContain("F-образный");
  });

  it("MIN/REC/MAX и режим точности не добавляют скрытый множитель", () => {
    const basic = windowsDef.calculate({
      windowCount: 5,
      windowWidth: 1200,
      windowHeight: 1400,
      jointGapWidthMm: 20,
      foamLayerDepthMm: 70,
      foamUsableYieldLPerCan: 35,
      foamReservePercent: 10,
      accuracyMode: "basic" as unknown as number,
    });
    const professional = windowsDef.calculate({
      windowCount: 5,
      windowWidth: 1200,
      windowHeight: 1400,
      jointGapWidthMm: 20,
      foamLayerDepthMm: 70,
      foamUsableYieldLPerCan: 35,
      foamReservePercent: 10,
      accuracyMode: "professional" as unknown as number,
    });

    expect(basic.scenarios?.MIN).toEqual(basic.scenarios?.REC);
    expect(basic.scenarios?.REC).toEqual(basic.scenarios?.MAX);
    expect(professional.scenarios).toEqual(basic.scenarios);
    expect(professional.totals.foamReservedCans).toBe(1.144);
  });

  it("скрывает поля выключенных проектных блоков", () => {
    const field = (key: string) => windowsDef.fields.find((item) => item.key === key);

    expect(field("projectOuterSealLengthM")?.hideIf).toEqual({ key: "outerSealEnabled", op: "eq", value: 0 });
    expect(field("projectInnerSealLengthM")?.hideIf).toEqual({ key: "innerSealEnabled", op: "eq", value: 0 });
    expect(field("projectFastenerCount")?.hideIf).toEqual({ key: "fastenersEnabled", op: "eq", value: 0 });
    expect(field("slopePanelPackCoverageM2")?.hideIf).toEqual({ key: "slopeFinishType", op: "ne", value: 1 });
    expect(field("slopeSheetLengthM")?.hideIf).toEqual({ key: "slopeFinishType", op: "ne", value: 2 });
    expect(field("slopePlasterConsumptionKgM2")?.hideIf).toEqual({ key: "slopeFinishType", op: "ne", value: 3 });
  });

  it("удаляет поля, которые восстанавливали проект из толщины стены и типа откоса", () => {
    const keys = windowsDef.fields.map((field) => field.key);

    expect(keys).not.toContain("wallThickness");
    expect(keys).not.toContain("slopeType");
  });

  it("предупреждает о границах узла, пены, крепления и отделки", () => {
    const warnings = calc({ slopeFinishType: 2, projectSlopeAreaM2: 10 }).warnings.join(" ");

    expect(warnings).toContain("эквивалентный прямоугольный объём");
    expect(warnings).toContain("Полезный выход");
    expect(warnings).toContain("крепления");
    expect(warnings).toContain("раскладк");
    expect(warnings).toContain("MIN/REC/MAX");
  });

  it("SEO-контент ведёт на первичные источники и не обещает монтаж по одному периметру", () => {
    const seo = windowsDef.seoContent?.descriptionHtml ?? "";

    expect(windowsDef.h1).toContain("фактическому шву");
    expect(windowsDef.metaDescription.startsWith("Бесплатный калькулятор")).toBe(true);
    expect(windowsDef.metaDescription.toLowerCase()).toContain("рассчитайте");
    expect(seo).toContain("https://protect.gost.ru/gost/details/09b731bf-531e-428b-8ef9-556ed2d1c110");
    expect(seo).toContain("https://protect.gost.ru/gost/details/a64d7437-05ff-4621-8339-53cd7418810d");
    expect(seo).toContain("https://protect.gost.ru/gost/details/dd2cf1c8-2634-46e7-8349-4a08ca4597f2");
    expect(seo).toContain("https://soudal.ru/images/stories/soudal/tds-profi/soudafoam-professional-60_tds_ru.pdf");
  });
});
