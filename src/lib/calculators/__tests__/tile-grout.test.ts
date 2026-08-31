import { describe, it, expect } from "vitest";
import { tileGroutDef } from "../formulas/tile-grout";
import { findMaterial, checkInvariants, withBasicAccuracy } from "./_helpers";

const calc = withBasicAccuracy(tileGroutDef.calculate.bind(tileGroutDef));

describe("Затирка для плитки", () => {
  describe("Цементная затирка (groutType=0)", () => {
    it("20 м², плитка 300x300, шов 3 мм, толщина 8 мм, уп. 2 кг", () => {
      const r = calc({ area: 20, tileWidth: 300, tileHeight: 300, tileThickness: 8, jointWidth: 3, groutType: 0, bagSize: 2 });
      checkInvariants(r);
      // Engine: "Затирка цементная 2кг"
      const grout = findMaterial(r, "Затирка цементная");
      expect(grout).toBeDefined();
    });

    it("большая площадь 100 м², уп. 5 кг", () => {
      const r = calc({ area: 100, tileWidth: 300, tileHeight: 300, tileThickness: 8, jointWidth: 3, groutType: 0, bagSize: 5 });
      checkInvariants(r);
      expect(findMaterial(r, "Затирка цементная")).toBeDefined();
    });
  });

  describe("Эпоксидная затирка (groutType=1)", () => {
    it("плотность 1400 кг/м³", () => {
      const r = calc({ area: 20, tileWidth: 300, tileHeight: 300, tileThickness: 8, jointWidth: 3, groutType: 1, bagSize: 2 });
      checkInvariants(r);
      // Engine: "Затирка эпоксидная 2кг"
      expect(findMaterial(r, "эпоксидная")).toBeDefined();
    });

    it("оставляет время работы и очистку техкарте продукта", () => {
      const r = calc({ area: 20, tileWidth: 300, tileHeight: 300, tileThickness: 8, jointWidth: 3, groutType: 1, bagSize: 2 });
      expect(r.warnings.some(w => w.includes("жизнеспособность") && w.includes("техкарты"))).toBe(true);
      expect(r.warnings.some(w => w.includes("требует быстрого нанесения"))).toBe(false);
    });
  });

  describe("Полиуретановая затирка (groutType=2)", () => {
    it("плотность 1200 кг/м³", () => {
      const r = calc({ area: 20, tileWidth: 300, tileHeight: 300, tileThickness: 8, jointWidth: 3, groutType: 2, bagSize: 2 });
      checkInvariants(r);
      // Engine: "Затирка полиуретановая 2кг"
      expect(findMaterial(r, "полиуретановая")).toBeDefined();
    });
  });

  describe("Размер плитки", () => {
    it("крупноформат 600x1200 — меньше швов → меньше затирки", () => {
      const r = calc({ area: 20, tileWidth: 600, tileHeight: 1200, tileThickness: 8, jointWidth: 3, groutType: 0, bagSize: 2 });
      const rSmall = calc({ area: 20, tileWidth: 300, tileHeight: 300, tileThickness: 8, jointWidth: 3, groutType: 0, bagSize: 2 });
      expect(r.totals.totalKg).toBeLessThan(rSmall.totals.totalKg);
    });
  });

  describe("Широкие швы → проверка продукта", () => {
    it("jointWidth >= 10 → допустимый диапазон из техкарты", () => {
      const r = calc({ area: 20, tileWidth: 300, tileHeight: 300, tileThickness: 8, jointWidth: 10, groutType: 0, bagSize: 2 });
      expect(r.warnings.some(w => w.includes("допустимый диапазон ширины"))).toBe(true);
      expect(r.warnings.some(w => w.includes("крупнозернистая"))).toBe(false);
    });
  });

  describe("Граничные условия", () => {
    it("минимальная площадь 1 м²", () => {
      const r = calc({ area: 0.5, tileWidth: 300, tileHeight: 300, tileThickness: 8, jointWidth: 3, groutType: 0, bagSize: 1 });
      checkInvariants(r);
      // area clamped to 1
      expect(r.totals.area).toBe(1);
    });
  });

  describe("Глубина, ширина и товарные границы", () => {
    it("помечает толщину плитки как справочную: масса от неё не меняется", () => {
      const thin = calc({ area: 20, tileWidth: 300, tileHeight: 300, tileThickness: 6, jointWidth: 3, groutType: 0, bagSize: 2 });
      const thick = calc({ area: 20, tileWidth: 300, tileHeight: 300, tileThickness: 25, jointWidth: 3, groutType: 0, bagSize: 2 });
      const field = tileGroutDef.fields.find((item) => item.key === "tileThickness");

      expect(thin.totals.groutDepth).toBe(6);
      expect(thick.totals.groutDepth).toBe(6);
      expect(thin.totals.totalKg).toBe(thick.totals.totalKg);
      expect(field?.label).toContain("справочно");
      expect(field?.hint).toContain("не использует это поле в массе");
      expect(thick.warnings.some((warning) => warning.includes("толщина 25 мм") && warning.includes("не влияет"))).toBe(true);
    });

    it("раскрывает автоматические пороги глубины 4 / 6 / 8 / 10 мм", () => {
      const depthFor = (side: number) => calc({
        area: 20,
        tileWidth: side,
        tileHeight: side,
        tileThickness: 8,
        jointWidth: 3,
        groutType: 0,
        bagSize: 2,
      }).totals.groutDepth;

      expect(depthFor(100)).toBe(4);
      expect(depthFor(300)).toBe(6);
      expect(depthFor(600)).toBe(8);
      expect(depthFor(1200)).toBe(10);
    });

    it("не предлагает дробный шаг, который canonical всё равно округляет", () => {
      const field = tileGroutDef.fields.find((item) => item.key === "jointWidth");
      const r = calc({ area: 20, tileWidth: 300, tileHeight: 300, tileThickness: 8, jointWidth: 2.5, groutType: 0, bagSize: 2 });

      expect(field?.step).toBe(1);
      expect(r.totals.jointWidth).toBe(3);
    });

    it("показывает геометрию, автоглубину, плотность и явный запас рядом с основной позицией", () => {
      const r = calc({ area: 20, tileWidth: 300, tileHeight: 600, tileThickness: 12, jointWidth: 4, groutType: 1, bagSize: 2 });
      const grout = findMaterial(r, "Затирка эпоксидная");

      expect(grout?.subtitle).toContain("300×600 мм");
      expect(grout?.subtitle).toContain("автоглубина 8 мм");
      expect(grout?.subtitle).toContain("1400 кг/м³");
      expect(grout?.subtitle).toContain("запас ×1,10");
      expect(r.warnings.some((warning) => warning.includes("не паспорт Ceresit, Mapei, Litokol"))).toBe(true);
    });

    it("ссылается на действующий ГОСТ и первичные карточки без универсальных цен и швов", () => {
      const html = tileGroutDef.seoContent?.descriptionHtml ?? "";
      const faq = tileGroutDef.seoContent?.faq.map((item) => item.answer).join(" ") ?? "";

      expect(html).toContain("ГОСТ Р 58271-2018");
      expect(html).toContain("protect.gost.ru/gost/details/ae484785-89b8-46bb-9f1b-d570493706ef");
      expect(html).toContain("ceresit.ru/ru/products/tiling/grouts-and-sealants/ce_40_aquastatic");
      expect(html).toContain("ceresit.ru/ru/products/tiling/grouts-and-sealants/ce-89-epoxy-grout");
      expect(html).not.toContain("для малого формата — <strong>2–3 мм</strong>");
      expect(faq).not.toContain("800–1500 руб.");
      expect(faq).not.toContain("минимальный шов");
    });
  });
});
