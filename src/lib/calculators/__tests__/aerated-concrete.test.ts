import { describe, it, expect } from "vitest";
import { aeratedConcreteDef } from "../formulas/aerated-concrete";
import { findMaterial, checkInvariants, withBasicAccuracy } from "./_helpers";

const calc = withBasicAccuracy(aeratedConcreteDef.calculate.bind(aeratedConcreteDef));

describe("Калькулятор газобетона", () => {
  describe("Поля и пользовательские границы", () => {
    it("показывает высоту и в режиме ввода по площади", () => {
      const wallHeight = aeratedConcreteDef.fields.find((field) => field.key === "wallHeight");
      expect(wallHeight?.group).toBeUndefined();
      expect(wallHeight?.hint).toContain("вводе по площади");
    });

    it("не назначает наружную стену по одной толщине", () => {
      const thickness = aeratedConcreteDef.fields.find((field) => field.key === "blockThickness");
      const labels = thickness?.options?.map((option) => option.label).join(" ") ?? "";
      expect(labels).not.toContain("наружные стены");
      expect(thickness?.hint).toContain("не определяет несущую способность");
    });

    it("объясняет фактические допущения и действующие нормы", () => {
      const seo = aeratedConcreteDef.seoContent?.descriptionHtml ?? "";
      const formula = aeratedConcreteDef.formulaDescription ?? "";

      expect(formula).toContain("5% на подрезку и бой — фиксированное допущение");
      expect(formula).toContain("режим MIN/REC/MAX");
      expect(formula).not.toContain("через 5 блоков");
      expect(seo).toContain("ГОСТ 31360-2024");
      expect(seo).toContain("СП 50.13330.2024");
      expect(seo).toContain("не выбирает плотность");
      expect(seo).not.toContain("ГОСТ 31360-2007</strong>");
      expect(seo).not.toContain("СП 50.13330.2012");
      expect(seo).not.toContain("Ceresit");
      expect(seo).not.toContain("Ytong");
    });
  });

  describe("По размерам: 10×2.7 м, проёмы 5 м², блок 200×200×600, толщина 200 мм", () => {
    // wallArea = 27, netArea = 22
    // blockFaceArea = 0.2*0.6 = 0.12, blocksPerSqm = 8.333
    // blocksNet = 22 * 8.333 = 183.33
    // blocksWithReserve = ceil(183.33 * 1.05) = ceil(192.5) = 193
    // volume = 22 * 0.2 = 4.4, glueKg = 4.4*28 = 123.2, glueBags = ceil(123.2/25) = 5
    const result = calc({
      inputMode: 0,
      wallWidth: 10,
      wallHeight: 2.7,
      openingsArea: 5,
      blockThickness: 200,
      blockHeight: 200,
      blockLength: 600,
    });

    it("площадь стены = 27 м²", () => {
      expect(result.totals.wallArea).toBeCloseTo(27, 1);
    });

    it("чистая площадь = 22 м²", () => {
      expect(result.totals.netArea).toBeCloseTo(22, 1);
    });

    it("блоков газобетонных = 205 шт (REC ×1.06)", () => {
      const blocks = findMaterial(result, "газобетонный блок");
      // blocksWithReserve=193, REC multiplier=1.06 → 204.58 → ceil=205
      expect(blocks?.purchaseQty).toBe(205);
    });

    it("клей для газобетона 5 мешков", () => {
      const glue = findMaterial(result, "Клей для тонкошовной кладки");
      expect(glue?.purchaseQty).toBe(5);
      expect(glue?.subtitle).toContain("фиксированному расходу модели 28 кг/м³");
      expect(glue?.subtitle).toContain("Первый ряд и выравнивающий состав не рассчитаны");
    });

    it("арматура Ø8 присутствует", () => {
      const rebar = findMaterial(result, "Ø8");
      expect(rebar).toBeDefined();
      expect(rebar?.subtitle).toContain("не готовая ведомость к покупке");
    });

    it("не добавляет отделочную грунтовку без выбора отделки", () => {
      expect(findMaterial(result, "Грунтовка")).toBeUndefined();
    });

    it("не выдумывает У-блоки по одной площади проёмов", () => {
      expect(findMaterial(result, "У-блок")).toBeUndefined();
      expect(result.totals.lintelsCalculated).toBe(0);
      expect(result.warnings.some((w) => w.includes("перемычки"))).toBe(true);
    });

    it("инварианты", () => {
      checkInvariants(result);
    });

    it("не выдаёт фиксированные коэффициенты за универсальные нормы", () => {
      expect(result.practicalNotes?.some((note) => note.includes("допущения текущей модели"))).toBe(true);
      expect(result.practicalNotes?.some((note) => note.includes("техкарте производителя"))).toBe(true);
    });
  });

  describe("Предупреждения", () => {
    it("блок ≤ 150 мм → только перегородки", () => {
      const result = calc({
        inputMode: 0,
        wallWidth: 10,
        wallHeight: 2.7,
        openingsArea: 0,
        blockThickness: 100,
        blockHeight: 200,
        blockLength: 600,
      });
      expect(result.warnings.some((w) => w.includes("перегородок"))).toBe(true);
    });

    it("блок >= 300 мм → проверка теплоизоляции", () => {
      const result = calc({
        inputMode: 0,
        wallWidth: 10,
        wallHeight: 2.7,
        openingsArea: 0,
        blockThickness: 375,
        blockHeight: 200,
        blockLength: 600,
      });
      expect(result.warnings.some((w) => w.includes("теплопередаче"))).toBe(true);
    });
  });

  describe("По площади", () => {
    const result = calc({
      inputMode: 1,
      area: 22,
      openingsArea: 0,
      blockThickness: 200,
      blockHeight: 200,
      blockLength: 600,
    });

    it("netArea = 22, blocksNet ≈ 183.33", () => {
      expect(result.totals.blocksNet).toBeCloseTo(183.33, 1);
    });

    it("оценивает длину стены как площадь / высота, а не как квадрат", () => {
      expect(result.totals.estimatedWallLength).toBeCloseTo(22 / 2.7, 3);
    });
  });
});
