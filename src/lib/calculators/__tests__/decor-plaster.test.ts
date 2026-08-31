import { describe, it, expect } from "vitest";
import { decorPlasterDef } from "../formulas/decor-plaster";
import { findMaterial, checkInvariants, withBasicAccuracy } from "./_helpers";

const calc = withBasicAccuracy(decorPlasterDef.calculate.bind(decorPlasterDef));

describe("Калькулятор декоративной штукатурки", () => {
  describe("Контракт реальной web-формы", () => {
    it("сохраняет публичный ключ textureType и мостит его в canonical", () => {
      expect(decorPlasterDef.fields.find((field) => field.label.includes("профиль фактуры"))?.key).toBe("textureType");
    });

    it("выбор профиля в форме меняет расход и материал", () => {
      const result = calc({ area: 20, textureType: 3, surface: 1, bagWeight: 25 });

      expect(result.totals.consumption).toBe(4);
      expect(findMaterial(result, "Шуба")).toBeDefined();
    });

    it("поддерживает прямой canonical-ключ texture", () => {
      const result = calc({ area: 20, texture: 2, surface: 1, bagWeight: 25 });

      expect(result.totals.consumption).toBe(3);
      expect(findMaterial(result, "Камешковая")).toBeDefined();
    });
  });

  describe("Короед 2 мм (texture=0), фасад, 50 м², мешки 25 кг", () => {
    const result = calc({
      area: 50,
      texture: 0,
      surface: 0,
      bagWeight: 25,
    });

    it("короед 2 мм присутствует", () => {
      // Engine: "Короед 2 мм (мешки 25 кг)"
      const plaster = findMaterial(result, "Короед 2 мм");
      expect(plaster).toBeDefined();
    });

    it("грунтовка глубокого проникновения", () => {
      // Engine: "Грунтовка глубокого проникновения (10 л)"
      const primer = findMaterial(result, "глубокого проникновения");
      expect(primer).toBeDefined();
    });

    it("тонированная грунтовка", () => {
      // Engine: "Тонированная грунтовка (5 л)"
      const primer = findMaterial(result, "Тонированная грунтовка");
      expect(primer).toBeDefined();
    });

    it("пигмент / колер", () => {
      // Engine: "Пигмент / колер (банки)"
      const color = findMaterial(result, "Пигмент");
      expect(color).toBeDefined();
    });

    it("воск отсутствует (не венецианская)", () => {
      expect(findMaterial(result, "Воск")).toBeUndefined();
    });

    it("totals содержат area, consumption, totalKg", () => {
      expect(result.totals.area).toBe(50);
      expect(result.totals.consumption).toBe(2.5);
    });

    it("показывает фиксированные допущения основной и сопутствующих позиций", () => {
      expect(findMaterial(result, "Короед 2 мм")?.subtitle).toContain("2.5 кг/м²");
      expect(findMaterial(result, "глубокого проникновения")?.subtitle).toContain("0,20 л/м² + 15%");
      expect(findMaterial(result, "Тонированная грунтовка")?.subtitle).toContain("Условная позиция");
      expect(findMaterial(result, "Пигмент")?.subtitle).toContain("не рецептура колеровки");
      expect(result.warnings.some((warning) => warning.includes("этикетки конкретного продукта"))).toBe(true);
    });

    it("инварианты", () => {
      checkInvariants(result);
    });
  });

  describe("Короед 3 мм (texture=1), 30 м²", () => {
    const result = calc({
      area: 30,
      texture: 1,
      surface: 1,
      bagWeight: 25,
    });

    it("короед 3 мм присутствует", () => {
      // Engine: "Короед 3 мм (мешки 25 кг)"
      expect(findMaterial(result, "Короед 3 мм")).toBeDefined();
    });
  });

  describe("Камешковая (texture=2), 100 м²", () => {
    const result = calc({
      area: 100,
      texture: 2,
      surface: 0,
      bagWeight: 25,
    });

    it("камешковая присутствует", () => {
      // Engine: "Камешковая (мешки 25 кг)"
      expect(findMaterial(result, "Камешковая")).toBeDefined();
    });
  });

  describe("Шуба (texture=3), 20 м²", () => {
    const result = calc({
      area: 20,
      texture: 3,
      surface: 1,
      bagWeight: 25,
    });

    it("шуба присутствует", () => {
      // Engine: "Шуба (мешки 25 кг)"
      expect(findMaterial(result, "Шуба")).toBeDefined();
    });
  });

  describe("Венецианская (texture=4), интерьер, 40 м²", () => {
    const result = calc({
      area: 40,
      texture: 4,
      surface: 1,
      bagWeight: 25,
    });

    it("венецианская присутствует", () => {
      // Engine: "Венецианская (мешки 25 кг)"
      expect(findMaterial(result, "Венецианская")).toBeDefined();
    });

    it("воск для венецианской штукатурки присутствует", () => {
      // Engine: "Воск для венецианской штукатурки (1 л)"
      const wax = findMaterial(result, "Воск");
      expect(wax).toBeDefined();
      expect(wax?.subtitle).toContain("только если воск предусмотрен");
    });

    it("не выдаёт черновой профиль за товарный расчёт", () => {
      expect(result.warnings.some((warning) => warning.includes("1,2 кг/м²"))).toBe(true);
      expect(result.warnings.some((warning) => warning.includes("итог нельзя использовать как готовый заказ"))).toBe(true);
    });
  });

  describe("Венецианская на фасаде → предупреждение", () => {
    const result = calc({
      area: 50,
      texture: 4,
      surface: 0,
      bagWeight: 25,
    });

    it("не назначает универсальный лак и требует фасадный продукт", () => {
      expect(result.warnings.some((w) => w.includes("защитный лак"))).toBe(false);
      expect(result.warnings.some((w) => w.includes("не подтверждает пригодность"))).toBe(true);
    });
  });

  describe("Большая площадь > 200 м²", () => {
    it("предупреждение об оптовой закупке", () => {
      const r = calc({ area: 300, texture: 0, surface: 0, bagWeight: 25 });
      // Engine: "Большая площадь — рассмотрите оптовую закупку"
      expect(r.warnings.some(w => w.includes("оптовую закупку"))).toBe(true);
    });
  });

  describe("Минимальная площадь 1 м²", () => {
    const result = calc({
      area: 1,
      texture: 0,
      surface: 1,
      bagWeight: 25,
    });

    it("расчёт корректен при 1 м²", () => {
      checkInvariants(result);
    });
  });

  describe("Проверяемые границы контента", () => {
    it("показывает фактические коэффициенты модели и первичные ссылки", () => {
      expect(decorPlasterDef.formulaDescription).toContain("Камешковая: 3,0 кг/м²");
      expect(decorPlasterDef.formulaDescription).toContain("режим точности и сценарий MIN/REC/MAX");
      expect(decorPlasterDef.seoContent?.descriptionHtml).toContain("ГОСТ Р 54358-2017 с изменением № 1");
      expect(decorPlasterDef.seoContent?.descriptionHtml).toContain("protect.gost.ru/sp/details/ca915ed9");
      expect(decorPlasterDef.seoContent?.descriptionHtml).toContain("dm.henkel-dam.com/is/content/henkel/ru-ceresit-tds-CT35");
      expect(decorPlasterDef.seoContent?.descriptionHtml).toContain("vgtkraska.ru/venecianskaya");
    });

    it("не содержит универсальных требований и выдуманной зимней рецептуры", () => {
      const html = decorPlasterDef.seoContent?.descriptionHtml ?? "";
      const faq = decorPlasterDef.seoContent?.faq.map((item) => item.answer).join(" ") ?? "";

      expect(html).not.toContain("обязательно нанесение кварцевой грунтовки");
      expect(html).not.toContain("отклонение не более 2 мм/м");
      expect(faq).not.toContain("антиморозными добавками");
      expect(faq).not.toContain("лучше скрывает мелкие неровности");
    });
  });
});
