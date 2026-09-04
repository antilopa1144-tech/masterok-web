import { describe, expect, it } from "vitest";
import { slopesDef } from "../formulas/slopes";
import { CALCULATOR_COMPANIONS } from "../companions";
import { checkInvariants, findMaterial, withBasicAccuracy } from "./_helpers";

const calc = withBasicAccuracy(slopesDef.calculate.bind(slopesDef));
const defaults = Object.fromEntries(
  slopesDef.fields.map((field) => [field.key, field.defaultValue]),
);

describe("Калькулятор откосов — закупочная модель", () => {
  it("считает три прямоугольные грани по отдельным глубинам", () => {
    const result = calc({
      ...defaults,
      openingCount: 2,
      openingWidthM: 1.2,
      openingHeightM: 1.4,
      leftDepthMm: 300,
      rightDepthMm: 320,
      includeTop: 1,
      topDepthMm: 280,
    });

    expect(result.formulaVersion).toBe("slopes-web-purchase-v1");
    expect(result.totals.sideAreaPerOpening).toBeCloseTo(0.868, 6);
    expect(result.totals.topAreaPerOpening).toBeCloseTo(0.336, 6);
    expect(result.totals.geometryAreaM2).toBeCloseTo(2.408, 6);
    expect(result.totals.areaM2).toBeCloseTo(2.408, 6);
    checkInvariants(result);
  });

  it("исключает верхнюю грань для дверного проёма", () => {
    const result = calc({
      ...defaults,
      openingCount: 1,
      openingWidthM: 1.2,
      openingHeightM: 1.4,
      leftDepthMm: 300,
      rightDepthMm: 320,
      includeTop: 0,
      topDepthMm: 999,
    });

    expect(result.totals.topAreaPerOpening).toBe(0);
    expect(result.totals.areaM2).toBeCloseTo(0.868, 6);
  });

  it("принимает готовую площадь вместо упрощённой геометрии", () => {
    const result = calc({
      ...defaults,
      areaMode: 0,
      measuredAreaM2: 7.35,
      openingCount: 999,
    });

    expect(result.totals.areaM2).toBe(7.35);
    expect(result.totals.exactNeed).toBe(7.35);
  });

  it("переводит площадь в целые листовые единицы без скрытого запаса", () => {
    const result = calc({
      ...defaults,
      areaMode: 0,
      measuredAreaM2: 7,
      coveragePerUnitM2: 3.6,
      sheetReservePercent: 0,
    });
    const sheet = findMaterial(result, "Листовой или панельный материал");

    expect(result.totals.exactNeed).toBe(7);
    expect(result.totals.needWithReserve).toBe(7);
    expect(result.totals.packagesCount).toBe(2);
    expect(result.totals.purchaseQuantity).toBeCloseTo(7.2, 6);
    expect(result.totals.packagingSurplus).toBeCloseTo(0.2, 6);
    expect(sheet?.packageInfo).toEqual({
      count: 2,
      size: 3.6,
      packageUnit: "единиц",
    });
    checkInvariants(result);
  });

  it("применяет явный запас листов один раз до упаковочного округления", () => {
    const result = calc({
      ...defaults,
      areaMode: 0,
      measuredAreaM2: 7,
      coveragePerUnitM2: 3.6,
      sheetReservePercent: 10,
    });

    expect(result.totals.needWithReserve).toBeCloseTo(7.7, 6);
    expect(result.totals.packagesCount).toBe(3);
    expect(result.totals.purchaseQuantity).toBeCloseTo(10.8, 6);
    expect(result.accuracyExplanation?.combinedMultiplier).toBe(1);
  });

  it("не добавляет единицу на точной границе и округляет превышение вверх", () => {
    const exact = calc({
      ...defaults,
      areaMode: 0,
      measuredAreaM2: 7.2,
      coveragePerUnitM2: 3.6,
    });
    const above = calc({
      ...defaults,
      areaMode: 0,
      measuredAreaM2: 7.201,
      coveragePerUnitM2: 3.6,
    });

    expect(exact.totals.packagesCount).toBe(2);
    expect(above.totals.packagesCount).toBe(3);
  });

  it("считает смесь по паспортному расходу и фактической упаковке", () => {
    const result = calc({
      ...defaults,
      positionType: 1,
      areaMode: 0,
      measuredAreaM2: 7,
      consumptionKgPerM2: 8.5,
      mixtureReservePercent: 0,
      packageMassKg: 30,
    });
    const mixture = findMaterial(result, "Смесь для откосов");

    expect(result.totals.exactNeed).toBeCloseTo(59.5, 6);
    expect(result.totals.packagesCount).toBe(2);
    expect(result.totals.purchaseQuantity).toBe(60);
    expect(mixture?.packageInfo).toEqual({
      count: 2,
      size: 30,
      packageUnit: "упаковок",
    });
    checkInvariants(result);
  });

  it("применяет явный запас смеси до округления упаковок", () => {
    const result = calc({
      ...defaults,
      positionType: 1,
      areaMode: 0,
      measuredAreaM2: 7,
      consumptionKgPerM2: 8.5,
      mixtureReservePercent: 10,
      packageMassKg: 30,
    });

    expect(result.totals.needWithReserve).toBeCloseTo(65.45, 6);
    expect(result.totals.packagesCount).toBe(3);
    expect(result.totals.purchaseQuantity).toBe(90);
  });

  it("считает профиль только по готовому обмеру и длине планки", () => {
    const result = calc({
      ...defaults,
      positionType: 2,
      measuredLinearM: 10,
      linearReservePercent: 10,
      pieceLengthM: 3,
    });
    const profile = findMaterial(result, "Профиль или уголок");

    expect(result.totals.exactNeed).toBe(10);
    expect(result.totals.needWithReserve).toBe(11);
    expect(result.totals.packagesCount).toBe(4);
    expect(result.totals.purchaseQuantity).toBe(12);
    expect(profile?.packageInfo).toEqual({
      count: 4,
      size: 3,
      packageUnit: "планок",
    });
    checkInvariants(result);
  });

  it("возвращает только одну выбранную позицию без условного комплекта", () => {
    const forbidden = [
      "Монтажная пена",
      "Герметик",
      "Грунтовка",
      "Шпаклёвка",
      "Саморезы",
      "Утеплитель",
    ];

    for (const positionType of [0, 1, 2]) {
      const result = calc({ ...defaults, positionType });

      expect(result.materials).toHaveLength(1);
      for (const name of forbidden) {
        expect(findMaterial(result, name)).toBeUndefined();
      }
    }
  });

  it("не скрывает множители в MIN/REC/MAX и режимах точности", () => {
    const basic = slopesDef.calculate({
      ...defaults,
      accuracyMode: "basic" as unknown as number,
    });
    const realistic = slopesDef.calculate({
      ...defaults,
      accuracyMode: "realistic" as unknown as number,
    });
    const professional = slopesDef.calculate({
      ...defaults,
      accuracyMode: "professional" as unknown as number,
    });

    expect(basic.scenarios?.MIN).toEqual(basic.scenarios?.REC);
    expect(basic.scenarios?.REC).toEqual(basic.scenarios?.MAX);
    expect(realistic.totals.purchaseQuantity).toBe(
      basic.totals.purchaseQuantity,
    );
    expect(professional.totals.purchaseQuantity).toBe(
      basic.totals.purchaseQuantity,
    );
    expect(professional.accuracyExplanation?.combinedMultiplier).toBe(1);
  });

  it("соблюдает exact_need → purchase_quantity → leftover", () => {
    const result = calc({
      ...defaults,
      positionType: 2,
      measuredLinearM: 10,
      linearReservePercent: 10,
      pieceLengthM: 3,
    });
    const scenario = result.scenarios?.REC;

    expect(scenario?.exact_need).toBe(10);
    expect(scenario?.purchase_quantity).toBe(12);
    expect(scenario?.leftover).toBe(2);
    expect(scenario?.purchase_quantity).toBe(
      (scenario?.exact_need ?? 0) + (scenario?.leftover ?? 0),
    );
  });

  it("возвращает валидный нулевой результат", () => {
    const result = calc({
      ...defaults,
      positionType: 2,
      measuredLinearM: 0,
    });

    expect(result.materials).toHaveLength(0);
    expect(result.totals.exactNeed).toBe(0);
    expect(result.scenarios?.REC.purchase_quantity).toBe(0);
    expect(
      result.warnings.some((warning) => warning.includes("нулевой результат")),
    ).toBe(true);
  });

  it("объявляет условные поля площади и трёх товарных режимов", () => {
    const byKey = new Map(slopesDef.fields.map((field) => [field.key, field]));

    expect(byKey.get("measuredAreaM2")?.hideIf).toEqual([
      { key: "positionType", op: "eq", value: 2 },
      { key: "areaMode", op: "ne", value: 0 },
    ]);
    expect(byKey.get("topDepthMm")?.hideIf).toEqual([
      { key: "positionType", op: "eq", value: 2 },
      { key: "areaMode", op: "ne", value: 1 },
      { key: "includeTop", op: "eq", value: 0 },
    ]);
    expect(byKey.get("coveragePerUnitM2")?.hideIf).toEqual({
      key: "positionType",
      op: "ne",
      value: 0,
    });
    expect(byKey.get("consumptionKgPerM2")?.hideIf).toEqual({
      key: "positionType",
      op: "ne",
      value: 1,
    });
    expect(byKey.get("measuredLinearM")?.hideIf).toEqual({
      key: "positionType",
      op: "ne",
      value: 2,
    });
  });

  it("связан с дверями и отдельными калькуляторами отделочных слоёв", () => {
    expect(CALCULATOR_COMPANIONS["otkosy-okon-i-dverej"]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ slug: "ustanovka-dverej" }),
        expect.objectContaining({ slug: "shtukaturka" }),
        expect.objectContaining({ slug: "gruntovka" }),
        expect.objectContaining({ slug: "shpaklevka" }),
        expect.objectContaining({ slug: "kraska" }),
      ]),
    );
  });

  it("публикует границы, внутренние ссылки и первичные источники", () => {
    const html = slopesDef.seoContent?.descriptionHtml ?? "";

    expect(slopesDef.h1).toContain("одна позиция к покупке");
    expect(slopesDef.metaDescription).toContain("рассчитайте");
    expect(html).toContain("protect.gost.ru/gost/details/09b731bf");
    expect(html).toContain("protect.gost.ru/gost/details/dd2cf1c8");
    expect(html).toContain("knauf.ru/catalog");
    expect(html).toContain("gyproc.ru/produkciya");
    expect(html).toContain("/instrumenty/raskladka-listov/");
    expect(html).toContain("/instrumenty/stoimost-remonta/");
    expect(html).toContain("/kalkulyatory/otdelka/ustanovka-okon/");
    expect(html).toContain("/kalkulyatory/otdelka/ustanovka-dverej/");
    expect(html).not.toContain("~12 кг/м");
    expect(html).not.toContain("свыше 400 мм");
    expect(html).not.toContain("20–30 мм");
    expect(html).not.toContain("/instrumenty/smeta-remonta/");
  });
});
