import { describe, expect, it } from "vitest";
import { foundationSlabDef } from "../formulas/foundation-slab";
import { checkInvariants, findMaterial, withBasicAccuracy } from "./_helpers";

const calc = withBasicAccuracy(foundationSlabDef.calculate.bind(foundationSlabDef));

describe("Калькулятор плитного фундамента v3", () => {
  describe("плита 10 × 6 × 0,2 м по проектной схеме", () => {
    const result = calc({});

    it("считает чистую геометрию без квадратной аппроксимации", () => {
      expect(result.formulaVersion).toBe("foundation-slab-canonical-v3");
      expect(result.totals.length).toBe(10);
      expect(result.totals.width).toBe(6);
      expect(result.totals.area).toBe(60);
      expect(result.totals.perimeter).toBe(32);
      expect(result.totals.concreteM3).toBe(12);
    });

    it("не использует legacy-площадь вместо обязательных сторон", () => {
      const legacy = calc({ area: 100 });
      expect(legacy.totals.area).toBe(60);
      expect(legacy.totals.length).toBe(10);
      expect(legacy.totals.width).toBe(6);
    });

    it("разделяет чистый объём, явный запас и заказ бетона", () => {
      const concrete = findMaterial(result, "Товарный бетон");
      expect(result.scenarios?.MIN.exact_need).toBe(12);
      expect(result.scenarios?.REC.exact_need).toBe(12.6);
      expect(result.scenarios?.MAX.exact_need).toBe(13.2);
      expect(concrete?.quantity).toBe(12);
      expect(concrete?.withReserve).toBe(12.6);
      expect(concrete?.purchaseQty).toBe(12.6);
    });

    it("показывает понятные итоговые карточки", () => {
      expect(result.summaryCards?.map((card) => card.label)).toEqual([
        "Бетон к заказу",
        "Арматура к покупке",
        "Площадь плиты",
      ]);
    });

    it("не меняет закупку скрытым режимом точности", () => {
      const professional = foundationSlabDef.calculate({ accuracyMode: "professional" as never });
      expect(professional.totals.concreteM3).toBe(12);
      expect(professional.scenarios?.REC.exact_need).toBe(12.6);
      expect(professional.accuracyExplanation?.combinedMultiplier).toBe(1);
    });

    it("соблюдает общие инварианты результата", () => {
      checkInvariants(result);
    });
  });

  describe("заказ товарного бетона", () => {
    it("добавляет остаток в линии подачи отдельно и округляет выбранным шагом", () => {
      const result = calc({
        concreteReservePercent: 7,
        deliveryAllowanceM3: 0.3,
        readyMixOrderStepM3: 0.5,
      });

      expect(result.scenarios?.REC.exact_need).toBe(13.14);
      expect(result.scenarios?.REC.purchase_quantity).toBe(13.5);
      expect(result.scenarios?.REC.leftover).toBeCloseTo(0.36, 6);
    });

    it("не назначает класс бетона", () => {
      expect(findMaterial(calc({}), "Товарный бетон — класс по проекту")).toBeDefined();
    });
  });

  describe("армирование только по введённой схеме", () => {
    it("учитывает отступ крайнего стержня, число слоёв и максимальный шаг", () => {
      const result = calc({});
      expect(result.totals.barsAlongLength).toBe(31);
      expect(result.totals.barsAlongWidth).toBe(51);
      expect(result.totals.totalBarLen).toBeCloseTo(1215.6, 3);
      expect(result.totals.rebarKg).toBeCloseTo(1079.453, 3);
    });

    it("применяет запас один раз и округляет до целых прутков", () => {
      const result = calc({ rebarReservePercent: 10, rodLengthM: 11.7 });
      const rebar = findMaterial(result, "Арматура сеток");

      expect(result.totals.rebarPlanningLengthM).toBeCloseTo(1337.16, 3);
      expect(result.totals.rebarRods).toBe(115);
      expect(result.totals.rebarPurchaseLengthM).toBeCloseTo(1345.5, 3);
      expect(rebar?.packageInfo).toEqual({ count: 115, size: 11.7, packageUnit: "прутков" });
    });

    it("один слой уменьшает метраж и число пересечений вдвое", () => {
      const twoLayers = calc({ gridLayers: 2 });
      const oneLayer = calc({ gridLayers: 1 });
      expect(oneLayer.totals.totalBarLen).toBeCloseTo(twoLayers.totals.totalBarLen / 2, 6);
      expect(oneLayer.totals.intersections).toBe(twoLayers.totals.intersections / 2);
    });

    it("вязальную проволоку считает по явной доле узлов и целым упаковкам", () => {
      const result = calc({
        tieSharePercent: 50,
        wireLengthPerTieM: 0.25,
        wireReservePercent: 10,
        wirePackageKg: 1,
      });
      const wire = findMaterial(result, "Проволока вязальная");

      expect(result.totals.tieCount).toBe(1581);
      expect(result.totals.wireKg).toBeCloseTo(2.372, 3);
      expect(result.totals.wirePurchaseKg).toBe(3);
      expect(wire?.packageInfo).toEqual({ count: 3, size: 1, packageUnit: "упаковок" });
    });
  });

  describe("подготовка, опалубка и утепление", () => {
    it("считает площадь щитов по введённой высоте без скрытого округления", () => {
      const result = calc({ formworkHeightMm: 300, formworkReservePercent: 5 });
      const formwork = findMaterial(result, "Опалубка");
      expect(formwork?.quantity).toBe(9.6);
      expect(formwork?.withReserve).toBeCloseTo(10.08, 3);
      expect(formwork?.purchaseQty).toBeCloseTo(10.08, 3);
    });

    it("отделяет объём уплотнённого слоя от надбавки и шага заказа", () => {
      const result = calc({
        sandLayerMm: 100,
        sandOrderExtraPercent: 15,
        gravelLayerMm: 80,
        gravelOrderExtraPercent: 10,
        aggregateOrderStepM3: 0.5,
      });

      expect(result.totals.sand).toBe(6);
      expect(result.totals.sandPlanningM3).toBe(6.9);
      expect(result.totals.sandPurchaseM3).toBe(7);
      expect(result.totals.gravel).toBe(4.8);
      expect(result.totals.gravelPlanningM3).toBeCloseTo(5.28, 3);
      expect(result.totals.gravelPurchaseM3).toBe(5.5);
    });

    it("позволяет исключить проектные слои", () => {
      const result = calc({
        sandLayerMm: 0,
        gravelLayerMm: 0,
        includeGeotextile: 0,
        formworkHeightMm: 0,
      });
      expect(findMaterial(result, "Песок")).toBeUndefined();
      expect(findMaterial(result, "Щебень")).toBeUndefined();
      expect(findMaterial(result, "Геотекстиль")).toBeUndefined();
      expect(findMaterial(result, "Опалубка")).toBeUndefined();
    });

    it("геотекстиль округляет до введённой площади рулона", () => {
      const result = calc({
        includeGeotextile: 1,
        geotextileReservePercent: 20,
        geotextileRollAreaM2: 50,
      });
      const material = findMaterial(result, "Геотекстиль");
      expect(material?.quantity).toBe(60);
      expect(material?.withReserve).toBe(72);
      expect(material?.purchaseQty).toBe(100);
      expect(material?.packageInfo).toEqual({ count: 2, size: 50, packageUnit: "рулонов" });
    });

    it("ЭППС округляет до введённой площади плиты", () => {
      const result = calc({
        insulationThickness: 100,
        insulationReservePercent: 5,
        eppsBoardAreaM2: 0.72,
      });
      const material = findMaterial(result, "ЭППС");
      expect(material?.quantity).toBe(60);
      expect(material?.withReserve).toBe(63);
      expect(material?.packageInfo).toEqual({ count: 88, size: 0.72, packageUnit: "плит" });
      expect(material?.purchaseQty).toBeCloseTo(63.36, 3);
    });
  });

  describe("границы безопасности", () => {
    it("всегда объясняет, что конструкцию калькулятор не проектирует", () => {
      const result = calc({});
      expect(result.warnings.some((warning) => warning.includes("не выбирает тип фундамента"))).toBe(true);
    });

    it("отдельно предупреждает о небольшой толщине и большой площади", () => {
      const result = calc({ length: 25, width: 10, thickness: 150 });
      expect(result.warnings.some((warning) => warning.includes("небольшая толщина"))).toBe(true);
      expect(result.warnings.some((warning) => warning.includes("Большая площадь"))).toBe(true);
    });
  });
});
