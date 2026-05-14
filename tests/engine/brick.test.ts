import { describe, expect, it } from "vitest";
import { computeCanonicalBrick } from "../../engine/brick";
import type { BrickCanonicalSpec } from "../../engine/canonical";
import type { FactorTable } from "../../engine/factors";
import brickSpec from "../../configs/calculators/brick-canonical.v1.json";
import factorTablesJson from "../../configs/factor-tables.json";

const spec = brickSpec as unknown as BrickCanonicalSpec;
const factorTable = factorTablesJson.factors as unknown as FactorTable;

function calc(inputs: Parameters<typeof computeCanonicalBrick>[1]) {
  return computeCanonicalBrick(spec, inputs, factorTable);
}

describe("computeCanonicalBrick — golden snapshot (basic mode)", () => {
  it("стена 5×3, одинарный кирпич, толщина 1 (250 мм)", () => {
    const r = calc({ accuracyMode: "basic" });

    expect(r.totals.area).toBe(15);
    expect(r.totals.wallWidth).toBe(5);
    expect(r.totals.wallHeight).toBe(3);
    expect(r.totals.brickType).toBe(0);
    expect(r.totals.wallThicknessMm).toBe(250);
    expect(r.totals.bricksPerSqm).toBe(102);
    expect(r.totals.wasteCoeff).toBe(1.05);
    expect(r.totals.bricksNeeded).toBeCloseTo(1702.89, 2);
    expect(r.totals.cementBags).toBe(4);
    expect(r.totals.totalRows).toBe(40);
    expect(r.totals.meshLayers).toBe(8);
    expect(r.scenarios.REC.purchase_quantity).toBe(1703);
    expect(r.scenarios.MAX.purchase_quantity).toBe(2215);
  });

  it("realistic mode даёт больше кирпичей чем basic", () => {
    const basic = calc({ accuracyMode: "basic" });
    const real = calc({ accuracyMode: "realistic" });

    expect(real.totals.bricksNeeded).toBeGreaterThan(basic.totals.bricksNeeded);
    expect(real.scenarios.REC.purchase_quantity).toBeGreaterThan(
      basic.scenarios.REC.purchase_quantity,
    );
  });

  it("полкирпича (wallThickness=0) даёт предупреждение про ненесущую перегородку", () => {
    const r = calc({ accuracyMode: "basic", wallThickness: 0 });
    expect(r.totals.wallThickness).toBe(0);
    expect(r.warnings.some((w) => w.includes("ненесущ"))).toBe(true);
  });

  it("толстая стена (wallThickness>=threshold) добавляет гибкие связи", () => {
    const r = calc({ accuracyMode: "basic", wallThickness: 3 });
    expect(r.totals.flexibleTies).toBeGreaterThan(0);
    expect(r.materials.some((m) => m.name.includes("Гибкие связи"))).toBe(true);
  });

  it("раствор содержит цемент и песок; добавка по умолчанию — известь (mortarAdditive=0)", () => {
    const r = calc({ accuracyMode: "basic" });
    const names = r.materials.map((m) => m.name);
    expect(names.some((n) => n.includes("Цемент"))).toBe(true);
    expect(names.some((n) => n.includes("Песок"))).toBe(true);
    // По умолчанию — известь (традиционная пластифицирующая добавка).
    expect(names.some((n) => n.includes("Известь"))).toBe(true);
    expect(names.some((n) => n.includes("Пластификатор"))).toBe(false);
  });

  it("mortarAdditive=1 → пластификатор вместо извести (взаимоисключение)", () => {
    const r = calc({ accuracyMode: "basic", mortarAdditive: 1 });
    const names = r.materials.map((m) => m.name);
    expect(names.some((n) => n.includes("Пластификатор"))).toBe(true);
    expect(names.some((n) => n.includes("Известь"))).toBe(false);
  });

  it("companion: добавлен инструмент каменщика и гидроизоляция фундамента", () => {
    const r = calc({ accuracyMode: "basic" });
    const names = r.materials.map((m) => m.name);
    expect(names.some((n) => n.includes("Кельма"))).toBe(true);
    expect(names.some((n) => n.includes("Уровень"))).toBe(true);
    expect(names.some((n) => n.includes("Расшивка"))).toBe(true);
    expect(names.some((n) => n.includes("Рубероид"))).toBe(true);
  });

  it("структура результата корректна", () => {
    const r = calc({ accuracyMode: "basic" });
    expect(r.canonicalSpecId).toBe("brick");
    expect(r.formulaVersion).toBeDefined();
    expect(r.scenarios.MIN.exact_need).toBeLessThan(r.scenarios.REC.exact_need);
    expect(r.scenarios.REC.exact_need).toBeLessThan(r.scenarios.MAX.exact_need);
  });
});
