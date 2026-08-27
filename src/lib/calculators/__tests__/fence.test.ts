import { describe, expect, it } from "vitest";
import { fenceDef } from "../formulas/fence";
import { checkInvariants, findMaterial, withBasicAccuracy } from "./_helpers";

const calc = withBasicAccuracy(fenceDef.calculate.bind(fenceDef));

describe("Калькулятор забора v2", () => {
  it("считает профлист по паспортной рабочей ширине без скрытого запаса", () => {
    const result = calc({});
    const sheets = findMaterial(result, "Профнастил");

    expect(result.formulaVersion).toBe("fence-canonical-v2");
    expect(result.totals.netLength).toBe(45);
    expect(result.totals.sheetWorkingWidthMm).toBe(1150);
    expect(result.totals.sheetExactNeed).toBeCloseTo(45 / 1.15, 5);
    expect(result.scenarios?.MIN.exact_need).toBeCloseTo(45 / 1.15, 5);
    expect(result.scenarios?.REC.exact_need).toBeCloseTo(45 / 1.15, 5);
    expect(result.scenarios?.REC.purchase_quantity).toBe(40);
    expect(result.scenarios?.MAX.purchase_quantity).toBe(42);
    expect(sheets?.quantity).toBeCloseTo(45 / 1.15, 5);
    expect(sheets?.withReserve).toBeCloseTo(45 / 1.15, 5);
    expect(sheets?.purchaseQty).toBe(40);
    expect(sheets?.subtitle).toContain("Точная потребность 39,13 листа");
    expect(sheets?.subtitle).toContain("нахлёст");
    expect(result.accuracyExplanation?.combinedMultiplier).toBe(1);
    checkInvariants(result);
  });

  it("рабочая ширина 1000 мм для подтверждённого С21 меняет покупку на 45 листов", () => {
    const result = calc({ sheetWorkingWidthMm: 1000 });

    expect(result.totals.sheetExactNeed).toBe(45);
    expect(result.totals.sheets).toBe(45);
    expect(result.scenarios?.REC.purchase_quantity).toBe(45);
  });

  it("явный запас применяется один раз до округления", () => {
    const result = calc({ sheetWorkingWidthMm: 1150, coverReservePercent: 10 });

    expect(result.scenarios?.MIN.exact_need).toBeCloseTo(45 / 1.15, 5);
    expect(result.scenarios?.REC.exact_need).toBeCloseTo(45 / 1.15 * 1.1, 5);
    expect(result.scenarios?.REC.purchase_quantity).toBe(44);
    expect(result.scenarios?.REC.key_factors.reserve_percent).toBe(10);
  });

  it("режим точности не меняет закупку профлиста", () => {
    const basic = fenceDef.calculate({ accuracyMode: "basic" as never });
    const detailed = fenceDef.calculate({ accuracyMode: "detailed" as never });

    expect(basic.totals.sheets).toBe(40);
    expect(detailed.totals.sheets).toBe(40);
    expect(detailed.accuracyExplanation?.combinedMultiplier).toBe(1);
  });

  it("саморезы считает в штуках и округляет до фактической упаковки", () => {
    const result = calc({ screwsPerSheet: 6, screwReservePercent: 5, screwPackCount: 200 });
    const screws = findMaterial(result, "Саморезы для профлиста");

    expect(screws?.quantity).toBe(240);
    expect(screws?.withReserve).toBe(252);
    expect(screws?.purchaseQty).toBe(400);
    expect(screws?.unit).toBe("шт");
    expect(screws?.packageInfo).toEqual({ count: 2, size: 200, packageUnit: "упаковок" });
    expect(JSON.stringify(result)).not.toContain("кг");
  });

  it("не показывает пустую позицию крепежа, если норма равна нулю", () => {
    const result = calc({ screwsPerSheet: 0 });

    expect(findMaterial(result, "Саморезы для профлиста")).toBeUndefined();
  });

  it("сохраняет геометрию опор и явно предупреждает об узле ворот", () => {
    const result = calc({});

    expect(result.totals.postsCount).toBe(23);
    expect(result.totals.lagsPerSpan).toBe(2);
    expect(result.totals.lagsCount).toBe(36);
    expect(result.warnings.some((warning) => warning.includes("отдельный расчёт усиленных опор"))).toBe(true);
    expect(findMaterial(result, "Столбы выбранной системы")).toBeDefined();
  });

  it("сетка и штакетник используют ту же прозрачную цепочку сценариев", () => {
    const mesh = calc({ fenceType: 1, coverReservePercent: 0 });
    const slats = calc({ fenceType: 2, coverReservePercent: 5 });

    expect(mesh.scenarios?.REC.exact_need).toBe(4.5);
    expect(mesh.scenarios?.REC.purchase_quantity).toBe(5);
    expect(findMaterial(mesh, "Сетка-рабица")?.purchaseQty).toBe(5);
    expect(slats.scenarios?.REC.exact_need).toBeCloseTo(45 / 0.13 * 1.05, 5);
    expect(findMaterial(slats, "Антисептик")?.packageInfo?.size).toBe(5);
    checkInvariants(mesh);
    checkInvariants(slats);
  });

  it("SEO-пример совпадает с расчётом 1150 и 1000 мм", () => {
    const html = fenceDef.seoContent?.faq.map((item) => item.answer).join(" ") ?? "";

    expect(html).toContain("<strong>39,13 листа</strong>");
    expect(html).toContain("<strong>40 листов</strong>");
    expect(html).toContain("<strong>45 листов</strong>");
    expect(html).toContain("<strong>2 упаковки, 400 шт. к покупке</strong>");
    expect(html).not.toContain("С20 с нахлёстом");
  });
});
