import { describe, it, expect } from "vitest";
import { screedDef } from "../formulas/screed";
import { ensureScenarioContract } from "../scenario-adapter";
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
      expect(mix?.purchaseQty).toBe(2800);
      expect(mix?.packageInfo).toEqual({
        count: 70,
        size: 40,
        packageUnit: "мешков",
      });
      expect(screedDef.seoContent?.descriptionHtml).toContain("1,54 м&sup3;");
      expect(screedDef.seoContent?.descriptionHtml).toContain("2 800 кг");
      expect(screedDef.seoContent?.descriptionHtml).toContain("70 мешков по 40 кг");
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
      expect(cement?.subtitle).toContain("рабочей рецептурой");
      expect(cement?.subtitle).not.toContain("Раствор М150");
    });

    it("песок присутствует", () => {
      expect(findMaterial(result, "Песок")).toBeDefined();
    });

    it("не добавляет в закупку слои и комплектующие без данных о конструкции пола", () => {
      expect(findMaterial(result, "Сетка армирующая")).toBeUndefined();
      expect(findMaterial(result, "Полиэтиленовая плёнка")).toBeUndefined();
      expect(findMaterial(result, "Демпферная лента")).toBeUndefined();
      expect(findMaterial(result, "Маячковый профиль")).toBeUndefined();
    });

    it("инварианты", () => {
      checkInvariants(result);
    });
  });

  describe("Готовая смесь (пескобетон М300)", () => {
    // area=20, thicknessM=0.05, volume_multiplier=1.10 (готовая смесь, заводская)
    // volume = 20 * 0.05 * 1.10 = 1.10 м³
    // паспортный расход по умолчанию: 20 кг/м² на 10 мм
    // 20 м² × 5 × 20 = 2000 кг; мешки 40 кг: 50 шт.
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

    it("масса 2000 кг → 50 мешков × 40 кг = 2000 кг", () => {
      const mix = findMaterial(result, "Пескобетон М300");
      expect(mix?.purchaseQty).toBe(2000);
      expect(mix?.packageInfo?.count).toBe(50);
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

    it("плановый объём с коэффициентом модели 1,07 = 1,07 м³", () => {
      expect(result.totals.volume).toBeCloseTo(1.07, 3);
    });

    it("не назначает фибру и показывает подрядчику расчётный объём", () => {
      expect(findMaterial(result, "Фиброволокно")).toBeUndefined();
      const volume = findMaterial(result, "Расчётный объём полусухой стяжки");
      expect(volume?.quantity).toBeCloseTo(1.07, 3);
      expect(volume?.unit).toBe("м³");
    });
  });

  describe("Ручной замес — явная рабочая рецептура", () => {
    const base = { inputMode: 0 as const, length: 5, width: 4, thickness: 50, screedType: 0 };

    it("стартовая рецептура даёт цемент 400 кг к покупке", () => {
      const result = calc({ ...base });
      const cement = findMaterial(result, "Цемент");
      expect(cement?.purchaseQty).toBe(400);
      expect(cement?.name).toContain("рабочей рецептуре");
    });

    it("пересчитывает цемент и песок по введённой рецептуре на 1 м³", () => {
      const result = calc({ ...base, cementKgPerM3: 300, sandKgPerM3: 1100 });
      expect(findMaterial(result, "Цемент")?.quantity).toBeCloseTo(345, 3);
      expect(findMaterial(result, "Песок")?.quantity).toBeCloseTo(1.265, 3);
    });

    it("цемент кратен мешку 50 кг (округление вверх)", () => {
      const result = calc({ ...base });
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
      expect(sand.quantity).toBe(1.38);
      expect(sand.purchaseQty).toBe(1.38);
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
      expect(mix.packageInfo?.count).toBe(67);
      expect(mix.purchaseQty).toBe(2010);
      expect(result.scenarios).toBeUndefined();
    });

    it("использует расход конкретной смеси с упаковки", () => {
      const result = calc({ ...base, readyConsumptionPer10mm: 18, readyBagWeight: 40 });
      const mix = findMaterial(result, "Пескобетон")!;
      expect(mix.quantity).toBe(1800);
      expect(mix.packageInfo?.count).toBe(45);
      expect(mix.purchaseQty).toBe(1800);
    });
  });

  describe("Единый понятный результат", () => {
    it("не показывает второй противоречащий закупке сценарный итог", () => {
      const result = screedDef.calculate({
        inputMode: 0,
        length: 5,
        width: 4,
        thickness: 50,
        screedType: 0,
      });
      const cement = findMaterial(result, "Цемент")!;

      expect(cement.packageInfo?.count).toBe(8);
      expect(cement.purchaseQty).toBe(400);
      expect(result.scenarios).toBeUndefined();
      expect(result.accuracyExplanation).toBeUndefined();
      expect(ensureScenarioContract("styazhka", result).scenarios).toBeUndefined();
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
    it("не включает сетку, плёнку, маяки и ленту в ведомость без проектных данных", () => {
      const result = calc({ inputMode: 1, area: 60, thickness: 80, screedType: 0 });
      const notes = result.practicalNotes?.join(" ") ?? "";

      expect(findMaterial(result, "Сетка")).toBeUndefined();
      expect(findMaterial(result, "Полиэтиленовая плёнка")).toBeUndefined();
      expect(findMaterial(result, "Маячковый профиль")).toBeUndefined();
      expect(findMaterial(result, "Демпферная лента")).toBeUndefined();
      expect(notes).toContain("не включены в закупочную ведомость");
      expect(notes).not.toContain("обязательно армирование");
    });

    it("не обещает назначение марки цемента и пропорции по типу помещения", () => {
      expect(screedDef.fields.find((field) => field.key === "cementGrade")).toBeUndefined();
      expect(screedDef.fields.find((field) => field.key === "mixProportion")).toBeUndefined();
      expect(screedDef.fields.find((field) => field.key === "cementKgPerM3")?.hint).toContain("рабочей рецептуры");
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
