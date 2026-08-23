import { describe, expect, it } from "vitest";
import {
  finalizeDecimalDraft,
  normalizeDecimalDraft,
  parseDecimalDraft,
} from "./numericInput";

describe("числовой ввод калькулятора", () => {
  it("разрешает временно очистить поле с нулём", () => {
    const draft = normalizeDecimalDraft("");

    expect(draft).toBe("");
    expect(parseDecimalDraft(draft)).toBeNull();
  });

  it("не теряет целую часть при вводе дроби через точку", () => {
    expect(normalizeDecimalDraft("5.")).toBe("5.");
    expect(parseDecimalDraft("5.")).toBeNull();
    expect(parseDecimalDraft("5.5")).toBe(5.5);
  });

  it("принимает русскую десятичную запятую", () => {
    expect(normalizeDecimalDraft("5,5")).toBe("5.5");
    expect(parseDecimalDraft(normalizeDecimalDraft("5,5"))).toBe(5.5);
  });

  it("на выходе из поля восстанавливает незавершённый ввод", () => {
    expect(finalizeDecimalDraft("", 10)).toBe(10);
    expect(finalizeDecimalDraft("5.", 10)).toBe(5);
  });

  it("не подменяет неверное значение допустимой границей", () => {
    expect(finalizeDecimalDraft("-1", 10)).toBe(-1);
    expect(finalizeDecimalDraft("150", 10)).toBe(150);
  });
});
