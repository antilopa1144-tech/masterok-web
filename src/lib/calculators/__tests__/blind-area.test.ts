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
  });

  describe("Бетонная отмостка: периметр 40 м, ширина 1.0 м, толщина 100 мм", () => {
    // area = 40 * 1.0 = 40
    // concreteM3 = ceil(40 * 0.1 * 1.05 * 10) / 10 = ceil(42) / 10 = 4.2
    const result = calc({
      perimeter: 40,
      width: 1.0,
      thickness: 100,
      materialType: 0,
      withInsulation: 0,
    });

    it("площадь = 40 м²", () => {
      expect(result.totals.area).toBeCloseTo(40, 2);
    });

    it("бетон присутствует", () => {
      // Engine: "Бетон (100 мм)"
      expect(findMaterial(result, "Бетон")).toBeDefined();
    });

    it("армосетка при толщине ≥ 100 мм", () => {
      const mesh = findMaterial(result, "Арматурная сетка 100×100×4 мм");
      expect(mesh).toBeDefined();
      // meshPcs = ceil(40 * 1.1) = ceil(44) = 44
      expect(mesh?.purchaseQty).toBe(44);
      expect(mesh?.unit).toBe("м²");
      expect(mesh?.subtitle).toContain("формату поставщика");
    });

    it("демпферная лента присутствует для бетонной", () => {
      // Engine: "Демпферная лента"
      const tape = findMaterial(result, "Демпферная разделительная лента");
      expect(tape?.subtitle).toContain("деформационного шва");
    });

    it("щебень подготовка = 40 * 0.15 = 6 м³", () => {
      // Engine: "Щебень (подушка)"
      const gravel = findMaterial(result, "Щебень");
      expect(gravel?.quantity).toBeCloseTo(6, 2);
    });

    it("песок подсыпка = 40 * 0.1 = 4 м³", () => {
      // Engine: "Песок (подушка)"
      const sand = findMaterial(result, "Песок");
      expect(sand?.quantity).toBeCloseTo(4, 2);
    });

    it("геотекстиль присутствует", () => {
      // Engine: "Геотекстиль (50 м²)"
      expect(findMaterial(result, "Геотекстиль")).toBeDefined();
    });

    it("без утепления — нет ЭППС", () => {
      expect(findMaterial(result, "ЭППС")).toBeUndefined();
    });

    it("инварианты", () => {
      checkInvariants(result);
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
    // area = 30 * 0.8 = 24
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

    it("плитка tileM2 = ceil(24 * 1.08) = 26", () => {
      expect(result.totals.tileM2).toBe(26);
    });

    it("смесь для укладки присутствует", () => {
      // Engine: "Смесь для укладки (50 кг)"
      // mixBags = ceil(24 * 6 / 50) = ceil(2.88) = 3
      const mix = findMaterial(result, "Сухая смесь для укладки");
      expect(mix).toBeDefined();
      expect(mix?.purchaseQty).toBe(3);
    });

    it("бордюр = ceil(30 / 0.5) = 60 шт", () => {
      // Engine: "Бордюр (0.5 м)"
      const border = findMaterial(result, "Бордюр");
      expect(border?.purchaseQty).toBe(60);
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
    // area = 40
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
      // membraneM2 = ceil(40 * 1.15) = 46
      expect(result.totals.membraneM2).toBe(46);
    });

    it("декоративный щебень = 40 * 0.1 = 4 м³", () => {
      // Engine: "Декоративный щебень"
      const pebble = findMaterial(result, "Декоративный щебень");
      expect(pebble?.quantity).toBeCloseTo(4, 2);
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
      expect(epps?.subtitle).toContain("прочностью на сжатие");
    });

    it("ЭППС плит = ceil(40 * 1.05 / 0.72) = ceil(58.33) = 59", () => {
      const epps = findMaterial(result, "ЭППС");
      expect(epps?.purchaseQty).toBe(Math.ceil(40 * 1.05 / 0.72));
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
    });
  });
});
