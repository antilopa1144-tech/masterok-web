import { describe, expect, it } from "vitest";
import { CATEGORY_INTRO } from "../category-intro";
import { puttyDef } from "../formulas/putty";

const calc = puttyDef.calculate.bind(puttyDef);

const directInputs = {
  inputMode: 1,
  area: 50,
  surface: 0,
  primaryPurpose: 0,
  primaryRateBasis: 0,
  primaryConsumptionRate: 1,
  primaryThicknessMm: 1,
  primaryLayerCount: 1,
  primaryAllowancePercent: 0,
  primaryPackageWeightKg: 20,
  addSecondPosition: 0,
};

describe("Шпаклёвка — паспортный расход и фактическая упаковка", () => {
  it("по умолчанию считает одну выбранную позицию без скрытых материалов", () => {
    const result = calc(directInputs);

    expect(result.formulaVersion).toBe("putty-web-passport-v1");
    expect(result.canonicalSpecId).toBe("putty");
    expect(result.materials).toHaveLength(1);
    expect(result.materials[0]).toMatchObject({
      name: "Шпаклёвка выбранного продукта",
      quantity: 50,
      unit: "кг",
      withReserve: 50,
      purchaseQty: 60,
      packageInfo: { count: 3, size: 20, packageUnit: "упаковок" },
    });
    expect(result.totals).toMatchObject({
      workAreaM2: 50,
      primaryBaseNeedKg: 50,
      primaryRequiredNeedKg: 50,
      primaryPackages: 3,
      primaryPurchaseKg: 60,
    });
  });

  it("считает расход на 1 мм по явной средней толщине", () => {
    const result = calc({
      ...directInputs,
      area: 20,
      primaryConsumptionRate: 1.2,
      primaryThicknessMm: 1.5,
    });

    expect(result.totals.primaryBaseNeedKg).toBe(36);
    expect(result.materials[0].quantity).toBe(36);
  });

  it("считает паспортный расход на проход по явному числу слоёв", () => {
    const result = calc({
      ...directInputs,
      area: 20,
      primaryRateBasis: 1,
      primaryConsumptionRate: 0.48,
      primaryLayerCount: 2,
    });

    expect(result.totals.primaryBaseNeedKg).toBe(19.2);
  });

  it("применяет явную надбавку один раз и округляет по фактической упаковке", () => {
    const result = calc({
      ...directInputs,
      area: 20,
      primaryConsumptionRate: 1.2,
      primaryThicknessMm: 1.5,
      primaryAllowancePercent: 5,
      primaryPackageWeightKg: 20,
    });

    expect(result.totals.primaryBaseNeedKg).toBe(36);
    expect(result.totals.primaryRequiredNeedKg).toBe(37.8);
    expect(result.totals.primaryPackages).toBe(2);
    expect(result.totals.primaryPurchaseKg).toBe(40);
    expect(result.totals.primaryLeftoverKg).toBe(2.2);
  });

  it("считает стены прямоугольной комнаты с явным вычетом проёмов", () => {
    const result = calc({
      ...directInputs,
      inputMode: 0,
      length: 5,
      width: 4,
      height: 2.7,
      openingArea: 3.6,
      surface: 0,
    });

    expect(result.totals.grossWallAreaM2).toBe(48.6);
    expect(result.totals.workAreaM2).toBe(45);
    expect(result.totals.primaryBaseNeedKg).toBe(45);
  });

  it("может явно добавить потолок к стенам одной однородной позиции", () => {
    const result = calc({
      ...directInputs,
      inputMode: 0,
      length: 5,
      width: 4,
      height: 2.7,
      openingArea: 3.6,
      surface: 2,
    });

    expect(result.totals.netWallAreaM2).toBe(45);
    expect(result.totals.ceilingAreaM2).toBe(20);
    expect(result.totals.workAreaM2).toBe(65);
    expect(result.totals.area).toBe(65);
  });

  it("не даёт площади проёмов сделать площадь стен отрицательной", () => {
    const result = calc({
      ...directInputs,
      inputMode: 0,
      length: 5,
      width: 4,
      height: 2.7,
      openingArea: 100,
      surface: 0,
    });

    expect(result.totals.netWallAreaM2).toBe(0);
    expect(result.totals.workAreaM2).toBe(0);
    expect(result.totals.primaryPurchaseKg).toBe(0);
    expect(result.warnings.join(" ")).toContain("проверьте обмер");
  });

  it("считает вторую позицию независимо по её техкарте и фасовке", () => {
    const result = calc({
      ...directInputs,
      area: 20,
      primaryPurpose: 1,
      primaryConsumptionRate: 1.5,
      primaryThicknessMm: 2,
      primaryAllowancePercent: 5,
      primaryPackageWeightKg: 25,
      addSecondPosition: 1,
      secondPurpose: 2,
      secondRateBasis: 1,
      secondConsumptionRate: 0.48,
      secondLayerCount: 1,
      secondAllowancePercent: 0,
      secondPackageWeightKg: 18,
    });

    expect(result.materials).toHaveLength(2);
    expect(result.materials[0]).toMatchObject({
      name: "Выравнивающая шпаклёвка по техкарте",
      quantity: 60,
      withReserve: 63,
      purchaseQty: 75,
      packageInfo: { count: 3, size: 25, packageUnit: "упаковок" },
    });
    expect(result.materials[1]).toMatchObject({
      name: "Финишная шпаклёвка по техкарте",
      quantity: 9.6,
      withReserve: 9.6,
      purchaseQty: 18,
      packageInfo: { count: 1, size: 18, packageUnit: "упаковок" },
    });
    expect(result.totals.totalBaseNeedKg).toBe(69.6);
    expect(result.totals.totalRequiredNeedKg).toBe(72.6);
    expect(result.totals.totalPurchaseKg).toBe(93);
  });

  it("назначение позиции меняет только подпись, а не скрытый расход", () => {
    const generic = calc(directInputs);
    const finish = calc({ ...directInputs, primaryPurpose: 2 });

    expect(generic.totals.primaryBaseNeedKg).toBe(50);
    expect(finish.totals.primaryBaseNeedKg).toBe(50);
    expect(finish.materials[0].name).toBe(
      "Финишная шпаклёвка по техкарте",
    );
  });

  it("не добавляет грунтовку, серпянку и наждачную бумагу автоматически", () => {
    const result = calc({
      ...directInputs,
      addSecondPosition: 1,
      secondPurpose: 3,
      secondRateBasis: 0,
      secondConsumptionRate: 1,
      secondThicknessMm: 1,
      secondAllowancePercent: 0,
      secondPackageWeightKg: 5,
    });
    const names = result.materials.map((material) => material.name).join(" ");

    expect(result.materials).toHaveLength(2);
    expect(names).not.toMatch(/Грунтов|Серпян|Наждач|P180|P240/);
  });

  it("не добавляет скрытые сценарные и accuracy-множители", () => {
    const result = calc({
      ...directInputs,
      accuracyMode: "professional" as unknown as number,
    });

    expect(result.scenarios?.MIN).toEqual(result.scenarios?.REC);
    expect(result.scenarios?.REC).toEqual(result.scenarios?.MAX);
    expect(result.accuracyExplanation?.combinedMultiplier).toBe(1);
    expect(result.scenarios?.REC.key_factors.hidden_multiplier).toBe(1);
  });

  it("скрывает взаимоисключающие режимы площади и базы расхода", () => {
    const field = (key: string) =>
      puttyDef.fields.find((item) => item.key === key);

    expect(field("area")?.hideIf).toEqual({
      key: "inputMode",
      op: "ne",
      value: 1,
    });
    expect(field("length")?.hideIf).toEqual({
      key: "inputMode",
      op: "ne",
      value: 0,
    });
    expect(field("primaryThicknessMm")?.hideIf).toEqual({
      key: "primaryRateBasis",
      op: "ne",
      value: 0,
    });
    expect(field("primaryLayerCount")?.hideIf).toEqual({
      key: "primaryRateBasis",
      op: "ne",
      value: 1,
    });
    expect(field("secondConsumptionRate")?.hideIf).toEqual({
      key: "addSecondPosition",
      op: "ne",
      value: 1,
    });
  });

  it("удаляет старые профили качества, фиксированные нормы и общую фасовку", () => {
    const keys = puttyDef.fields.map((field) => field.key);

    expect(keys).not.toContain("puttyType");
    expect(keys).not.toContain("qualityClass");
    expect(keys).not.toContain("bagWeight");
    expect(keys).not.toContain("layers");
    expect(keys).not.toContain("startLayers");
    expect(keys).not.toContain("finishLayers");
    expect(keys).toContain("primaryConsumptionRate");
    expect(keys).toContain("primaryAllowancePercent");
    expect(keys).toContain("primaryPackageWeightKg");
  });

  it("не обещает универсальные нормы, бренды и автоматический подбор", () => {
    expect(puttyDef.h1).toBe(
      "Калькулятор шпаклёвки — расход по техкарте и упаковка",
    );
    expect(puttyDef.description).not.toMatch(/Knauf|Волма|Ceresit/i);
    expect(puttyDef.description).not.toMatch(/0[,.](8|9)|1[,.](0|1|2|3|5)/i);
    expect(puttyDef.metaDescription.toLowerCase()).toContain("рассчитайте");
  });

  it("ссылается на действующие нормы и техдокументацию разных продуктов", () => {
    const html = puttyDef.seoContent?.descriptionHtml ?? "";

    expect(html).toContain(
      "https://protect.gost.ru/sp/details/ca915ed9-5bce-4de4-94af-debfd041a939",
    );
    expect(html).toContain(
      "https://protect.gost.ru/gost/details/05226480-ceea-4d2a-96f5-91b8943d3865",
    );
    expect(html).toContain(
      "https://www.knauf.ru/catalog/shpaklyevki/shpaklyevki-polimernye/knauf-rotband-pasta-profi/",
    );
    expect(html).toContain(
      "https://www.knauf.ru/catalog/sukhie-stroitelnye-smesi-i-gotovye-sostavy/shpaklyevki/knauf-fugen/",
    );
    expect(html).toContain(
      "https://ceresit.ru/ru/products/vnutrennyay-otdelka/shpaklevki/ct_127_polymer_plus",
    );
    expect(html).toContain(
      "https://www.knauf.ru/company/technology/sistema-q1-q4/",
    );
    expect(CATEGORY_INTRO.interior.standards.join(" ")).toContain(
      "СП 71.13330",
    );
  });
});
