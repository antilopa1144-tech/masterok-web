import { describe, expect, it } from "vitest";
import {
  appendQuickCalculatorChar,
  backspaceQuickCalculator,
  evaluateQuickExpression,
  percentTrailingOperand,
  QUICK_CALCULATOR_ERROR,
  toggleTrailingOperand,
} from "./quick-calculator";

describe("quick calculator input contract", () => {
  it("changes the sign of the current operand", () => {
    const negative = toggleTrailingOperand("5+2");
    expect(negative).toBe("5+(-2)");
    expect(evaluateQuickExpression(negative)).toBe(3);
    expect(toggleTrailingOperand(negative)).toBe("5+2");
    expect(toggleTrailingOperand("-2")).toBe("2");
  });

  it("converts only the current operand to a percentage", () => {
    expect(percentTrailingOperand("50")).toBe("0.5");
    expect(percentTrailingOperand("5+2")).toBe("5+0.02");
    expect(evaluateQuickExpression(percentTrailingOperand("5+2"))).toBe(5.02);
    expect(percentTrailingOperand("5+(-2)")).toBe("5+(-0.02)");
  });

  it("starts a new value immediately after an error", () => {
    expect(appendQuickCalculatorChar(QUICK_CALCULATOR_ERROR, "5", false)).toBe("5");
    expect(appendQuickCalculatorChar(QUICK_CALCULATOR_ERROR, ".", false)).toBe("0.");
    expect(backspaceQuickCalculator(QUICK_CALCULATOR_ERROR, false)).toBe("0");
  });

  it("evaluates precedence, parentheses and negative operands without eval", () => {
    expect(evaluateQuickExpression("2+3*4")).toBe(14);
    expect(evaluateQuickExpression("(2+3)*4")).toBe(20);
    expect(evaluateQuickExpression("5-(-2)")).toBe(7);
    expect(() => evaluateQuickExpression("(2+3")).toThrow("Missing closing parenthesis");
  });
});
