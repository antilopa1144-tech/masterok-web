import { describe, expect, it } from "vitest";
import { lawnDef } from "../formulas/lawn";
import { checkInvariants, findMaterial, withBasicAccuracy } from "./_helpers";

const calc = withBasicAccuracy(lawnDef.calculate.bind(lawnDef));
const defaults = Object.fromEntries(
  lawnDef.fields.map((field) => [field.key, field.defaultValue]),
);

describe("Калькулятор газона — закупочная модель", () => {
  it("считает семена по норме и фасовке выбранной смеси", () => {
    const result = calc(defaults);
    const seeds = findMaterial(result, "Семена газона");

    expect(result.formulaVersion).toBe("lawn-web-purchase-v1");
    expect(result.totals.exactNeed).toBe(2);
    expect(result.totals.needWithReserve).toBe(2);
    expect(result.totals.packagesCount).toBe(2);
    expect(result.totals.purchaseQuantity).toBe(2);
    expect(seeds?.quantity).toBe(2);
    expect(seeds?.purchaseQty).toBe(2);
    expect(seeds?.packageInfo).toEqual({
      count: 2,
      size: 1,
      packageUnit: "упаковок",
    });
    checkInvariants(result);
  });

  it("не добавляет к паспортной норме семян скрытый запас", () => {
    const result = calc({
      ...defaults,
      areaM2: 100,
      seedRateGm2: 40,
      seedReservePercent: 0,
      seedPackKg: 2,
    });

    expect(result.totals.exactNeed).toBe(4);
    expect(result.totals.needWithReserve).toBe(4);
    expect(result.totals.purchaseQuantity).toBe(4);
    expect(result.accuracyExplanation?.combinedMultiplier).toBe(1);
  });

  it("применяет явный запас семян один раз до упаковочного округления", () => {
    const result = calc({
      ...defaults,
      areaM2: 100,
      seedRateGm2: 40,
      seedReservePercent: 10,
      seedPackKg: 2,
    });

    expect(result.totals.exactNeed).toBe(4);
    expect(result.totals.needWithReserve).toBeCloseTo(4.4, 6);
    expect(result.totals.packagesCount).toBe(3);
    expect(result.totals.purchaseQuantity).toBe(6);
    expect(result.totals.packagingSurplus).toBeCloseTo(1.6, 6);
  });

  it("не покупает лишнюю упаковку на точной границе и округляет превышение вверх", () => {
    const exact = calc({
      ...defaults,
      areaM2: 250,
      seedRateGm2: 40,
      seedPackKg: 5,
    });
    const above = calc({
      ...defaults,
      areaM2: 252.5,
      seedRateGm2: 40,
      seedPackKg: 5,
    });

    expect(exact.totals.exactNeed).toBe(10);
    expect(exact.totals.packagesCount).toBe(2);
    expect(above.totals.exactNeed).toBeCloseTo(10.1, 6);
    expect(above.totals.packagesCount).toBe(3);
    expect(above.totals.purchaseQuantity).toBe(15);
  });

  it("считает рулонный газон по фактической площади рулона", () => {
    const result = calc({
      ...defaults,
      lawnType: 1,
      areaM2: 50,
      rollAreaM2: 0.8,
      rollReservePercent: 5,
    });
    const turf = findMaterial(result, "Рулонный газон");

    expect(result.totals.exactNeed).toBe(50);
    expect(result.totals.needWithReserve).toBe(52.5);
    expect(result.totals.packagesCount).toBe(66);
    expect(result.totals.purchaseQuantity).toBeCloseTo(52.8, 6);
    expect(result.totals.packagingSurplus).toBeCloseTo(0.3, 6);
    expect(turf?.packageInfo).toEqual({
      count: 66,
      size: 0.8,
      packageUnit: "рулонов",
    });
    checkInvariants(result);
  });

  it("позволяет заменить пример 0,8 м² площадью рулона поставщика", () => {
    const result = calc({
      ...defaults,
      lawnType: 1,
      areaM2: 40,
      rollAreaM2: 0.75,
      rollReservePercent: 0,
    });

    expect(result.totals.packagesCount).toBe(54);
    expect(result.totals.purchaseQuantity).toBe(40.5);
  });

  it("не добавляет грунт, песок, геотекстиль, удобрения и инструменты", () => {
    const seedResult = calc(defaults);
    const rollResult = calc({ ...defaults, lawnType: 1 });

    for (const result of [seedResult, rollResult]) {
      expect(result.materials).toHaveLength(1);
      expect(result.materials.map((item) => item.name).join(" ")).not.toMatch(
        /грунт|песок|геотекст|удобрен|стимулятор|каток|полив/i,
      );
      expect(
        result.warnings.some((warning) =>
          warning.includes("автоматически не добавляются"),
        ),
      ).toBe(true);
    }
  });

  it("не скрывает множители в MIN/REC/MAX и режимах точности", () => {
    const basic = lawnDef.calculate({
      ...defaults,
      accuracyMode: "basic" as unknown as number,
    });
    const realistic = lawnDef.calculate({
      ...defaults,
      accuracyMode: "realistic" as unknown as number,
    });
    const professional = lawnDef.calculate({
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

  it("соблюдает контракт exact_need → purchase_quantity → leftover", () => {
    const result = calc({
      ...defaults,
      lawnType: 1,
      areaM2: 50,
      rollAreaM2: 0.8,
      rollReservePercent: 5,
    });
    const scenario = result.scenarios?.REC;

    expect(scenario?.exact_need).toBe(50);
    expect(scenario?.purchase_quantity).toBeCloseTo(52.8, 6);
    expect(scenario?.leftover).toBeCloseTo(2.8, 6);
    expect(scenario?.purchase_quantity).toBeCloseTo(
      (scenario?.exact_need ?? 0) + (scenario?.leftover ?? 0),
      6,
    );
    expect(scenario?.buy_plan).toEqual({
      package_label: "lawn-roll-user-area",
      package_size: 0.8,
      packages_count: 66,
      unit: "м²",
    });
  });

  it("возвращает валидный нулевой результат", () => {
    const result = calc({ ...defaults, areaM2: 0 });

    expect(result.materials).toHaveLength(0);
    expect(result.totals.exactNeed).toBe(0);
    expect(result.scenarios?.REC.purchase_quantity).toBe(0);
    expect(
      result.warnings.some((warning) => warning.includes("нулевой результат")),
    ).toBe(true);
  });

  it("объявляет условные поля для двух видов закупки", () => {
    const byKey = new Map(lawnDef.fields.map((field) => [field.key, field]));

    expect(byKey.get("seedRateGm2")?.hideIf).toEqual({
      key: "lawnType",
      op: "ne",
      value: 0,
    });
    expect(byKey.get("rollAreaM2")?.hideIf).toEqual({
      key: "lawnType",
      op: "ne",
      value: 1,
    });
  });

  it("публикует границы, внутреннюю ссылку и проверяемые источники", () => {
    const html = lawnDef.seoContent?.descriptionHtml ?? "";

    expect(lawnDef.h1).toContain("к покупке");
    expect(lawnDef.metaDescription).toContain("по норме с упаковки");
    expect(html).toContain("www.mos.ru");
    expect(html).toContain("fertika.com");
    expect(html).toContain("gazony.com/ukladka-rulonnogo-gazona");
    expect(html).toContain("/kalkulyatory/inzhenernye/drenazh-uchastka/");
    expect(html).not.toContain("коэф. 1.20");
    expect(html).not.toContain("стимулятор укоренения");
  });
});
