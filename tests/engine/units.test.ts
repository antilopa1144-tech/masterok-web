import { describe, expect, it } from "vitest";
import { roundDisplay, roundPurchase } from "../../engine/units";

describe("roundDisplay", () => {
  it("roundDisplay(1.2345, 2) === 1.23", () => {
    expect(roundDisplay(1.2345, 2)).toBe(1.23);
  });

  it("roundDisplay(1.235, 2) === 1.24 (стандартное округление)", () => {
    expect(roundDisplay(1.235, 2)).toBe(1.24);
  });

  it("roundDisplay(NaN) === 0 (защита от NaN)", () => {
    expect(roundDisplay(NaN)).toBe(0);
  });

  it("roundDisplay(Infinity) === 0 (защита от Infinity)", () => {
    expect(roundDisplay(Infinity)).toBe(0);
  });

  it("roundDisplay(-Infinity) === 0 (защита от -Infinity)", () => {
    expect(roundDisplay(-Infinity)).toBe(0);
  });

  it("roundDisplay(0) === 0", () => {
    expect(roundDisplay(0)).toBe(0);
  });

  it("roundDisplay(10, 0) === 10 (0 знаков после запятой)", () => {
    expect(roundDisplay(10, 0)).toBe(10);
  });

  it("roundDisplay(3.14159, 4) === 3.1416", () => {
    expect(roundDisplay(3.14159, 4)).toBe(3.1416);
  });

  it("roundDisplay с digits по умолчанию (2)", () => {
    expect(roundDisplay(5.678)).toBe(5.68);
  });

  it("roundDisplay с отрицательным значением", () => {
    expect(roundDisplay(-3.456, 2)).toBe(-3.46);
  });
});

describe("roundPurchase", () => {
  it("roundPurchase(12.3, 5) === 15", () => {
    expect(roundPurchase(12.3, 5)).toBe(15);
  });

  it("roundPurchase(0, 1) === 0", () => {
    expect(roundPurchase(0, 1)).toBe(0);
  });

  it("roundPurchase(10, 0) === Math.ceil(10) = 10 (step=0 fallback)", () => {
    expect(roundPurchase(10, 0)).toBe(10);
  });

  it("roundPurchase(10.1, 0) === Math.ceil(10.1) = 11 (step=0 fallback)", () => {
    expect(roundPurchase(10.1, 0)).toBe(11);
  });

  it("roundPurchase с отрицательным step → fallback на Math.ceil", () => {
    expect(roundPurchase(7.5, -1)).toBe(8);
  });

  it("roundPurchase(25, 25) === 25 (точное совпадение с шагом)", () => {
    expect(roundPurchase(25, 25)).toBe(25);
  });

  it("roundPurchase(26, 25) === 50 (округление вверх до следующего шага)", () => {
    expect(roundPurchase(26, 25)).toBe(50);
  });

  it("roundPurchase(0.1, 5) === 5 (малое значение округляется до одного шага)", () => {
    expect(roundPurchase(0.1, 5)).toBe(5);
  });

  it("roundPurchase со step=1 по умолчанию", () => {
    expect(roundPurchase(3.2)).toBe(4);
  });
});
