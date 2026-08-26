import { describe, expect, it } from "vitest";
import decorStoneSpec from "../../configs/calculators/decor-stone-canonical.v1.json";
import factorTablesJson from "../../configs/factor-tables.json";
import type { DecorStoneCanonicalSpec } from "../../engine/canonical";
import { computeCanonicalDecorStone } from "../../engine/decor-stone";
import type { FactorTable } from "../../engine/factors";

const spec = decorStoneSpec as unknown as DecorStoneCanonicalSpec;
const factorTable = factorTablesJson.factors as unknown as FactorTable;

function calc(inputs: Parameters<typeof computeCanonicalDecorStone>[1]) {
  return computeCanonicalDecorStone(spec, inputs, factorTable);
}

describe("computeCanonicalDecorStone — безопасная модель v2", () => {
  it("вычитает площадь проёмов только из площади по размерам", () => {
    const bySize = calc({ inputMode: 0, wallWidth: 4, wallHeight: 2.7, openingsArea: 1.8 });
    const readyArea = calc({ inputMode: 1, area: 15, openingsArea: 1.8 });

    expect(bySize.totals.grossArea).toBe(10.8);
    expect(bySize.totals.area).toBe(9);
    expect(readyArea.totals.area).toBe(15);
  });

  it("применяет пользовательский запас один раз и округляет по площади коробки", () => {
    const result = calc({
      inputMode: 1,
      area: 10,
      reservePercent: 10,
      packArea: 1.8,
    });

    expect(result.scenarios.MIN.exact_need).toBe(10);
    expect(result.scenarios.REC.exact_need).toBe(11);
    expect(result.scenarios.MAX.exact_need).toBe(11.5);
    expect(result.scenarios.REC.buy_plan.packages_count).toBe(7);
    expect(result.scenarios.REC.purchase_quantity).toBe(12.6);
    expect(result.scenarios.REC.leftover).toBe(1.6);
  });

  it("считает расходники по паспортным нормам и реальным фасовкам без скрытого запаса", () => {
    const result = calc({
      inputMode: 1,
      area: 10,
      glueRate: 4.2,
      glueBag: 20,
      needGrout: 1,
      groutRate: 0.35,
      groutBag: 5,
      needPrimer: 1,
      primerRate: 0.12,
      primerLayers: 2,
      primerCan: 5,
    });

    expect(result.totals.glueKg).toBe(42);
    expect(result.totals.glueBags).toBe(3);
    expect(result.totals.groutKg).toBe(3.5);
    expect(result.totals.groutBags).toBe(1);
    expect(result.totals.primerL).toBe(2.4);
    expect(result.totals.primerCans).toBe(1);
  });

  it("не выводит расход клея из типа камня", () => {
    const gypsum = calc({ inputMode: 1, area: 10, stoneType: 0, glueRate: 4.2 });
    const natural = calc({ inputMode: 1, area: 10, stoneType: 2, glueRate: 4.2 });

    expect(gypsum.totals.glueKg).toBe(natural.totals.glueKg);
  });
});
