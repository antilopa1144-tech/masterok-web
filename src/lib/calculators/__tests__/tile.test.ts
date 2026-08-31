import { describe, expect, it } from "vitest";
import tileFixture from "../../../../tests/fixtures/tile-canonical-parity.json";
import { tileDef } from "../formulas/tile";
import { findMaterial, checkInvariants, withBasicAccuracy } from "./_helpers";

const calc = withBasicAccuracy(tileDef.calculate.bind(tileDef));

describe("Калькулятор плитки", () => {
  it("декларирует formulaVersion для canonical tile", () => {
    expect(tileDef.formulaVersion).toBe("tile-canonical-v3");
  });

  describe("Canonical tile fixture parity", () => {
    for (const fixtureCase of tileFixture.cases) {
      it(fixtureCase.id, () => {
        const result = calc(fixtureCase.inputs as unknown as Record<string, number>);
        const expected = fixtureCase.expected;

        expect(result.formulaVersion).toBe(expected.formulaVersion);
        expect(result.totals.area).toBeCloseTo(expected.area, 2);
        expect(result.totals.wastePercent).toBeCloseTo(expected.wastePercent, 2);
        expect(result.warnings).toHaveLength(expected.warningsCount + 1);
        expect(result.warnings.some((warning) => warning.includes("предварительные позиции общей модели"))).toBe(true);

        const recScenario = result.scenarios!.REC;
        expect(recScenario.buy_plan.package_size).toBe(expected.recScenario.packageSize);
        expect(recScenario.exact_need).toBeCloseTo(expected.recScenario.exactNeed, 5);
        expect(recScenario.purchase_quantity).toBeCloseTo(expected.recScenario.purchaseQuantity, 5);

        expect(findMaterial(result, "Плитка")?.purchaseQty).toBe(expected.materials.tiles);
        expect(findMaterial(result, "Плитка")?.packageInfo?.count).toBe(expected.materials.tilePackages);
        expect(findMaterial(result, "Плиточный клей")?.purchaseQty).toBe(expected.materials.glueBags);
        expect(findMaterial(result, "Затирка")?.purchaseQty).toBe(expected.materials.groutBags);
        const _pm = findMaterial(result, 'Грунтовка'); expect(_pm).toBeTruthy(); expect(_pm!.purchaseQty).toBeGreaterThan(0);

        if (expected.materials.crosses !== undefined) {
          expect(findMaterial(result, "Крестики")?.purchaseQty).toBe(expected.materials.crosses);
        }
        if (expected.materials.svpPackages !== undefined) {
          expect(findMaterial(result, "СВП")?.purchaseQty).toBe(expected.materials.svpPackages);
        }

        checkInvariants(result);
      });
    }
  });

  it("округляет плитку до полных коробок, сохраняя точную потребность в штуках", () => {
    const result = calc({
      inputMode: 1,
      area: 12,
      tileWidth: 300,
      tileHeight: 300,
      packArea: 1.44,
      layingMethod: 0,
      roomComplexity: 0,
    });

    const tile = findMaterial(result, "Плитка");
    expect(result.scenarios?.REC.exact_need).toBeCloseTo(146.666667, 5);
    expect(result.scenarios?.REC.buy_plan.package_size).toBe(16);
    expect(result.scenarios?.REC.buy_plan.packages_count).toBe(10);
    expect(result.scenarios?.REC.purchase_quantity).toBe(160);
    expect(tile?.packageInfo).toEqual({ count: 10, size: 16, packageUnit: "упаковок" });
    expect(tile?.purchaseQty).toBe(160);
  });

  it("использует количество плиток с этикетки вместо вывода из площади", () => {
    const result = calc({
      inputMode: 1,
      area: 10,
      tileWidth: 600,
      tileHeight: 300,
      packagingMode: 1,
      tilesPerPackage: 10,
      packArea: 1.44,
      layingMethod: 0,
      roomComplexity: 0,
    });

    const tile = findMaterial(result, "Плитка");
    expect(result.scenarios?.REC.buy_plan.package_size).toBe(10);
    expect(result.scenarios?.REC.buy_plan.packages_count).toBe(7);
    expect(result.scenarios?.REC.purchase_quantity).toBe(70);
    expect(result.totals.packArea).toBe(1.8);
    expect(result.totals.packagingSource).toBe(1);
    expect(result.scenarios?.REC.assumptions).toContain("packaging_source:label");
    expect(tile?.subtitle).toContain("По этикетке: 10 шт.");
    expect(result.warnings.some((warning) => warning.includes("предварительной оценкой"))).toBe(false);
  });

  it("помечает старый расчёт по площади коробки как оценку", () => {
    const result = calc({
      inputMode: 1,
      area: 10,
      tileWidth: 600,
      tileHeight: 300,
      packagingMode: 0,
      packArea: 1.44,
      layingMethod: 0,
      roomComplexity: 0,
    });

    expect(result.scenarios?.REC.buy_plan.package_size).toBe(8);
    expect(result.totals.packagingSource).toBe(0);
    expect(result.scenarios?.REC.assumptions).toContain("packaging_source:estimated");
    expect(findMaterial(result, "Плитка")?.subtitle).toContain("Оценка по площади коробки");
    expect(result.warnings.some((warning) => warning.includes("предварительной оценкой"))).toBe(true);
  });

  it("добавляет предупреждение для диагональной укладки", () => {
    const result = calc({
      inputMode: 1,
      area: 12,
      tileWidth: 300,
      tileHeight: 300,
      layingMethod: 1,
      jointWidth: 3,
    });

    expect(result.warnings.some((warning) => warning.includes("Диагональная"))).toBe(true);
  });

  it("показывает поддерживаемую canonical-раскладку ёлочкой в web-форме", () => {
    const method = tileDef.fields.find((field) => field.key === "layingMethod");
    const result = calc({
      inputMode: 1,
      area: 40,
      tileWidth: 200,
      tileHeight: 600,
      layingMethod: 3,
      roomComplexity: 0,
    });

    expect(method?.options?.some((option) => option.value === 3 && option.label.includes("Ёлочка"))).toBe(true);
    expect(result.totals.layoutPattern).toBe(4);
    expect(result.totals.wastePercent).toBe(20);
    expect(result.warnings.some((warning) => warning.toLowerCase().includes("ёлоч"))).toBe(true);
  });

  it("добавляет предупреждение для крупного формата", () => {
    const result = calc({
      inputMode: 1,
      area: 20,
      tileWidth: 800,
      tileHeight: 800,
      layingMethod: 0,
      jointWidth: 3,
    });

    expect(result.warnings.some((warning) => warning.includes("Крупный формат"))).toBe(true);
    const glue = findMaterial(result, "Плиточный клей усиленный для крупного формата");
    expect(glue?.subtitle).toContain("800×800 мм");
    expect(findMaterial(result, "Система выравнивания плитки (СВП), клипса 3 мм")).toBeDefined();
    expect(result.warnings.some((warning) => warning.includes("двойного нанесения клея"))).toBe(false);
    expect(result.practicalNotes?.some((note) => note.includes("обязательно"))).toBe(false);
  });

  it("конкретизирует затирку, крестики и герметик по введённому шву", () => {
    const result = calc({
      inputMode: 1,
      area: 12,
      tileWidthCm: 30,
      tileHeightCm: 30,
      jointWidth: 2,
    });

    expect(findMaterial(result, "Затирка цементная для шва 2 мм")?.subtitle).toContain("влажных зон");
    expect(findMaterial(result, "Крестики для плитки 2 мм")?.subtitle).toContain("ширине шва");
    expect(findMaterial(result, "силиконовый герметик")?.name).toContain("280–310 мл");
  });

  it("не приписывает бренд плитки клею и расходникам", () => {
    const result = calc({
      inputMode: 1,
      area: 12,
      tileWidth: 300,
      tileHeight: 300,
      layingMethod: 0,
      roomComplexity: 0,
      manufacturer: 1,
    });

    expect(findMaterial(result, "Плитка")?.name).toContain("Kerama Marazzi");
    expect(findMaterial(result, "Плиточный клей")?.name).not.toContain("Kerama Marazzi");
    expect(findMaterial(result, "Крестики")?.name).not.toContain("Kerama Marazzi");
    expect(result.warnings.some((warning) => warning.includes("не загружает его конкретную коллекцию"))).toBe(true);
    expect(tileDef.fields.find((field) => field.key === "manufacturer")?.hint).toContain("бренд только к названию");
  });

  it("раскрывает коэффициенты условной сопутствующей ведомости", () => {
    const result = calc({
      inputMode: 1,
      area: 12,
      tileWidth: 300,
      tileHeight: 300,
      jointWidth: 2,
      jointDepth: 6,
      layingMethod: 0,
      roomComplexity: 0,
    });

    expect(findMaterial(result, "Плитка")?.subtitle).toContain("базовый запас раскладки 10%");
    expect(findMaterial(result, "Плиточный клей")?.subtitle).toContain("4 кг/м²");
    expect(findMaterial(result, "Затирка")?.subtitle).toContain("1600 кг/м³ × 1,10");
    expect(findMaterial(result, "Грунтовка")?.subtitle).toContain("0,15 л/м²");
    expect(findMaterial(result, "Крестики")?.subtitle).toContain("1 элемент на каждую плитку");
    expect(findMaterial(result, "герметик")?.subtitle).toContain("1 туба на 15 м²");
    expect(result.warnings.some((warning) => warning.includes("предварительные позиции общей модели"))).toBe(true);
  });

  it("использует текущие стандарты и первичные карточки без универсальных обещаний СВП", () => {
    const html = tileDef.seoContent?.descriptionHtml ?? "";
    const faq = tileDef.seoContent?.faq.map((item) => item.answer).join(" ") ?? "";

    expect(html).toContain("ГОСТ 13996-2019 с поправкой 2023 года");
    expect(html).toContain("ГОСТ Р 56387-2018");
    expect(html).toContain("ceresit.ru/ru/products/tiling/tile-adhesives/cm-16");
    expect(html).toContain("ceresit.ru/ru/products/tiling/grouts-and-sealants/ce_40_aquastatic");
    expect(html).not.toContain("снижает перепады между плитками на 50");
    expect(faq).not.toContain("6&ndash;8 шт/м&sup2;");
    expect(faq).not.toContain("толщина клеевого слоя после прижатия");
  });
});
