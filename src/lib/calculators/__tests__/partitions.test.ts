import { describe, it, expect } from "vitest";
import { partitionsDef } from "../formulas/partitions";
import { findMaterial, checkInvariants, withBasicAccuracy } from "./_helpers";

const calc = withBasicAccuracy(partitionsDef.calculate.bind(partitionsDef));

describe("Калькулятор перегородок из блоков", () => {
  describe("Входы и проектные границы", () => {
    it("прямо сообщает, что проёмы не вычитаются", () => {
      const length = partitionsDef.fields.find((field) => field.key === "length");
      const formula = partitionsDef.formulaDescription ?? "";
      const seo = partitionsDef.seoContent?.descriptionHtml ?? "";

      expect(length?.hint).toContain("Двери и другие проёмы не вычитаются");
      expect(formula).toContain("без вычета дверей и других проёмов");
      expect(seo).not.toContain("S<sub>проёмов</sub>");
      expect(seo).toContain("Проёмы не вычитаются");
    });

    it("маркирует D500/D600 как ярлыки модели, а не подтверждённые свойства", () => {
      const blockType = partitionsDef.fields.find((field) => field.key === "blockType");
      const labels = blockType?.options?.map((option) => option.label).join(" ") ?? "";
      const thickness = partitionsDef.fields.find((field) => field.key === "thickness");

      expect(labels).toContain("D500");
      expect(labels).toContain("D600");
      expect(blockType?.hint).toContain("ярлыки текущей модели");
      expect(thickness?.hint).toContain("не подтверждает прочность");
    });

    it("раскрывает фактические коэффициенты и актуальные стандарты", () => {
      const formula = partitionsDef.formulaDescription ?? "";
      const seo = partitionsDef.seoContent?.descriptionHtml ?? "";

      expect(formula).toContain("1,5 кг/м² и мешок 25 кг");
      expect(formula).toContain("0,8 кг/м² и мешок 20 кг");
      expect(formula).toContain("условная линия через 0,75 м");
      expect(seo).toContain("ГОСТ 31360-2024");
      expect(seo).toContain("ГОСТ 6428-2018");
      expect(seo).toContain("СП 15.13330.2020 с изменением № 1");
      expect(seo).not.toContain("~38 дБ");
      expect(seo).not.toContain("До 25 кг на точку");
    });

    it("маркирует все автоматически добавленные материалы как предварительные", () => {
      const result = calc({ length: 5, height: 2.7, thickness: 100, blockType: 0 });

      expect(findMaterial(result, "Газобетонные перегородочные блоки")?.subtitle).toContain("фиксированный ярлык текущей модели");
      expect(findMaterial(result, "Клей для тонкошовной кладки")?.subtitle).toContain("1.5 кг/м²");
      expect(findMaterial(result, "Армирующая лента")?.subtitle).toContain("через 0.75 м");
      expect(findMaterial(result, "монтажная пена")?.subtitle).toContain("суммы верха и двух боковых");
      expect(findMaterial(result, "Грунтовка")?.subtitle).toContain("для двух сторон");
      expect(findMaterial(result, "Упругая лента")?.subtitle).toContain("Справочная длина");
      expect(result.practicalNotes?.some((note) => note.includes("допущения текущей модели"))).toBe(true);
    });
  });

  describe("Газобетон D500 (blockType=0), 5x2.7 м, толщина 100 мм", () => {
    const result = calc({
      length: 5,
      height: 2.7,
      thickness: 100,
      blockType: 0,
    });

    it("указаны тип, модельная плотность и размер газобетонного блока", () => {
      const blocks = findMaterial(result, "Газобетонные перегородочные блоки D500 625×250×100 мм");
      expect(blocks).toBeDefined();
    });

    it("указан клей для тонкошовной кладки в мешках 25 кг", () => {
      const glue = findMaterial(result, "Клей для тонкошовной кладки");
      expect(glue).toBeDefined();
    });

    it("армирующая лента для ячеистых блоков присутствует", () => {
      const arm = findMaterial(result, "Армирующая лента");
      expect(arm).toBeDefined();
    });

    it("профессиональная монтажная пена 750 мл присутствует", () => {
      const foam = findMaterial(result, "монтажная пена");
      expect(foam).toBeDefined();
    });

    it("грунтовка (канистра 10 л) присутствует", () => {
      // Engine: "Грунтовка (канистра 10 л)"
      expect(findMaterial(result, "Грунтовка")).toBeDefined();
    });

    it("упругая лента для примыкания присутствует", () => {
      expect(findMaterial(result, "Упругая лента")).toBeDefined();
    });

    it("totals содержат wallArea, blocks, length, height", () => {
      // wallArea=5*2.7=13.5
      expect(result.totals.wallArea).toBeCloseTo(13.5, 2);
      expect(result.totals.blocks).toBeGreaterThan(0);
    });

    it("инварианты", () => {
      checkInvariants(result);
    });
  });

  describe("Пенобетон D600 (blockType=1), 3x3.0 м, толщина 150 мм", () => {
    const result = calc({
      length: 3,
      height: 3.0,
      thickness: 150,
      blockType: 1,
    });

    it("блоки перегородочные присутствуют", () => {
      expect(findMaterial(result, "Пенобетонные перегородочные блоки D600")).toBeDefined();
    });

    it("клей для блоков присутствует", () => {
      expect(findMaterial(result, "Клей для тонкошовной кладки")).toBeDefined();
    });

    it("нет гипсового монтажного клея (не ПГП)", () => {
      expect(findMaterial(result, "Гипсовый монтажный клей")).toBeUndefined();
    });
  });

  describe("ПГП гипсовые (blockType=2), 4x2.7 м, 100 мм", () => {
    const result = calc({
      length: 4,
      height: 2.7,
      thickness: 100,
      blockType: 2,
    });

    it("блоки перегородочные присутствуют", () => {
      expect(findMaterial(result, "Гипсовые пазогребневые плиты 667×500×100 мм")).toBeDefined();
    });

    it("гипсовый монтажный клей присутствует (вместо клея для блоков)", () => {
      const gypsum = findMaterial(result, "Гипсовый монтажный клей");
      expect(gypsum).toBeDefined();
      expect(gypsum?.subtitle).toContain("0.8 кг/м²");
    });

    it("клей для блоков отсутствует", () => {
      expect(findMaterial(result, "Клей для тонкошовной кладки")).toBeUndefined();
    });

    it("универсальная армирующая сетка для ПГП не добавляется", () => {
      expect(findMaterial(result, "Армирующая лента")).toBeUndefined();
    });

    it("для нетипичной толщины ПГП показывается предупреждение", () => {
      const r2 = calc({ length: 4, height: 2.7, thickness: 150, blockType: 2 });
      expect(r2.warnings.some((w) => w.includes("типовые толщины"))).toBe(true);
    });
  });

  describe("ПГП 75 мм из общей формы нормализуется к реальному формату 80 мм", () => {
    it("в ведомости и totals указана толщина 80 мм", () => {
      const result = calc({ length: 4, height: 2.7, thickness: 75, blockType: 2 });
      expect(result.totals.requestedThickness).toBe(75);
      expect(result.totals.thickness).toBe(80);
      expect(findMaterial(result, "667×500×80 мм")).toBeDefined();
    });
  });

  describe("Высота > 3.5 м → предупреждение", () => {
    const result = calc({
      length: 5,
      height: 3.8,
      thickness: 100,
      blockType: 0,
    });

    it("предупреждение о проверке конструктором", () => {
      expect(result.warnings.some((w) => w.includes("конструктор"))).toBe(true);
    });
  });

  describe("Минимальные размеры", () => {
    const result = calc({
      length: 1,
      height: 2,
      thickness: 75,
      blockType: 0,
    });

    it("расчёт корректен при минимальных размерах", () => {
      checkInvariants(result);
    });
  });
});
