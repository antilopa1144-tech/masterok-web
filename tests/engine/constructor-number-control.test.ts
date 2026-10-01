import { describe, expect, it } from "vitest";
import { numberControlStep, parseNumberControl, sliderNumber, sliderPosition, SLIDER_TICKS, stepNumber } from "../../src/lib/constructor/number-control";

describe("Constructor numeric slider contracts", () => {
  it("makes small pack counts and ordinary prices reachable in a wide permitted range", () => {
    const packs = { min: 1, max: 1000, integer: true, unit: "шт." }, price = { min: 0, max: 10_000_000, unit: "₽" };
    expect(sliderPosition(8, packs)).toBeGreaterThan(1000);
    expect(sliderPosition(2500, price)).toBeGreaterThan(1000);
    expect(sliderNumber(sliderPosition(8, packs), packs)).toBe(8);
    expect(sliderNumber(sliderPosition(2500, price), price)).toBe(2500);
    expect(sliderNumber(SLIDER_TICKS, price)).toBe(price.max);
  });
  it("does not create fractional package counts at any sampled pointer position", () => {
    const bounds = { min: 1, max: 1000, integer: true };
    for (let position = 0; position <= SLIDER_TICKS; position += 13.7) {
      const next = sliderNumber(position, bounds);
      expect(Number.isInteger(next)).toBe(true); expect(next).toBeGreaterThanOrEqual(1); expect(next).toBeLessThanOrEqual(1000);
    }
  });
  it("preserves precise saved millimetres and money when using fine buttons", () => {
    expect(stepNumber(450.5, 1, { min: 10, max: 30000, unit: "мм" })).toBe(451.5);
    expect(stepNumber(1999.99, -1, { min: 0, max: 10000000, unit: "₽" })).toBe(1998.99);
    expect(stepNumber(.25, 1, { min: 0, max: 100, unit: "кг/м²" })).toBe(.35);
    expect(stepNumber(450.5, 1, { min: 10, max: 30000, unit: "мм" }, .1)).toBe(450.6);
  });
  it("keeps fine grout steps, integer counts and percentage steps distinct", () => {
    expect(numberControlStep({ min: 0, max: 20, unit: "мм" })).toBe(.1);
    expect(sliderNumber(1250, { min: 0, max: 20, unit: "мм" })).toBe(2.5);
    expect(numberControlStep({ min: 0, max: 100, unit: "%" })).toBe(1);
    expect(numberControlStep({ min: 1, max: 1000, integer: true })).toBe(1);
  });
  it("handles boundaries and a zero-size coordinate range without NaN", () => {
    const bounds = { min: 0, max: 0, unit: "мм" };
    expect(sliderPosition(1500, bounds)).toBe(0); expect(sliderNumber(5000, bounds)).toBe(0); expect(stepNumber(1500, -1, bounds)).toBe(0);
    expect(sliderNumber(-10, { min: 300, max: 30000 })).toBe(300);
    expect(sliderNumber(20000, { min: 300, max: 30000 })).toBe(30000);
    expect(stepNumber(300, -1, { min: 300, max: 30000 })).toBe(300);
  });
  it("accepts exact comma fractions without slider rounding", () => {
    expect(parseNumberControl("450,5", { min: 10, max: 30000 })).toBe(450.5);
    expect(parseNumberControl("0,125", { min: 0, max: 100, unit: "кг/м²" })).toBe(.125);
    expect(parseNumberControl("1999.99", { min: 0, max: 10000000 })).toBe(1999.99);
  });
  it.each(["", " ", "-1", "1e3", "abc", "Infinity", "0", "30001"])("rejects incomplete or invalid exact size %j", (text) => {
    expect(parseNumberControl(text, { min: 10, max: 30000 })).toBeNull();
  });
  it("rejects a fractional pack while allowing an optional filter to be cleared", () => {
    expect(parseNumberControl("8.5", { min: 1, max: 1000, integer: true })).toBeNull();
    expect(parseNumberControl("", { min: 0, max: 30000, emptyValue: 0 })).toBe(0);
    expect(parseNumberControl("", { min: 10, max: 30000, emptyValue: 0 })).toBeNull();
  });
});
