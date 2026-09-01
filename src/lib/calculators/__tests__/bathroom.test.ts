import { describe, expect, it } from "vitest";
import { bathroomDef } from "../formulas/bathroom";
import { checkInvariants, findMaterial, withBasicAccuracy } from "./_helpers";

const calc = withBasicAccuracy(bathroomDef.calculate.bind(bathroomDef));

const defaults = Object.fromEntries(
  bathroomDef.fields.map((field) => [field.key, field.defaultValue]),
);

describe("Калькулятор плитки для ванной", () => {
  it("считает пол и стены простой комнаты как две независимые позиции", () => {
    const result = calc(defaults);

    expect(result.formulaVersion).toBe("bathroom-web-tile-purchase-v1");
    expect(result.totals.floorAreaM2).toBeCloseTo(4.25, 6);
    expect(result.totals.grossWallAreaM2).toBeCloseTo(21, 6);
    expect(result.totals.wallAreaM2).toBeCloseTo(19.53, 6);
    expect(result.materials).toHaveLength(2);
    expect(findMaterial(result, "Напольная плитка")?.quantity).toBe(48);
    expect(findMaterial(result, "Напольная плитка")?.withReserve).toBe(52);
    expect(findMaterial(result, "Настенная плитка")?.quantity).toBe(326);
    expect(findMaterial(result, "Настенная плитка")?.withReserve).toBe(359);
    checkInvariants(result);
  });

  it("по умолчанию не выдумывает фасовку и показывает поштучную закупку", () => {
    const result = calc(defaults);
    const floor = findMaterial(result, "Напольная плитка");
    const wall = findMaterial(result, "Настенная плитка");

    expect(floor?.packageInfo).toBeUndefined();
    expect(wall?.packageInfo).toBeUndefined();
    expect(floor?.purchaseQty).toBe(52);
    expect(wall?.purchaseQty).toBe(359);
    expect(floor?.subtitle).toContain("фасовка не задана");
  });

  it("округляет каждую позицию по фактическому числу плиток в коробке", () => {
    const result = calc({
      ...defaults,
      floorPackagingMode: 1,
      floorTilesPerBox: 10,
      wallPackagingMode: 1,
      wallTilesPerBox: 25,
    });
    const floor = findMaterial(result, "Напольная плитка");
    const wall = findMaterial(result, "Настенная плитка");

    expect(floor?.packageInfo).toEqual({
      count: 6,
      size: 10,
      packageUnit: "коробок",
    });
    expect(floor?.purchaseQty).toBe(60);
    expect(wall?.packageInfo).toEqual({
      count: 15,
      size: 25,
      packageUnit: "коробок",
    });
    expect(wall?.purchaseQty).toBe(375);
    expect(result.totals.purchasePieces).toBe(435);
    checkInvariants(result);
  });

  it("применяет явный запас к теоретическому количеству ровно один раз", () => {
    const result = calc({
      ...defaults,
      inputMode: 1,
      floorAreaM2: 4.25,
      wallAreaM2: 0,
      includeWallTile: 0,
      floorTileWidthMm: 300,
      floorTileHeightMm: 300,
      floorAllowancePercent: 10,
    });

    expect(result.totals.floorTheoreticalPieces).toBeCloseTo(47.222222, 6);
    expect(result.totals.floorBasePieces).toBe(48);
    expect(result.totals.floorRequiredPieces).toBe(52);
    expect(result.scenarios?.REC.key_factors.hidden_multiplier).toBe(1);
  });

  it("поддерживает готовые площади и отключение одной позиции", () => {
    const result = calc({
      ...defaults,
      inputMode: 1,
      floorAreaM2: 10,
      includeWallTile: 0,
      floorTileWidthMm: 600,
      floorTileHeightMm: 600,
      floorAllowancePercent: 0,
      floorPackagingMode: 1,
      floorTilesPerBox: 4,
    });

    expect(result.materials).toHaveLength(1);
    expect(result.totals.floorBasePieces).toBe(28);
    expect(result.totals.floorRequiredPieces).toBe(28);
    expect(result.totals.floorBoxes).toBe(7);
    expect(result.totals.floorPurchasePieces).toBe(28);
    expect(result.totals.wallAreaM2).toBe(0);
  });

  it("ограничивает вычет проёмов площадью стен и объясняет это", () => {
    const result = calc({
      ...defaults,
      lengthM: 2,
      widthM: 2,
      heightM: 2,
      openingAreaM2: 100,
    });

    expect(result.totals.grossWallAreaM2).toBe(16);
    expect(result.totals.appliedOpeningAreaM2).toBe(16);
    expect(result.totals.wallAreaM2).toBe(0);
    expect(result.warnings.some((warning) => warning.includes("ограничен площадью стен"))).toBe(true);
  });

  it("не добавляет клей, затирку, гидроизоляцию и расходники", () => {
    const result = calc({
      ...defaults,
      floorPackagingMode: 1,
      wallPackagingMode: 1,
    });
    const names = result.materials.map((material) => material.name).join(" ");

    expect(names).not.toMatch(/клей|затир|гидроизоля|грунт|гермет|крест|лента/i);
    expect(result.warnings.some((warning) => warning.includes("автоматически не добавляются"))).toBe(true);
  });

  it("не скрывает дополнительный множитель в MIN/REC/MAX или режиме точности", () => {
    const basic = bathroomDef.calculate({ ...defaults, accuracyMode: "basic" as unknown as number });
    const realistic = bathroomDef.calculate({ ...defaults, accuracyMode: "realistic" as unknown as number });
    const professional = bathroomDef.calculate({ ...defaults, accuracyMode: "professional" as unknown as number });

    expect(basic.scenarios?.MIN).toEqual(basic.scenarios?.REC);
    expect(basic.scenarios?.REC).toEqual(basic.scenarios?.MAX);
    expect(realistic.totals.purchasePieces).toBe(basic.totals.purchasePieces);
    expect(professional.totals.purchasePieces).toBe(basic.totals.purchasePieces);
    expect(professional.accuracyExplanation?.combinedMultiplier).toBe(1);
  });

  it("соблюдает сценарный контракт exact_need → purchase_quantity → leftover", () => {
    const result = calc(defaults);
    const scenario = result.scenarios?.REC;

    expect(scenario?.exact_need).toBe(374);
    expect(scenario?.purchase_quantity).toBe(411);
    expect(scenario?.leftover).toBe(37);
    expect(scenario?.purchase_quantity).toBe(
      (scenario?.exact_need ?? 0) + (scenario?.leftover ?? 0),
    );
    expect(scenario?.buy_plan).toEqual({
      package_label: "bathroom-tile-pieces-by-position",
      package_size: 1,
      packages_count: 411,
      unit: "шт",
    });
  });

  it("сохраняет валидный нулевой результат, если обе позиции выключены", () => {
    const result = calc({
      ...defaults,
      includeFloorTile: 0,
      includeWallTile: 0,
    });

    expect(result.materials).toHaveLength(0);
    expect(result.totals.selectedAreaM2).toBe(0);
    expect(result.scenarios?.REC.exact_need).toBe(0);
    expect(result.scenarios?.REC.purchase_quantity).toBe(0);
    expect(result.warnings.some((warning) => warning.includes("Нет позиции к закупке"))).toBe(true);
  });

  it("объявляет условные поля для геометрии, готовых площадей и фасовок", () => {
    const byKey = new Map(bathroomDef.fields.map((field) => [field.key, field]));

    expect(byKey.get("lengthM")?.hideIf).toEqual({ key: "inputMode", op: "ne", value: 0 });
    expect(byKey.get("floorAreaM2")?.hideIf).toContainEqual({ key: "inputMode", op: "ne", value: 1 });
    expect(byKey.get("floorTilesPerBox")?.hideIf).toContainEqual({ key: "floorPackagingMode", op: "ne", value: 1 });
    expect(byKey.get("wallTilesPerBox")?.hideIf).toContainEqual({ key: "wallPackagingMode", op: "ne", value: 1 });
  });

  it("публикует границы расчёта, внутренние ссылки и первичные источники", () => {
    const html = bathroomDef.seoContent?.descriptionHtml ?? "";

    expect(bathroomDef.h1).toContain("плитки для ванной");
    expect(bathroomDef.metaDescription).toContain("рассчитайте");
    expect(html).toContain("ГОСТ 13996-2019");
    expect(html).toContain("СП 71.13330.2017");
    expect(html).toContain("kerama-marazzi.com/catalog/ceramic_tile/8376/");
    expect(html).toContain("/kalkulyatory/poly/klej-dlya-plitki/");
    expect(html).toContain("/kalkulyatory/poly/zatirka/");
    expect(html).toContain("/kalkulyatory/otdelka/gidroizolyaciya-vlagozaschita/");
    expect(html).not.toContain("5 кг/м²");
    expect(html).not.toContain("1,5 кг/м²");
  });
});
