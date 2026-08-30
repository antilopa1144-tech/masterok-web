import { describe, expect, it } from "vitest";
import {
  BRICKWORK_CALCULATOR_PATH,
  buildBrickworkCalculatorHref,
  buildBrickworkLayoutHrefFromCalculatorResult,
  parseBrickworkLayoutSearchParams,
} from "./brickwork-layout-to-calc";

describe("brickwork layout cluster links", () => {
  it("передаёт в раскладку только реальные размеры одного участка и формат кирпича", () => {
    const href = buildBrickworkLayoutHrefFromCalculatorResult("kirpich", {
      inputMode: 0,
      wallWidth: 6,
      wallHeight: 2.7,
      brickType: 1,
      wallThickness: 2,
      wasteCoeff: 1.1,
    });
    const url = new URL(href!, "https://getmasterok.ru");

    expect(Object.fromEntries(url.searchParams)).toEqual({
      from: "kirpich",
      surfaceWmm: "6000",
      surfaceHmm: "2700",
      brickLmm: "250",
      brickHmm: "88",
    });
    expect(url.searchParams.has("wallThickness")).toBe(false);
    expect(url.searchParams.has("wasteCoeff")).toBe(false);
  });

  it("не превращает площадь или суммарный периметр в выдуманную прямоугольную стену", () => {
    expect(buildBrickworkLayoutHrefFromCalculatorResult("kirpich", {
      inputMode: 1,
      wallWidth: 5,
      wallHeight: 3,
      brickType: 0,
    })).toBe("/instrumenty/raskladka-kirpicha/?from=kirpich");

    expect(buildBrickworkLayoutHrefFromCalculatorResult("kladka-kirpicha", {
      inputMode: 0,
      wallLength: 24,
      wallHeight: 2.7,
      brickFormat: 0,
    })).toBe("/instrumenty/raskladka-kirpicha/?from=kladka-kirpicha");
  });

  it("разбирает только полный и допустимый набор параметров раскладки", () => {
    expect(parseBrickworkLayoutSearchParams(new URLSearchParams({
      from: "kirpich",
      surfaceWmm: "4500",
      surfaceHmm: "2800",
      brickLmm: "250",
      brickHmm: "65",
    }))).toEqual({
      source: "kirpich",
      surfaceWmm: 4500,
      surfaceHmm: 2800,
      brickLmm: 250,
      brickHmm: 65,
    });

    expect(parseBrickworkLayoutSearchParams(new URLSearchParams({
      from: "kirpich",
      surfaceWmm: "99999",
      surfaceHmm: "2800",
      brickLmm: "250",
      brickHmm: "65",
    }))).toEqual({ source: "kirpich" });
  });

  it("возвращает из раскладки размеры, нулевые проёмы, формат и допустимый шов", () => {
    const href = buildBrickworkCalculatorHref({
      surfaceWmm: 4000,
      surfaceHmm: 2700,
      brickLmm: 250,
      brickHmm: 138,
      jointMm: 12,
    });
    const url = new URL(href, "https://getmasterok.ru");

    expect(Object.fromEntries(url.searchParams)).toEqual({
      from: "raskladka-kirpicha",
      inputMode: "0",
      wallLength: "4",
      wallHeight: "2.7",
      openingsArea: "0",
      brickFormat: "2",
      mortarJoint: "12",
    });
    expect(url.searchParams.has("wallThickness")).toBe(false);
  });

  it("не передаёт высоту вне диапазона принимающего калькулятора", () => {
    expect(buildBrickworkCalculatorHref({
      surfaceWmm: 4000,
      surfaceHmm: 6000,
      brickLmm: 250,
      brickHmm: 65,
      jointMm: 10,
    })).toBe(BRICKWORK_CALCULATOR_PATH);
  });
});
