import { describe, expect, it } from "vitest";
import { buildProcurementCsv } from "./export-csv";
import type { ProcurementLine } from "./procurement";
import type { ProjectEstimateTotals } from "./build-estimate";

const totals: ProjectEstimateTotals = {
  materialsSubtotal: 1_000,
  reservePercent: 0,
  reserveAmount: 0,
  deliveryRub: 0,
  grandTotal: 1_000,
  pricedLines: 1,
  totalLines: 1,
  pricedCalculations: 1,
  calculationsCount: 1,
};

describe("buildProcurementCsv", () => {
  it("выгружает закупочную спецификацию отдельной колонкой", () => {
    const lines: ProcurementLine[] = [{
      key: "screws__шт",
      name: "Саморезы",
      unit: "шт",
      quantity: 200,
      category: "Крепёж",
      subtitles: ["Для ГКЛ по металлу 3,5×25 мм", "Для металлического профиля"],
      sources: [],
    }];

    const csv = buildProcurementCsv("Ванная", lines, { Саморезы: 5 }, totals);

    expect(csv).toContain("Категория;Материал;Спецификация;Количество");
    expect(csv).toContain("Для ГКЛ по металлу 3,5×25 мм | Для металлического профиля");
  });
});
