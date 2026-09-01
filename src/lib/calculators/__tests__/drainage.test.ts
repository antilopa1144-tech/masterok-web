import { describe, expect, it } from "vitest";
import { drainageDef } from "../formulas/drainage";
import { checkInvariants, findMaterial, withBasicAccuracy } from "./_helpers";

const calc = withBasicAccuracy(drainageDef.calculate.bind(drainageDef));

describe("Калькулятор дренажа — ведомость по проектной трассе", () => {
  it("default считает только фактическую длину трубы без выдуманной ёлочки", () => {
    const result = calc({});
    const pipe = findMaterial(result, "Дренажная труба");

    expect(result.formulaVersion).toBe("drainage-web-route-v1");
    expect(result.totals.pipeLengthM).toBe(40);
    expect(result.totals.pipeReservedM).toBe(40);
    expect(result.totals.pipePurchaseM).toBe(40);
    expect(result.totals.pipePurchaseLots).toBe(40);
    expect(pipe?.quantity).toBe(40);
    expect(pipe?.withReserve).toBe(40);
    expect(pipe?.purchaseQty).toBe(40);
    expect(result.materials).toHaveLength(1);
    expect(result.summaryCards?.map((card) => card.value)).toEqual(["40", "40", "40"]);
    checkInvariants(result);
  });

  it("явный запас применяется один раз", () => {
    const result = calc({ pipeReservePercent: 5, pipeSaleStepM: 1 });

    expect(result.totals.pipeLengthM).toBe(40);
    expect(result.totals.pipeReservedM).toBe(42);
    expect(result.totals.pipePurchaseM).toBe(42);
    expect(result.scenarios?.REC.exact_need).toBe(42);
  });

  it("округляет трубу по фактической длине неделимой бухты", () => {
    const result = calc({ pipeReservePercent: 5, pipeSaleStepM: 50 });
    const pipe = findMaterial(result, "Дренажная труба");

    expect(result.totals.pipeReservedM).toBe(42);
    expect(result.totals.pipePurchaseLots).toBe(1);
    expect(result.totals.pipePurchaseM).toBe(50);
    expect(result.totals.pipeLeftoverM).toBe(8);
    expect(pipe?.subtitle).toContain("1 неделимая");
  });

  it("диаметр меняет подпись товара, но не подменяет гидравлический подбор", () => {
    const d110 = calc({ pipeDiameterMm: 110 });
    const d160 = calc({ pipeDiameterMm: 160 });

    expect(findMaterial(d110, "Ø110")).toBeDefined();
    expect(findMaterial(d160, "Ø160")).toBeDefined();
    expect(d110.totals.pipePurchaseM).toBe(d160.totals.pipePurchaseM);
    expect(d160.warnings.some((warning) => warning.includes("не подбирается"))).toBe(true);
  });

  it("считает песчаный слой и щебёночную обсыпку только по заданному сечению", () => {
    const result = calc({
      layersEnabled: 1,
      sandLayerWidthM: 0.3,
      sandLayerThicknessMm: 100,
      sandPurchaseFactor: 1.2,
      gravelEnvelopeWidthM: 0.3,
      gravelEnvelopeHeightM: 0.4,
      gravelPurchaseFactor: 1.25,
      bulkSaleStepM3: 0.1,
    });

    expect(result.totals.sandGeometricM3).toBeCloseTo(1.2, 6);
    expect(result.totals.sandPurchaseNeedM3).toBeCloseTo(1.44, 6);
    expect(result.totals.sandPurchaseM3).toBe(1.5);
    expect(result.totals.pipeCrossSectionM2).toBeCloseTo(Math.PI * 0.11 ** 2 / 4, 6);
    expect(result.totals.gravelGeometricM3).toBeCloseTo((0.3 * 0.4 - Math.PI * 0.11 ** 2 / 4) * 40, 6);
    expect(result.totals.gravelPurchaseM3).toBe(5.6);
    expect(findMaterial(result, "Песок — заданный слой")?.purchaseQty).toBe(1.5);
    expect(findMaterial(result, "Щебень — заданная обсыпка")?.purchaseQty).toBe(5.6);
    checkInvariants(result);
  });

  it("не назначает слои при включённом блоке с нулевыми размерами", () => {
    const result = calc({ layersEnabled: 1 });

    expect(result.totals.sandPurchaseM3).toBe(0);
    expect(result.totals.gravelPurchaseM3).toBe(0);
    expect(findMaterial(result, "Песок — заданный слой")).toBeUndefined();
    expect(findMaterial(result, "Щебень — заданная обсыпка")).toBeUndefined();
    expect(result.warnings.some((warning) => warning.includes("размеры слоёв не заданы"))).toBe(true);
  });

  it("считает геотекстиль по развёрнутой ширине и фактическому рулону", () => {
    const result = calc({
      geotextileEnabled: 1,
      geotextileDevelopedWidthM: 1.61,
      geotextileReservePercent: 15,
      geotextileRollM2: 50,
    });

    expect(result.totals.geotextileCleanM2).toBeCloseTo(64.4, 6);
    expect(result.totals.geotextileReservedM2).toBeCloseTo(74.06, 6);
    expect(result.totals.geotextileRolls).toBe(2);
    expect(findMaterial(result, "Геотекстиль")?.unit).toBe("рулонов");
    expect(findMaterial(result, "Геотекстиль")?.purchaseQty).toBe(2);
  });

  it("добавляет колодцы и фитинги только по введённой проектной ведомости", () => {
    const result = calc({
      projectItemsEnabled: 1,
      inspectionWellCount: 3,
      collectorWellCount: 1,
      teeCount: 4,
      elbowCount: 2,
    });

    expect(findMaterial(result, "Смотровые колодцы")?.purchaseQty).toBe(3);
    expect(findMaterial(result, "Приёмные или коллекторные колодцы")?.purchaseQty).toBe(1);
    expect(findMaterial(result, "Тройники")?.purchaseQty).toBe(4);
    expect(findMaterial(result, "Отводы")?.purchaseQty).toBe(2);
  });

  it("по умолчанию не назначает колодцы, фитинги, слои и геотекстиль", () => {
    const serialized = JSON.stringify(calc({}));

    for (const forbidden of ["Песок", "Щебень", "Геотекстиль", "Смотровые колодцы", "Тройники", "Отводы"]) {
      expect(serialized).not.toContain(forbidden);
    }
  });

  it("MIN/REC/MAX и режим точности не добавляют скрытые множители", () => {
    const result = calc({ pipeReservePercent: 5, accuracyMode: "detailed" as never });

    expect(result.scenarios?.MIN).toEqual(result.scenarios?.REC);
    expect(result.scenarios?.REC).toEqual(result.scenarios?.MAX);
    expect(result.scenarios?.REC.key_factors).toEqual({ field_multiplier: 1, reserve_percent: 5 });
    expect(result.accuracyExplanation?.combinedMultiplier).toBe(1);
  });

  it("форма не содержит универсальных проектных пресетов", () => {
    const keys = drainageDef.fields.map((field) => field.key);
    const field = (key: string) => drainageDef.fields.find((item) => item.key === key);

    expect(keys).not.toContain("drainageType");
    expect(keys).not.toContain("groundwaterRisk");
    expect(keys).not.toContain("withCollector");
    expect(keys).toContain("pipeSaleStepM");
    expect(keys).toContain("gravelEnvelopeWidthM");
    expect(field("sandLayerWidthM")?.hideIf).toEqual({ key: "layersEnabled", op: "eq", value: 0 });
    expect(field("geotextileDevelopedWidthM")?.hideIf).toEqual({ key: "geotextileEnabled", op: "eq", value: 0 });
    expect(field("inspectionWellCount")?.hideIf).toEqual({ key: "projectItemsEnabled", op: "eq", value: 0 });
  });

  it("SEO отделяет геометрию закупки от проекта и ведёт на первичные источники", () => {
    const html = drainageDef.seoContent?.descriptionHtml ?? "";

    expect(html).not.toContain("до 80 м трассы");
    expect(html).not.toContain("шаг 5-7 м");
    expect(html).not.toContain("типичная глубина");
    expect(html).not.toContain("раз в 3&ndash;5 лет");
    expect(html).toContain("https://protect.gost.ru/sp/details/e1b05b3c-a2e5-419b-b4c1-d7e07aa7e3ce");
    expect(html).toContain("https://protect.gost.ru/sp/details/cf3b6ea5-c63b-4aa4-9dd3-4295fcaef945");
    expect(html).toContain("https://protect.gost.ru/gost/details/a1c13ac5-d59f-4397-b221-634f686375f3");
    expect(html).toContain("https://protect.gost.ru/sp/details/990885bc-664d-4329-b54c-5aa3d581c20d");
  });

  it("метаданные обещают только поддерживаемую ведомость", () => {
    expect(drainageDef.h1).toBe("Калькулятор дренажа — материалы по проектной трассе");
    expect(drainageDef.metaTitle).toContain("Калькулятор дренажа: труба и материалы");
    expect(drainageDef.metaDescription.startsWith("Бесплатный калькулятор")).toBe(true);
    expect(drainageDef.metaDescription).toContain("рассчитайте");
    expect(drainageDef.metaDescription).not.toContain("уровню грунтовых вод");
  });
});
