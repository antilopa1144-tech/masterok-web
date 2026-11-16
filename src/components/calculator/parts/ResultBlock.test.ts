import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterAll, describe, expect, it, vi } from "vitest";
import { blindAreaDef } from "@/lib/calculators/formulas/blind-area";
import type { CalculatorResult } from "@/lib/calculators/types";
import { ResultBlock } from "./ResultBlock";

vi.stubGlobal("React", React);
afterAll(() => vi.unstubAllGlobals());

function purchaseSummary(result: CalculatorResult) {
  const html = renderToStaticMarkup(React.createElement(ResultBlock, {
    result,
    shareState: "idle",
    onShare: () => {},
  }));

  return html.match(/>К покупке<\/p><p[^>]*>(.*?)<\/p>/)?.[1]
    .replace(/<[^>]+>/g, "")
    .trim();
}

describe("Сводка покупки", () => {
  it.each([[100, "5 м³"], [150, "7,5 м³"]])(
    "показывает объём бетона для слоя %i мм",
    (thickness, expected) => {
      const result = blindAreaDef.calculate({ perimeter: 40, width: 1, materialType: 0, thickness });
      expect(purchaseSummary(result)).toBe(expected);
    },
  );

  it.each([
    ["мешков", "кг", 25, "5 мешков"],
    ["коробок", "м²", 1.44, "5 коробок"],
  ])("показывает целое количество %s", (packageUnit, unit, size, expected) => {
    const result: CalculatorResult = {
      materials: [{
        name: "Материал",
        quantity: 4 * size,
        purchaseQty: 5 * size,
        unit,
        packageInfo: { count: 5, size, packageUnit },
      }],
      totals: {},
      warnings: [],
    };

    expect(purchaseSummary(result)).toBe(expected);
  });
});
