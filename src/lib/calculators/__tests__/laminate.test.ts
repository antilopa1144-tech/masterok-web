import { describe, expect, it } from "vitest";
import laminateFixture from "../../../../tests/fixtures/laminate-canonical-parity.json";
import { laminateDef } from "../formulas/laminate";
import { runCanonicalParitySuite } from "./canonical-parity";
import { checkInvariants, findMaterial, withBasicAccuracy } from "./_helpers";
import { underlayCutMaterial } from "../../../../engine/underlay-cut";
import { shouldHideField } from "../field-options";
import { getCalculateFn } from "../registry";

const calc = withBasicAccuracy(laminateDef.calculate.bind(laminateDef));

describe("Калькулятор ламината", () => {
  it("публичный registry сохраняет метраж и режим покупки", async () => {
    const calculate = (await getCalculateFn("laminat"))!;
    const material = findMaterial(calculate({ underlaySaleMode: 1, underlayWidth: 1.2 }), "Подложка")!;
    expect(material.unit).toBe("пог. м");
    expect(material.purchaseQty).toBe(18);
  });

  it("скрывает неиспользуемые поля, включая сохранённый режим при переходе на плиты", () => {
    const field = (key: string) => laminateDef.fields.find((f) => f.key === key)!;
    expect(shouldHideField(field("underlaymentRoll"), { hasUnderlayment: 1, underlaySaleMode: 1, underlayType: 3 })).toBe(true);
    expect(shouldHideField(field("underlaymentRoll"), { hasUnderlayment: 1, underlaySaleMode: 1, underlayType: 4 })).toBe(false);
    expect(shouldHideField(field("underlayWidth"), { hasUnderlayment: 0, underlaySaleMode: 1, underlayType: 3 })).toBe(true);
  });

  it("обрабатывает границы и дробную кратность без лишнего шага продажи", () => {
    expect(underlayCutMaterial(0, 1, 1).purchaseQty).toBe(0);
    expect(underlayCutMaterial(0.3, 1, 0.1).purchaseQty).toBe(0.3);
    expect(underlayCutMaterial(0.30001, 1, 0.1).purchaseQty).toBe(0.4);
    expect(underlayCutMaterial(21, NaN, Infinity).purchaseQty).toBe(21);
    expect(underlayCutMaterial(21, 0, -1).purchaseQty).toBe(210);
    expect(underlayCutMaterial(10000, 5, 10).purchaseQty).toBe(2000);
  });

  it.each([[1, 1, 21], [1.2, 1, 18], [1.2, 0.1, 17.5], [1.5, 0.5, 14]])(
    "покупает подложку на отрез: ширина %s, шаг %s → %s пог. м",
    (width, step, purchase) => {
      const result = calc({ inputMode: 1, area: 20, hasUnderlayment: 1, underlayType: 2,
        underlaySaleMode: 1, underlayWidth: width, underlaySaleStep: step });
      const material = findMaterial(result, "Подложка")!;
      expect(material.unit).toBe("пог. м");
      expect(material.quantity).toBeCloseTo(21 / width, 6);
      expect(material.purchaseQty).toBe(purchase);
      expect(material.subtitle).toContain("Потребность с запасом: 21 м²");
      expect(result.totals.underlaymentRolls).toBe(0);
      expect(result.practicalNotes?.join(" ")).toContain("не схема раскроя");
    },
  );

  it("игнорирует режим отреза для плит и выключенной подложки", () => {
    expect(findMaterial(calc({ underlayType: 4, underlaySaleMode: 1 }), "Подложка")?.unit).toBe("упаковок");
    expect(findMaterial(calc({ hasUnderlayment: 0, underlaySaleMode: 1 }), "Подложка")).toBeUndefined();
  });

  it.each([
    [5, 4.2, 5],
    [10, 2.1, 3],
    [20, 1.05, 2],
  ])("считает дробную потребность по выбранной фасовке подложки %s м²", (packSize, exactPackages, purchasePackages) => {
    const result = calc({ inputMode: 1, area: 20, hasUnderlayment: 1, underlaymentRoll: packSize });
    const underlay = findMaterial(result, "Подложка");
    // 20 м² + существующие 5% = 21 м²; делим на фактическую фасовку.
    expect(result.totals?.underlayArea).toBe(21);
    expect(underlay?.quantity).toBeCloseTo(exactPackages, 6);
    expect(underlay?.purchaseQty).toBe(purchasePackages);
    expect(underlay?.subtitle).toContain(`В одной упаковке: ${packSize} м²`);
    expect(underlay?.subtitle).toContain("Потребность с запасом: 21 м²");
    expect(underlay?.subtitle).toContain(`Всего к покупке: ${purchasePackages * packSize} м²`);
    expect(underlay?.subtitle).toContain(`Остаток сверх потребности: ${purchasePackages * packSize - 21} м²`);
  });

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
