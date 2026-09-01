import { describe, expect, it } from "vitest";
import { fenceDef } from "../formulas/fence";
import { checkInvariants, findMaterial, withBasicAccuracy } from "./_helpers";

const calc = withBasicAccuracy(fenceDef.calculate.bind(fenceDef));

describe("Калькулятор забора — безопасная web-модель заполнения", () => {
  it("считает профлист по чистой длине и паспортной рабочей ширине", () => {
    const result = calc({});
    const sheets = findMaterial(result, "Профнастил");

    expect(result.formulaVersion).toBe("fence-web-fill-v1");
    expect(result.totals.fenceLength).toBe(50);
    expect(result.totals.openingsWidthM).toBe(5);
    expect(result.totals.netFillLengthM).toBe(45);
    expect(result.totals.productModuleM).toBe(1.15);
    expect(result.totals.cleanNeed).toBeCloseTo(45 / 1.15, 6);
    expect(result.totals.reservedNeed).toBeCloseTo(45 / 1.15, 6);
    expect(result.totals.purchaseQty).toBe(40);
    expect(sheets?.quantity).toBeCloseTo(45 / 1.15, 6);
    expect(sheets?.withReserve).toBeCloseTo(45 / 1.15, 6);
    expect(sheets?.purchaseQty).toBe(40);
    expect(sheets?.subtitle).toContain("45 м / 1,15 м");
    expect(result.summaryCards?.map((card) => card.value)).toEqual(["45", "39,13", "40"]);
    checkInvariants(result);
  });

  it("рабочая ширина 1000 мм меняет покупку на 45 листов", () => {
    const result = calc({ sheetWorkingWidthMm: 1000 });

    expect(result.totals.productModuleM).toBe(1);
    expect(result.totals.cleanNeed).toBe(45);
    expect(result.totals.purchaseQty).toBe(45);
  });

  it("явный запас применяется один раз, а MIN/REC/MAX совпадают", () => {
    const result = calc({ coverReservePercent: 10 });

    expect(result.totals.cleanNeed).toBeCloseTo(45 / 1.15, 6);
    expect(result.totals.reservedNeed).toBeCloseTo(45 / 1.15 * 1.1, 6);
    expect(result.totals.purchaseQty).toBe(44);
    expect(result.scenarios?.MIN).toEqual(result.scenarios?.REC);
    expect(result.scenarios?.REC).toEqual(result.scenarios?.MAX);
    expect(result.scenarios?.REC.key_factors).toEqual({ field_multiplier: 1, reserve_percent: 10 });
  });

  it("рабицу считает по фактической длине рулона", () => {
    const result = calc({ fenceType: 1, meshRollLengthM: 10 });
    const mesh = findMaterial(result, "Сетка-рабица");

    expect(result.totals.productModuleM).toBe(10);
    expect(result.totals.cleanNeed).toBe(4.5);
    expect(result.totals.purchaseQty).toBe(5);
    expect(mesh?.unit).toBe("рулонов");
    expect(mesh?.purchaseQty).toBe(5);
    expect(result.warnings.some((warning) => warning.includes("высота рулона"))).toBe(true);
    checkInvariants(result);
  });

  it("штакетник считает по введённым ширине и зазору", () => {
    const result = calc({ fenceType: 2, slatWidthMm: 100, slatGapMm: 30 });
    const slats = findMaterial(result, "Штакетник");

    expect(result.totals.productModuleM).toBe(0.13);
    expect(result.totals.cleanNeed).toBeCloseTo(45 / 0.13, 6);
    expect(result.totals.purchaseQty).toBe(347);
    expect(slats?.purchaseQty).toBe(347);
    expect(result.warnings.some((warning) => warning.includes("двухстороннюю шахматную"))).toBe(true);
    checkInvariants(result);
  });

  it("не создаёт фиктивный метр заполнения, если проёмы не меньше общей длины", () => {
    const result = calc({ fenceLength: 20, openingsWidthM: 30 });

    expect(result.totals.openingsWidthUsedM).toBe(20);
    expect(result.totals.netFillLengthM).toBe(0);
    expect(result.totals.cleanNeed).toBe(0);
    expect(result.totals.purchaseQty).toBe(0);
    expect(result.materials).toHaveLength(0);
    expect(result.warnings.some((warning) => warning.includes("не меньше общей длины"))).toBe(true);
  });

  it("не назначает несущую систему и скрытые сопутствующие материалы", () => {
    const serialized = JSON.stringify(calc({}));

    for (const forbidden of [
      "Столбы",
      "лаги",
      "Бетон",
      "Заглушки",
      "Грунт-спрей",
      "Саморезы",
      "Проволока натяжная",
      "Антисептик",
    ]) {
      expect(serialized).not.toContain(forbidden);
    }
  });

  it("форма не содержит универсальные поля конструкции и автоматического крепежа", () => {
    const keys = fenceDef.fields.map((field) => field.key);

    expect(keys).toContain("openingsWidthM");
    expect(keys).toContain("meshRollLengthM");
    expect(keys).toContain("slatWidthMm");
    expect(keys).toContain("slatGapMm");
    expect(keys).not.toContain("postStep");
    expect(keys).not.toContain("gatesCount");
    expect(keys).not.toContain("wicketsCount");
    expect(keys).not.toContain("screwsPerSheet");
    expect(keys).not.toContain("screwReservePercent");
    expect(keys).not.toContain("screwPackCount");
  });

  it("условно показывает только параметры выбранного заполнения", () => {
    const field = (key: string) => fenceDef.fields.find((item) => item.key === key);

    expect(field("sheetWorkingWidthMm")?.hideIf).toEqual({ key: "fenceType", op: "ne", value: 0 });
    expect(field("meshRollLengthM")?.hideIf).toEqual({ key: "fenceType", op: "ne", value: 1 });
    expect(field("slatWidthMm")?.hideIf).toEqual({ key: "fenceType", op: "ne", value: 2 });
    expect(field("slatGapMm")?.hideIf).toEqual({ key: "fenceType", op: "ne", value: 2 });
  });

  it("режим точности не меняет закупку и не добавляет коэффициент", () => {
    const basic = fenceDef.calculate({ accuracyMode: "basic" as never });
    const detailed = fenceDef.calculate({ accuracyMode: "detailed" as never });

    expect(basic.totals.purchaseQty).toBe(40);
    expect(detailed.totals.purchaseQty).toBe(40);
    expect(detailed.accuracyExplanation?.combinedMultiplier).toBe(1);
  });

  it("SEO-примеры совпадают с расчётом для С8 и С21", () => {
    const html = fenceDef.seoContent?.faq.map((item) => item.answer).join(" ") ?? "";

    expect(html).toContain("<strong>39,13 листа</strong>");
    expect(html).toContain("<strong>40 листов</strong>");
    expect(html).toContain("<strong>45 листов</strong>");
    expect(html).not.toContain("23 столба");
    expect(html).not.toContain("0,03 м³");
  });

  it("метаданные обещают только поддерживаемый расчёт заполнения", () => {
    expect(fenceDef.h1).toBe("Калькулятор забора онлайн — расчёт заполнения по длине");
    expect(fenceDef.metaTitle).toContain("Калькулятор забора: расчёт заполнения");
    expect(fenceDef.metaDescription.startsWith("Бесплатный калькулятор")).toBe(true);
    expect(fenceDef.metaDescription).toContain("рассчитайте");
    expect(fenceDef.metaDescription).not.toContain("столб");
    expect(fenceDef.metaDescription).not.toContain("лаг");
    expect(fenceDef.metaDescription).not.toContain("крепёж");
  });
});
