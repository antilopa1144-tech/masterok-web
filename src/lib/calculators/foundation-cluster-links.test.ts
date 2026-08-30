import { describe, expect, it } from "vitest";
import {
  buildConcreteCalculatorHrefFromFoundationResult,
  CONCRETE_CALCULATOR_PATH,
  getFoundationConcreteSourceLabel,
} from "./foundation-cluster-links";

describe("foundation cluster links", () => {
  it("передаёт чистый объём и запас ленточного фундамента", () => {
    const href = buildConcreteCalculatorHrefFromFoundationResult("lentochnyy-fundament", {
      vol: 12.3454,
      reserve: 10,
    });
    const url = new URL(href!, "https://getmasterok.ru");

    expect(Object.fromEntries(url.searchParams)).toEqual({
      from: "lentochnyy-fundament",
      inputMode: "0",
      concreteVolume: "12.345",
      reserve: "10",
    });
  });

  it("использует расчётный объём плитного фундамента", () => {
    const href = buildConcreteCalculatorHrefFromFoundationResult("plitnyj-fundament", {
      concreteM3: 24.678,
      concreteReservePercent: 8,
    });
    const url = new URL(href!, "https://getmasterok.ru");

    expect(url.searchParams.get("from")).toBe("plitnyj-fundament");
    expect(url.searchParams.get("concreteVolume")).toBe("24.678");
    expect(url.searchParams.get("reserve")).toBe("8");
  });

  it("не передаёт объём вне диапазона принимающего калькулятора", () => {
    expect(buildConcreteCalculatorHrefFromFoundationResult("lentochnyy-fundament", {
      vol: 125,
      reserve: 10,
    })).toBe(CONCRETE_CALCULATOR_PATH);
  });

  it("не строит ссылку для чужого калькулятора и подписывает известный источник", () => {
    expect(buildConcreteCalculatorHrefFromFoundationResult("beton", { vol: 12 })).toBeNull();
    expect(getFoundationConcreteSourceLabel("lentochnyy-fundament")).toBe("ленточного фундамента");
    expect(getFoundationConcreteSourceLabel("beton")).toBeNull();
  });
});
