import { describe, expect, it } from "vitest";
import {
  buildLaminateCalculatorHref,
  buildLaminateLayoutHref,
  parseLaminateLayoutSearchParams,
} from "./laminate-layout-to-calc";

describe("laminate layout transfer", () => {
  it("переносит размеры комнаты и палубу 1/2 в калькулятор", () => {
    const url = new URL(
      buildLaminateCalculatorHref({
        surfaceW: 3200,
        surfaceH: 4750,
        mode: "deck-half",
      }),
      "https://getmasterok.ru",
    );

    expect(url.pathname).toBe("/kalkulyatory/poly/laminat/");
    expect(Object.fromEntries(url.searchParams)).toEqual({
      from: "raskladka-laminata",
      inputMode: "0",
      length: "4.75",
      width: "3.2",
      layingMethod: "0",
      offsetMode: "2",
    });
  });

  it("переносит режим ёлочки в калькулятор", () => {
    const url = new URL(
      buildLaminateCalculatorHref({
        surfaceW: 3000,
        surfaceH: 4000,
        mode: "herringbone",
      }),
      "https://getmasterok.ru",
    );

    expect(url.searchParams.get("layingMethod")).toBe("2");
    expect(url.searchParams.get("offsetMode")).toBe("0");
  });

  it("строит ссылку из калькулятора с размерами и схемой", () => {
    const url = new URL(
      buildLaminateLayoutHref({
        inputMode: 0,
        length: 5,
        width: 3.6,
        layingMethod: 0,
        offsetMode: 1,
      }),
      "https://getmasterok.ru",
    );

    expect(url.pathname).toBe("/instrumenty/raskladka-laminata/");
    expect(Object.fromEntries(url.searchParams)).toEqual({
      surfaceW: "3600",
      surfaceH: "5000",
      mode: "deck-third",
    });
  });

  it("не выдаёт прямую схему за диагональную", () => {
    const url = new URL(
      buildLaminateLayoutHref({
        inputMode: 0,
        length: 5,
        width: 4,
        layingMethod: 1,
        offsetMode: 2,
      }),
      "https://getmasterok.ru",
    );

    expect(url.searchParams.get("surfaceW")).toBe("4000");
    expect(url.searchParams.get("surfaceH")).toBe("5000");
    expect(url.searchParams.has("mode")).toBe(false);
  });

  it("принимает только допустимые параметры инструмента", () => {
    expect(
      parseLaminateLayoutSearchParams(
        new URLSearchParams("surfaceW=4200&surfaceH=3600&mode=deck-half"),
      ),
    ).toEqual({
      surfaceW: 4200,
      surfaceH: 3600,
      mode: "deck-half",
    });

    expect(
      parseLaminateLayoutSearchParams(
        new URLSearchParams("surfaceW=10&surfaceH=50000&mode=diagonal"),
      ),
    ).toEqual({
      surfaceW: undefined,
      surfaceH: undefined,
      mode: undefined,
    });
  });
});
