import { describe, expect, it } from "vitest";
import {
  convertLinearUnit,
  convertTemperature,
  formatConvertedValue,
  parseUnitValue,
} from "./unit-converter";

describe("unit converter", () => {
  it("не подменяет ноль единицей", () => {
    expect(parseUnitValue("0")).toBe(0);
    expect(convertLinearUnit(0, 1, 0.001)).toBe(0);
    expect(formatConvertedValue(0)).toBe("0");
  });

  it("понимает десятичную запятую и отбрасывает пустой ввод", () => {
    expect(parseUnitValue("1,25")).toBe(1.25);
    expect(parseUnitValue("")).toBeNull();
    expect(parseUnitValue("не число")).toBeNull();
  });

  it("переводит метры в миллиметры", () => {
    expect(convertLinearUnit(1, 1, 0.001)).toBe(1000);
  });

  it("переводит температуру между Цельсием, Фаренгейтом и Кельвином", () => {
    expect(convertTemperature(0, "c", "f")).toBeCloseTo(32, 10);
    expect(convertTemperature(32, "f", "c")).toBeCloseTo(0, 10);
    expect(convertTemperature(0, "c", "k")).toBeCloseTo(273.15, 10);
  });
});
