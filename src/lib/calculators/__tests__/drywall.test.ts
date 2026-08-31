import { describe, it, expect } from "vitest";
import { drywallDef } from "../formulas/drywall";
import { findMaterial, checkInvariants, withBasicAccuracy } from "./_helpers";

const calc = withBasicAccuracy(drywallDef.calculate.bind(drywallDef));

describe("Калькулятор гипсокартона", () => {
  describe("Перегородка 5×2.7 м, 1 слой, шаг 600 мм", () => {
    // area = 13.5, sides = 2, totalSheetArea = 27
    // GKL_AREA = 3.0
    // sheetsNeeded = ceil(27/3.0 * 1.10) = ceil(9.9) = 10
    // cdCount = ceil(5/0.6)+1 = 9+1 = 10
    // Направляющий профиль для перегородки идёт только по полу и потолку: 2*5 = 10 м.
    const result = calc({
      workType: 0,
      length: 5,
      height: 2.7,
      layers: 1,
      profileStep: 0.6,
    });

    it("листов ГКЛ к покупке — целое число (11): нельзя купить 10.6 листа", () => {
      const sheets = findMaterial(result, "ГКЛ");
      // baseSheetsNeeded=10, REC ×1.06 = 10.6 расхода → к покупке ceil = 11 листов
      expect(sheets?.purchaseQty).toBe(11);
      expect(Number.isInteger(sheets?.purchaseQty)).toBe(true);
      // Точный REC-расход остаётся в totals для справки
      expect(result.totals.sheetsNeeded).toBeCloseTo(10.6, 1);
    });

    it("профиль ПН присутствует", () => {
      expect(findMaterial(result, "ПН")).toBeDefined();
    });

    it("перегородка комплектуется стоечным профилем ПС 50×50", () => {
      expect(findMaterial(result, "ПС 50×50")).toBeDefined();
    });

    it("саморезы 3,5×25 мм считаются поштучно и упаковками", () => {
      const screws = findMaterial(result, "3,5×25");
      expect(screws).toBeDefined();
      expect(screws?.unit).toBe("шт");
      expect(screws?.purchaseQty).toBeGreaterThanOrEqual(screws?.quantity ?? 0);
      expect((screws?.purchaseQty ?? 0) % 200).toBe(0);
    });

    it("саморезы для сборки каркаса считаются поштучно", () => {
      const screws = findMaterial(result, "3,5×9,5");
      expect(screws).toBeDefined();
      expect(screws?.unit).toBe("шт");
      expect((screws?.purchaseQty ?? 0) % 100).toBe(0);
    });

    it("направляющего профиля ПН нужно 4 хлыста по 3 м", () => {
      expect(result.totals.pnPerimeter).toBe(10);
      expect(result.totals.pnPieces).toBe(4);
    });

    it("шпаклёвка финишная Knauf присутствует", () => {
      expect(findMaterial(result, "финишная")).toBeDefined();
    });

    it("серпянка присутствует", () => {
      expect(findMaterial(result, "Серпянка")).toBeDefined();
    });

    it("totals содержат sheetsNeeded = 10.6 (REC ×1.06)", () => {
      expect(result.totals.sheetsNeeded).toBeCloseTo(10.6, 1);
    });

    it("инварианты", () => {
      checkInvariants(result);
    });
  });

  describe("Обшивка стены (1 сторона)", () => {
    // area = 13.5, sides = 1, totalSheetArea = 13.5
    // sheetsNeeded = ceil(13.5/3.0 * 1.10) = ceil(4.95) = 5
    const result = calc({
      workType: 1,
      length: 5,
      height: 2.7,
      layers: 1,
      profileStep: 0.6,
    });

    it("листов к покупке — целое (6): обшивка одной стороны", () => {
      const sheets = findMaterial(result, "ГКЛ");
      // baseSheetsNeeded=5, REC ×1.06 = 5.3 → к покупке ceil = 6 листов
      expect(sheets?.purchaseQty).toBe(6);
      expect(result.totals.sheetsNeeded).toBeCloseTo(5.3, 1);
    });
  });

  describe("Обшивка всех четырёх стен комнаты", () => {
    const result = calc({
      workType: 1,
      inputMode: 0,
      wallScope: 1,
      roomLength: 5,
      roomWidth: 4,
      height: 2.7,
      openingsArea: 3.6,
      layers: 1,
      profileStep: 0.6,
    });

    it("вычитает окна и двери из площади четырёх стен", () => {
      expect(result.totals.grossArea).toBeCloseTo(48.6, 3);
      expect(result.totals.openingsArea).toBeCloseTo(3.6, 3);
      expect(result.totals.area).toBeCloseTo(45, 3);
      expect(result.totals.wallRun).toBe(18);
    });

    it("считает стойки отдельно на каждой стене", () => {
      expect(result.totals.ppCount).toBe(36);
      expect(result.totals.pnPerimeter).toBeCloseTo(57.6, 3);
    });

    it("возвращает целое количество листов к покупке", () => {
      const sheets = findMaterial(result, "ГКЛ");
      expect(sheets?.purchaseQty).toBe(19);
    });
  });

  describe("Понятные режимы формы", () => {
    it("по умолчанию сразу предлагает все четыре стены комнаты", () => {
      const firstField = drywallDef.fields[0];
      expect(firstField.key).toBe("surfaceMode");
      expect(firstField.defaultValue).toBe(0);
      expect(firstField.options?.map((option) => option.label)).toEqual([
        "Все 4 стены комнаты",
        "Одну стену",
        "Перегородку",
      ]);
    });

    it("режим «все стены» передаёт движку одностороннюю обшивку четырёх стен", () => {
      const result = calc({
        surfaceMode: 0,
        inputMode: 0,
        roomLength: 5,
        roomWidth: 4,
        height: 2.7,
        openingsArea: 3.6,
        layers: 1,
        profileStep: 0.6,
      });

      expect(result.totals.workType).toBe(1);
      expect(result.totals.wallScope).toBe(1);
      expect(result.totals.area).toBeCloseTo(45, 3);
    });

    it("режим «перегородка» сохраняет двухсторонний расчёт", () => {
      const result = calc({
        surfaceMode: 2,
        inputMode: 0,
        length: 5,
        height: 2.7,
        layers: 1,
        profileStep: 0.6,
      });

      expect(result.totals.workType).toBe(0);
      expect(result.totals.sides).toBe(2);
    });
  });

  describe("Ввод по готовой площади", () => {
    const result = calc({
      workType: 1,
      inputMode: 1,
      area: 30,
      height: 2.7,
      layers: 1,
      profileStep: 0.6,
    });

    it("площадь листов точная, каркас помечен как ориентировочный", () => {
      expect(result.totals.area).toBe(30);
      expect(result.warnings.some((w) => w.includes("профили — ориентировочно"))).toBe(true);
    });
  });

  describe("2 слоя с каждой стороны", () => {
    // totalSheetArea = 13.5 * 2 * 2 = 54
    // sheetsNeeded = ceil(54/3.0 * 1.10) = ceil(19.8) = 20
    const result = calc({
      workType: 0,
      length: 5,
      height: 2.7,
      layers: 2,
      profileStep: 0.6,
    });

    it("листов к покупке — целое (22): 2 слоя с каждой стороны", () => {
      const sheets = findMaterial(result, "ГКЛ");
      // baseSheetsNeeded=20, REC ×1.06 = 21.2 → к покупке ceil = 22 листа
      expect(sheets?.purchaseQty).toBe(22);
      expect(result.totals.sheetsNeeded).toBeCloseTo(21.2, 1);
    });

    it("предупреждение о смещении стыков", () => {
      expect(result.warnings.some((w) => w.includes("смещением"))).toBe(true);
      expect(result.warnings.join(" ")).not.toContain("600 мм");
      expect(result.practicalNotes?.join(" ")).not.toContain("минимум на 400 мм");
    });

    it("для второго слоя отдельно указан саморез 3,5×35 мм", () => {
      const secondLayerScrews = findMaterial(result, "3,5×35");
      expect(secondLayerScrews).toBeDefined();
      expect(secondLayerScrews?.subtitle).toContain("второго слоя");
      expect(result.totals.screws35Pcs).toBeGreaterThan(0);
    });
  });

  describe("Высота > 3.5 м → проектная проверка каркаса", () => {
    it("не назначает профиль 100 мм без проекта и раскрывает фиксированный ПС 50×50", () => {
      const result = calc({
        workType: 0,
        length: 5,
        height: 4.0,
        layers: 1,
        profileStep: 0.6,
      });
      expect(result.warnings.some((w) => w.includes("ПС 50×50"))).toBe(true);
      expect(result.warnings.join(" ")).not.toContain("требуются профили шириной 100");
    });
  });

  describe("Прозрачные границы закупочной модели", () => {
    const result = calc({
      workType: 0,
      length: 5,
      height: 2.7,
      layers: 2,
      profileStep: 0.6,
    });

    it("показывает фиксированные нормы и упаковки рядом с материалами", () => {
      expect(findMaterial(result, "ГКЛ")?.subtitle).toContain("базовым запасом 10%");
      expect(findMaterial(result, "ПС 50×50")?.subtitle).toContain("+5%");
      expect(findMaterial(result, "3,5×25")?.subtitle).toContain("30 шт/м²");
      expect(findMaterial(result, "стартовая")?.subtitle).toContain("0,8 кг/м²");
      expect(findMaterial(result, "финишная")?.subtitle).toContain("1,0 кг/м²");
      expect(findMaterial(result, "Серпянка")?.subtitle).toContain("2,5 м");
      expect(findMaterial(result, "Грунтовка")?.subtitle).toContain("0,3 л/м²");
    });

    it("не обещает свойства конструкции по числу слоёв или шагу", () => {
      const layersField = drywallDef.fields.find((field) => field.key === "layers");
      const stepField = drywallDef.fields.find((field) => field.key === "profileStep");

      expect(layersField?.options?.map((option) => option.label)).toEqual(["1 слой", "2 слоя"]);
      expect(layersField?.hint).toContain("не подтверждают огнестойкость или звукоизоляцию");
      expect(stepField?.options?.map((option) => option.label)).toEqual(["400 мм", "600 мм"]);
      expect(stepField?.hint).toContain("альбому выбранной системы");
    });

    it("ссылается на действующие карточки Росстандарта и раскрывает непроверяемые параметры", () => {
      const content = drywallDef.seoContent?.descriptionHtml ?? "";

      expect(content).toContain("protect.gost.ru/sp/details/92439dea-05ad-4cfe-9dc4-c1bddcdb8c55");
      expect(content).toContain("изменением № 1");
      expect(content).toContain("protect.gost.ru/gost/details/2bab5670-8967-4962-94cb-4e15a4d15f4b");
      expect(content).toContain("не проверяет предельную высоту");
      expect(content).toContain("по площади всех слоёв");
    });
  });
});
