import { describe, expect, it } from "vitest";
import { computePurchaseStats, filterProcurementLines } from "./procurement-stats";
import type { ProcurementLine } from "./procurement";

const lines: ProcurementLine[] = [
  {
    key: "a",
    name: "Плитка",
    unit: "шт",
    quantity: 10,
    category: "Отделка",
    sources: [],
  },
  {
    key: "b",
    name: "Клей",
    unit: "мешок",
    quantity: 2,
    category: "Смеси",
    sources: [],
  },
];

describe("computePurchaseStats", () => {
  it("считает куплено и осталось", () => {
    const stats = computePurchaseStats(lines, { Плитка: 100, Клей: 500 }, new Set(["a"]));
    expect(stats.pricedSubtotal).toBe(2000);
    expect(stats.purchasedSubtotal).toBe(1000);
    expect(stats.remainingSubtotal).toBe(1000);
    expect(stats.purchasedCount).toBe(1);
    expect(stats.pendingCount).toBe(1);
  });
});

describe("filterProcurementLines", () => {
  it("фильтрует по статусу и поиску", () => {
    const checked = new Set(["a"]);
    expect(filterProcurementLines(lines, checked, "pending", "").map((l) => l.key)).toEqual(["b"]);
    expect(filterProcurementLines(lines, checked, "purchased", "").map((l) => l.key)).toEqual(["a"]);
    expect(filterProcurementLines(lines, checked, "all", "клей").map((l) => l.key)).toEqual(["b"]);
  });

  it("ищет не только по названию, но и по спецификации", () => {
    const checked = new Set<string>();
    const withSpecification = lines.map((line) =>
      line.key === "a" ? { ...line, subtitles: ["Саморез для ГКЛ по металлу 3,5×25 мм"] } : line,
    );
    expect(filterProcurementLines(withSpecification, checked, "all", "3,5×25").map((line) => line.key)).toEqual(["a"]);
  });
});
