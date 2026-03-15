import { describe, it, expect } from "vitest";
import { decorPlasterDef } from "../formulas/decor-plaster";
import { findMaterial, checkInvariants } from "./_helpers";

const calc = decorPlasterDef.calculate.bind(decorPlasterDef);

describe("Калькулятор декоративной штукатурки", () => {
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
    });
  });

  describe("Венецианская на фасаде → предупреждение", () => {
    const result = calc({
      area: 50,
      texture: 4,
      surface: 0,
      bagWeight: 25,
    });

    it("предупреждение: защитный лак", () => {
      // Engine: "Венецианская штукатурка на фасаде — требуется защитный лак"
      expect(result.warnings.some((w) => w.includes("защитный лак"))).toBe(true);
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
});
