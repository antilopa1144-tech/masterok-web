import { describe, it, expect } from "vitest";
import { blindAreaDef } from "../formulas/blind-area";
import { findMaterial, checkInvariants, withBasicAccuracy } from "./_helpers";

const calc = withBasicAccuracy(blindAreaDef.calculate.bind(blindAreaDef));

describe("Калькулятор отмостки", () => {
  describe("SEO и пользовательские допущения", () => {
    it("объясняет расчёт вокруг дома и не выдаёт практическую ширину за норму", () => {
      expect(blindAreaDef.h1).toContain("вокруг дома");
      expect(blindAreaDef.metaDescription).toContain("площадь");
      expect(blindAreaDef.seoContent?.descriptionHtml).toContain("от 1% до 10%");
      expect(blindAreaDef.seoContent?.descriptionHtml).toContain("не задаёт");
      expect(blindAreaDef.seoContent?.descriptionHtml).not.toContain("не менее <strong>600 мм</strong>");
    });

    it("скрывает толщину бетона для плиточной и мягкой отмостки", () => {
      const thickness = blindAreaDef.fields.find((field) => field.key === "thickness");
      expect(thickness?.hideIf).toEqual({ key: "materialType", op: "ne", value: 0 });
    });

    it("не выдаёт класс бетона, утепление и фиксированные слои за проект", () => {
      const materialType = blindAreaDef.fields.find((field) => field.key === "materialType");
      const insulation = blindAreaDef.fields.find((field) => field.key === "withInsulation");
      const insulationFaq = blindAreaDef.faq?.find((item) => item.question === "Нужно ли утеплять отмостку?");

      expect(materialType?.options?.find((option) => option.value === 0)?.label).toBe("Бетонная");
      expect(materialType?.options?.find((option) => option.value === 2)?.label).toContain("профилированная мембрана");
      expect(materialType?.hint).toContain("не проектирует");
      expect(insulation?.hint).toContain("только подсчёт плит");
      expect(insulationFaq?.answer).toContain("По одному типу дома это решить нельзя");
      expect(blindAreaDef.seoContent?.descriptionHtml).toContain("предварительные позиции");
      expect(blindAreaDef.seoContent?.descriptionHtml).toContain("ГОСТ 7473-2026");
      expect(blindAreaDef.seoContent?.descriptionHtml).toContain("01.11.2026");
    });
  });

  describe("Бетонная отмостка: периметр 40 м, ширина 1.0 м, толщина 100 мм", () => {
    // Замкнутый прямоугольный контур: 40 * 1 + 4 * 1² = 44 м².
    // Чистый объём бетона: 44 * 0.1 = 4.4 м³.
    const result = calc({
      perimeter: 40,
      width: 1.0,
      thickness: 100,
      materialType: 0,
      withInsulation: 0,
    });

    it("учитывает четыре угловых участка", () => {
      expect(result.totals.straightStripArea).toBeCloseTo(40, 2);
      expect(result.totals.cornerAllowanceArea).toBeCloseTo(4, 2);
      expect(result.totals.area).toBeCloseTo(44, 2);
      expect(result.totals.outerEdgeLength).toBeCloseTo(48, 2);
    });

    it("разделяет чистый объём, потребность с поправками и заказ", () => {
      const concrete = findMaterial(result, "Бетон");
      expect(result.totals.concreteM3).toBeCloseTo(4.4, 6);
      expect(concrete?.quantity).toBeCloseTo(4.4, 6);
      expect(concrete?.withReserve).toBeCloseTo(4.4, 6);
      expect(concrete?.purchaseQty).toBeCloseTo(4.4, 6);
      expect(concrete?.packageInfo).toMatchObject({ size: 0.1, count: 44 });
      expect(concrete?.subtitle).toContain("по одному объёму бетон не заказывают");
    });

    it("армосетка при толщине ≥ 100 мм", () => {
      const mesh = findMaterial(result, "Арматурная сетка 100×100×4 мм");
      expect(mesh).toBeDefined();
      // 44 м² × 1,10 на нахлёсты = 48,4 м² → 49 м² к покупке.
      expect(mesh?.quantity).toBeCloseTo(44, 6);
      expect(mesh?.withReserve).toBeCloseTo(48.4, 6);
      expect(mesh?.purchaseQty).toBe(49);
      expect(mesh?.unit).toBe("м²");
      expect(mesh?.subtitle).toContain("не является готовой ведомостью армирования");
    });

    it("демпферная лента присутствует для бетонной", () => {
      // Engine: "Демпферная лента"
      const tape = findMaterial(result, "Демпферная разделительная лента");
      expect(tape?.subtitle).toContain("не готовая позиция к покупке");
    });

    it("щебень подготовка = 44 × 0,15 = 6,6 м³", () => {
      const gravel = findMaterial(result, "Щебень");
      expect(gravel?.quantity).toBeCloseTo(6.6, 2);
      expect(gravel?.subtitle).toContain("Предварительный геометрический объём");
    });

    it("песок подсыпка = 44 × 0,1 = 4,4 м³", () => {
      const sand = findMaterial(result, "Песок");
      expect(sand?.quantity).toBeCloseTo(4.4, 2);
      expect(sand?.subtitle).toContain("коэффициент поставки рыхлого материала");
    });

    it("геотекстиль присутствует", () => {
      // Engine: "Геотекстиль (50 м²)"
      expect(findMaterial(result, "Геотекстиль")).toBeDefined();
      expect(findMaterial(result, "Геотекстиль")?.subtitle).toContain("Справочная позиция");
    });

    it("без утепления — нет ЭППС", () => {
      expect(findMaterial(result, "ЭППС")).toBeUndefined();
    });

    it("инварианты", () => {
      checkInvariants(result);
      for (const material of result.materials) {
        expect(material.purchaseQty).toBeGreaterThanOrEqual(material.withReserve ?? material.quantity);
      }
    });
  });

  describe("Бетонная отмостка толщина 70 мм — без армосетки", () => {
    const result = calc({
      perimeter: 40,
      width: 1.0,
      thickness: 70,
      materialType: 0,
      withInsulation: 0,
    });

    it("нет армосетки при толщине < 100", () => {
      expect(findMaterial(result, "Арматурная сетка")).toBeUndefined();
    });
  });

  describe("Тротуарная плитка: периметр 30 м, ширина 0.8 м", () => {
    // area = 30 * 0.8 + 4 * 0.8² = 26.56
    const result = calc({
      perimeter: 30,
      width: 0.8,
      thickness: 100,
      materialType: 1,
      withInsulation: 0,
    });

    it("тротуарная плитка присутствует", () => {
      // Engine: "Тротуарная плитка"
      expect(findMaterial(result, "Тротуарная плитка")).toBeDefined();
    });

    it("чистая площадь плитки = 26,56 м²", () => {
      expect(result.totals.tileM2).toBeCloseTo(26.56, 6);
      const tile = findMaterial(result, "Тротуарная плитка");
      expect(tile?.quantity).toBeCloseTo(26.56, 6);
      expect(tile?.purchaseQty).toBe(27);
    });

    it("не выдаёт ложную точность расхода укладочной смеси", () => {
      expect(findMaterial(result, "Смесь для укладки")).toBeUndefined();
      expect(result.totals.mixBags).toBe(0);
      expect(result.warnings.some((warning) => warning.includes("Укладочный слой"))).toBe(true);
    });

    it("бордюр считает по наружной кромке: ceil((30 + 8 × 0,8) / 0,5) = 73", () => {
      const border = findMaterial(result, "Бордюр");
      expect(result.totals.outerEdgeLength).toBeCloseTo(36.4, 6);
      expect(border?.purchaseQty).toBe(73);
      expect(border?.subtitle).toContain("нужен не в каждом узле");
    });

    it("нет бетона для плиточной отмостки", () => {
      // materialType=1 has no concrete output
      expect(result.totals.concreteM3).toBe(0);
    });

    it("инварианты", () => {
      checkInvariants(result);
    });
  });

  describe("Мягкая отмостка: периметр 40 м, ширина 1.0 м", () => {
    // area = 44
    const result = calc({
      perimeter: 40,
      width: 1.0,
      thickness: 100,
      materialType: 2,
      withInsulation: 0,
    });

    it("профилированная мембрана присутствует", () => {
      // Engine: "Профилированная мембрана"
      const membrane = findMaterial(result, "Профилированная дренажная мембрана");
      expect(membrane).toBeDefined();
      expect(result.totals.membraneM2).toBeCloseTo(44, 6);
      expect(result.totals.membraneWithOverlapM2).toBeCloseTo(50.6, 6);
      expect(membrane?.quantity).toBeCloseTo(44, 6);
      expect(membrane?.withReserve).toBeCloseTo(50.6, 6);
      expect(membrane?.purchaseQty).toBe(51);
      expect(membrane?.subtitle).toContain("отвод воды задаёт проект");
    });

    it("декоративный щебень = 44 × 0,1 = 4,4 м³", () => {
      const pebble = findMaterial(result, "Декоративный щебень");
      expect(pebble?.quantity).toBeCloseTo(4.4, 2);
    });

    it("не дублирует щебёночную подушку и отдельный геотекстиль", () => {
      expect(findMaterial(result, "Щебень фракции 20–40 мм для подушки")).toBeUndefined();
      expect(findMaterial(result, "Геотекстиль 200 г/м²")).toBeUndefined();
      expect(result.totals.gravel).toBe(0);
      expect(result.totals.geotextileRolls).toBe(0);
      expect(result.warnings.some((warning) => warning.includes("прикреплённым геотекстилем"))).toBe(true);
    });

    it("нет бетона и плитки", () => {
      expect(result.totals.concreteM3).toBe(0);
      expect(result.totals.tileM2).toBe(0);
    });

    it("инварианты", () => {
      checkInvariants(result);
    });
  });

  describe("С утеплением ЭППС 50 мм", () => {
    const result = calc({
      perimeter: 40,
      width: 1.0,
      thickness: 100,
      materialType: 0,
      withInsulation: 50,
    });

    it("ЭППС присутствует", () => {
      // Engine: "ЭППС утеплитель (50 мм)"
      const epps = findMaterial(result, "ЭППС");
      expect(epps).toBeDefined();
      expect(epps?.subtitle).toContain("0,72 м²");
      expect(result.practicalNotes?.some((note) => note.includes("не подтверждает теплотехнический расчёт"))).toBe(true);
    });

    it("ЭППС плит = ceil(44 × 1,05 / 0,72) = 65", () => {
      const epps = findMaterial(result, "ЭППС");
      expect(epps?.purchaseQty).toBe(Math.ceil(44 * 1.05 / 0.72));
    });
  });

  describe("Режимы точности и сценарии", () => {
    it("ни один сценарий не опускается ниже чистой геометрии", () => {
      const result = calc({ perimeter: 40, width: 1, thickness: 100, materialType: 0, withInsulation: 0 });
      expect(result.scenarios?.MIN.exact_need).toBeGreaterThanOrEqual(4.4);
      expect(result.scenarios?.REC.exact_need).toBeGreaterThanOrEqual(4.4);
      expect(result.scenarios?.MAX.exact_need).toBeGreaterThanOrEqual(4.4);
    });

    it("в реалистичном и профессиональном режимах заказ не меньше потребности", () => {
      for (const accuracyMode of ["realistic", "professional"] as const) {
        const result = blindAreaDef.calculate({
          perimeter: 40,
          width: 1,
          thickness: 100,
          materialType: 0,
          withInsulation: 0,
          accuracyMode: accuracyMode as unknown as number,
        });
        const concrete = findMaterial(result, "Бетон");
        expect(concrete?.purchaseQty).toBeGreaterThanOrEqual(concrete?.withReserve ?? Infinity);
        const purchaseQty = concrete?.purchaseQty ?? 0;
        expect(purchaseQty * 10).toBeCloseTo(Math.round(purchaseQty * 10), 6);
      }
    });
  });

  describe("Предупреждения", () => {
    it("ширина < 0.8 м → предупреждение", () => {
      const result = calc({ perimeter: 40, width: 0.6, thickness: 100, materialType: 0, withInsulation: 0 });
      expect(result.warnings.some((w) => w.includes("менее 0,8 м"))).toBe(true);
      expect(result.practicalNotes?.some((note) => note.includes("не универсальный нормативный минимум"))).toBe(true);
    });

    it("бетон < 100 мм → предупреждение", () => {
      const result = calc({ perimeter: 40, width: 1.0, thickness: 70, materialType: 0, withInsulation: 0 });
      expect(result.warnings.some((w) => w.includes("Слой бетона 70 мм"))).toBe(true);
      expect(result.warnings.some((w) => w.includes("сетка автоматически не добавлена"))).toBe(true);
    });

    it("показывает нормативный диапазон уклона без назначения проектного значения", () => {
      const result = calc({ perimeter: 40, width: 1.0, thickness: 100, materialType: 0, withInsulation: 0 });
      expect(result.practicalNotes?.some((note) => note.includes("от 1% до 10%"))).toBe(true);
      expect(result.practicalNotes?.some((note) => note.includes("по покрытию и схеме водоотвода"))).toBe(true);
      expect(result.practicalNotes?.some((note) => note.includes("не готовая ведомость закупки"))).toBe(true);
      expect(result.practicalNotes?.some((note) => note.includes("В15 (М200) — допущение"))).toBe(true);
    });
  });
});
