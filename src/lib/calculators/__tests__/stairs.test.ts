import { describe, expect, it } from "vitest";
import { stairsDef } from "../formulas/stairs";
import { checkInvariants, findMaterial, withBasicAccuracy } from "./_helpers";

const calc = withBasicAccuracy(stairsDef.calculate.bind(stairsDef));

describe("Калькулятор прямой лестницы", () => {
  it("считает честную геометрию одного прямого марша", () => {
    const result = calc({});

    expect(result.totals.riserCount).toBe(16);
    expect(result.totals.actualRiserHeightMm).toBe(175);
    expect(result.totals.treadCount).toBe(15);
    expect(result.totals.straightRunM).toBeCloseTo(4.2, 6);
    expect(result.totals.inclineLengthM).toBeCloseTo(Math.hypot(2.8, 4.2), 3);
    expect(result.totals.comfortStepMm).toBe(630);
    expect(result.totals.headroomEstimateAvailable).toBe(0);
    checkInvariants(result);
  });

  it("учитывает отдельную верхнюю проступь", () => {
    const result = calc({ topFloorActsAsTread: 0 });

    expect(result.totals.riserCount).toBe(16);
    expect(result.totals.treadCount).toBe(16);
    expect(result.totals.straightRunM).toBeCloseTo(4.48, 6);
  });

  it("принимает точное проектное число подъёмов", () => {
    const result = calc({ geometryMode: 1, projectRiserCount: 17 });

    expect(result.totals.riserCount).toBe(17);
    expect(result.totals.actualRiserHeightMm).toBeCloseTo(164.706, 3);
    expect(result.warnings.some((warning) => warning.includes("подобрано по целевой"))).toBe(false);
  });

  it("оценивает габарит прохода и предупреждает о малом значении", () => {
    const result = calc({ openingLengthM: 3.2, floorStructureThicknessM: 0.3 });

    expect(result.totals.estimatedHeadroomM).toBeCloseTo(1.833, 3);
    expect(result.warnings.some((warning) => warning.includes("нужен разрез проекта"))).toBe(true);
  });

  it("не придумывает несущие элементы, бетон, арматуру, ограждение и крепёж", () => {
    const result = calc({});

    expect(result.materials).toHaveLength(1);
    expect(findMaterial(result, "Чистовые заготовки ступеней")).toBeDefined();
    expect(findMaterial(result, "Косоур")).toBeUndefined();
    expect(findMaterial(result, "Бетон")).toBeUndefined();
    expect(findMaterial(result, "Арматура")).toBeUndefined();
    expect(findMaterial(result, "Поручень")).toBeUndefined();
    expect(findMaterial(result, "ограждения")).toBeUndefined();
    expect(findMaterial(result, "Крепёж")).toBeUndefined();
  });

  it("округляет чистовые ступени по явному запасу и упаковке", () => {
    const result = calc({ treadReservePercent: 10, treadsPerPackagePcs: 4 });
    const treads = findMaterial(result, "Чистовые заготовки ступеней");

    expect(treads?.quantity).toBe(15);
    expect(treads?.withReserve).toBeCloseTo(16.5, 6);
    expect(treads?.packageInfo?.count).toBe(5);
    expect(treads?.purchaseQty).toBe(20);
    expect(result.scenarios?.MIN.purchase_quantity).toBe(16);
    expect(result.scenarios?.REC.purchase_quantity).toBe(20);
    expect(result.scenarios?.MAX.exact_need).toBe(result.scenarios?.REC.exact_need);
    expect(result.scenarios?.MAX.purchase_quantity).toBe(result.scenarios?.REC.purchase_quantity);
    expect(result.scenarios?.MAX.assumptions).toContain("no_hidden_max_reserve");
  });

  it("может исключить чистовые ступени из закупки", () => {
    const result = calc({ includeTreadBlanks: 0 });

    expect(findMaterial(result, "Чистовые заготовки ступеней")).toBeUndefined();
    expect(result.scenarios?.MIN.purchase_quantity).toBe(0);
    expect(result.warnings).toContain("Не рассчитана ни одна закупочная позиция");
  });

  it("считает подступенки только по проектной ведомости", () => {
    const result = calc({ riserProjectPcs: 15, riserReservePercent: 10, risersPerPackagePcs: 4 });
    const risers = findMaterial(result, "Подступенки");

    expect(risers?.quantity).toBe(15);
    expect(risers?.withReserve).toBeCloseTo(16.5, 6);
    expect(risers?.purchaseQty).toBe(20);
  });

  it("проверяет раскрой цельных косоуров или тетив", () => {
    const result = calc({
      stringerProjectPcs: 4,
      stringerBlankLengthM: 2.5,
      stringerReservePercent: 0,
      stringerStockLengthM: 6,
    });
    const stringers = findMaterial(result, "Косоур/тетива");

    expect(stringers?.quantity).toBe(10);
    expect(stringers?.packageInfo?.count).toBe(2);
    expect(stringers?.purchaseQty).toBe(12);
  });

  it("не склеивает косоур из коротких заготовок без проектного узла", () => {
    const result = calc({
      stringerProjectPcs: 2,
      stringerBlankLengthM: 5,
      stringerStockLengthM: 4,
    });

    expect(findMaterial(result, "Косоур/тетива")).toBeUndefined();
    expect(result.warnings.some((warning) => warning.includes("заготовка короче"))).toBe(true);
  });

  it("переводит проектный бетон и арматуру в закупочные шаги", () => {
    const result = calc({
      concreteProjectM3: 1.25,
      concreteReservePercent: 5,
      concreteOrderStepM3: 0.1,
      rebarProjectKg: 123,
      rebarReservePercent: 5,
      rebarPackageKg: 25,
    });

    expect(findMaterial(result, "Бетон")?.purchaseQty).toBe(1.4);
    expect(findMaterial(result, "Арматура")?.purchaseQty).toBe(150);
  });

  it("считает поручень и заполнение только по проекту", () => {
    const result = calc({
      handrailProjectM: 8.4,
      handrailReservePercent: 5,
      handrailStockLengthM: 3,
      railingInfillProjectPcs: 18,
      railingInfillReservePercent: 10,
      railingInfillPackagePcs: 5,
    });

    expect(findMaterial(result, "Поручень")?.purchaseQty).toBe(9);
    expect(findMaterial(result, "заполнение ограждения")?.purchaseQty).toBe(20);
  });

  it("считает крепёж и покрытие площадок отдельными проектными позициями", () => {
    const result = calc({
      fastenersProjectPcs: 64,
      fastenersReservePercent: 5,
      fastenersPackagePcs: 50,
      landingFinishProjectM2: 3.2,
      landingFinishReservePercent: 10,
      landingFinishPackageM2: 1.5,
    });

    expect(findMaterial(result, "Крепёж")?.purchaseQty).toBe(100);
    expect(findMaterial(result, "Покрытие площадок")?.purchaseQty).toBe(4.5);
  });

  it("сообщает о незаполненной фасовке", () => {
    const result = calc({ fastenersProjectPcs: 64, fastenersPackagePcs: 0 });

    expect(findMaterial(result, "Крепёж")).toBeUndefined();
    expect(result.warnings.some((warning) => warning.includes("Крепёж задан"))).toBe(true);
  });

  it("не применяет скрытые коэффициенты точности", () => {
    const result = calc({ accuracyMode: "PRO" });

    expect(result.accuracyExplanation?.combinedMultiplier).toBe(1);
    expect(result.accuracyExplanation?.appliedModifiers).toEqual([]);
    expect(result.accuracyExplanation?.notes.join(" ")).toContain("Скрытые коэффициенты");
  });

  it("экран содержит только поля нового проектного контракта", () => {
    const keys = stairsDef.fields.map((field) => field.key);

    expect(keys).toContain("geometryMode");
    expect(keys).toContain("stringerProjectPcs");
    expect(keys).toContain("concreteProjectM3");
    expect(keys).not.toContain("materialType");
    expect(keys).not.toContain("floorHeight");
  });
});
