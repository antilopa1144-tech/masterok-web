import { describe, expect, it } from "vitest";
import { computeTotals } from "./build-estimate";
import type { ProcurementLine } from "./procurement";
import type { ProjectEstimateLine } from "./build-estimate";

const procurement: ProcurementLine[] = [
  {
    key: "a__шт",
    name: "Плитка",
    unit: "шт",
    quantity: 100,
    category: "Отделка",
    sources: [],
  },
];

const lines: ProjectEstimateLine[] = [];

describe("computeTotals", () => {
  it("считает сумму материалов по resolvedPrices", () => {
    const totals = computeTotals(
      procurement,
      lines,
      { Плитка: 500 },
      { reservePercent: 0, deliveryRub: 0 },
    );
    expect(totals.materialsSubtotal).toBe(50_000);
    expect(totals.grandTotal).toBe(50_000);
    expect(totals.pricedLines).toBe(1);
  });

  it("добавляет запас и доставку", () => {
    const totals = computeTotals(
      procurement,
      lines,
      { Плитка: 100 },
      { reservePercent: 10, deliveryRub: 1500 },
    );
    expect(totals.materialsSubtotal).toBe(10_000);
    expect(totals.reserveAmount).toBe(1_000);
    expect(totals.deliveryRub).toBe(1_500);
    expect(totals.grandTotal).toBe(12_500);
  });

  it("учитывает незаполненные цены", () => {
    const totals = computeTotals(procurement, lines, {}, { reservePercent: 0, deliveryRub: 0 });
    expect(totals.pricedLines).toBe(0);
    expect(totals.grandTotal).toBe(0);
  });
});
