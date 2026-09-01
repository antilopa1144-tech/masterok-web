import { describe, expect, it } from "vitest";
import { CATEGORY_INTRO } from "../category-intro";
import { primerDef } from "../formulas/primer";

const calc = primerDef.calculate.bind(primerDef);

const directInputs = {
  inputMode: 0,
  primerPurpose: 0,
  projectAreaM2: 50,
  passportConsumptionPerM2: 0.1,
  coatCount: 1,
  allowancePercent: 0,
  packageSize: 5,
  quantityUnit: 0,
};

describe("Грунтовка — паспортный расход и фактическая упаковка", () => {
  it("по умолчанию считает один выбранный продукт без скрытых добавок", () => {
    const result = calc(directInputs);

    expect(result.formulaVersion).toBe("primer-web-passport-v1");
    expect(result.canonicalSpecId).toBe("primer");
    expect(result.materials).toHaveLength(1);
    expect(result.materials[0]).toMatchObject({
      name: "Грунтовка выбранного продукта",
      quantity: 5,
      unit: "л",
      withReserve: 5,
      purchaseQty: 5,
      packageInfo: { count: 1, size: 5, packageUnit: "упаковок" },
    });
    expect(result.totals).toMatchObject({
      workAreaM2: 50,
      basePrimerNeed: 5,
      requiredPrimerNeed: 5,
      primerPackages: 1,
      purchasePrimerQuantity: 5,
    });
  });

  it("умножает площадь на паспортный расход и явное число слоёв", () => {
    const result = calc({
      ...directInputs,
      projectAreaM2: 20,
      passportConsumptionPerM2: 0.15,
      coatCount: 2,
    });

    expect(result.totals.basePrimerNeed).toBe(6);
    expect(result.materials[0].quantity).toBe(6);
  });

  it("применяет явную надбавку один раз и округляет по фактической упаковке", () => {
    const result = calc({
      ...directInputs,
      projectAreaM2: 20,
      passportConsumptionPerM2: 0.15,
      coatCount: 2,
      allowancePercent: 5,
      packageSize: 5,
    });

    expect(result.totals.basePrimerNeed).toBe(6);
    expect(result.totals.requiredPrimerNeed).toBe(6.3);
    expect(result.totals.primerPackages).toBe(2);
    expect(result.totals.purchasePrimerQuantity).toBe(10);
    expect(result.totals.packageLeftoverQuantity).toBe(3.7);
  });

  it("считает стены прямоугольной комнаты с явным вычетом проёмов", () => {
    const result = calc({
      ...directInputs,
      inputMode: 1,
      roomWidthM: 4,
      roomLengthM: 5,
      roomHeightM: 2.7,
      openingAreaM2: 3.6,
      surfaceScope: 0,
    });

    expect(result.totals.grossWallAreaM2).toBe(48.6);
    expect(result.totals.workAreaM2).toBe(45);
    expect(result.totals.basePrimerNeed).toBe(4.5);
  });

  it("может явно добавить потолок к стенам той же однородной позиции", () => {
    const result = calc({
      ...directInputs,
      inputMode: 1,
      roomWidthM: 4,
      roomLengthM: 5,
      roomHeightM: 2.7,
      openingAreaM2: 3.6,
      surfaceScope: 3,
    });

    expect(result.totals.netWallAreaM2).toBe(45);
    expect(result.totals.ceilingAreaM2).toBe(20);
    expect(result.totals.workAreaM2).toBe(65);
  });

  it("не даёт площади проёмов сделать площадь стен отрицательной", () => {
    const result = calc({
      ...directInputs,
      inputMode: 1,
      roomWidthM: 4,
      roomLengthM: 5,
      roomHeightM: 2.7,
      openingAreaM2: 100,
      surfaceScope: 0,
    });

    expect(result.totals.netWallAreaM2).toBe(0);
    expect(result.totals.workAreaM2).toBe(0);
    expect(result.totals.purchasePrimerQuantity).toBe(0);
  });

  it("поддерживает килограммы без пересчёта через условную плотность", () => {
    const result = calc({
      ...directInputs,
      projectAreaM2: 20,
      passportConsumptionPerM2: 0.25,
      packageSize: 5,
      quantityUnit: 1,
    });

    expect(result.materials[0]).toMatchObject({
      quantity: 5,
      unit: "кг",
      purchaseQty: 5,
    });
    expect(result.totals.basePrimerNeed).toBe(5);
  });

  it("назначение меняет только подпись, а не скрытый расход", () => {
    const generic = calc(directInputs);
    const adhesion = calc({ ...directInputs, primerPurpose: 2 });

    expect(generic.totals.basePrimerNeed).toBe(5);
    expect(adhesion.totals.basePrimerNeed).toBe(5);
    expect(adhesion.materials[0].name).toBe(
      "Адгезионная грунтовка по техкарте",
    );
  });

  it("не добавляет валик, кисть и кювету автоматически", () => {
    const result = calc(directInputs);
    const names = result.materials.map((material) => material.name).join(" ");

    expect(result.materials).toHaveLength(1);
    expect(names).not.toMatch(/Валик|Кисть|Кювета/);
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

  it("скрывает геометрию комнаты и готовую площадь в противоположных режимах", () => {
    const field = (key: string) =>
      primerDef.fields.find((item) => item.key === key);

    expect(field("projectAreaM2")?.hideIf).toEqual({
      key: "inputMode",
      op: "ne",
      value: 0,
    });
    expect(field("roomWidthM")?.hideIf).toEqual({
      key: "inputMode",
      op: "ne",
      value: 1,
    });
    expect(field("openingAreaM2")?.hideIf).toEqual({
      key: "inputMode",
      op: "ne",
      value: 1,
    });
  });

  it("удаляет старые поля условного типа и фиксированных канистр", () => {
    const keys = primerDef.fields.map((field) => field.key);

    expect(keys).not.toContain("area");
    expect(keys).not.toContain("surfaceType");
    expect(keys).not.toContain("primerType");
    expect(keys).not.toContain("coats");
    expect(keys).not.toContain("canSize");
    expect(keys).toContain("passportConsumptionPerM2");
    expect(keys).toContain("allowancePercent");
    expect(keys).toContain("packageSize");
  });

  it("не обещает универсальный расход, бренд и готовый подбор", () => {
    expect(primerDef.h1).toBe(
      "Калькулятор грунтовки — расход по техкарте и упаковка",
    );
    expect(primerDef.description).not.toMatch(/0[,.](1|12|15|35|42)/i);
    expect(primerDef.description).not.toMatch(/Ceresit|Knauf/i);
    expect(primerDef.metaDescription.toLowerCase()).toContain("рассчитайте");
  });

  it("ссылается на СП и техдокументацию разных продуктов", () => {
    const html = primerDef.seoContent?.descriptionHtml ?? "";

    expect(html).toContain(
      "https://protect.gost.ru/sp/details/ca915ed9-5bce-4de4-94af-debfd041a939",
    );
    expect(html).toContain(
      "https://www.ceresit.ru/ru/products/tiling/supplementary-materials/ct_17_pro",
    );
    expect(html).toContain(
      "https://www.knauf.ru/catalog/sukhie-stroitelnye-smesi-i-gotovye-sostavy/gruntovki/knauf-tifengrund/",
    );
    expect(html).toContain(
      "https://www.knauf.ru/catalog/sukhie-stroitelnye-smesi-i-gotovye-sostavy/gruntovki/knauf-betogrund/",
    );
    expect(CATEGORY_INTRO.interior.standards.join(" ")).toContain(
      "СП 71.13330",
    );
  });
});
