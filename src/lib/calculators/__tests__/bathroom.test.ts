import { describe, it, expect } from "vitest";
import { bathroomDef } from "../formulas/bathroom";
import { findMaterial, checkInvariants } from "./_helpers";

const calc = bathroomDef.calculate.bind(bathroomDef);

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
    });

    it("клей для настенной плитки присутствует", () => {
      // Engine: "Клей для настенной плитки (25 кг)"
      const adhesive = findMaterial(result, "настенной плитки");
      expect(adhesive).toBeDefined();
    });

    it("затирка присутствует", () => {
      // Engine: "Затирка (2 кг)"
      const grout = findMaterial(result, "Затирка");
      expect(grout).toBeDefined();
    });

    it("мастика гидроизоляционная присутствует", () => {
      // Engine: "Мастика гидроизоляционная (4 кг)"
      const wp = findMaterial(result, "Мастика гидроизоляционная");
      expect(wp).toBeDefined();
    });

    it("лента гидроизоляционная присутствует", () => {
      // Engine: "Лента гидроизоляционная (10 м)"
      const tape = findMaterial(result, "Лента гидроизоляционная");
      expect(tape).toBeDefined();
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

    it("предупреждение о СП 29.13330", () => {
      // Engine: "Гидроизоляция обязательна согласно СП 29.13330"
      expect(result.warnings.some((w) => w.includes("СП 29.13330"))).toBe(true);
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
});
