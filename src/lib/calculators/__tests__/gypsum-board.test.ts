import { describe, it, expect } from "vitest";
import { gypsumBoardDef } from "../formulas/gypsum-board";
import { findMaterial, checkInvariants } from "./_helpers";

const calc = gypsumBoardDef.calculate.bind(gypsumBoardDef);

describe("Калькулятор гипсокартона (стены/перегородки/потолок)", () => {
  describe("Обшивка стены, 20 м², 1 слой, шаг 600", () => {
    // constructionType=0, area=20, layers=1, profileStep=600
    // sheetArea = 3.0
    // sheetsOneSide = ceil(20*1/3.0*1.1) = ceil(7.333) = 8
    // totalSheets = 8 (обшивка — 1 сторона)
    // wallHeight = 2.7, wallLength = 20/2.7 ≈ 7.407
    // ppCount = ceil(7.407/0.6)+1 = 13+1 = 14
    // ppMeters = 14*2.7 = 37.8
    // ppQuantity = ceil(37.8/3) = 13
    // perimeter = (7.407+2.7)*2 = 20.214
    // pnMeters = 20.214 (обшивка — 1 раз)
    // pnQuantity = ceil(20.214/3) = 7
    // screwsGKL = 8*24 = 192
    // dubelCount = ceil(20.214/0.5)*2 = 41*2 = 82
    // jointsPerRow = ceil(7.407/1.2)+1 = 7+1 = 8
    // serpyanka = ceil(8*2.7*1*1.1) = ceil(23.76) = 24
    const result = calc({
      area: 20,
      constructionType: 0,
      layers: 1,
      gklType: 0,
      profileStep: 600,
    });

    it("ГКЛ = 8 листов", () => {
      const gkl = findMaterial(result, "ГКЛ");
      expect(gkl?.purchaseQty).toBe(8);
      expect(gkl!.name).toContain("Обшивка стены");
    });

    it("ПП 60×27 = 13 шт", () => {
      const pp = findMaterial(result, "ПП 60×27");
      expect(pp?.purchaseQty).toBe(13);
    });

    it("ПН 28×27 = 7 шт", () => {
      const pn = findMaterial(result, "ПН 28×27");
      expect(pn?.purchaseQty).toBe(7);
    });

    it("саморезы для ГКЛ в кг", () => {
      const screws = findMaterial(result, "Саморезы для ГКЛ");
      expect(screws).toBeDefined();
      expect(screws!.unit).toBe("кг");
    });

    it("дюбели присутствуют", () => {
      const dubels = findMaterial(result, "Дюбель");
      expect(dubels).toBeDefined();
    });

    it("серпянка присутствует", () => {
      const serp = findMaterial(result, "Серпянка");
      expect(serp).toBeDefined();
    });

    it("шпаклёвка Knauf Фуген", () => {
      expect(findMaterial(result, "Фуген")).toBeDefined();
    });

    it("грунтовка присутствует", () => {
      expect(findMaterial(result, "Грунтовка")).toBeDefined();
    });

    it("скобы отсутствуют (только для перегородок)", () => {
      expect(findMaterial(result, "Скоба")).toBeUndefined();
    });

    it("totals", () => {
      expect(result.totals.area).toBe(20);
      expect(result.totals.totalSheets).toBe(8);
    });

    it("инварианты", () => {
      checkInvariants(result);
    });
  });

  describe("Перегородка, 20 м², 1 слой", () => {
    // constructionType=1
    // sheetsOneSide = ceil(20*1/3.0*1.1) = 8
    // totalSheets = 8 * 2 = 16 (обе стороны)
    // pnMeters = perimeter * 2 (перегородка)
    // wallHeight = 2.7, wallLength = 20/2.7 ≈ 7.407
    // perimeter = (7.407+2.7)*2 = 20.214
    // pnMeters = 20.214*2 = 40.428
    // pnQuantity = ceil(40.428/3) = 14
    const result = calc({
      area: 20,
      constructionType: 1,
      layers: 1,
      gklType: 0,
      profileStep: 600,
    });

    it("ГКЛ = 16 листов (обе стороны)", () => {
      const gkl = findMaterial(result, "ГКЛ");
      expect(gkl?.purchaseQty).toBe(16);
      expect(gkl!.name).toContain("Перегородка");
    });

    it("ПН 28×27 = 14 шт (перегородка — двойной периметр)", () => {
      const pn = findMaterial(result, "ПН 28×27");
      expect(pn?.purchaseQty).toBe(14);
    });

    it("скобы крепёжные присутствуют", () => {
      const brackets = findMaterial(result, "Скоба");
      expect(brackets).toBeDefined();
    });

    it("предупреждение о звукоизоляции минватой", () => {
      expect(result.warnings.some((w) => w.includes("минватой"))).toBe(true);
    });
  });

  describe("Потолок, 15 м², 1 слой, шаг 600", () => {
    // constructionType=2
    // wallHeight = sqrt(15) ≈ 3.873
    // wallLength = 15 / 3.873 ≈ 3.873
    // ppCount = ceil(3.873/0.6) * ceil(3.873/0.6)
    //         = ceil(6.455)*ceil(6.455) = 7*7 = 49
    // ppMeters = 49 * 3.873 ≈ 189.77
    // ppQuantity = ceil(189.77/3) = 64
    const result = calc({
      area: 15,
      constructionType: 2,
      layers: 1,
      gklType: 0,
      profileStep: 600,
    });

    it("ГКЛ листы для потолка", () => {
      const gkl = findMaterial(result, "ГКЛ");
      expect(gkl).toBeDefined();
      expect(gkl!.name).toContain("Потолок");
      // sheetsOneSide = ceil(15*1/3.0*1.1) = ceil(5.5) = 6
      expect(gkl!.purchaseQty).toBe(6);
    });

    it("ПП 60×27 профили для потолочной решётки", () => {
      const pp = findMaterial(result, "ПП 60×27");
      expect(pp).toBeDefined();
      expect(pp!.purchaseQty).toBeGreaterThan(0);
    });

    it("инварианты", () => {
      checkInvariants(result);
    });
  });

  describe("2 слоя ГКЛ на обшивке стены → предупреждение", () => {
    const result = calc({
      area: 10,
      constructionType: 0,
      layers: 2,
      gklType: 0,
      profileStep: 600,
    });

    it("предупреждение о смещении стыков", () => {
      expect(result.warnings.some((w) => w.includes("смещение стыков"))).toBe(true);
    });

    it("количество листов удвоено для 2 слоёв", () => {
      const gkl = findMaterial(result, "ГКЛ");
      // sheetsOneSide = ceil(10*2/3.0*1.1) = ceil(7.333) = 8
      expect(gkl?.purchaseQty).toBe(8);
    });
  });

  describe("ГКЛВ (влагостойкий)", () => {
    const result = calc({
      area: 10,
      constructionType: 0,
      layers: 1,
      gklType: 1,
      profileStep: 600,
    });

    it("название содержит ГКЛВ", () => {
      const gkl = findMaterial(result, "ГКЛВ");
      expect(gkl).toBeDefined();
    });
  });

  describe("Усиленный шаг профилей 400 мм", () => {
    // area=20, constructionType=0
    // wallHeight=2.7, wallLength=20/2.7≈7.407
    // ppCount = ceil(7.407/0.4)+1 = 19+1 = 20
    const result = calc({
      area: 20,
      constructionType: 0,
      layers: 1,
      gklType: 0,
      profileStep: 400,
    });

    it("больше ПП профилей при шаге 400", () => {
      const pp = findMaterial(result, "ПП 60×27");
      // ppMeters = 20*2.7 = 54 → ceil(54/3) = 18
      expect(pp?.purchaseQty).toBe(18);
    });
  });
});
