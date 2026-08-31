import { describe, it, expect } from "vitest";
import { bathroomDef } from "../formulas/bathroom";
import { findMaterial, checkInvariants, withBasicAccuracy } from "./_helpers";

const calc = withBasicAccuracy(bathroomDef.calculate.bind(bathroomDef));

describe("Калькулятор ванной комнаты", () => {
  describe("Стандартная ванная 2.5x1.7, h=2.5, плитка 300x300/200x300, гидроизоляция", () => {
    const result = calc({
      length: 2.5,
      width: 1.7,
      height: 2.5,
      floorTileSize: 0,
      wallTileSize: 0,
      hasWaterproofing: 1,
      doorWidth: 0.7,
    });

    it("напольная плитка 300x300 присутствует", () => {
      // Engine: "Плитка напольная 300×300 мм"
      const tile = findMaterial(result, "напольная");
      expect(tile).toBeDefined();
    });

    it("настенная плитка 200x300 присутствует", () => {
      // Engine: "Плитка настенная 200×300 мм"
      const tile = findMaterial(result, "настенная");
      expect(tile).toBeDefined();
    });

    it("клей для напольной плитки присутствует", () => {
      // Engine: "Клей для напольной плитки (25 кг)"
      const adhesive = findMaterial(result, "напольной плитки");
      expect(adhesive).toBeDefined();
      expect(adhesive?.subtitle).toContain("5 кг/м²");
      expect(adhesive?.subtitle).toContain("Продукт, основание, зуб");
    });

    it("клей для настенной плитки присутствует", () => {
      // Engine: "Клей для настенной плитки (25 кг)"
      const adhesive = findMaterial(result, "настенной плитки");
      expect(adhesive).toBeDefined();
      expect(adhesive?.subtitle).toContain("3,5 кг/м²");
    });

    it("затирка присутствует", () => {
      // Engine: "Затирка (2 кг)"
      const grout = findMaterial(result, "Затирка");
      expect(grout).toBeDefined();
      expect(grout?.subtitle).toContain("0,5 кг/м²");
      expect(grout?.subtitle).toContain("ширина и глубина шва");
    });

    it("мастика гидроизоляционная присутствует", () => {
      // Engine: "Мастика гидроизоляционная (4 кг)"
      const wp = findMaterial(result, "Мастика гидроизоляционная");
      expect(wp).toBeDefined();
      expect(wp?.subtitle).toContain("полосу 0,2 м");
      expect(wp?.subtitle).toContain("Душевые стены и проходки не включены");
    });

    it("лента гидроизоляционная присутствует", () => {
      // Engine: "Лента гидроизоляционная (10 м)"
      const tape = findMaterial(result, "Лента гидроизоляционная");
      expect(tape).toBeDefined();
      expect(tape?.subtitle).toContain("фиксированные 1,2 м");
    });

    it("грунтовка присутствует", () => {
      // Engine: "Грунтовка (5 л)"
      expect(findMaterial(result, "Грунтовка")).toBeDefined();
    });

    it("крестики присутствуют", () => {
      // Engine: "Крестики (упаковка 100 шт)"
      expect(findMaterial(result, "Крестики")).toBeDefined();
    });

    it("силиконовый герметик присутствует", () => {
      // Engine: "Силиконовый герметик"
      expect(findMaterial(result, "Силиконовый герметик")).toBeDefined();
    });

    it("totals содержат площадь пола, стен и периметр", () => {
      // floorArea=2.5*1.7=4.25
      expect(result.totals.floorArea).toBeCloseTo(4.25, 2);
      // perimeter=2*(2.5+1.7)=8.4
      expect(result.totals.perimeter).toBeCloseTo(8.4, 2);
      expect(result.totals.wallArea).toBeCloseTo(19.53, 2);
    });

    it("результат раскрывает упрощённую геометрию и сценарную границу", () => {
      expect(result.warnings.some((warning) => warning.includes("один дверной проём высотой 2,1 м"))).toBe(true);
      expect(result.warnings.some((warning) => warning.includes("не совместимая система материалов"))).toBe(true);
      expect(result.warnings.some((warning) => warning.includes("MIN/REC/MAX") && warning.includes("только суммарное число плиток"))).toBe(true);
      expect(result.practicalNotes?.some((note) => note.includes("только пол и полосу 200 мм"))).toBe(true);
    });

    it("инварианты", () => {
      checkInvariants(result);
    });
  });

  describe("Без гидроизоляции → предупреждение", () => {
    const result = calc({
      length: 2.5,
      width: 1.7,
      height: 2.5,
      floorTileSize: 0,
      wallTileSize: 0,
      hasWaterproofing: 0,
      doorWidth: 0.7,
    });

    it("предупреждение описывает пропуск без универсального нормативного обещания", () => {
      expect(result.warnings.some((w) => w.includes("Гидроизоляция выключена") && w.includes("проекту помещения"))).toBe(true);
      expect(result.warnings.every((w) => !w.includes("обязательна согласно"))).toBe(true);
    });

    it("гидроизоляция отсутствует в материалах", () => {
      expect(findMaterial(result, "Мастика гидроизоляционная")).toBeUndefined();
      expect(findMaterial(result, "Лента гидроизоляционная")).toBeUndefined();
    });

    it("остальные материалы на месте", () => {
      expect(findMaterial(result, "напольная")).toBeDefined();
      expect(findMaterial(result, "настенная")).toBeDefined();
      expect(findMaterial(result, "Клей")).toBeDefined();
      expect(findMaterial(result, "Затирка")).toBeDefined();
      expect(findMaterial(result, "Грунтовка")).toBeDefined();
      checkInvariants(result);
    });
  });

  describe("Маленькая ванная < 2 м² → предупреждение", () => {
    const result = calc({
      length: 1.2,
      width: 1.0,
      height: 2.5,
      floorTileSize: 0,
      wallTileSize: 0,
      hasWaterproofing: 1,
      doorWidth: 0.6,
    });

    it("предупреждение о маленькой площади и подрезке", () => {
      // Engine: "При площади менее 2 м² повышенный расход на подрезку плитки"
      expect(result.warnings.some((w) => w.includes("менее 2 м²"))).toBe(true);
    });

    it("расчёт выполняется без ошибок", () => {
      checkInvariants(result);
    });
  });

  describe("Границы комплексной модели", () => {
    const baseInputs = {
      length: 2.5,
      width: 1.7,
      height: 2.5,
      floorTileSize: 0,
      wallTileSize: 0,
      hasWaterproofing: 1,
      doorWidth: 0.7,
    };

    it("формат плитки меняет штуки, но не универсальные нормы клея и затирки", () => {
      const small = calc(baseInputs);
      const large = calc({ ...baseInputs, floorTileSize: 2, wallTileSize: 2 });

      expect(findMaterial(small, "напольная")?.quantity).not.toBe(findMaterial(large, "напольная")?.quantity);
      expect(findMaterial(small, "настенная")?.quantity).not.toBe(findMaterial(large, "настенная")?.quantity);
      expect(findMaterial(small, "Клей для напольной")?.quantity).toBe(findMaterial(large, "Клей для напольной")?.quantity);
      expect(findMaterial(small, "Клей для настенной")?.quantity).toBe(findMaterial(large, "Клей для настенной")?.quantity);
      expect(findMaterial(small, "Затирка")?.quantity).toBe(findMaterial(large, "Затирка")?.quantity);
    });

    it("MIN/REC/MAX меняют только основной итог в штуках", () => {
      const result = calc(baseInputs);

      expect(result.scenarios?.MIN.purchase_quantity).toBeLessThan(result.scenarios?.REC.purchase_quantity ?? 0);
      expect(result.scenarios?.REC.purchase_quantity).toBeLessThan(result.scenarios?.MAX.purchase_quantity ?? 0);
      expect(findMaterial(result, "Клей для напольной")?.quantity).toBeCloseTo(21.25, 3);
      expect(findMaterial(result, "Затирка")?.quantity).toBeCloseTo(11.89, 3);
    });

    it("поля и SEO-текст закрепляют реальные ограничения и первичные источники", () => {
      expect(bathroomDef.fields.find((field) => field.key === "doorWidth")?.hint).toContain("фиксированной высотой 2,1 м");
      expect(bathroomDef.fields.find((field) => field.key === "hasWaterproofing")?.hint).toContain("Стены душевой");
      expect(bathroomDef.formulaDescription).toContain("только к суммарному числу плиток");
      expect(bathroomDef.seoContent?.descriptionHtml).toContain("https://protect.gost.ru/sp/details/a2711156-c40f-4d0f-89f1-7e3c366bc430");
      expect(bathroomDef.seoContent?.descriptionHtml).toContain("https://protect.gost.ru/sp/details/ca915ed9-5bce-4de4-94af-debfd041a939");
      expect(bathroomDef.seoContent?.descriptionHtml).toContain("https://ceresit.ru/ru/products/waterproofing/waterproofing-materials/cl_51_combo");
      expect(bathroomDef.seoContent?.descriptionHtml).not.toContain("обязательна с заведением");
    });
  });
});
