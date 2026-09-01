import { describe, expect, it } from "vitest";
import { CATEGORY_INTRO } from "../category-intro";
import { ceilingCassetteDef } from "../formulas/ceiling-cassette";

const calc = ceilingCassetteDef.calculate.bind(ceilingCassetteDef);

const simpleInputs = {
  inputMode: 0,
  ceilingLengthM: 5,
  ceilingWidthM: 4,
  cassetteModuleLengthMm: 600,
  cassetteModuleWidthMm: 600,
  cassetteReservePercent: 0,
  cassettesPerPack: 1,
};

const findMaterial = (
  result: ReturnType<typeof calc>,
  namePart: string,
) => result.materials.find((material) => material.name.includes(namePart));

describe("Кассетный потолок — модульная раскладка и проектная ведомость", () => {
  it("считает позиции простой прямоугольной сетки по фактическому модулю", () => {
    const result = calc(simpleInputs);

    expect(result.formulaVersion).toBe("ceiling-cassette-web-layout-v1");
    expect(result.canonicalSpecId).toBe("ceiling-cassette");
    expect(result.materials).toHaveLength(1);
    expect(result.materials[0]).toMatchObject({
      name: "Кассеты по простой модульной раскладке",
      quantity: 63,
      unit: "шт",
      withReserve: 63,
      purchaseQty: 63,
      packageInfo: { count: 63, size: 1, packageUnit: "кассет" },
    });
    expect(result.totals).toMatchObject({
      area: 20,
      gridColumns: 9,
      gridRows: 7,
      layoutCassettePieces: 63,
      requiredCassettePieces: 63,
      purchaseCassettePieces: 63,
      cassettePacks: 63,
      cassettePurchasedSurplusPieces: 0,
    });
  });

  it("показывает симметричные подрезки, не меняя число модульных позиций", () => {
    const result = calc({
      ...simpleInputs,
      ceilingLengthM: 4.32,
      ceilingWidthM: 2.7,
    });

    expect(result.totals).toMatchObject({
      gridColumns: 8,
      gridRows: 5,
      layoutCassettePieces: 40,
      fullColumns: 6,
      fullRows: 3,
      borderCutLengthMm: 360,
      borderCutWidthMm: 450,
    });
    expect(result.practicalNotes?.[0]).toContain("по 360 мм вдоль длины");
    expect(result.practicalNotes?.[0]).toContain("по 450 мм вдоль ширины");
  });

  it("использует оба фактических размера монтажного модуля", () => {
    const square600 = calc(simpleInputs);
    const square625 = calc({
      ...simpleInputs,
      cassetteModuleLengthMm: 625,
      cassetteModuleWidthMm: 625,
    });
    const rectangular = calc({
      ...simpleInputs,
      cassetteModuleLengthMm: 600,
      cassetteModuleWidthMm: 1200,
    });

    expect(square600.totals.layoutCassettePieces).toBe(63);
    expect(square625.totals.layoutCassettePieces).toBe(56);
    expect(rectangular.totals.layoutCassettePieces).toBe(36);
  });

  it("применяет явный запас один раз и округляет по фактической упаковке", () => {
    const result = calc({
      ...simpleInputs,
      cassetteReservePercent: 10,
      cassettesPerPack: 12,
    });

    expect(result.totals.layoutCassettePieces).toBe(63);
    expect(result.totals.requiredCassettePieces).toBe(70);
    expect(result.totals.cassettePacks).toBe(6);
    expect(result.totals.purchaseCassettePieces).toBe(72);
    expect(result.totals.cassettePurchasedSurplusPieces).toBe(9);
  });

  it("принимает готовое число кассет для сложной раскладки", () => {
    const result = calc({
      inputMode: 1,
      projectCeilingAreaM2: 18.5,
      projectCassettePieceCount: 62,
      cassetteReservePercent: 5,
      cassettesPerPack: 10,
    });

    expect(result.materials[0].name).toBe(
      "Кассеты по проектной ведомости",
    );
    expect(result.totals).toMatchObject({
      area: 18.5,
      gridColumns: 0,
      gridRows: 0,
      layoutCassettePieces: 62,
      requiredCassettePieces: 66,
      cassettePacks: 7,
      purchaseCassettePieces: 70,
    });
  });

  it("добавляет главные направляющие только по проектной длине", () => {
    const result = calc({
      ...simpleInputs,
      mainRunnerEnabled: 1,
      projectMainRunnerLengthM: 16.8,
      mainRunnerReservePercent: 5,
      mainRunnerPieceLengthM: 3.6,
    });

    expect(findMaterial(result, "Главные направляющие")).toMatchObject({
      quantity: 16.8,
      unit: "м",
      withReserve: 17.64,
      purchaseQty: 18,
      packageInfo: { count: 5, size: 3.6, packageUnit: "направляющих" },
    });
  });

  it("добавляет первый тип поперечных профилей готовым количеством", () => {
    const result = calc({
      ...simpleInputs,
      crossProfileAEnabled: 1,
      projectCrossProfileACount: 28,
      crossProfileAReservePercent: 5,
      crossProfilesAPerPack: 10,
    });

    expect(findMaterial(result, "Поперечные профили — тип 1")).toMatchObject({
      quantity: 28,
      unit: "шт",
      withReserve: 30,
      purchaseQty: 30,
      packageInfo: { count: 3, size: 10, packageUnit: "упаковок" },
    });
  });

  it("добавляет второй тип поперечных профилей независимо", () => {
    const result = calc({
      ...simpleInputs,
      crossProfileBEnabled: 1,
      projectCrossProfileBCount: 24,
      crossProfileBReservePercent: 5,
      crossProfilesBPerPack: 10,
    });

    expect(findMaterial(result, "Поперечные профили — тип 2")).toMatchObject({
      quantity: 24,
      unit: "шт",
      withReserve: 26,
      purchaseQty: 30,
      packageInfo: { count: 3, size: 10, packageUnit: "упаковок" },
    });
  });

  it("добавляет периметральный профиль только по измеренной длине", () => {
    const result = calc({
      ...simpleInputs,
      perimeterEnabled: 1,
      projectPerimeterLengthM: 18.4,
      perimeterReservePercent: 5,
      perimeterPieceLengthM: 3,
    });

    expect(findMaterial(result, "Периметральный профиль")).toMatchObject({
      quantity: 18.4,
      unit: "м",
      withReserve: 19.32,
      purchaseQty: 21,
      packageInfo: { count: 7, size: 3, packageUnit: "профилей" },
    });
  });

  it("принимает подвесы готовым количеством из ведомости", () => {
    const result = calc({
      ...simpleInputs,
      hangerEnabled: 1,
      projectHangerCount: 18,
      hangersPerPack: 10,
    });

    expect(findMaterial(result, "Подвесы по проектной ведомости")).toMatchObject({
      quantity: 18,
      unit: "шт",
      withReserve: 18,
      purchaseQty: 20,
      packageInfo: { count: 2, size: 10, packageUnit: "упаковок" },
    });
  });

  it("не назначает профили, подвесы и крепёж автоматически", () => {
    const result = calc(simpleInputs);
    const names = result.materials.map((material) => material.name).join(" ");

    expect(result.materials).toHaveLength(1);
    expect(names).not.toMatch(/Главн|Поперечн|Подвес|Углов|Анкер|Саморез/);
  });

  it("не добавляет скрытые сценарные и accuracy-множители", () => {
    const result = calc({
      ...simpleInputs,
      cassetteReservePercent: 0,
      accuracyMode: "professional" as unknown as number,
    });

    expect(result.scenarios?.MIN).toEqual(result.scenarios?.REC);
    expect(result.scenarios?.REC).toEqual(result.scenarios?.MAX);
    expect(result.accuracyExplanation?.combinedMultiplier).toBe(1);
    expect(result.scenarios?.REC.key_factors.hidden_multiplier).toBe(1);
  });

  it("скрывает геометрию и проектные блоки до выбора режима", () => {
    const field = (key: string) =>
      ceilingCassetteDef.fields.find((item) => item.key === key);

    expect(field("ceilingLengthM")?.hideIf).toEqual({
      key: "inputMode",
      op: "eq",
      value: 1,
    });
    expect(field("projectCassettePieceCount")?.hideIf).toEqual({
      key: "inputMode",
      op: "eq",
      value: 0,
    });
    expect(field("projectMainRunnerLengthM")?.hideIf).toEqual({
      key: "mainRunnerEnabled",
      op: "eq",
      value: 0,
    });
    expect(field("projectCrossProfileACount")?.hideIf).toEqual({
      key: "crossProfileAEnabled",
      op: "eq",
      value: 0,
    });
    expect(field("projectPerimeterLengthM")?.hideIf).toEqual({
      key: "perimeterEnabled",
      op: "eq",
      value: 0,
    });
    expect(field("projectHangerCount")?.hideIf).toEqual({
      key: "hangerEnabled",
      op: "eq",
      value: 0,
    });
  });

  it("удаляет старые поля площади и условного типоразмера", () => {
    const keys = ceilingCassetteDef.fields.map((field) => field.key);

    expect(keys).not.toContain("area");
    expect(keys).not.toContain("cassetteSize");
    expect(keys).not.toContain("roomLength");
    expect(keys).toContain("cassetteModuleLengthMm");
    expect(keys).toContain("cassetteModuleWidthMm");
    expect(keys).toContain("cassetteReservePercent");
  });

  it("не обещает универсальный бренд, каркас, стоимость и высоту", () => {
    expect(ceilingCassetteDef.h1).toBe(
      "Калькулятор кассетного потолка — раскладка и проектные материалы",
    );
    expect(ceilingCassetteDef.description).not.toMatch(/Armstrong|Т-24|стоимост/i);
    expect(ceilingCassetteDef.metaDescription).not.toMatch(
      /Armstrong|Т-24|стоимост|120 мм/i,
    );
  });

  it("ссылается на профильный ГОСТ и документацию реальных систем", () => {
    const html = ceilingCassetteDef.seoContent?.descriptionHtml ?? "";

    expect(html).toContain(
      "https://protect.gost.ru/gost/details/346d371b-7eb7-4be0-a7da-d18a7758931b",
    );
    expect(html).toContain(
      "https://protect.gost.ru/sp/details/ca915ed9-5bce-4de4-94af-debfd041a939",
    );
    expect(html).toContain(
      "https://albes.ru/catalog/kassetnye-potolki/otkrytaya-podvesnaya-sistema/c-otkrytoy-podvesnoy-sistemoy-albes/",
    );
    expect(html).toContain(
      "https://www.knaufceilingsolutions.com/fileadmin/knaufceilingsolutions/01_products/01_mineral/installation_guides/india/IG_Installation_Manual_Mineral_KCS_EN_IN.pdf",
    );
    expect(CATEGORY_INTRO.ceiling.standards.join(" ")).toContain(
      "ГОСТ Р 70939",
    );
  });
});
