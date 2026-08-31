import { describe, expect, it } from "vitest";
import laminateFixture from "../../../../tests/fixtures/laminate-canonical-parity.json";
import { laminateDef } from "../formulas/laminate";
import { runCanonicalParitySuite } from "./canonical-parity";
import { checkInvariants, findMaterial, withBasicAccuracy } from "./_helpers";

const calc = withBasicAccuracy(laminateDef.calculate.bind(laminateDef));

describe("Калькулятор ламината", () => {
  it("декларирует formulaVersion для canonical laminate", () => {
    expect(laminateDef.formulaVersion).toBe("laminate-canonical-v1");
  });

  it("добавляет предупреждение для диагональной укладки", () => {
    const result = calc({
      inputMode: 1,
      area: 24,
      packArea: 2,
      layingMethod: 1,
      reservePercent: 5,
      hasUnderlayment: 0,
    });

    expect(result.warnings.some((warning) => warning.includes("Диагональная"))).toBe(true);
  });

  it("добавляет предупреждение для смещения 1/2", () => {
    const result = calc({
      inputMode: 1,
      area: 24,
      packArea: 2,
      layingMethod: 0,
      offsetMode: 2,
      reservePercent: 5,
      hasUnderlayment: 0,
    });

    expect(result.warnings.some((warning) => warning.includes("1/2"))).toBe(true);
  });

  it("передаёт тип основания и внешние углы в canonical-движок", () => {
    const result = calc({
      inputMode: 0,
      length: 5,
      width: 4,
      floorBase: 1,
      outerCorners: 3,
    });

    expect(findMaterial(result, "Пароизоляционная плёнка")).toBeUndefined();
    expect(findMaterial(result, "Внешние углы")?.purchaseQty).toBe(3);
    expect(result.practicalNotes?.some((note) => note.includes("автоматически не добавляется"))).toBe(true);
  });

  it("передаёт формат подложки и не добавляет скотч для гармошки", () => {
    const roll = calc({ underlayType: 2, hasUnderlayment: 1 });
    const accordion = calc({ underlayType: 4, hasUnderlayment: 1 });

    expect(findMaterial(roll, "Скотч")).toBeDefined();
    expect(findMaterial(accordion, "Скотч")).toBeUndefined();
    expect(findMaterial(roll, "Скотч")?.subtitle).toContain("Справочная позиция");
    expect(findMaterial(roll, "Подложка")?.unit).toBe("рулонов");
    expect(findMaterial(accordion, "Подложка")?.unit).toBe("упаковок");
  });

  it("принимает фактический периметр и раскрывает оценку по площади", () => {
    const measured = calc({ inputMode: 1, area: 20, perimeter: 24 });
    const estimated = calc({ inputMode: 1, area: 20, perimeter: 0 });

    expect(measured.totals.perimeter).toBe(24);
    expect(estimated.practicalNotes?.some((note) => note.includes("4 × √S"))).toBe(true);
    expect(laminateDef.fields.find((field) => field.key === "perimeter")).toBeDefined();
  });

  it("не выдаёт порог площади за готовый проект шва", () => {
    const result = calc({ inputMode: 1, area: 60, perimeter: 32 });

    expect(result.warnings.some((warning) => warning.includes("предварительно добавил профиль"))).toBe(true);
    expect(result.warnings.some((warning) => warning.includes("требуется компенсационный"))).toBe(false);
    expect(findMaterial(result, "Профиль компенсационный")?.subtitle).toContain("Предварительная позиция");
    expect(findMaterial(result, "Пароизоляционная плёнка")?.subtitle).toContain("Предварительная позиция");
  });

  it("SEO-пример совпадает с дефолтным запасом и не приписывает монтаж ГОСТ на изделие", () => {
    const content = `${laminateDef.formulaDescription ?? ""} ${laminateDef.seoContent?.descriptionHtml ?? ""} ${JSON.stringify(laminateDef.seoContent?.faq ?? [])}`;

    expect(content).toContain("10 базовых упаковок");
    expect(content).toContain("11 упаковок");
    expect(content).not.toContain("9 упаковок");
    expect(content).not.toContain("обязателен при площади более 50");
    expect(content).not.toContain("По <strong>ГОСТ 32304-2013</strong> и рекомендациям производителей");
    expect(content).toContain("ГОСТ Р 72714-2026");
    expect(content).toContain("1 января 2027 года");
  });
});

runCanonicalParitySuite({
  suiteName: "Canonical laminate fixture parity",
  cases: laminateFixture.cases as any,
  calculate: calc,
  assertCase(result, expected: {
    formulaVersion: string; area: number; perimeter: number; wastePercent: number; warningsCount: number;
    materials: { packs: number; underlaymentRolls?: number; plinthPieces: number; thresholds: number };
    recScenario: { packageSize: number; exactNeed: number; purchaseQuantity: number };
  }) {
    expect(result.formulaVersion).toBe(expected.formulaVersion);
    expect(result.totals.area).toBeCloseTo(expected.area, 1);
    expect(result.totals.perimeter).toBeCloseTo(expected.perimeter, 1);
    expect(result.totals.wastePercent).toBeCloseTo(expected.wastePercent, 5);
    expect(result.warnings).toHaveLength(expected.warningsCount);

    const recScenario = result.scenarios!.REC;
    expect(recScenario.buy_plan.package_size).toBe(expected.recScenario.packageSize);
    expect(recScenario.exact_need).toBeCloseTo(expected.recScenario.exactNeed, 5);
    expect(recScenario.purchase_quantity).toBeCloseTo(expected.recScenario.purchaseQuantity, 5);

    expect(findMaterial(result, "Ламинат")?.purchaseQty).toBe(expected.materials.packs);
    if (expected.materials.underlaymentRolls !== undefined) {
      expect(findMaterial(result, "Подложка")?.purchaseQty).toBe(expected.materials.underlaymentRolls);
    }
    expect(findMaterial(result, "Плинтус")?.purchaseQty).toBe(expected.materials.plinthPieces);
    expect(findMaterial(result, "Порожек")?.purchaseQty).toBe(expected.materials.thresholds);

    checkInvariants(result);
  },
});
