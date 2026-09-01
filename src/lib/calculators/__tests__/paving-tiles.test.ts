import { describe, expect, it } from "vitest";
import { pavingTilesDef } from "../formulas/paving-tiles";
import { checkInvariants, findMaterial, withBasicAccuracy } from "./_helpers";

const calc = withBasicAccuracy(pavingTilesDef.calculate.bind(pavingTilesDef));

describe("Калькулятор тротуарной плитки — явная закупочная модель", () => {
  it("default считает только плитку и бордюр без скрытого основания", () => {
    const result = calc({});
    const tile = findMaterial(result, "Тротуарная плитка");
    const border = findMaterial(result, "Бордюр");

    expect(result.formulaVersion).toBe("paving-tiles-web-purchase-v1");
    expect(result.totals.area).toBe(50);
    expect(result.totals.tileCleanM2).toBe(50);
    expect(result.totals.tileReservedM2).toBe(50);
    expect(result.totals.tilePurchaseM2).toBe(50);
    expect(result.totals.tilePurchaseLots).toBe(500);
    expect(tile?.quantity).toBe(50);
    expect(tile?.withReserve).toBe(50);
    expect(tile?.purchaseQty).toBe(50);
    expect(border?.purchaseQty).toBe(30);
    expect(result.materials.map((material) => material.name)).toEqual([
      expect.stringContaining("Тротуарная плитка"),
      expect.stringContaining("Бордюр"),
    ]);
    expect(result.summaryCards?.map((card) => card.value)).toEqual(["50", "50", "50"]);
    checkInvariants(result);
  });

  it("явный запас применяется один раз и не округляется заранее до целого м²", () => {
    const result = calc({ tileReservePercent: 7, tileSaleStepM2: 0.1 });

    expect(result.totals.tileCleanM2).toBe(50);
    expect(result.totals.tileReservedM2).toBe(53.5);
    expect(result.totals.tilePurchaseM2).toBe(53.5);
    expect(result.totals.tilePurchaseLots).toBe(535);
    expect(result.scenarios?.REC.exact_need).toBe(53.5);
    expect(result.scenarios?.REC.purchase_quantity).toBe(53.5);
  });

  it("округляет плитку вверх по фактической площади неделимой упаковки или поддона", () => {
    const result = calc({ tileReservePercent: 7, tileSaleStepM2: 12.96 });
    const tile = findMaterial(result, "Тротуарная плитка");

    expect(result.totals.tileReservedM2).toBe(53.5);
    expect(result.totals.tilePurchaseLots).toBe(5);
    expect(result.totals.tilePurchaseM2).toBe(64.8);
    expect(result.totals.tileLeftoverM2).toBe(11.3);
    expect(tile?.subtitle).toContain("5 неделимых");
  });

  it("считает бордюр по фактической длине изделия и отдельному запасу", () => {
    const result = calc({
      perimeter: 30,
      borderPieceLengthM: 0.5,
      borderReservePercent: 5,
    });
    const border = findMaterial(result, "Бордюр");

    expect(result.totals.borderCleanPcs).toBe(60);
    expect(result.totals.borderReservedPcs).toBe(63);
    expect(result.totals.borderPurchasePcs).toBe(63);
    expect(border?.purchaseQty).toBe(63);
  });

  it("не считает бордюр, когда пользователь его выключил", () => {
    const result = calc({ borderEnabled: 0 });

    expect(result.totals.borderPurchasePcs).toBe(0);
    expect(findMaterial(result, "Бордюр")).toBeUndefined();
  });

  it("считает песок и щебень только по явно заданным проектным слоям", () => {
    const result = calc({
      layersEnabled: 1,
      sandLayerThicknessMm: 50,
      sandPurchaseFactor: 1.2,
      gravelLayerThicknessMm: 100,
      gravelPurchaseFactor: 1.25,
      bulkSaleStepM3: 0.1,
    });

    expect(result.totals.sandGeometricM3).toBe(2.5);
    expect(result.totals.sandPurchaseNeedM3).toBe(3);
    expect(result.totals.sandPurchaseM3).toBe(3);
    expect(result.totals.gravelGeometricM3).toBe(5);
    expect(result.totals.gravelPurchaseNeedM3).toBe(6.25);
    expect(result.totals.gravelPurchaseM3).toBe(6.3);
    expect(findMaterial(result, "Песок — заданный слой")?.purchaseQty).toBe(3);
    expect(findMaterial(result, "Щебень — заданный слой")?.purchaseQty).toBe(6.3);
    checkInvariants(result);
  });

  it("не подставляет толщины и коэффициенты основания при включённом пустом блоке", () => {
    const result = calc({ layersEnabled: 1 });

    expect(result.totals.sandGeometricM3).toBe(0);
    expect(result.totals.gravelGeometricM3).toBe(0);
    expect(findMaterial(result, "Песок — заданный слой")).toBeUndefined();
    expect(findMaterial(result, "Щебень — заданный слой")).toBeUndefined();
    expect(result.warnings.some((warning) => warning.includes("не заданы"))).toBe(true);
  });

  it("считает шовный материал и геотекстиль только по паспортным входам пользователя", () => {
    const result = calc({
      jointSandEnabled: 1,
      jointSandRateKgM2: 5,
      jointSandBagKg: 25,
      geotextileEnabled: 1,
      geotextileReservePercent: 10,
      geotextileRollM2: 50,
    });

    expect(result.totals.jointSandKg).toBe(250);
    expect(result.totals.jointSandBags).toBe(10);
    expect(findMaterial(result, "Материал для заполнения швов")?.purchaseQty).toBe(10);
    expect(result.totals.geotextileReservedM2).toBe(55);
    expect(result.totals.geotextileRolls).toBe(2);
    expect(findMaterial(result, "Геотекстиль")?.purchaseQty).toBe(2);
  });

  it("MIN/REC/MAX и режим точности не добавляют скрытые множители", () => {
    const result = calc({ tileReservePercent: 10, accuracyMode: "detailed" as never });

    expect(result.scenarios?.MIN).toEqual(result.scenarios?.REC);
    expect(result.scenarios?.REC).toEqual(result.scenarios?.MAX);
    expect(result.scenarios?.REC.key_factors).toEqual({ field_multiplier: 1, reserve_percent: 10 });
    expect(result.accuracyExplanation?.combinedMultiplier).toBe(1);
  });

  it("форма убирает универсальные пресеты основания и раскрывает фактические входы", () => {
    const keys = pavingTilesDef.fields.map((field) => field.key);
    const field = (key: string) => pavingTilesDef.fields.find((item) => item.key === key);

    expect(keys).not.toContain("foundationType");
    expect(keys).not.toContain("tileThickness");
    expect(keys).toContain("tileReservePercent");
    expect(keys).toContain("tileSaleStepM2");
    expect(keys).toContain("sandLayerThicknessMm");
    expect(keys).toContain("gravelLayerThicknessMm");
    expect(field("perimeter")?.hideIf).toEqual({ key: "borderEnabled", op: "eq", value: 0 });
    expect(field("sandLayerThicknessMm")?.hideIf).toEqual({ key: "layersEnabled", op: "eq", value: 0 });
    expect(field("jointSandRateKgM2")?.hideIf).toEqual({ key: "jointSandEnabled", op: "eq", value: 0 });
    expect(field("geotextileRollM2")?.hideIf).toEqual({ key: "geotextileEnabled", op: "eq", value: 0 });
  });

  it("не выдаёт проект основания и универсальные нормы за нормативный результат", () => {
    const serialized = JSON.stringify(calc({}));
    const html = pavingTilesDef.seoContent?.descriptionHtml ?? "";

    expect(serialized).not.toContain("Цемент М400");
    expect(serialized).not.toContain("Бетон М200");
    expect(html).not.toContain("5 кг/м² по СП");
    expect(html).not.toContain("бетонная плита 100 мм");
    expect(html).not.toContain("обязательно для парковок");
    expect(html).toContain("https://protect.gost.ru/gost/details/acb7d009-5d1c-45bd-8ab4-d3591ad19972");
    expect(html).toContain("https://protect.gost.ru/sp/details/8d5a8ef5-f450-4356-ac88-72cd17c416cf");
    expect(html).toContain("https://protect.gost.ru/gost/details/683a4426-dd5d-431d-a83f-6208cf3667aa");
  });

  it("метаданные обещают только поддерживаемый расчёт", () => {
    expect(pavingTilesDef.h1).toBe("Калькулятор тротуарной плитки — закупка покрытия и заданных слоёв");
    expect(pavingTilesDef.metaTitle).toContain("Калькулятор тротуарной плитки: закупка материалов");
    expect(pavingTilesDef.metaDescription.startsWith("Бесплатный калькулятор")).toBe(true);
    expect(pavingTilesDef.metaDescription).toContain("рассчитайте");
    expect(pavingTilesDef.metaDescription).not.toContain("под автомобиль");
  });
});
