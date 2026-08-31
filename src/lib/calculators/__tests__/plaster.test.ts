import { describe, it, expect } from "vitest";
import { plasterDef } from "../formulas/plaster";
import { findMaterial, checkInvariants, withBasicAccuracy } from "./_helpers";

const calc = withBasicAccuracy(plasterDef.calculate.bind(plasterDef));

describe("Калькулятор штукатурки", () => {
  it("направляет брендовые запросы Ротбанд и Волма Слой на профильную страницу", () => {
    expect(plasterDef.metaTitle).toContain("Ротбанд и Волма Слой");
    expect(plasterDef.metaDescription).toContain("Knauf Ротбанд и Волма Слой");
    expect(plasterDef.fields.find((field) => field.key === "plasterType")?.options?.[0]?.label).toBe("Гипсовая");
    expect(plasterDef.fields.find((field) => field.key === "manufacturer")?.label).toBe("Конкретный товар (необязательно)");
    expect(plasterDef.seoContent?.faq?.some((item) => item.question.includes("Волма Слой"))).toBe(true);
  });

  it("показывает canonical-поля основания и кривизны с неизменными дефолтами", () => {
    const substrate = plasterDef.fields.find((field) => field.key === "substrateType");
    const evenness = plasterDef.fields.find((field) => field.key === "wallEvenness");

    expect(substrate?.defaultValue).toBe(1);
    expect(substrate?.options?.map((option) => option.value)).toEqual([1, 2, 3, 4, 5]);
    expect(substrate?.options?.[3]?.label).toContain("×1,25");
    expect(evenness?.defaultValue).toBe(1);
    expect(evenness?.options?.map((option) => option.value)).toEqual([1, 2, 3]);
    expect(evenness?.options?.[2]?.label).toContain("×1,30");
  });

  describe("Товарный расход без расхождения итогов", () => {
    it("ВОЛМА-Слой пересчитывает движок, сценарий и карточку одним расходом", () => {
      const result = calc({
        inputMode: 1,
        area: 30,
        openingsArea: 0,
        plasterType: 0,
        substrateType: 1,
        wallEvenness: 1,
        thickness: 20,
        bagWeight: 25,
        manufacturer: 3,
      });
      const material = findMaterial(result, "Волма Слой");

      expect(result.totals.usesProductRate).toBe(1);
      expect(result.totals.baseKgPerM2At10Mm).toBe(8.5);
      expect(result.totals.totalKg).toBeCloseTo(561, 3);
      expect(result.scenarios?.REC.exact_need).toBeCloseTo(561, 3);
      expect(result.scenarios?.REC.purchase_quantity).toBe(570);
      expect(material?.purchaseQty).toBe(19);
      expect(result.scenarios?.REC.buy_plan).toMatchObject({ packages_count: 19, package_size: 30 });
    });

    it("CT 29 применяет 15 кг/м² на 10 мм и фасовку 25 кг", () => {
      const result = calc({
        inputMode: 1,
        area: 40,
        openingsArea: 0,
        plasterType: 1,
        substrateType: 1,
        wallEvenness: 1,
        thickness: 10,
        bagWeight: 40,
        manufacturer: 11,
      });
      const material = findMaterial(result, "Церезит CT 29");

      expect(result.totals.totalKg).toBeCloseTo(660, 3);
      expect(result.totals.recPurchaseKg).toBe(675);
      expect(material?.purchaseQty).toBe(27);
      expect(result.scenarios?.REC.buy_plan).toMatchObject({ packages_count: 27, package_size: 25 });
    });

    it("не смешивает гипсовый Ротбанд с выбранной цементной моделью", () => {
      const result = calc({
        inputMode: 1,
        area: 40,
        openingsArea: 0,
        plasterType: 1,
        substrateType: 1,
        wallEvenness: 1,
        thickness: 10,
        bagWeight: 30,
        manufacturer: 1,
      });

      expect(result.totals.usesProductRate).toBe(0);
      expect(result.totals.totalKg).toBeCloseTo(748, 3);
      expect(findMaterial(result, "Ротбанд")).toBeUndefined();
      expect(result.warnings.some((warning) => warning.includes("относится к типу «гипсовая»"))).toBe(true);
    });

    it("не применяет общий расход бренда без проверенной карточки конкретного товара", () => {
      const result = calc({
        inputMode: 1,
        area: 30,
        openingsArea: 0,
        plasterType: 0,
        thickness: 20,
        bagWeight: 30,
        manufacturer: 2,
      });

      expect(result.totals.usesProductRate).toBe(0);
      expect(findMaterial(result, "Knauf Гольдбанд")).toBeUndefined();
      expect(result.warnings.some((warning) => warning.includes("не зафиксирована проверенная карточка"))).toBe(true);
    });
  });

  it("основание и кривизна действительно меняют REC по раскрытым множителям", () => {
    const evenConcrete = calc({ inputMode: 1, area: 40, openingsArea: 0, plasterType: 0, thickness: 10, bagWeight: 30, substrateType: 1, wallEvenness: 1 });
    const unevenGasBlock = calc({ inputMode: 1, area: 40, openingsArea: 0, plasterType: 0, thickness: 10, bagWeight: 30, substrateType: 4, wallEvenness: 2 });

    expect((unevenGasBlock.scenarios?.REC.exact_need ?? 0) / (evenConcrete.scenarios?.REC.exact_need ?? 1)).toBeCloseTo(1.25 * 1.15, 6);
  });

  describe("По размерам: 5×4 м, h=2.7 м, проёмы 5 м², гипсовая 15 мм, мешок 30 кг", () => {
    // wallArea = 2*(5+4)*2.7 = 48.6
    // netArea = 48.6 - 5 = 43.6
    // kgPer10mm = 8.5, kgPerSqm = 8.5 * 1.5 = 12.75
    // totalKg = 43.6 * 12.75 * 1.1 = 611.49
    // bags = ceil(611.49/30) = ceil(20.38) = 21
    const result = calc({
      inputMode: 0,
      length: 5,
      width: 4,
      height: 2.7,
      openingsArea: 5,
      plasterType: 0,
      thickness: 15,
      bagWeight: 30,
    });

    it("площадь стен = 48.6 м²", () => {
      expect(result.totals.wallArea).toBeCloseTo(48.6, 1);
    });

    it("чистая площадь = 43.6 м²", () => {
      expect(result.totals.netArea).toBeCloseTo(43.6, 1);
    });

    it("мешков гипсовой штукатурки = 21", () => {
      const plaster = findMaterial(result, "Гипсовая штукатурка");
      expect(plaster?.purchaseQty).toBe(21);
    });

    it("грунтовка присутствует", () => {
      expect(findMaterial(result, "Грунтовка")).toBeDefined();
    });

    it("маяки присутствуют", () => {
      expect(findMaterial(result, "Маяки")).toBeDefined();
    });

    it("инварианты", () => {
      checkInvariants(result);
    });

    it("раскрывает формулу и границы сопутствующих позиций", () => {
      expect(findMaterial(result, "Гипсовая штукатурка")?.subtitle).toContain("8.5 кг/м² при 10 мм");
      expect(findMaterial(result, "Грунтовка")?.subtitle).toContain("0.3 кг/м²");
      expect(findMaterial(result, "Маяки")?.subtitle).toContain("1 шт. на 2.5 м²");
      expect(findMaterial(result, "Правило")?.subtitle).toContain("Инвентарная позиция");
      expect(findMaterial(result, "Угловой профиль")?.subtitle).toContain("4 вертикальных угла");
    });
  });

  describe("Цементная штукатурка: canonical расход 17 кг/м² на 10 мм", () => {
    // netArea ≈ 43.6, thickness=15, kgPerSqm=15*1.5=22.5
    // totalKg = 43.6*22.5*1.1 = 1079.1 → bags=ceil(1079.1/30)=36
    const result = calc({
      inputMode: 0,
      length: 5,
      width: 4,
      height: 2.7,
      openingsArea: 5,
      plasterType: 1,
      thickness: 15,
      bagWeight: 30,
    });

    it("цементной штукатурки больше, чем гипсовой", () => {
      const cement = findMaterial(result, "Цементная штукатурка");
      expect(cement?.purchaseQty).toBeGreaterThan(21);
    });
  });

  describe("Предупреждения", () => {
    it("гипс толще 20 мм → армирование", () => {
      const result = calc({
        inputMode: 1,
        area: 40,
        openingsArea: 0,
        plasterType: 0,
        thickness: 25,
        bagWeight: 30,
      });
      expect(result.warnings.some((w) => w.includes("2 слоя"))).toBe(true);
    });

    it("толщина > 30 мм → сетка обязательна", () => {
      const result = calc({
        inputMode: 1,
        area: 40,
        openingsArea: 0,
        plasterType: 0,
        thickness: 35,
        bagWeight: 30,
      });
      expect(result.warnings.some((w) => w.includes("армирование"))).toBe(true);
    });

    it("площадь < 5 м² → использовать готовую", () => {
      const result = calc({
        inputMode: 1,
        area: 3,
        openingsArea: 0,
        plasterType: 0,
        thickness: 15,
        bagWeight: 30,
      });
      expect(result.warnings.some((w) => w.includes("ведра"))).toBe(true);
    });
  });

  it("SEO-методика совпадает с движком и ссылается на первичные источники", () => {
    const content = plasterDef.seoContent?.descriptionHtml ?? "";

    expect(content).toContain("Цементная, общая</td><td>17");
    expect(content).toContain("Церезит CT 29</td><td>около 15");
    expect(content).toContain("СП 71.13330.2017 с изменениями № 1&ndash;4");
    expect(content).toContain("www.knauf.ru/catalog/");
    expect(content).toContain("www.volma.ru/production/catalog/plaster/volma-sloy/");
    expect(content).toContain("www.ceresit.ru/ru/products/");
    expect(content).not.toContain("до 20 мм без армирования");
    expect(content).not.toContain("обязательно в следующих случаях");
  });
});

it("декларирует formulaVersion для canonical plaster", () => {
  expect(plasterDef.formulaVersion).toBe("plaster-canonical-v1");
});

describe("Canonical plaster fixture parity", () => {
  const parityFixture = require("../../../../tests/fixtures/plaster-canonical-parity.json") as {
    cases: Array<{
      id: string;
      inputs: Record<string, number>;
      expected: {
        formulaVersion: string;
        netArea: number;
        totalKg: number;
        warningsCount: number;
        materials: {
          plasterBags: number;
          primerPackages: number;
          beacons: number;
          hasMesh: number;
        };
        recScenario: {
          packageSize: number;
          exactNeed: number;
          purchaseQuantity: number;
        };
      };
    }>;
  };

  for (const fixtureCase of parityFixture.cases) {
    it(fixtureCase.id, () => {
      const result = calc(fixtureCase.inputs);
      expect(result.formulaVersion).toBe(fixtureCase.expected.formulaVersion);
      expect(result.totals.netArea).toBeCloseTo(fixtureCase.expected.netArea, 2);
      expect(result.totals.totalKg).toBeCloseTo(fixtureCase.expected.totalKg, 2);
      expect(result.warnings).toHaveLength(fixtureCase.expected.warningsCount);
      expect(result.scenarios?.REC.buy_plan.package_size).toBe(fixtureCase.expected.recScenario.packageSize);
      expect(result.scenarios?.REC.exact_need ?? 0).toBeCloseTo(fixtureCase.expected.recScenario.exactNeed, 2);
      expect(result.scenarios?.REC.purchase_quantity ?? 0).toBeCloseTo(fixtureCase.expected.recScenario.purchaseQuantity, 2);
      expect(result.materials.find((material) => material.category === "Основное")?.purchaseQty).toBe(fixtureCase.expected.materials.plasterBags);
      expect(findMaterial(result, "Грунтовка")?.purchaseQty).toBe(fixtureCase.expected.materials.primerPackages);
      expect(findMaterial(result, "Маяки")?.purchaseQty).toBe(fixtureCase.expected.materials.beacons);
      expect(Boolean(findMaterial(result, "Стеклосетка"))).toBe(Boolean(fixtureCase.expected.materials.hasMesh));
    });
  }
});

