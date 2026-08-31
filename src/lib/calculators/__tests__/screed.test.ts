import { describe, it, expect } from "vitest";
import { screedDef } from "../formulas/screed";
import { findMaterial, checkInvariants, withBasicAccuracy } from "./_helpers";

const calc = withBasicAccuracy(screedDef.calculate.bind(screedDef));

describe("Калькулятор стяжки пола", () => {
  describe("SEO-обещание совпадает с расчётом", () => {
    const result = calc({
      inputMode: 0,
      length: 5,
      width: 4,
      thickness: 70,
      screedType: 1,
      readyMix: 0,
      readyBagWeight: 40,
    });

    it("описывает полную толщину стяжки, в том числе над тёплым полом", () => {
      expect(screedDef.metaDescription).toContain("полной толщине");
      expect(screedDef.metaDescription).toContain("тёплым полом");
      expect(screedDef.seoContent?.descriptionHtml).toContain("весь слой от основания");
    });

    it("пример 20 м² и 70 мм совпадает с движком и фасовкой", () => {
      const mix = findMaterial(result, "Пескобетон М300");

      expect(result.totals.volume).toBeCloseTo(1.54, 3);
      expect(mix?.purchaseQty).toBe(3080);
      expect(mix?.packageInfo).toEqual({
        count: 77,
        size: 40,
        packageUnit: "мешков",
      });
      expect(screedDef.seoContent?.descriptionHtml).toContain("1,54 м&sup3;");
      expect(screedDef.seoContent?.descriptionHtml).toContain("3 080 кг");
      expect(screedDef.seoContent?.descriptionHtml).toContain("77 мешков по 40 кг");
    });
  });

  describe("ЦПС 1:3, 5×4 м, толщина 50 мм", () => {
    // area = 20, thicknessM = 0.05
    // volume = 20 * 0.05 * 1.15 = 1.15 (усадочный множитель 1.15 для ручного замеса ЦПС 1:3)
    // cementKg = 1.15 * 0.25 * 1300 = 373.75
    // cementBags = ceil(373.75/50) = ceil(7.475) = 8
    const result = calc({
      inputMode: 0,
      length: 5,
      width: 4,
      thickness: 50,
      screedType: 0,
    });

    it("площадь = 20 м²", () => {
      expect(result.totals.area).toBe(20);
    });

    it("плановый объём с коэффициентом модели 1,15 = 1,15 м³", () => {
      expect(result.totals.volume).toBeCloseTo(1.15, 3);
    });

    it("цемент 8 мешков × 50 кг = 400 кг", () => {
      const cement = findMaterial(result, "Цемент");
      expect(cement?.purchaseQty).toBe(400);
      expect(cement?.subtitle).toContain("марка раствора требует подбора состава");
      expect(cement?.subtitle).not.toContain("Раствор М150");
    });

    it("песок присутствует", () => {
      expect(findMaterial(result, "Песок")).toBeDefined();
    });

    it("армосетка при 50 мм >= 40 мм", () => {
      expect(findMaterial(result, "Сетка армирующая")).toBeDefined();
    });

    it("демпферная лента присутствует", () => {
      expect(findMaterial(result, "Демпферная лента")).toBeDefined();
    });

    it("инварианты", () => {
      checkInvariants(result);
    });
  });

  describe("Готовая смесь (пескобетон М300)", () => {
    // area=20, thicknessM=0.05, volume_multiplier=1.10 (готовая смесь, заводская)
    // volume = 20 * 0.05 * 1.10 = 1.10 м³
    // массa = 1.10 * 2000 = 2200 кг; мешки 40 кг: ceil(2200/40) = 55 → 2200 кг
    const result = calc({
      inputMode: 0,
      length: 5,
      width: 4,
      thickness: 50,
      screedType: 1,
    });

    it("пескобетон М300 присутствует", () => {
      expect(findMaterial(result, "Пескобетон М300")).toBeDefined();
    });

    it("плановый объём с коэффициентом модели 1,10 = 1,10 м³", () => {
      expect(result.totals.volume).toBeCloseTo(1.10, 3);
    });

    it("масса 2200 кг → 55 мешков × 40 кг = 2200 кг", () => {
      const mix = findMaterial(result, "Пескобетон М300");
      expect(mix?.purchaseQty).toBe(2200);
      expect(mix?.packageInfo?.count).toBe(55);
    });
  });

  describe("Полусухая стяжка", () => {
    // area=20, thicknessM=0.05, volume_multiplier=1.07 (полусухая, минимум воды)
    // volume = 20 * 0.05 * 1.07 = 1.07 м³
    // cpsKg = 1.07 * 1800 = 1926
    // Для механизированной полусухой стяжки мешки не являются единицей
    // закупки: показываем ориентировочную массу компонентов.
    const result = calc({
      inputMode: 0,
      length: 5,
      width: 4,
      thickness: 50,
      screedType: 2,
    });

    it("ориентировочная масса сухих компонентов присутствует", () => {
      expect(findMaterial(result, "Сухие компоненты для полусухой")).toBeDefined();
    });

    it("плановый объём с коэффициентом модели 1,07 = 1,07 м³", () => {
      expect(result.totals.volume).toBeCloseTo(1.07, 3);
    });

    it("не выдумывает фасовку 50 кг для механизированной работы", () => {
      const cps = findMaterial(result, "Сухие компоненты для полусухой");
      expect(cps?.quantity).toBe(1926);
      expect(cps?.purchaseQty).toBe(1930);
      expect(cps?.packageInfo).toBeUndefined();
    });

    it("фиброволокно ПП присутствует", () => {
      expect(findMaterial(result, "Фиброволокно")).toBeDefined();
    });

    it("фиброволокно считается по объёму, а не по площади", () => {
      const fiber = findMaterial(result, "Фиброволокно");
      // 1,07 м³ × 0,9 кг/м³ = 0,963 кг → 2 пакета по 0,6 кг.
      expect(fiber?.quantity).toBeCloseTo(0.963, 3);
      expect(fiber?.purchaseQty).toBe(1.2);
      expect(fiber?.packageInfo).toEqual({
        count: 2,
        size: 0.6,
        packageUnit: "пакетов",
      });
    });
  });

  describe("Ручной замес — марка цемента и пропорция", () => {
    const base = { inputMode: 0 as const, length: 5, width: 4, thickness: 50, screedType: 0 };

    it("дефолт (М400, 1:3) не изменился — паритет: цемент 400 кг", () => {
      const result = calc({ ...base, cementGrade: 0, mixProportion: 0 });
      const cement = findMaterial(result, "Цемент");
      expect(cement?.purchaseQty).toBe(400);
      expect(cement?.name).toContain("М400");
    });

    it("М400 1:4 — цемента меньше, чем при 1:3", () => {
      const ref = calc({ ...base, cementGrade: 0, mixProportion: 0 });
      const result = calc({ ...base, cementGrade: 0, mixProportion: 1 });
      const refKg = findMaterial(ref, "Цемент")!.quantity;
      const kg = findMaterial(result, "Цемент")!.quantity;
      expect(kg).toBeLessThan(refKg);
    });

    it("М500 — цемента меньше, чем у М400 при той же пропорции", () => {
      const m400 = calc({ ...base, cementGrade: 0, mixProportion: 0 });
      const m500 = calc({ ...base, cementGrade: 1, mixProportion: 0 });
      const kg400 = findMaterial(m400, "Цемент")!.quantity;
      const kg500 = findMaterial(m500, "Цемент")!.quantity;
      expect(kg500).toBeLessThan(kg400);
      expect(findMaterial(m500, "Цемент")?.name).toContain("М500");
    });

    it("цемент кратен мешку 50 кг (округление вверх)", () => {
      const result = calc({ ...base, cementGrade: 1, mixProportion: 1 });
      const cement = findMaterial(result, "Цемент")!;
      expect(cement.purchaseQty! % 50).toBe(0);
      expect(cement.purchaseQty).toBeGreaterThanOrEqual(cement.quantity);
    });

    it("учитывает выбранную фасовку цемента 25 кг", () => {
      const result = calc({ ...base, cementBagWeight: 25 });
      const cement = findMaterial(result, "Цемент")!;
      expect(cement.packageInfo?.size).toBe(25);
      expect(cement.packageInfo?.count).toBe(15);
      expect(cement.purchaseQty).toBe(375);
    });

    it("не округляет песок до лишней целой тонны", () => {
      const result = calc({ ...base });
      const sand = findMaterial(result, "Песок")!;
      expect(sand.quantity).toBe(1.4);
      expect(sand.purchaseQty).toBe(1.4);
    });
  });

  describe("Готовая смесь — пескобетон", () => {
    const base = { inputMode: 0 as const, length: 5, width: 4, thickness: 50, screedType: 1 };

    it("пескобетон М300 по умолчанию, мешки 40 кг", () => {
      const result = calc({ ...base, readyMix: 0 });
      const mix = findMaterial(result, "Пескобетон");
      expect(mix).toBeDefined();
      expect(mix?.packageInfo?.size).toBe(40);
      expect(mix?.purchaseQty! % 40).toBe(0);
    });

    it("вариант М200 — другое название позиции", () => {
      const result = calc({ ...base, readyMix: 1 });
      expect(findMaterial(result, "цементно-песчаная смесь М200")).toBeDefined();
    });

    it("пересчитывает покупку для мешков 30 кг", () => {
      const result = calc({ ...base, readyBagWeight: 30 });
      const mix = findMaterial(result, "Пескобетон")!;
      expect(mix.packageInfo?.size).toBe(30);
      expect(mix.packageInfo?.count).toBe(74);
      expect(mix.purchaseQty).toBe(2220);
      expect(result.scenarios?.REC.buy_plan.package_size).toBe(30);
    });
  });

  describe("Предупреждения", () => {
    it("толщина > 100 мм → проектная проверка без назначения слоёв", () => {
      const result = calc({ inputMode: 1, area: 20, thickness: 120, screedType: 0 });
      expect(result.warnings.some((w) => w.includes("нагрузку на перекрытие"))).toBe(true);
      expect(result.warnings.some((w) => w.includes("рекомендуется разделить"))).toBe(false);
    });

    it("площадь > 50 м² → проверка организации работ без выбора смеси", () => {
      const result = calc({ inputMode: 1, area: 60, thickness: 50, screedType: 0 });
      expect(result.warnings.some((w) => w.includes("карты заливки"))).toBe(true);
      expect(result.warnings.some((w) => w.includes("рекомендуется использовать"))).toBe(false);
    });
  });

  describe("Пользовательские границы расчёта", () => {
    it("помечает сетку, плёнку, маяки и периметр как предварительные", () => {
      const result = calc({ inputMode: 1, area: 60, thickness: 80, screedType: 0 });
      const notes = result.practicalNotes?.join(" ") ?? "";

      expect(findMaterial(result, "Сетка")?.subtitle).toContain("внутреннему порогу толщины");
      expect(findMaterial(result, "Полиэтиленовая плёнка")?.subtitle).toContain("Нужна не для каждой конструкции");
      expect(notes).toContain("4 × √S");
      expect(notes).toContain("один профиль на 2 м²");
      expect(notes).not.toContain("обязательно армирование");
    });

    it("не обещает назначение марки цемента и пропорции по типу помещения", () => {
      const cement = screedDef.fields.find((field) => field.key === "cementGrade")!;
      const proportion = screedDef.fields.find((field) => field.key === "mixProportion")!;
      const labels = `${cement.options?.map((option) => option.label).join(" ")} ${proportion.options?.map((option) => option.label).join(" ")}`;

      expect(labels).not.toContain("гараж");
      expect(labels).not.toContain("жилые комнаты");
      expect(labels).not.toContain("нежилые");
      expect(cement.hint).toContain("не задаёт марку раствора");
      expect(proportion.hint).toContain("не подбор марки раствора");
    });

    it("использует действующие профильные ссылки и не обещает универсальные сроки", () => {
      const content = `${screedDef.seoContent?.descriptionHtml ?? ""} ${JSON.stringify(screedDef.seoContent?.faq ?? [])}`;

      expect(content).toContain("СП 71.13330.2017");
      expect(content).toContain("ГОСТ 31358-2019");
      expect(content).not.toContain("СНиП 3.04.01-87");
      expect(content).not.toContain("ГОСТ 28013-98");
      expect(content).not.toContain("28&ndash;35");
      expect(content).not.toContain("не более <strong>2%");
    });

    it("полусухая ведомость требует согласовать рецептуру без категоричного оборудования", () => {
      const result = calc({ inputMode: 0, length: 5, width: 4, thickness: 50, screedType: 2 });
      const notes = result.practicalNotes?.join(" ") ?? "";

      expect(notes).toContain("рецептуру");
      expect(notes).not.toContain("затирочная машина обязательна");
    });
  });
});
