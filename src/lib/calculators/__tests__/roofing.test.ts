import { describe, expect, it } from "vitest";
import { roofingDef } from "../formulas/roofing";
import { checkInvariants, findMaterial, withBasicAccuracy } from "./_helpers";

const calc = withBasicAccuracy(roofingDef.calculate.bind(roofingDef));

const baseInputs = {
  roofAreaMode: 0,
  projectSlopeAreaM2: 100,
  planProjectionAreaM2: 80,
  slopeDeg: 30,
  roofingType: 0,
  primaryCoverageM2: 2.5,
  primaryReservePercent: 10,
};

describe("Калькулятор кровли v3", () => {
  it("использует готовую площадь скатов без обратного пересчёта", () => {
    const result = calc(baseInputs);

    expect(result.formulaVersion).toBe("roofing-canonical-v3");
    expect(result.totals.selectedSlopeAreaM2).toBe(100);
    expect(result.totals.primaryUnits).toBe(44);
  });

  it("переводит покрытие в покупные единицы по полезной площади товара", () => {
    const result = calc(baseInputs);
    const covering = findMaterial(result, "Металлочерепица");

    expect(covering?.quantity).toBe(100);
    expect(covering?.withReserve).toBe(110);
    expect(covering?.purchaseQty).toBe(110);
    expect(covering?.packageInfo).toEqual({
      count: 44,
      size: 2.5,
      packageUnit: "листов",
    });
  });

  it("MIN/REC/MAX применяет только явный запас основного покрытия", () => {
    const result = calc(baseInputs);

    expect(result.scenarios.MIN.exact_need).toBe(40);
    expect(result.scenarios.MIN.purchase_quantity).toBe(40);
    expect(result.scenarios.REC.exact_need).toBe(44);
    expect(result.scenarios.REC.purchase_quantity).toBe(44);
    expect(result.scenarios.MAX.exact_need).toBe(46);
    expect(result.scenarios.MAX.purchase_quantity).toBe(46);
    expect(result.scenarios.MAX.key_factors).toMatchObject({
      field_multiplier: 1,
      reserve_percent: 15,
    });
  });

  it("не применяет скрытые коэффициенты сложности или точности", () => {
    const result = calc({ ...baseInputs, accuracyMode: "conservative" });

    expect(result.scenarios.REC.purchase_quantity).toBe(44);
    expect(result.accuracyExplanation?.combinedMultiplier).toBe(1);
    expect(result.accuracyExplanation?.notes.join(" ")).toContain("Скрытые коэффициенты");
  });

  it("для простой крыши считает площадь как проекцию со свесами / cos(уклона)", () => {
    const result = calc({
      ...baseInputs,
      roofAreaMode: 1,
      planProjectionAreaM2: 80,
      slopeDeg: 30,
    });

    expect(result.totals.selectedSlopeAreaM2).toBeCloseTo(92.376, 3);
    expect(result.warnings.some((warning) => warning.includes("одно- или двухскатной"))).toBe(true);
  });

  it("не выводит старый условный периметр, сложность и автоподбор", () => {
    const result = calc(baseInputs);
    const names = result.materials.map((material) => material.name).join(" ");

    expect(result.totals).not.toHaveProperty("perimeterEst");
    expect(result.totals).not.toHaveProperty("complexityCoeff");
    expect(names).not.toContain("Снегозадерж");
    expect(names).not.toContain("Обрешётка");
    expect(names).not.toContain("Контробрешётка");
    expect(names).not.toContain("мембрана");
    expect(names).not.toContain("Крепёж");
  });

  it("не рассчитывает покрытие без полезной площади выбранного товара", () => {
    const result = calc({ ...baseInputs, primaryCoverageM2: 0 });

    expect(result.materials).toHaveLength(0);
    expect(result.scenarios.REC.purchase_quantity).toBe(0);
    expect(result.warnings.some((warning) => warning.includes("полезную площадь"))).toBe(true);
  });

  it("использует корректную покупную единицу для мягкой черепицы", () => {
    const result = calc({ ...baseInputs, roofingType: 1, primaryCoverageM2: 3 });
    const covering = findMaterial(result, "Мягкая черепица");

    expect(covering?.packageInfo?.packageUnit).toBe("упаковок");
    expect(result.scenarios.REC.buy_plan.unit).toBe("упаковок");
  });

  it("использует штучную покупную единицу для керамической черепицы", () => {
    const result = calc({ ...baseInputs, roofingType: 5, primaryCoverageM2: 0.077 });
    const covering = findMaterial(result, "Керамическая");

    expect(covering?.packageInfo?.packageUnit).toBe("шт");
    expect(covering?.packageInfo?.count).toBe(1429);
  });

  it("округляет коньковые элементы по полезной длине", () => {
    const result = calc({
      ...baseInputs,
      ridgeProjectM: 8,
      ridgeReservePercent: 5,
      ridgeElementUsefulLengthM: 1.9,
    });
    const ridge = findMaterial(result, "Коньковый элемент");

    expect(ridge?.quantity).toBe(8);
    expect(ridge?.withReserve).toBe(8.4);
    expect(ridge?.packageInfo?.count).toBe(5);
    expect(ridge?.purchaseQty).toBe(9.5);
  });

  it("округляет мембрану по фактической полезной площади рулона", () => {
    const result = calc({
      ...baseInputs,
      membraneProjectAreaM2: 110,
      membraneReservePercent: 10,
      membraneRollCoverageM2: 75,
    });
    const membrane = findMaterial(result, "Кровельная мембрана");

    expect(membrane?.quantity).toBe(110);
    expect(membrane?.withReserve).toBe(121);
    expect(membrane?.packageInfo?.count).toBe(2);
    expect(membrane?.purchaseQty).toBe(150);
  });

  it("округляет листовое основание по фактическому листу", () => {
    const result = calc({
      ...baseInputs,
      deckProjectAreaM2: 100,
      deckReservePercent: 10,
      deckSheetAreaM2: 3.125,
    });
    const deck = findMaterial(result, "Сплошное листовое основание");

    expect(deck?.packageInfo?.count).toBe(36);
    expect(deck?.purchaseQty).toBe(112.5);
  });

  it("обрешётку и контробрешётку добавляет только по проектному метражу", () => {
    const result = calc({
      ...baseInputs,
      battenProjectLengthM: 300,
      battenReservePercent: 5,
      battenBoardLengthM: 6,
      counterBattenProjectLengthM: 100,
      counterBattenReservePercent: 5,
      counterBattenBoardLengthM: 6,
    });

    expect(findMaterial(result, "Обрешётка")?.packageInfo?.count).toBe(53);
    expect(findMaterial(result, "Контробрешётка")?.packageInfo?.count).toBe(18);
  });

  it("крепёж округляет по введённой фасовке без нормы на м²", () => {
    const result = calc({
      ...baseInputs,
      fastenersProjectPcs: 700,
      fastenersReservePercent: 5,
      fastenersPackagePcs: 250,
    });
    const fasteners = findMaterial(result, "Крепёж из проектной ведомости");

    expect(fasteners?.quantity).toBe(700);
    expect(fasteners?.withReserve).toBe(735);
    expect(fasteners?.packageInfo?.count).toBe(3);
    expect(fasteners?.purchaseQty).toBe(750);
  });

  it("снегозадержание появляется только по проектной длине", () => {
    const result = calc({
      ...baseInputs,
      snowGuardProjectM: 12,
      snowGuardReservePercent: 0,
      snowGuardSectionUsefulLengthM: 3,
    });

    expect(findMaterial(result, "Снегозадержание")?.packageInfo?.count).toBe(4);
  });

  it("выдаёт предметные предупреждения о незаполненных фасовках", () => {
    const result = calc({
      ...baseInputs,
      ridgeProjectM: 8,
      membraneProjectAreaM2: 100,
      fastenersProjectPcs: 500,
    });

    expect(result.warnings.some((warning) => warning.includes("конькового элемента"))).toBe(true);
    expect(result.warnings.some((warning) => warning.includes("площадь рулона"))).toBe(true);
    expect(result.warnings.some((warning) => warning.includes("количество в упаковке"))).toBe(true);
  });

  it("всегда показывает границу закупочного расчёта", () => {
    const result = calc(baseInputs);

    expect(result.warnings[0]).toContain("стропила");
    expect(result.warnings[0]).toContain("нагрузки");
    expect(result.warnings[0]).toContain("не проектируются");
  });

  it("сохраняет закупочные инварианты для полного набора позиций", () => {
    const result = calc({
      ...baseInputs,
      ridgeProjectM: 8,
      ridgeElementUsefulLengthM: 1.9,
      valleyProjectM: 6,
      valleyElementUsefulLengthM: 1.8,
      eavesProjectM: 20,
      eavesElementUsefulLengthM: 1.9,
      membraneProjectAreaM2: 110,
      membraneRollCoverageM2: 75,
      deckProjectAreaM2: 100,
      deckSheetAreaM2: 3.125,
      battenProjectLengthM: 300,
      battenBoardLengthM: 6,
      counterBattenProjectLengthM: 100,
      counterBattenBoardLengthM: 6,
      fastenersProjectPcs: 700,
      fastenersPackagePcs: 250,
      snowGuardProjectM: 12,
      snowGuardSectionUsefulLengthM: 3,
      sealingTapeProjectM: 150,
      sealingTapeRollLengthM: 25,
    });

    expect(result.materials).toHaveLength(11);
    checkInvariants(result);
  });

  it("контент не обещает автопроектирование кровли", () => {
    expect(roofingDef.h1).toContain("по проекту");
    expect(roofingDef.formulaDescription).toContain("готовой проектной ведомости");
    expect(roofingDef.seoContent?.descriptionHtml).toContain("не назначает стропила");
    expect(roofingDef.seoContent?.descriptionHtml).not.toContain("1 элемент / 3 м");
  });
});
