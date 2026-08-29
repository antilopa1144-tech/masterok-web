import { describe, expect, it } from "vitest";
import { basementDef } from "../formulas/basement";
import { CALCULATOR_COMPANIONS } from "../companions";
import { checkInvariants, findMaterial, withBasicAccuracy } from "./_helpers";

const calc = withBasicAccuracy(basementDef.calculate.bind(basementDef));

describe("Калькулятор монолитного подвала v2", () => {
  it("считает стены как кольцо и не удваивает углы", () => {
    const result = calc({});

    expect(result.formulaVersion).toBe("basement-canonical-v2");
    expect(result.totals.outerPlanArea).toBe(48);
    expect(result.totals.innerPlanArea).toBe(42.56);
    expect(result.totals.wallVolume).toBe(13.6);
    expect(result.totals.floorVolume).toBe(7.2);
    expect(result.totals.cleanConcreteM3).toBe(20.8);
  });

  it("разделяет чистый объём, явный запас и два заказа бетона", () => {
    const result = calc({});
    const floor = findMaterial(result, "плиты пола");
    const walls = findMaterial(result, "наружных стен");

    expect(result.scenarios?.MIN.exact_need).toBe(20.8);
    expect(result.scenarios?.MIN.purchase_quantity).toBe(20.8);
    expect(result.scenarios?.REC.exact_need).toBe(21.84);
    expect(result.scenarios?.REC.purchase_quantity).toBe(21.9);
    expect(result.scenarios?.MAX.exact_need).toBe(22.88);
    expect(result.scenarios?.MAX.purchase_quantity).toBe(23);
    expect(floor).toMatchObject({ quantity: 7.2, withReserve: 7.56, purchaseQty: 7.6 });
    expect(walls).toMatchObject({ quantity: 13.6, withReserve: 14.28, purchaseQty: 14.3 });
  });

  it("учитывает остаток в линии и шаг поставщика отдельно для каждой заливки", () => {
    const result = calc({
      floorConcreteReservePercent: 0,
      wallConcreteReservePercent: 0,
      floorDeliveryAllowanceM3: 0.35,
      wallDeliveryAllowanceM3: 0.25,
      readyMixOrderStepM3: 0.5,
    });

    expect(result.scenarios?.REC.exact_need).toBe(21.4);
    expect(result.scenarios?.REC.purchase_quantity).toBe(22);
    expect(findMaterial(result, "плиты пола")?.purchaseQty).toBe(8);
    expect(findMaterial(result, "наружных стен")?.purchaseQty).toBe(14);
  });

  it("использует отдельные размеры плиты пола", () => {
    const result = calc({ floorLength: 9, floorWidth: 7, floorThickness: 200 });

    expect(result.totals.floorArea).toBe(63);
    expect(result.totals.floorVolume).toBe(12.6);
    expect(result.totals.wallVolume).toBe(13.6);
  });

  it("вычитает проёмы из бетона и граней опалубки", () => {
    const result = calc({ wallOpeningsAreaM2: 4, wallFormworkMode: 3 });

    expect(result.totals.openingsVolume).toBe(0.8);
    expect(result.totals.wallVolume).toBe(12.8);
    expect(result.totals.outerWallArea).toBe(66);
    expect(result.totals.innerWallArea).toBe(62);
    expect(result.totals.formworkExactAreaM2).toBe(128);
  });

  it("ограничивает невозможную площадь проёмов и предупреждает", () => {
    const result = calc({ wallOpeningsAreaM2: 200 });

    expect(result.totals.wallOpeningsAreaM2).toBe(66);
    expect(result.totals.wallVolume).toBe(0.4);
    expect(result.warnings.some((warning) => warning.includes("превышает доступную площадь"))).toBe(true);
  });

  it("не назначает арматуру по площади", () => {
    const result = calc({});

    expect(findMaterial(result, "Арматура плиты")).toBeUndefined();
    expect(findMaterial(result, "Арматура стен")).toBeUndefined();
    expect(findMaterial(result, "Вязальная проволока")).toBeUndefined();
    expect(result.totals.rebarPurchaseKg).toBe(0);
    expect(result.warnings.some((warning) => warning.includes("Арматура не добавлена автоматически"))).toBe(true);
  });

  it("принимает массу арматуры только из ведомости и округляет её явно", () => {
    const result = calc({
      floorRebarProjectKg: 1000,
      wallRebarProjectKg: 1200,
      rebarReservePercent: 10,
      rebarOrderStepKg: 50,
    });

    expect(findMaterial(result, "Арматура плиты")?.purchaseQty).toBe(1100);
    expect(findMaterial(result, "Арматура стен")?.purchaseQty).toBe(1350);
    expect(result.totals.rebarPurchaseKg).toBe(2450);
  });

  it("округляет опалубку до фактической площади листа", () => {
    const result = calc({
      wallFormworkMode: 3,
      formworkReservePercent: 10,
      formworkSheetAreaM2: 2.88,
    });
    const formwork = findMaterial(result, "Опалубки") ?? findMaterial(result, "опалубки стен");

    expect(result.totals.formworkExactAreaM2).toBe(136);
    expect(result.totals.formworkPlanningAreaM2).toBe(149.6);
    expect(result.totals.formworkSheets).toBe(52);
    expect(formwork?.purchaseQty).toBe(149.76);
    expect(formwork?.packageInfo).toEqual({ count: 52, size: 2.88, packageUnit: "листов/щитов" });
  });

  it("считает состав только по расходу и упаковке выбранного товара", () => {
    const result = calc({
      waterproofScope: 1,
      waterproofSystem: 1,
      waterproofWallHeightM: 2.5,
      waterproofReservePercent: 10,
      waterproofConsumptionKgM2: 1.5,
      waterproofPackageKg: 20,
    });
    const material = findMaterial(result, "Гидроизоляционный состав");

    expect(result.totals.waterproofArea).toBe(70);
    expect(material).toMatchObject({ quantity: 105, withReserve: 115.5, purchaseQty: 120 });
    expect(material?.packageInfo).toEqual({ count: 6, size: 20, packageUnit: "упаковок" });
  });

  it("считает рулонную систему по слоям и полезной площади рулона", () => {
    const result = calc({
      waterproofScope: 3,
      waterproofSystem: 2,
      waterproofLayers: 2,
      waterproofReservePercent: 15,
      waterproofRollAreaM2: 10,
    });
    const material = findMaterial(result, "Рулонная гидроизоляция");

    expect(result.totals.waterproofArea).toBe(118);
    expect(material).toMatchObject({ quantity: 236, withReserve: 271.4, purchaseQty: 280 });
    expect(material?.packageInfo).toEqual({ count: 28, size: 10, packageUnit: "рулонов" });
  });

  it("не выдаёт покупку гидроизоляции без данных товара", () => {
    const result = calc({ waterproofScope: 3, waterproofSystem: 1 });

    expect(findMaterial(result, "Гидроизоляционный состав")).toBeUndefined();
    expect(result.warnings.some((warning) => warning.includes("не заполнены расход"))).toBe(true);
  });

  it("округляет утепление до целых плит по фактической площади", () => {
    const result = calc({
      insulationScope: 3,
      insulationWallHeightM: 2.5,
      insulationLayers: 1,
      insulationReservePercent: 5,
      insulationBoardAreaM2: 0.72,
    });
    const material = findMaterial(result, "Плитный утеплитель");

    expect(result.totals.insulationArea).toBe(118);
    expect(result.totals.insulationBoards).toBe(173);
    expect(material?.purchaseQty).toBe(124.56);
    expect(material?.packageInfo).toEqual({ count: 173, size: 0.72, packageUnit: "плит" });
  });

  it("не выводит выдуманные продухи, дренаж и универсальную мастику", () => {
    const result = calc({});

    expect(findMaterial(result, "Продухи")).toBeUndefined();
    expect(findMaterial(result, "Дренаж")).toBeUndefined();
    expect(findMaterial(result, "Обмазочная")).toBeUndefined();
    expect(result.totals.drainageLength).toBe(0);
  });

  it("не меняет проектный результат скрытым режимом точности", () => {
    const basic = basementDef.calculate({ accuracyMode: "basic" as never });
    const professional = basementDef.calculate({ accuracyMode: "professional" as never });

    expect(professional.scenarios?.REC).toEqual(basic.scenarios?.REC);
    expect(professional.totals.recPurchase).toBe(basic.totals.recPurchase);
    expect(professional.accuracyExplanation?.combinedMultiplier).toBe(1);
  });

  it("показывает проектную границу в UI и SEO", () => {
    expect(basementDef.h1).toContain("по проектной схеме");
    expect(basementDef.description).toContain("готовые проектные данные");
    expect(basementDef.formulaDescription).toContain("не назначает кг/м²");
    expect(basementDef.seoContent?.descriptionHtml).toContain("ГОСТ 7473-2026");
    expect(basementDef.seoContent?.descriptionHtml).toContain("1 ноября 2026 года");
    expect(basementDef.faq?.some((item) => item.answer.includes("18 или 22 кг/м²"))).toBe(true);
  });

  it("скрывает поля упаковок, пока соответствующий раздел выключен", () => {
    const formworkSheet = basementDef.fields.find((field) => field.key === "formworkSheetAreaM2");
    const waterproofPackage = basementDef.fields.find((field) => field.key === "waterproofPackageKg");
    const rollArea = basementDef.fields.find((field) => field.key === "waterproofRollAreaM2");
    const insulationBoard = basementDef.fields.find((field) => field.key === "insulationBoardAreaM2");

    expect(formworkSheet?.hideIf).toEqual({ key: "wallFormworkMode", op: "eq", value: 0 });
    expect(waterproofPackage?.hideIf).toEqual(expect.arrayContaining([
      { key: "waterproofScope", op: "eq", value: 0 },
      { key: "waterproofSystem", op: "ne", value: 1 },
    ]));
    expect(rollArea?.hideIf).toEqual(expect.arrayContaining([
      { key: "waterproofSystem", op: "ne", value: 2 },
    ]));
    expect(insulationBoard?.hideIf).toEqual({ key: "insulationScope", op: "eq", value: 0 });
  });

  it("связан с соседними безопасными расчётами", () => {
    const slugs = CALCULATOR_COMPANIONS["podval-fundamenta"].map((item) => item.slug);

    expect(slugs).toEqual(expect.arrayContaining([
      "beton",
      "armatura",
      "gidroizolyaciya-vlagozaschita",
      "drenazh-uchastka",
      "otmostka",
    ]));
  });

  it("сохраняет общие инварианты результата", () => {
    const result = calc({
      wallOpeningsAreaM2: 3,
      floorRebarProjectKg: 900,
      wallFormworkMode: 3,
      waterproofScope: 3,
      waterproofSystem: 2,
      waterproofLayers: 2,
      waterproofRollAreaM2: 10,
      insulationScope: 1,
    });

    checkInvariants(result);
  });
});
