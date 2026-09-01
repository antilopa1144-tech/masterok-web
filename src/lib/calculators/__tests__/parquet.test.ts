import { describe, expect, it } from "vitest";
import { parquetDef } from "../formulas/parquet";
import { checkInvariants, findMaterial, withBasicAccuracy } from "./_helpers";

const calc = withBasicAccuracy(parquetDef.calculate.bind(parquetDef));

describe("Калькулятор паркетной доски", () => {
  it("по умолчанию считает только покрытие без скрытого запаса и системы материалов", () => {
    const result = calc({});
    const parquet = findMaterial(result, "Паркетная доска");

    expect(result.formulaVersion).toBe("parquet-web-purchase-v1");
    expect(result.totals.area).toBe(20);
    expect(result.totals.reservePercent).toBe(0);
    expect(result.totals.coverageRequiredAreaM2).toBe(20);
    expect(result.totals.parquetPacks).toBe(11);
    expect(result.totals.parquetPurchaseAreaM2).toBe(20.812);
    expect(result.materials).toHaveLength(1);
    expect(parquet?.quantity).toBe(20);
    expect(parquet?.withReserve).toBe(20);
    expect(parquet?.purchaseQty).toBe(20.812);
    expect(parquet?.packageInfo?.count).toBe(11);
    checkInvariants(result);
  });

  it("применяет явный запас один раз и округляет вверх по фактической площади пачки", () => {
    const result = calc({ reservePercent: 10, packArea: 1.892 });

    expect(result.totals.coverageRequiredAreaM2).toBe(22);
    expect(result.totals.parquetPacks).toBe(12);
    expect(result.totals.parquetPurchaseAreaM2).toBe(22.704);
    expect(result.totals.parquetLeftoverAreaM2).toBeCloseTo(0.704, 6);
    expect(result.scenarios?.REC.exact_need).toBe(22);
    expect(result.scenarios?.REC.purchase_quantity).toBe(22.704);
  });

  it("поддерживает готовую площадь сложного помещения без восстановления периметра", () => {
    const result = calc({ inputMode: 1, area: 18.5, reservePercent: 5, packArea: 2.17 });

    expect(result.totals.area).toBe(18.5);
    expect(result.totals.coverageRequiredAreaM2).toBe(19.425);
    expect(result.totals.parquetPacks).toBe(9);
    expect(result.totals.parquetPurchaseAreaM2).toBe(19.53);
    expect(result.totals.parquetLeftoverAreaM2).toBeCloseTo(0.105, 6);
    expect(result.totals.perimeter).toBeUndefined();
  });

  it("не превращает название раскладки в скрытый процент", () => {
    const straight = calc({ layoutType: 0, reservePercent: 0 });
    const diagonal = calc({ layoutType: 1, reservePercent: 0 });
    const herringbone = calc({ layoutType: 2, reservePercent: 0 });

    expect(straight.totals.coverageRequiredAreaM2).toBe(20);
    expect(diagonal.totals.coverageRequiredAreaM2).toBe(20);
    expect(herringbone.totals.coverageRequiredAreaM2).toBe(20);
    expect(herringbone.warnings.some((warning) => warning.includes("ёлочк"))).toBe(true);
  });

  it("считает подложку только по проектной площади и фактической упаковке", () => {
    const result = calc({
      underlaymentEnabled: 1,
      projectUnderlaymentAreaM2: 23,
      underlaymentReservePercent: 5,
      underlaymentPackAreaM2: 10,
    });
    const underlayment = findMaterial(result, "Подложка");

    expect(underlayment?.quantity).toBe(23);
    expect(underlayment?.withReserve).toBe(24.15);
    expect(underlayment?.purchaseQty).toBe(30);
    expect(underlayment?.packageInfo?.count).toBe(3);
    expect(findMaterial(result, "Скотч")).toBeUndefined();
  });

  it("считает клей по паспортному расходу, проектной площади и массе ведра", () => {
    const result = calc({
      glueEnabled: 1,
      projectGlueAreaM2: 18,
      glueRateKgPerM2: 1.2,
      glueReservePercent: 10,
      glueBucketKg: 10,
    });
    const glue = findMaterial(result, "Клей для паркета");

    expect(glue?.quantity).toBe(21.6);
    expect(glue?.withReserve).toBe(23.76);
    expect(glue?.purchaseQty).toBe(30);
    expect(glue?.packageInfo?.count).toBe(3);
  });

  it("считает плинтус только по измеренной длине и товарной планке", () => {
    const result = calc({
      plinthEnabled: 1,
      projectPlinthLengthM: 17.4,
      plinthReservePercent: 5,
      plinthPieceLengthM: 2.4,
    });
    const plinth = findMaterial(result, "Плинтус");

    expect(plinth?.quantity).toBe(17.4);
    expect(plinth?.withReserve).toBe(18.27);
    expect(plinth?.purchaseQty).toBe(19.2);
    expect(plinth?.packageInfo?.count).toBe(8);
  });

  it("принимает проектные порожки и их реальную неделимую фасовку", () => {
    const result = calc({
      thresholdsEnabled: 1,
      projectThresholdCount: 7,
      thresholdsPerPack: 4,
    });
    const thresholds = findMaterial(result, "Порожки");

    expect(thresholds?.quantity).toBe(7);
    expect(thresholds?.purchaseQty).toBe(8);
    expect(thresholds?.packageInfo?.count).toBe(2);
  });

  it("считает влагозащитный слой только по проектной площади и рулону", () => {
    const result = calc({
      moistureLayerEnabled: 1,
      projectMoistureLayerAreaM2: 21,
      moistureLayerReservePercent: 10,
      moistureLayerRollAreaM2: 15,
    });
    const layer = findMaterial(result, "Влагозащитный слой");

    expect(layer?.quantity).toBe(21);
    expect(layer?.withReserve).toBe(23.1);
    expect(layer?.purchaseQty).toBe(30);
    expect(layer?.packageInfo?.count).toBe(2);
  });

  it("не добавляет универсальные сопутствующие материалы", () => {
    const result = calc({});

    expect(findMaterial(result, "Подложка")).toBeUndefined();
    expect(findMaterial(result, "Скотч")).toBeUndefined();
    expect(findMaterial(result, "Плинтус")).toBeUndefined();
    expect(findMaterial(result, "Клинья")).toBeUndefined();
    expect(findMaterial(result, "Порож")).toBeUndefined();
    expect(findMaterial(result, "Клей")).toBeUndefined();
    expect(findMaterial(result, "компенсац")).toBeUndefined();
  });

  it("не меняет закупку скрытыми MIN/REC/MAX и режимом точности", () => {
    for (const accuracyMode of ["basic", "accurate", "professional"] as const) {
      const result = parquetDef.calculate({ reservePercent: 10, packArea: 1.892, accuracyMode } as never);

      expect(result.scenarios?.MIN.exact_need).toBe(22);
      expect(result.scenarios?.REC.exact_need).toBe(22);
      expect(result.scenarios?.MAX.exact_need).toBe(22);
      expect(result.scenarios?.MIN.purchase_quantity).toBe(22.704);
      expect(result.scenarios?.REC.purchase_quantity).toBe(22.704);
      expect(result.scenarios?.MAX.purchase_quantity).toBe(22.704);
      expect(result.accuracyExplanation?.combinedMultiplier).toBe(1);
    }
  });

  it("скрывает поля необязательных материалов до их включения", () => {
    const field = (key: string) => parquetDef.fields.find((item) => item.key === key);

    expect(field("projectUnderlaymentAreaM2")?.hideIf).toEqual({ key: "underlaymentEnabled", op: "eq", value: 0 });
    expect(field("projectGlueAreaM2")?.hideIf).toEqual({ key: "glueEnabled", op: "eq", value: 0 });
    expect(field("projectPlinthLengthM")?.hideIf).toEqual({ key: "plinthEnabled", op: "eq", value: 0 });
    expect(field("projectThresholdCount")?.hideIf).toEqual({ key: "thresholdsEnabled", op: "eq", value: 0 });
    expect(field("projectMoistureLayerAreaM2")?.hideIf).toEqual({ key: "moistureLayerEnabled", op: "eq", value: 0 });
  });

  it("удаляет поля старой универсальной модели", () => {
    const keys = parquetDef.fields.map((field) => field.key);

    expect(keys).not.toContain("layingMethod");
    expect(keys).not.toContain("boardWidth");
    expect(keys).not.toContain("needUnderlayment");
    expect(keys).not.toContain("needPlinth");
    expect(keys).not.toContain("needGlue");
    expect(keys).not.toContain("doorThresholds");
  });

  it("объясняет границы модели и использует действующие первичные источники", () => {
    const result = calc({ inputMode: 1, area: 4, layoutType: 2 });
    const seo = parquetDef.seoContent?.descriptionHtml ?? "";

    expect(result.warnings.some((warning) => warning.includes("карты раскладки"))).toBe(true);
    expect(result.warnings.some((warning) => warning.includes("основан"))).toBe(true);
    expect(seo).toContain("https://protect.gost.ru/gost/details/0c43efed-c787-4403-bd67-d536850409b2");
    expect(seo).toContain("https://protect.gost.ru/sp/details/ca915ed9-5bce-4de4-94af-debfd041a939");
    expect(seo).toContain("https://www.tarkett.ru/documents/filter/role-is-installation/category-is-parketnaya-doska/apply/");
    expect(seo).not.toContain("ГОСТ 862.3-86");
  });
});
