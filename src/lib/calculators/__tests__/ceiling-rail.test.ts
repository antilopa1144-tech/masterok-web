import { describe, expect, it } from "vitest";
import { CATEGORY_INTRO } from "../category-intro";
import { ceilingRailDef } from "../formulas/ceiling-rail";

const calc = ceilingRailDef.calculate.bind(ceilingRailDef);

const simpleInputs = {
  inputMode: 0,
  railRunLengthM: 3,
  railFieldWidthM: 2,
  railModuleWidthMm: 100,
  railPieceLengthM: 3,
  railReservePercent: 0,
  railPiecesPerPack: 1,
};

const findMaterial = (
  result: ReturnType<typeof calc>,
  namePart: string,
) => result.materials.find((material) => material.name.includes(namePart));

describe("Реечный потолок — раскладка и явная проектная ведомость", () => {
  it("считает простой прямоугольник по направлению реек и фактическому модулю", () => {
    const result = calc(simpleInputs);

    expect(result.formulaVersion).toBe("ceiling-rail-web-layout-v1");
    expect(result.canonicalSpecId).toBe("ceiling-rail");
    expect(result.materials).toHaveLength(1);
    expect(result.materials[0]).toMatchObject({
      name: "Потолочные рейки по простой раскладке",
      quantity: 20,
      unit: "шт",
      withReserve: 20,
      purchaseQty: 20,
      packageInfo: { count: 20, size: 1, packageUnit: "реек" },
    });
    expect(result.totals).toMatchObject({
      area: 6,
      railRows: 20,
      railPiecesPerRow: 1,
      layoutRailPieces: 20,
      exactRailLengthM: 60,
      purchaseRailPieces: 20,
      purchaseRailLengthM: 60,
      railPurchasedSurplusLengthM: 0,
    });
  });

  it("не объединяет обрезки разных рядов в фиктивную общую длину", () => {
    const result = calc({
      ...simpleInputs,
      railRunLengthM: 5,
      railFieldWidthM: 4,
      railPieceLengthM: 3,
    });

    expect(result.totals.railRows).toBe(40);
    expect(result.totals.railPiecesPerRow).toBe(2);
    expect(result.totals.layoutRailPieces).toBe(80);
    expect(result.totals.exactRailLengthM).toBe(200);
    expect(result.totals.layoutStockLengthM).toBe(240);
    expect(result.totals.layoutOffcutLengthM).toBe(40);
    expect(result.warnings.some((warning) => warning.includes("стык"))).toBe(true);
  });

  it("использует фактический монтажный модуль, а не условное название ширины", () => {
    const module100 = calc({ ...simpleInputs, railModuleWidthMm: 100 });
    const module125 = calc({ ...simpleInputs, railModuleWidthMm: 125 });

    expect(module100.totals.railRows).toBe(20);
    expect(module125.totals.railRows).toBe(16);
    expect(ceilingRailDef.fields.map((field) => field.key)).not.toContain("railWidth");
  });

  it("применяет явный запас один раз и округляет по фактической упаковке", () => {
    const result = calc({
      ...simpleInputs,
      railRunLengthM: 5,
      railFieldWidthM: 4,
      railPieceLengthM: 3,
      railReservePercent: 10,
      railPiecesPerPack: 10,
    });

    expect(result.totals.layoutRailPieces).toBe(80);
    expect(result.totals.requiredRailPieces).toBe(88);
    expect(result.totals.railPacks).toBe(9);
    expect(result.totals.purchaseRailPieces).toBe(90);
    expect(result.totals.purchaseRailLengthM).toBe(270);
    expect(result.totals.railPurchasedSurplusLengthM).toBe(70);
  });

  it("принимает готовое число реек для сложной или диагональной раскладки", () => {
    const result = calc({
      inputMode: 1,
      projectCeilingAreaM2: 18.5,
      projectRailPieceCount: 62,
      railPieceLengthM: 3.5,
      railReservePercent: 5,
      railPiecesPerPack: 10,
    });

    expect(result.materials[0].name).toBe(
      "Потолочные рейки по проектной ведомости",
    );
    expect(result.totals).toMatchObject({
      area: 18.5,
      railRows: 0,
      layoutRailPieces: 62,
      requiredRailPieces: 66,
      railPacks: 7,
      purchaseRailPieces: 70,
      purchaseRailLengthM: 245,
    });
  });

  it("добавляет несущие направляющие только по проектной длине", () => {
    const result = calc({
      ...simpleInputs,
      carrierEnabled: 1,
      projectCarrierLengthM: 16.8,
      carrierReservePercent: 5,
      carrierPieceLengthM: 3,
    });

    expect(findMaterial(result, "Несущие направляющие")).toMatchObject({
      quantity: 16.8,
      unit: "м",
      withReserve: 17.64,
      purchaseQty: 18,
      packageInfo: { count: 6, size: 3, packageUnit: "направляющих" },
    });
  });

  it("добавляет периметральный профиль только по измеренной длине", () => {
    const result = calc({
      ...simpleInputs,
      perimeterEnabled: 1,
      projectPerimeterLengthM: 10,
      perimeterReservePercent: 5,
      perimeterPieceLengthM: 3,
    });

    expect(findMaterial(result, "Периметральный профиль")).toMatchObject({
      quantity: 10,
      unit: "м",
      withReserve: 10.5,
      purchaseQty: 12,
      packageInfo: { count: 4, size: 3, packageUnit: "профилей" },
    });
  });

  it("добавляет раскладку или вставку только по проектной длине", () => {
    const result = calc({
      ...simpleInputs,
      insertEnabled: 1,
      projectInsertLengthM: 58,
      insertReservePercent: 5,
      insertPieceLengthM: 3,
    });

    expect(findMaterial(result, "Раскладка или вставка")).toMatchObject({
      quantity: 58,
      unit: "м",
      withReserve: 60.9,
      purchaseQty: 63,
      packageInfo: { count: 21, size: 3, packageUnit: "элементов" },
    });
  });

  it("принимает монтажные элементы готовым количеством из ведомости", () => {
    const result = calc({
      ...simpleInputs,
      mountingEnabled: 1,
      projectMountingItemCount: 13,
      mountingItemsPerPack: 10,
    });

    expect(findMaterial(result, "Монтажные элементы")).toMatchObject({
      quantity: 13,
      unit: "шт",
      withReserve: 13,
      purchaseQty: 20,
      packageInfo: { count: 2, size: 10, packageUnit: "упаковок" },
    });
  });

  it("не назначает стрингеры, подвесы, саморезы и анкеры автоматически", () => {
    const result = calc(simpleInputs);
    const names = result.materials.map((material) => material.name).join(" ");

    expect(result.materials).toHaveLength(1);
    expect(names).not.toMatch(/Т-профиль|стрингер|Подвес|Саморез|Анкер/);
  });

  it("не добавляет скрытые сценарные и accuracy-множители", () => {
    const result = calc({
      ...simpleInputs,
      railReservePercent: 0,
      accuracyMode: "professional" as unknown as number,
    });

    expect(result.scenarios?.MIN).toEqual(result.scenarios?.REC);
    expect(result.scenarios?.REC).toEqual(result.scenarios?.MAX);
    expect(result.accuracyExplanation?.combinedMultiplier).toBe(1);
    expect(result.scenarios?.REC.key_factors.hidden_multiplier).toBe(1);
  });

  it("скрывает поля геометрии и проектных блоков до выбора режима", () => {
    const field = (key: string) =>
      ceilingRailDef.fields.find((item) => item.key === key);

    expect(field("railRunLengthM")?.hideIf).toEqual({
      key: "inputMode",
      op: "eq",
      value: 1,
    });
    expect(field("projectRailPieceCount")?.hideIf).toEqual({
      key: "inputMode",
      op: "eq",
      value: 0,
    });
    expect(field("projectCarrierLengthM")?.hideIf).toEqual({
      key: "carrierEnabled",
      op: "eq",
      value: 0,
    });
    expect(field("projectPerimeterLengthM")?.hideIf).toEqual({
      key: "perimeterEnabled",
      op: "eq",
      value: 0,
    });
    expect(field("projectInsertLengthM")?.hideIf).toEqual({
      key: "insertEnabled",
      op: "eq",
      value: 0,
    });
    expect(field("projectMountingItemCount")?.hideIf).toEqual({
      key: "mountingEnabled",
      op: "eq",
      value: 0,
    });
  });

  it("удаляет старые поля площади и универсальных типоразмеров", () => {
    const keys = ceilingRailDef.fields.map((field) => field.key);

    expect(keys).not.toContain("area");
    expect(keys).not.toContain("railWidth");
    expect(keys).not.toContain("railLength");
    expect(keys).not.toContain("roomLength");
    expect(keys).toContain("railModuleWidthMm");
    expect(keys).toContain("railPieceLengthM");
    expect(keys).toContain("railReservePercent");
  });

  it("не обещает универсальные бренды, стоимость и комплектность", () => {
    expect(ceilingRailDef.h1).toBe(
      "Калькулятор реечного потолка — рейки и проектные материалы",
    );
    expect(ceilingRailDef.description).not.toMatch(/Armstrong|Cesal|стоимост/i);
    expect(ceilingRailDef.metaDescription).not.toMatch(/Armstrong|Cesal|стоимост/i);
  });

  it("ссылается на профильный ГОСТ и документацию реальных систем", () => {
    const html = ceilingRailDef.seoContent?.descriptionHtml ?? "";

    expect(html).toContain(
      "https://protect.gost.ru/gost/details/346d371b-7eb7-4be0-a7da-d18a7758931b",
    );
    expect(html).toContain(
      "https://protect.gost.ru/sp/details/ca915ed9-5bce-4de4-94af-debfd041a939",
    );
    expect(html).toContain("https://www.cesal.ru/products/diy/");
    expect(html).toContain(
      "https://albes.ru/upload/iblock/64e/up9uwbrp6ux7quz0k491p0uax20qae0a/Albes_Celling_block_2025_sayt.pdf",
    );
    expect(CATEGORY_INTRO.ceiling.standards.join(" ")).toContain(
      "ГОСТ Р 70939",
    );
  });
});
