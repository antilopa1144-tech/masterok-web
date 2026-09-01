import { describe, expect, it } from "vitest";
import { balconyDef } from "../formulas/balcony";
import { checkInvariants, findMaterial, withBasicAccuracy } from "./_helpers";

const calc = withBasicAccuracy(balconyDef.calculate.bind(balconyDef));

const defaults = Object.fromEntries(
  balconyDef.fields.map((field) => [field.key, field.defaultValue]),
);

describe("Калькулятор обшивки балкона", () => {
  it("считает одну позицию по чистой площади и рабочей ширине", () => {
    const result = calc(defaults);
    const cladding = findMaterial(result, "Панели / вагонка");

    expect(result.formulaVersion).toBe("balcony-web-cladding-purchase-v1");
    expect(result.totals.selectedAreaM2).toBe(12);
    expect(result.totals.pieceCoverageM2).toBeCloseTo(0.288, 6);
    expect(result.totals.theoreticalPieces).toBeCloseTo(41.666667, 6);
    expect(cladding?.quantity).toBe(42);
    expect(cladding?.withReserve).toBe(46);
    expect(cladding?.purchaseQty).toBe(46);
    checkInvariants(result);
  });

  it("не выдумывает фасовку по умолчанию", () => {
    const result = calc(defaults);
    const cladding = findMaterial(result, "Панели / вагонка");

    expect(cladding?.packageInfo).toBeUndefined();
    expect(cladding?.subtitle).toContain("фасовка не задана");
    expect(result.totals.packs).toBe(0);
  });

  it("округляет закупку по фактическому числу деталей в упаковке", () => {
    const result = calc({
      ...defaults,
      packagingMode: 1,
      piecesPerPack: 6,
    });
    const cladding = findMaterial(result, "Панели / вагонка");

    expect(cladding?.packageInfo).toEqual({
      count: 8,
      size: 6,
      packageUnit: "упаковок",
    });
    expect(cladding?.purchaseQty).toBe(48);
    expect(result.totals.purchasedSurplusPieces).toBe(2);
    checkInvariants(result);
  });

  it("простой обмер складывает только выбранные стены и потолок и вычитает проёмы", () => {
    const result = calc({
      ...defaults,
      inputMode: 1,
      wallRunM: 5.2,
      claddingHeightM: 2.5,
      includeCeiling: 1,
      ceilingLengthM: 3,
      ceilingWidthM: 1.2,
      openingAreaM2: 4.6,
    });

    expect(result.totals.wallAreaM2).toBeCloseTo(13, 6);
    expect(result.totals.ceilingAreaM2).toBeCloseTo(3.6, 6);
    expect(result.totals.grossAreaM2).toBeCloseTo(16.6, 6);
    expect(result.totals.selectedAreaM2).toBeCloseTo(12, 6);
    expect(result.totals.requiredPieces).toBe(46);
  });

  it("позволяет исключить потолок из простого обмера", () => {
    const result = calc({
      ...defaults,
      inputMode: 1,
      wallRunM: 4,
      claddingHeightM: 2.5,
      includeCeiling: 0,
      openingAreaM2: 2,
      usableWidthMm: 100,
      pieceLengthM: 2.5,
      allowancePercent: 0,
    });

    expect(result.totals.wallAreaM2).toBe(10);
    expect(result.totals.ceilingAreaM2).toBe(0);
    expect(result.totals.selectedAreaM2).toBe(8);
    expect(result.totals.basePieces).toBe(32);
  });

  it("ограничивает вычет площадью выбранных плоскостей и объясняет это", () => {
    const result = calc({
      ...defaults,
      inputMode: 1,
      wallRunM: 2,
      claddingHeightM: 2,
      includeCeiling: 0,
      openingAreaM2: 100,
    });

    expect(result.totals.grossAreaM2).toBe(4);
    expect(result.totals.appliedOpeningAreaM2).toBe(4);
    expect(result.totals.selectedAreaM2).toBe(0);
    expect(result.warnings.some((warning) => warning.includes("вырез ограничен") || warning.includes("вычет ограничен"))).toBe(true);
  });

  it("принимает готовое число целых деталей из раскладки", () => {
    const result = calc({
      ...defaults,
      inputMode: 2,
      projectPieceCount: 46,
      allowancePercent: 10,
      packagingMode: 1,
      piecesPerPack: 6,
    });

    expect(result.totals.selectedAreaM2).toBe(0);
    expect(result.totals.basePieces).toBe(46);
    expect(result.totals.requiredPieces).toBe(51);
    expect(result.totals.packs).toBe(9);
    expect(result.totals.purchasePieces).toBe(54);
    expect(findMaterial(result, "по раскладке")).toBeDefined();
  });

  it("применяет явный запас ровно один раз до упаковочного округления", () => {
    const result = calc({
      ...defaults,
      areaM2: 12,
      usableWidthMm: 96,
      pieceLengthM: 3,
      allowancePercent: 10,
      packagingMode: 1,
      piecesPerPack: 6,
    });

    expect(result.totals.theoreticalPieces).toBeCloseTo(41.666667, 6);
    expect(result.totals.basePieces).toBe(42);
    expect(result.totals.requiredPieces).toBe(46);
    expect(result.totals.purchasePieces).toBe(48);
    expect(result.scenarios?.REC.key_factors.hidden_multiplier).toBe(1);
  });

  it("не назначает утеплитель, каркас, крепёж и доборные элементы", () => {
    const result = calc({
      ...defaults,
      packagingMode: 1,
    });
    const names = result.materials.map((material) => material.name).join(" ");

    expect(result.materials).toHaveLength(1);
    expect(names).not.toMatch(/утепл|пенопол|пенофол|обреш|брус|кляймер|креп|профил|подокон/i);
    expect(result.warnings.some((warning) => warning.includes("автоматически не добавляются"))).toBe(true);
    expect(result.warnings.some((warning) => warning.includes("не подбирает утепление"))).toBe(true);
  });

  it("не скрывает множители в MIN/REC/MAX и режимах точности", () => {
    const basic = balconyDef.calculate({ ...defaults, accuracyMode: "basic" as unknown as number });
    const realistic = balconyDef.calculate({ ...defaults, accuracyMode: "realistic" as unknown as number });
    const professional = balconyDef.calculate({ ...defaults, accuracyMode: "professional" as unknown as number });

    expect(basic.scenarios?.MIN).toEqual(basic.scenarios?.REC);
    expect(basic.scenarios?.REC).toEqual(basic.scenarios?.MAX);
    expect(realistic.totals.purchasePieces).toBe(basic.totals.purchasePieces);
    expect(professional.totals.purchasePieces).toBe(basic.totals.purchasePieces);
    expect(professional.accuracyExplanation?.combinedMultiplier).toBe(1);
  });

  it("соблюдает сценарный контракт exact_need → purchase_quantity → leftover", () => {
    const result = calc(defaults);
    const scenario = result.scenarios?.REC;

    expect(scenario?.exact_need).toBe(42);
    expect(scenario?.purchase_quantity).toBe(46);
    expect(scenario?.leftover).toBe(4);
    expect(scenario?.purchase_quantity).toBe(
      (scenario?.exact_need ?? 0) + (scenario?.leftover ?? 0),
    );
    expect(scenario?.buy_plan).toEqual({
      package_label: "balcony-cladding-pieces",
      package_size: 1,
      packages_count: 46,
      unit: "шт",
    });
  });

  it("возвращает валидный нулевой результат", () => {
    const result = calc({
      ...defaults,
      areaM2: 0,
    });

    expect(result.materials).toHaveLength(0);
    expect(result.totals.basePieces).toBe(0);
    expect(result.scenarios?.REC.exact_need).toBe(0);
    expect(result.scenarios?.REC.purchase_quantity).toBe(0);
    expect(result.warnings.some((warning) => warning.includes("нулевой результат"))).toBe(true);
  });

  it("объявляет условные поля для трёх способов ввода и фасовки", () => {
    const byKey = new Map(balconyDef.fields.map((field) => [field.key, field]));

    expect(byKey.get("areaM2")?.hideIf).toEqual({ key: "inputMode", op: "ne", value: 0 });
    expect(byKey.get("wallRunM")?.hideIf).toEqual({ key: "inputMode", op: "ne", value: 1 });
    expect(byKey.get("projectPieceCount")?.hideIf).toEqual({ key: "inputMode", op: "ne", value: 2 });
    expect(byKey.get("usableWidthMm")?.hideIf).toEqual({ key: "inputMode", op: "eq", value: 2 });
    expect(byKey.get("piecesPerPack")?.hideIf).toEqual({ key: "packagingMode", op: "ne", value: 1 });
  });

  it("публикует границы расчёта, внутренние ссылки и проверяемые источники", () => {
    const html = balconyDef.seoContent?.descriptionHtml ?? "";

    expect(balconyDef.h1).toContain("обшивки балкона");
    expect(balconyDef.metaDescription).toContain("рассчитайте");
    expect(html).toContain("СП 50.13330.2024");
    expect(html).toContain("spb.lesobirzha.ru/articles/skolko-vagonki-v-m2");
    expect(html).toContain("/kalkulyatory/steny/paneli-dlya-sten/");
    expect(html).toContain("/instrumenty/lineynyy-raskroy/");
    expect(html).toContain("/kalkulyatory/steny/uteplenie/");
    expect(html).not.toContain("до 20%");
    expect(html).not.toContain("R ≈");
  });
});
