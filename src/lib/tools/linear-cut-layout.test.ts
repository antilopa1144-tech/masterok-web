import { describe, expect, it } from "vitest";
import { calculateLinearCutLayout } from "./linear-cut-layout";

describe("linear-cut-layout", () => {
  it("укладывает детали в заготовки с учётом пропила", () => {
    const result = calculateLinearCutLayout({ stockLengthMm: 3000, sawKerfMm: 3, reusableOffcutMm: 300, parts: [
      { id: "a", label: "Стойка", lengthMm: 1400, quantity: 2 },
      { id: "b", label: "Перемычка", lengthMm: 500, quantity: 2 },
    ] });
    expect(result.stockCount).toBe(2);
    for (const stock of result.stock) expect(stock.usedMm).toBeLessThanOrEqual(3000);
  });

  it("маркирует пригодные остатки", () => {
    const result = calculateLinearCutLayout({ stockLengthMm: 3000, sawKerfMm: 3, reusableOffcutMm: 500, parts: [{ id: "a", label: "Деталь", lengthMm: 2000, quantity: 1 }] });
    expect(result.reusableOffcuts).toBe(1);
    expect(result.stock[0].offcutMm).toBe(997);
  });

  it("не пытается уложить деталь длиннее заготовки", () => {
    const result = calculateLinearCutLayout({ stockLengthMm: 2400, sawKerfMm: 3, reusableOffcutMm: 300, parts: [{ id: "a", label: "Длинная", lengthMm: 2600, quantity: 1 }] });
    expect(result.stockCount).toBe(0);
    expect(result.errors[0]).toContain("Длинная");
  });
});
