import { describe, expect, it } from "vitest";
import { soundInsulationDef } from "../formulas/sound-insulation";
import { checkInvariants, findMaterial, withBasicAccuracy } from "./_helpers";

const calc = withBasicAccuracy(soundInsulationDef.calculate.bind(soundInsulationDef));

describe("Звукоизоляция — web product contract", () => {
  it("default считает только акустический материал по видимой фасовке", () => {
    const result = calc({});

    checkInvariants(result);
    expect(result.formulaVersion).toBe("sound-insulation-web-product-v1");
    expect(result.materials).toHaveLength(1);
    expect(result.totals.area).toBe(25);
    expect(result.totals.primaryNeedM2).toBe(25);
    expect(result.totals.primaryReservedM2).toBe(25);
    expect(result.totals.primaryPurchasePackages).toBe(5);
    expect(result.totals.primaryPurchasedM2).toBe(30);
    expect(result.totals.primaryLeftoverM2).toBe(5);

    const material = result.materials[0];
    expect(material.name).toContain("Акустический материал");
    expect(material.quantity).toBe(25);
    expect(material.withReserve).toBe(25);
    expect(material.purchaseQty).toBe(30);
    expect(material.packageInfo).toEqual({ count: 5, size: 6, packageUnit: "упаковок" });
  });

  it("применяет число слоёв и явный запас ровно один раз", () => {
    const result = calc({ area: 25, systemType: 0, acousticLayers: 2, reservePercent: 10, acousticPackCoverageM2: 6 });

    expect(result.totals.primaryNeedM2).toBe(50);
    expect(result.totals.primaryReservedM2).toBe(55);
    expect(result.totals.primaryPurchasePackages).toBe(10);
    expect(result.totals.primaryPurchasedM2).toBe(60);
    expect(result.totals.primaryLeftoverM2).toBe(5);
  });

  it("использует фактическую площадь упаковки акустического материала", () => {
    const result = calc({ area: 25, systemType: 3, acousticLayers: 1, reservePercent: 0, acousticPackCoverageM2: 12 });

    expect(result.totals.primaryPurchasePackages).toBe(3);
    expect(result.totals.primaryPurchasedM2).toBe(36);
    expect(result.materials[0].name).toContain("потолка");
  });

  it("панельную систему считает по рабочим размерам и упаковке", () => {
    const result = calc({ area: 30, systemType: 1, reservePercent: 0, panelWidthMm: 600, panelHeightMm: 1200, panelsPerPack: 4 });

    checkInvariants(result);
    expect(result.totals.panelWorkingAreaM2).toBe(0.72);
    expect(result.totals.primaryCleanItems).toBeCloseTo(41.666667, 5);
    expect(result.totals.primaryReservedItems).toBeCloseTo(41.666667, 5);
    expect(result.totals.primaryPurchasePackages).toBe(11);
    expect(result.totals.primaryPurchaseItems).toBe(44);
    expect(result.totals.primaryLeftoverItems).toBeCloseTo(2.333333, 5);

    const panels = findMaterial(result, "Панели выбранной системы")!;
    expect(panels.purchaseQty).toBe(44);
    expect(panels.packageInfo).toEqual({ count: 11, size: 4, packageUnit: "упаковок" });
  });

  it("плавающий пол считает только фактическую площадь рулона", () => {
    const result = calc({ area: 30, systemType: 2, reservePercent: 10, floorRollCoverageM2: 12.5 });

    checkInvariants(result);
    expect(result.materials).toHaveLength(1);
    expect(result.totals.primaryReservedM2).toBe(33);
    expect(result.totals.primaryPurchasePackages).toBe(3);
    expect(result.totals.primaryPurchasedM2).toBe(37.5);
    expect(result.totals.primaryLeftoverM2).toBe(4.5);
    expect(result.materials[0].name).toContain("плавающего пола");
  });

  it("добавляет обшивочные листы только после явного включения", () => {
    const result = calc({ area: 30, systemType: 0, sheetEnabled: 1, sheetLayers: 2, sheetLengthM: 2.5, sheetWidthM: 1.2, sheetReservePercent: 5 });

    const sheets = findMaterial(result, "Обшивочный лист")!;
    expect(sheets.quantity).toBe(20);
    expect(sheets.withReserve).toBe(21);
    expect(sheets.purchaseQty).toBe(21);
  });

  it("добавляет только введённые проектные позиции", () => {
    const result = calc({
      area: 25,
      systemType: 0,
      projectItemsEnabled: 1,
      projectProfileLengthM: 90,
      profileBarLengthM: 3,
      projectMountCount: 50,
      projectFastenerCount: 275,
      fastenersPerPack: 200,
      projectTapeLengthM: 43,
      tapeRollLengthM: 30,
      projectSealantCartridges: 6,
    });

    expect(findMaterial(result, "Профиль по проектной ведомости")!.purchaseQty).toBe(30);
    expect(findMaterial(result, "Виброузлы по проектной ведомости")!.purchaseQty).toBe(50);

    const fasteners = findMaterial(result, "Крепёж по проектной ведомости")!;
    expect(fasteners.quantity).toBe(275);
    expect(fasteners.purchaseQty).toBe(400);
    expect(fasteners.packageInfo?.count).toBe(2);

    const tape = findMaterial(result, "Лента по проектной ведомости")!;
    expect(tape.quantity).toBe(43);
    expect(tape.purchaseQty).toBe(60);
    expect(tape.packageInfo?.count).toBe(2);
    expect(findMaterial(result, "Герметик по проектной ведомости")!.purchaseQty).toBe(6);
  });

  it("не добавляет нулевые проектные позиции", () => {
    const result = calc({ area: 25, systemType: 0, projectItemsEnabled: 1 });

    expect(result.materials).toHaveLength(1);
    expect(findMaterial(result, "Профиль по проектной ведомости")).toBeUndefined();
    expect(findMaterial(result, "Герметик по проектной ведомости")).toBeUndefined();
  });

  it("смесь плавающего пола считает только по паспортному расходу", () => {
    const result = calc({ area: 30, systemType: 2, screedEnabled: 1, screedConsumptionKgM2: 20, screedReservePercent: 5, screedBagKg: 25 });

    const screed = findMaterial(result, "Смесь по паспортному расходу")!;
    expect(screed.quantity).toBe(600);
    expect(screed.withReserve).toBe(630);
    expect(screed.purchaseQty).toBe(650);
    expect(screed.packageInfo).toEqual({ count: 26, size: 25, packageUnit: "мешков" });
  });

  it("не подставляет старую универсальную систему материалов", () => {
    const result = calc({ area: 30, systemType: 0 });
    const names = result.materials.map((material) => material.name).join(" | ");

    expect(names).not.toContain("Потолочный профиль ПП");
    expect(names).not.toContain("Виброподвес");
    expect(names).not.toContain("саморезы для гипсокартона");
    expect(names).not.toContain("акустический герметик");
    expect(names).not.toContain("Уплотнительная виброизоляционная лента");
  });

  it("MIN/REC/MAX и режим точности не добавляют скрытый множитель", () => {
    const basic = soundInsulationDef.calculate({ area: 25, systemType: 0, acousticLayers: 1, reservePercent: 10, acousticPackCoverageM2: 6, accuracyMode: "basic" as unknown as number });
    const professional = soundInsulationDef.calculate({ area: 25, systemType: 0, acousticLayers: 1, reservePercent: 10, acousticPackCoverageM2: 6, accuracyMode: "professional" as unknown as number });

    expect(basic.scenarios?.MIN).toEqual(basic.scenarios?.REC);
    expect(basic.scenarios?.REC).toEqual(basic.scenarios?.MAX);
    expect(professional.scenarios).toEqual(basic.scenarios);
    expect(professional.totals.primaryReservedM2).toBe(27.5);
  });

  it("скрывает поля чужих товарных моделей", () => {
    const field = (key: string) => soundInsulationDef.fields.find((item) => item.key === key);

    expect(field("acousticPackCoverageM2")?.hideIf).toEqual([
      { key: "systemType", op: "eq", value: 1 },
      { key: "systemType", op: "eq", value: 2 },
    ]);
    expect(field("panelWidthMm")?.hideIf).toEqual({ key: "systemType", op: "ne", value: 1 });
    expect(field("floorRollCoverageM2")?.hideIf).toEqual({ key: "systemType", op: "ne", value: 2 });
    expect(field("sheetEnabled")?.hideIf).toEqual({ key: "systemType", op: "eq", value: 2 });
  });

  it("предупреждает о границах акустики, основания и монтажа", () => {
    const result = calc({ area: 25, systemType: 1 });
    const warnings = result.warnings.join(" ");

    expect(warnings).toContain("Rw");
    expect(warnings).toContain("основан");
    expect(warnings).toContain("MIN/REC/MAX");
    expect(warnings).toContain("комплектной системы");
  });

  it("SEO-контент ведёт на первичные источники и не обещает акустический результат", () => {
    const seo = soundInsulationDef.seoContent?.descriptionHtml ?? "";

    expect(soundInsulationDef.h1).toContain("фактической фасовке");
    expect(soundInsulationDef.metaDescription.startsWith("Бесплатный калькулятор")).toBe(true);
    expect(soundInsulationDef.metaDescription.toLowerCase()).toContain("рассчитайте");
    expect(seo).toContain("https://protect.gost.ru/sp/details/04d467f1-c956-4238-8bc6-a066ecb17990");
    expect(seo).toContain("https://protect.gost.ru/gost/details/1e7aea97-2a9d-4647-9ddc-7e466b85724a");
    expect(seo).toContain("https://www.knauf.ru/systems/peregorodki/s-112-dfh3ir/");
    expect(seo).toContain("https://www.acoustic.ru/productions/zips/zips_z4/");
    expect(seo).toContain("https://www.acoustic.ru/albom_solutions/flats/zvukoizolyaciya_pola_kvartiry/");
  });
});
