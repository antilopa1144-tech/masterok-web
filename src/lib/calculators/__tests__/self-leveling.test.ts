import { describe, expect, it } from "vitest";
import { selfLevelingDef } from "../formulas/self-leveling";

const calc = selfLevelingDef.calculate.bind(selfLevelingDef);

const findMaterial = (namePart: string, inputs: Record<string, number>) =>
  calc(inputs).materials.find((material) => material.name.includes(namePart));

describe("Наливной пол — явный паспортный контракт", () => {
  it("считает только смесь по площади, средней толщине, паспортному расходу и мешку", () => {
    const result = calc({
      inputMode: 0,
      length: 5,
      width: 4,
      thickness: 10,
      productConsumptionKgPerM2Mm: 1.6,
      reservePercent: 0,
      bagWeightKg: 25,
    });

    expect(result.formulaVersion).toBe("self-leveling-web-purchase-v1");
    expect(result.canonicalSpecId).toBe("self-leveling");
    expect(result.materials).toHaveLength(1);
    expect(result.materials[0]).toMatchObject({
      quantity: 320,
      unit: "кг",
      withReserve: 320,
      purchaseQty: 325,
      packageInfo: { count: 13, size: 25, packageUnit: "мешков" },
    });
    expect(result.totals).toMatchObject({
      area: 20,
      exactMixKg: 320,
      requiredMixKg: 320,
      bagsNeeded: 13,
      purchaseMixKg: 325,
      leftoverMixKg: 5,
    });
  });

  it("применяет введённый запас один раз до округления мешков", () => {
    const result = calc({
      inputMode: 1,
      area: 20,
      thickness: 10,
      productConsumptionKgPerM2Mm: 1.6,
      reservePercent: 5,
      bagWeightKg: 25,
    });

    expect(result.totals.exactMixKg).toBe(320);
    expect(result.totals.requiredMixKg).toBe(336);
    expect(result.totals.bagsNeeded).toBe(14);
    expect(result.totals.purchaseMixKg).toBe(350);
    expect(result.totals.leftoverMixKg).toBe(14);
  });

  it("принимает готовую площадь без выдуманного квадратного периметра", () => {
    const result = calc({
      inputMode: 1,
      area: 18.5,
      thickness: 6,
      productConsumptionKgPerM2Mm: 1.35,
      reservePercent: 10,
      bagWeightKg: 20,
    });

    expect(result.totals).not.toHaveProperty("perimeter");
    expect(result.totals.exactMixKg).toBeCloseTo(149.85, 6);
    expect(result.totals.requiredMixKg).toBeCloseTo(164.835, 6);
    expect(result.totals.bagsNeeded).toBe(9);
    expect(result.totals.purchaseMixKg).toBe(180);
    expect(result.totals.leftoverMixKg).toBeCloseTo(15.165, 6);
  });

  it("не меняет расход по старому универсальному типу смеси", () => {
    const common = {
      inputMode: 1,
      area: 12,
      thickness: 8,
      productConsumptionKgPerM2Mm: 1.72,
      reservePercent: 0,
      bagWeightKg: 20,
    };

    const first = calc({ ...common, mixtureType: 0 });
    const second = calc({ ...common, mixtureType: 2 });

    expect(first.totals.requiredMixKg).toBe(second.totals.requiredMixKg);
    expect(first.totals.bagsNeeded).toBe(second.totals.bagsNeeded);
  });

  it("проверяет среднюю толщину только по явно введённому диапазону продукта", () => {
    const result = calc({
      inputMode: 1,
      area: 10,
      thickness: 35,
      productConsumptionKgPerM2Mm: 1.6,
      reservePercent: 0,
      bagWeightKg: 25,
      layerLimitsEnabled: 1,
      productMinThicknessMm: 3,
      productMaxThicknessMm: 30,
    });

    expect(
      result.warnings.some((warning) =>
        warning.includes("выше паспортного максимума 30 мм"),
      ),
    ).toBe(true);
  });

  it("добавляет грунтовку только по проектной площади и техкарте", () => {
    const inputs = {
      inputMode: 1,
      area: 20,
      thickness: 5,
      productConsumptionKgPerM2Mm: 1.5,
      reservePercent: 0,
      bagWeightKg: 20,
      primerEnabled: 1,
      projectPrimerAreaM2: 22,
      primerRateLPerM2: 0.18,
      primerCoats: 2,
      primerReservePercent: 10,
      primerCanL: 5,
    };

    const primer = findMaterial("Грунтовка", inputs);
    expect(primer).toMatchObject({
      quantity: 7.92,
      unit: "л",
      withReserve: 8.712,
      purchaseQty: 10,
      packageInfo: { count: 2, size: 5, packageUnit: "канистр" },
    });
  });

  it("добавляет демпферную ленту только по измеренной проектной длине", () => {
    const inputs = {
      inputMode: 1,
      area: 20,
      thickness: 5,
      productConsumptionKgPerM2Mm: 1.5,
      reservePercent: 0,
      bagWeightKg: 20,
      damperEnabled: 1,
      projectDamperLengthM: 18.4,
      damperReservePercent: 5,
      damperRollLengthM: 10,
    };

    const tape = findMaterial("Демпферная", inputs);
    expect(tape).toMatchObject({
      quantity: 18.4,
      unit: "м",
      withReserve: 19.32,
      purchaseQty: 20,
      packageInfo: { count: 2, size: 10, packageUnit: "рулонов" },
    });
  });

  it("не назначает грунтовку и ленту автоматически", () => {
    const result = calc({
      inputMode: 1,
      area: 20,
      thickness: 10,
      productConsumptionKgPerM2Mm: 1.6,
      reservePercent: 0,
      bagWeightKg: 25,
    });

    expect(result.materials).toHaveLength(1);
    expect(result.materials.some((item) => item.name.includes("Грунтов"))).toBe(false);
    expect(result.materials.some((item) => item.name.includes("Демпфер"))).toBe(false);
  });

  it("не добавляет скрытые сценарные и accuracy-множители", () => {
    const result = calc({
      inputMode: 1,
      area: 20,
      thickness: 10,
      productConsumptionKgPerM2Mm: 1.6,
      reservePercent: 0,
      bagWeightKg: 25,
      accuracyMode: "professional" as unknown as number,
    });

    expect(result.scenarios?.MIN).toEqual(result.scenarios?.REC);
    expect(result.scenarios?.REC).toEqual(result.scenarios?.MAX);
    expect(result.accuracyExplanation?.combinedMultiplier).toBe(1);
    expect(result.scenarios?.REC.key_factors.hidden_multiplier).toBe(1);
  });

  it("скрывает проектные поля, пока пользователь не включил блок", () => {
    const field = (key: string) => selfLevelingDef.fields.find((item) => item.key === key);

    expect(field("productMinThicknessMm")?.hideIf).toEqual({
      key: "layerLimitsEnabled",
      op: "eq",
      value: 0,
    });
    expect(field("projectPrimerAreaM2")?.hideIf).toEqual({
      key: "primerEnabled",
      op: "eq",
      value: 0,
    });
    expect(field("projectDamperLengthM")?.hideIf).toEqual({
      key: "damperEnabled",
      op: "eq",
      value: 0,
    });
  });

  it("удаляет старые универсальные типы смеси и скрытый override", () => {
    const keys = selfLevelingDef.fields.map((field) => field.key);

    expect(keys).not.toContain("mixtureType");
    expect(keys).not.toContain("consumptionOverride");
    expect(keys).toContain("productConsumptionKgPerM2Mm");
    expect(keys).toContain("reservePercent");
    expect(keys).toContain("bagWeightKg");
  });

  it("не рекламирует бренды как универсальные расчётные нормы", () => {
    expect(selfLevelingDef.h1).toBe(
      "Калькулятор наливного пола — смесь, толщина и мешки",
    );
    expect(selfLevelingDef.description).not.toMatch(/Ceresit|Knauf|Волма/);
    expect(selfLevelingDef.metaDescription).not.toMatch(/Ceresit|Knauf|Волма/);
  });

  it("ссылается на действующие документы и карточки конкретных продуктов", () => {
    const html = selfLevelingDef.seoContent?.descriptionHtml ?? "";

    expect(html).toContain(
      "https://protect.gost.ru/gost/details/a58a273b-a6f1-4f6b-868e-c0be3a3ef192",
    );
    expect(html).toContain(
      "https://protect.gost.ru/sp/details/ca915ed9-5bce-4de4-94af-debfd041a939",
    );
    expect(html).toContain(
      "https://www.ceresit.ru/ru/products/industrial-mortars-fixing-repair/industrial-floors/cn_178",
    );
    expect(html).toContain(
      "https://www.volma.ru/production/catalog/mixtures-for-floor-leveling/volma-alignment-arena-self-leveling-floor-cement-based/",
    );
  });
});
