import { describe, expect, it } from "vitest";
import frameHouseSpec from "../../../../configs/calculators/frame-house-canonical.v1.json";
import { frameHouseDef } from "../formulas/frame-house";
import { checkInvariants, findMaterial, withBasicAccuracy } from "./_helpers";

const calc = withBasicAccuracy(frameHouseDef.calculate.bind(frameHouseDef));

describe("Калькулятор материалов каркасного дома v2", () => {
  it("по умолчанию использует валовую площадь и не выдаёт ложную ведомость каркаса", () => {
    const result = calc({});

    expect(result.formulaVersion).toBe("frame-house-canonical-v2");
    expect(result.totals.grossWallArea).toBe(81);
    expect(result.totals.netWallArea).toBe(71);
    expect(result.totals.selectedSurfaceArea).toBe(81);
    expect(findMaterial(result, "Конструкционная доска")).toBeUndefined();
    expect(result.warnings.some((warning) => warning.includes("Пиломатериал каркаса не добавлен"))).toBe(true);
  });

  it("разделяет точную площадь, явный запас и целые наружные листы", () => {
    const result = calc({});
    const material = findMaterial(result, "Наружная листовая обшивка");

    expect(material).toMatchObject({
      quantity: 81,
      withReserve: 89.1,
      purchaseQty: 90.625,
    });
    expect(material?.packageInfo).toEqual({ count: 29, size: 3.125, packageUnit: "листов" });
    expect(result.totals.outerSheets).toBe(29);
  });

  it("MIN/REC/MAX относятся только к наружным листам", () => {
    const result = calc({});

    expect(result.scenarios?.MIN).toMatchObject({ exact_need: 25.92, purchase_quantity: 26, leftover: 0.08 });
    expect(result.scenarios?.REC).toMatchObject({ exact_need: 28.512, purchase_quantity: 29, leftover: 0.488 });
    expect(result.scenarios?.MAX).toMatchObject({ exact_need: 29.808, purchase_quantity: 30, leftover: 0.192 });
    expect(result.scenarios?.REC.buy_plan).toEqual({
      package_label: "outer-sheet",
      package_size: 1,
      packages_count: 29,
      unit: "листов",
    });
  });

  it("чистую площадь применяет только после явного выбора", () => {
    const result = calc({ surfaceAreaBasis: 1 });
    const outer = findMaterial(result, "Наружная листовая обшивка");

    expect(result.totals.selectedSurfaceArea).toBe(71);
    expect(outer?.quantity).toBe(71);
    expect(outer?.packageInfo?.count).toBe(25);
  });

  it("ограничивает невозможную площадь проёмов и предупреждает", () => {
    const result = calc({ wallLength: 5, wallHeight: 2, openingsArea: 100, surfaceAreaBasis: 1 });

    expect(result.totals.openingsArea).toBe(10);
    expect(result.totals.netWallArea).toBe(0);
    expect(result.warnings.some((warning) => warning.includes("превышает валовую площадь"))).toBe(true);
  });

  it("покупает одну позицию пиломатериала по ведомости и фактической длине", () => {
    const result = calc({
      framingProjectLengthM: 100,
      framingReservePercent: 5,
      framingBoardLengthM: 6,
    });
    const framing = findMaterial(result, "Конструкционная доска");

    expect(framing).toMatchObject({ quantity: 100, withReserve: 105, purchaseQty: 108 });
    expect(framing?.packageInfo).toEqual({ count: 18, size: 6, packageUnit: "досок" });
    expect(result.totals.framingPurchaseBoards).toBe(18);
  });

  it("не назначает стойки, обвязку, сечения и метраж из одного периметра", () => {
    const result = calc({});

    expect(findMaterial(result, "Стойки каркаса")).toBeUndefined();
    expect(findMaterial(result, "Обвязка")).toBeUndefined();
    expect(result.totals.studs).toBeUndefined();
    expect(result.totals.studStep).toBeUndefined();
  });

  it("может полностью отключить наружную обшивку", () => {
    const result = calc({ outerSheathingEnabled: 0 });

    expect(findMaterial(result, "Наружная листовая обшивка")).toBeUndefined();
    expect(result.scenarios).toBeUndefined();
    expect(result.totals.outerSheets).toBe(0);
  });

  it("считает внутреннюю обшивку только после включения", () => {
    const disabled = calc({});
    const enabled = calc({
      innerSheathingEnabled: 1,
      innerSheetAreaM2: 3,
      innerSheathingLayers: 2,
      innerSheathingReservePercent: 10,
    });
    const inner = findMaterial(enabled, "Внутренняя листовая обшивка");

    expect(findMaterial(disabled, "Внутренняя листовая обшивка")).toBeUndefined();
    expect(inner).toMatchObject({ quantity: 162, withReserve: 178.2, purchaseQty: 180 });
    expect(inner?.packageInfo).toEqual({ count: 60, size: 3, packageUnit: "листов" });
  });

  it("округляет утеплитель по площади упаковки выбранной толщины", () => {
    const result = calc({
      insulationEnabled: 1,
      insulationPackageAreaM2: 5.76,
      insulationLayers: 2,
      insulationReservePercent: 5,
    });
    const insulation = findMaterial(result, "Утеплитель принятой");

    expect(insulation).toMatchObject({ quantity: 162, withReserve: 170.1, purchaseQty: 172.8 });
    expect(insulation?.packageInfo).toEqual({ count: 30, size: 5.76, packageUnit: "упаковок" });
  });

  it("не выдаёт утеплитель без данных упаковки", () => {
    const result = calc({ insulationEnabled: 1 });

    expect(findMaterial(result, "Утеплитель принятой")).toBeUndefined();
    expect(result.warnings.some((warning) => warning.includes("площадь упаковки"))).toBe(true);
  });

  it("считает пароизоляцию и наружную мембрану раздельно", () => {
    const result = calc({
      vaporBarrierEnabled: 1,
      vaporRollAreaM2: 75,
      vaporLayers: 1,
      vaporReservePercent: 15,
      windBarrierEnabled: 1,
      windRollAreaM2: 50,
      windLayers: 2,
      windReservePercent: 10,
    });

    expect(findMaterial(result, "Пароизоляционный слой")?.packageInfo).toEqual({
      count: 2,
      size: 75,
      packageUnit: "рулонов",
    });
    expect(findMaterial(result, "Наружная защитная мембрана")?.packageInfo).toEqual({
      count: 4,
      size: 50,
      packageUnit: "рулонов",
    });
  });

  it("ленту считает только по проектной длине и длине рулона", () => {
    const result = calc({ tapeProjectM: 100, tapeReservePercent: 10, tapeRollLengthM: 25 });
    const tape = findMaterial(result, "Системная лента");

    expect(tape).toMatchObject({ quantity: 100, withReserve: 110, purchaseQty: 125 });
    expect(tape?.packageInfo).toEqual({ count: 5, size: 25, packageUnit: "рулонов" });
  });

  it("не выводит универсальные два рулона ленты на каждую мембрану", () => {
    const result = calc({ vaporBarrierEnabled: 1, vaporRollAreaM2: 75 });

    expect(findMaterial(result, "Системная лента")).toBeUndefined();
    expect(result.totals.tapeRolls).toBe(0);
  });

  it("крепёж округляет только из проектного количества и фактической фасовки", () => {
    const result = calc({
      sheathingFastenersProjectPcs: 1000,
      sheathingFastenersReservePercent: 5,
      sheathingFastenersPackagePcs: 200,
      framingFastenersProjectPcs: 450,
      framingFastenersReservePercent: 10,
      framingFastenersPackagePcs: 100,
    });

    expect(findMaterial(result, "Крепёж листовой обшивки")?.packageInfo).toEqual({
      count: 6,
      size: 200,
      packageUnit: "упаковок",
    });
    expect(findMaterial(result, "Крепёж соединений каркаса")?.packageInfo).toEqual({
      count: 5,
      size: 100,
      packageUnit: "упаковок",
    });
  });

  it("не назначает вид и число крепежа по числу листов", () => {
    const result = calc({});

    expect(findMaterial(result, "Крепёж листовой обшивки")).toBeUndefined();
    expect(findMaterial(result, "Гвозди ершёные")).toBeUndefined();
    expect(result.totals.screwsKg).toBeUndefined();
  });

  it("скрытый режим точности не меняет проектную закупку", () => {
    const basic = frameHouseDef.calculate({ accuracyMode: "basic" as never });
    const professional = frameHouseDef.calculate({ accuracyMode: "professional" as never });

    expect(professional.materials).toEqual(basic.materials);
    expect(professional.scenarios).toEqual(basic.scenarios);
    expect(professional.accuracyExplanation?.combinedMultiplier).toBe(1);
  });

  it("UI и SEO явно показывают проектную границу и актуальный СП", () => {
    expect(frameHouseDef.h1).toContain("по проектной ведомости");
    expect(frameHouseDef.description).toContain("готовые проектные количества");
    expect(frameHouseDef.formulaDescription).toContain("не назначает несущую схему");
    expect(frameHouseDef.seoContent?.descriptionHtml).toContain("СП 50.13330.2024");
    expect(frameHouseDef.seoContent?.descriptionHtml).not.toContain("СП 50.13330.2012");
    expect(frameHouseDef.faq?.some((item) => item.answer.includes("теплотехническим расчётом"))).toBe(true);
  });

  it("поля упаковок скрыты до включения соответствующей позиции", () => {
    const insulationPackage = frameHouseDef.fields.find((field) => field.key === "insulationPackageAreaM2");
    const vaporRoll = frameHouseDef.fields.find((field) => field.key === "vaporRollAreaM2");
    const tapeRoll = frameHouseDef.fields.find((field) => field.key === "tapeRollLengthM");
    const fastenerPackage = frameHouseDef.fields.find((field) => field.key === "sheathingFastenersPackagePcs");

    expect(insulationPackage?.hideIf).toEqual({ key: "insulationEnabled", op: "eq", value: 0 });
    expect(vaporRoll?.hideIf).toEqual({ key: "vaporBarrierEnabled", op: "eq", value: 0 });
    expect(tapeRoll?.hideIf).toEqual({ key: "tapeProjectM", op: "eq", value: 0 });
    expect(fastenerPackage?.hideIf).toEqual({ key: "sheathingFastenersProjectPcs", op: "eq", value: 0 });
  });

  it("canonical evidence фиксирует действующую нормативную границу", () => {
    expect(frameHouseSpec.evidence.standards.map((item) => item.code)).toEqual(expect.arrayContaining([
      "СП 64.13330.2017",
      "СП 20.13330.2016",
      "СП 50.13330.2024",
      "ГОСТ Р 70876-2023",
      "ГОСТ 32567-2013",
    ]));
    expect(frameHouseSpec.field_factors.enabled).toEqual([]);
  });

  it("сохраняет общие инварианты результата", () => {
    const result = calc({
      surfaceAreaBasis: 1,
      framingProjectLengthM: 180,
      innerSheathingEnabled: 1,
      insulationEnabled: 1,
      insulationPackageAreaM2: 5.76,
      vaporBarrierEnabled: 1,
      vaporRollAreaM2: 75,
      windBarrierEnabled: 1,
      windRollAreaM2: 75,
      tapeProjectM: 120,
      tapeRollLengthM: 25,
      sheathingFastenersProjectPcs: 1500,
      sheathingFastenersPackagePcs: 500,
    });

    checkInvariants(result);
  });
});
