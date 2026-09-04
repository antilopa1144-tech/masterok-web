import { describe, expect, it } from "vitest";
import { doorsDef } from "../formulas/doors";
import { CALCULATOR_COMPANIONS } from "../companions";
import { checkInvariants, findMaterial, withBasicAccuracy } from "./_helpers";

const calc = withBasicAccuracy(doorsDef.calculate.bind(doorsDef));
const defaults = Object.fromEntries(
  doorsDef.fields.map((field) => [field.key, field.defaultValue]),
);

describe("Калькулятор установки дверей — закупочная модель", () => {
  it("считает монтажную пену по явному расходу выбранного продукта", () => {
    const result = calc({
      ...defaults,
      doorCount: 3,
      foamCanEquivalentPerBlock: 0.7,
      foamReservePercent: 0,
    });
    const foam = findMaterial(result, "Монтажная пена");

    expect(result.formulaVersion).toBe("doors-web-purchase-v1");
    expect(result.totals.exactNeed).toBeCloseTo(2.1, 6);
    expect(result.totals.needWithReserve).toBeCloseTo(2.1, 6);
    expect(result.totals.packagesCount).toBe(3);
    expect(result.totals.purchaseQuantity).toBe(3);
    expect(foam?.packageInfo).toBeUndefined();
    checkInvariants(result);
  });

  it("применяет запас пены один раз до округления баллонов", () => {
    const result = calc({
      ...defaults,
      doorCount: 3,
      foamCanEquivalentPerBlock: 0.7,
      foamReservePercent: 10,
    });

    expect(result.totals.exactNeed).toBeCloseTo(2.1, 6);
    expect(result.totals.needWithReserve).toBeCloseTo(2.31, 6);
    expect(result.totals.purchaseQuantity).toBe(3);
    expect(result.totals.packagingSurplus).toBeCloseTo(0.69, 6);
    expect(result.accuracyExplanation?.combinedMultiplier).toBe(1);
  });

  it("не добавляет баллон на точной границе и округляет превышение вверх", () => {
    const exact = calc({
      ...defaults,
      doorCount: 2,
      foamCanEquivalentPerBlock: 1,
    });
    const above = calc({
      ...defaults,
      doorCount: 3,
      foamCanEquivalentPerBlock: 0.67,
    });

    expect(exact.totals.exactNeed).toBe(2);
    expect(exact.totals.packagesCount).toBe(2);
    expect(above.totals.exactNeed).toBeCloseTo(2.01, 6);
    expect(above.totals.packagesCount).toBe(3);
  });

  it("считает наличник по обмеру и фактической длине планки", () => {
    const result = calc({
      ...defaults,
      positionType: 1,
      linearMaterialType: 0,
      measuredLengthM: 15,
      linearReservePercent: 0,
      pieceLengthM: 2.2,
    });
    const trim = findMaterial(result, "Наличник");

    expect(result.totals.exactNeed).toBe(15);
    expect(result.totals.packagesCount).toBe(7);
    expect(result.totals.purchaseQuantity).toBeCloseTo(15.4, 6);
    expect(trim?.packageInfo).toEqual({
      count: 7,
      size: 2.2,
      packageUnit: "планок",
    });
    checkInvariants(result);
  });

  it("применяет явный запас погонажа до округления целых планок", () => {
    const result = calc({
      ...defaults,
      positionType: 1,
      measuredLengthM: 15,
      linearReservePercent: 10,
      pieceLengthM: 2.2,
    });

    expect(result.totals.needWithReserve).toBeCloseTo(16.5, 6);
    expect(result.totals.packagesCount).toBe(8);
    expect(result.totals.purchaseQuantity).toBeCloseTo(17.6, 6);
    expect(result.totals.packagingSurplus).toBeCloseTo(1.1, 6);
  });

  it("отделяет добор от наличника, не меняя математику фасовки", () => {
    const result = calc({
      ...defaults,
      positionType: 1,
      linearMaterialType: 1,
      measuredLengthM: 10,
      pieceLengthM: 2.5,
    });

    expect(findMaterial(result, "Добор")).toBeDefined();
    expect(findMaterial(result, "Наличник")).toBeUndefined();
    expect(result.totals.purchaseQuantity).toBe(10);
  });

  it("переводит готовое число креплений в целые упаковки", () => {
    const result = calc({
      ...defaults,
      positionType: 2,
      fastenerCount: 24,
      extraFastenersPcs: 0,
      fastenersPerPack: 20,
    });
    const fasteners = findMaterial(result, "Крепёж по монтажной схеме");

    expect(result.totals.exactNeed).toBe(24);
    expect(result.totals.needWithReserve).toBe(24);
    expect(result.totals.packagesCount).toBe(2);
    expect(result.totals.purchaseQuantity).toBe(40);
    expect(fasteners?.packageInfo).toEqual({
      count: 2,
      size: 20,
      packageUnit: "упаковок",
    });
    checkInvariants(result);
  });

  it("добавляет только явно указанное число запасных креплений", () => {
    const result = calc({
      ...defaults,
      positionType: 2,
      fastenerCount: 36,
      extraFastenersPcs: 4,
      fastenersPerPack: 20,
    });

    expect(result.totals.exactNeed).toBe(36);
    expect(result.totals.needWithReserve).toBe(40);
    expect(result.totals.packagesCount).toBe(2);
    expect(result.totals.purchaseQuantity).toBe(40);
  });

  it("не создаёт условную многоматериальную ведомость", () => {
    for (const positionType of [0, 1, 2]) {
      const result = calc({ ...defaults, positionType });

      expect(result.materials).toHaveLength(1);
      expect(
        result.warnings.some((warning) =>
          warning.includes("автоматически не объединяются"),
        ),
      ).toBe(true);
    }
  });

  it("не скрывает множители в MIN/REC/MAX и режимах точности", () => {
    const basic = doorsDef.calculate({
      ...defaults,
      accuracyMode: "basic" as unknown as number,
    });
    const realistic = doorsDef.calculate({
      ...defaults,
      accuracyMode: "realistic" as unknown as number,
    });
    const professional = doorsDef.calculate({
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
      positionType: 1,
      measuredLengthM: 15,
      linearReservePercent: 10,
      pieceLengthM: 2.2,
    });
    const scenario = result.scenarios?.REC;

    expect(scenario?.exact_need).toBe(15);
    expect(scenario?.purchase_quantity).toBeCloseTo(17.6, 6);
    expect(scenario?.leftover).toBeCloseTo(2.6, 6);
    expect(scenario?.purchase_quantity).toBeCloseTo(
      (scenario?.exact_need ?? 0) + (scenario?.leftover ?? 0),
      6,
    );
  });

  it("возвращает валидный нулевой результат", () => {
    const result = calc({
      ...defaults,
      positionType: 2,
      fastenerCount: 0,
      extraFastenersPcs: 0,
    });

    expect(result.materials).toHaveLength(0);
    expect(result.totals.exactNeed).toBe(0);
    expect(result.scenarios?.REC.purchase_quantity).toBe(0);
    expect(
      result.warnings.some((warning) => warning.includes("нулевой результат")),
    ).toBe(true);
  });

  it("объявляет условные поля трёх режимов", () => {
    const byKey = new Map(doorsDef.fields.map((field) => [field.key, field]));

    expect(byKey.get("foamCanEquivalentPerBlock")?.hideIf).toEqual({
      key: "positionType",
      op: "ne",
      value: 0,
    });
    expect(byKey.get("measuredLengthM")?.hideIf).toEqual({
      key: "positionType",
      op: "ne",
      value: 1,
    });
    expect(byKey.get("fastenerCount")?.hideIf).toEqual({
      key: "positionType",
      op: "ne",
      value: 2,
    });
  });

  it("связан с откосами и отдельным калькулятором крепежа", () => {
    expect(CALCULATOR_COMPANIONS["ustanovka-dverej"]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ slug: "otkosy-okon-i-dverej" }),
        expect.objectContaining({ slug: "krepezh" }),
      ]),
    );
  });

  it("публикует границы, внутренние ссылки и проверяемые источники", () => {
    const html = doorsDef.seoContent?.descriptionHtml ?? "";

    expect(doorsDef.h1).toContain("одна позиция к покупке");
    expect(doorsDef.metaDescription).toContain("по обмеру");
    expect(html).toContain("protect.gost.ru/gost/details/15817887");
    expect(html).toContain("protect.gost.ru/gost/details/21f2503e");
    expect(html).toContain("volhovec.ru/helpfull-info/installation");
    expect(html).toContain("soudal.ru");
    expect(html).toContain("/kalkulyatory/otdelka/otkosy-okon-i-dverej/");
    expect(html).toContain("/kalkulyatory/otdelka/krepezh/");
    expect(html).toContain("/instrumenty/stoimost-remonta/");
    expect(html).not.toContain("/instrumenty/smeta-remonta/");
    expect(html).not.toContain("~100 мл/м.п.");
    expect(html).not.toContain("2.5 палки");
  });
});
