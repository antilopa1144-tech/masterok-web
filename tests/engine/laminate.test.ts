import { describe, expect, it } from "vitest";
import { computeCanonicalLaminate } from "../../engine/laminate";
import type { LaminateCanonicalSpec } from "../../engine/canonical";
import type { FactorTable } from "../../engine/factors";
import laminateSpec from "../../configs/calculators/laminate-canonical.v1.json";
import factorTablesJson from "../../configs/factor-tables.json";

const spec = laminateSpec as unknown as LaminateCanonicalSpec;
const factorTable = factorTablesJson.factors as unknown as FactorTable;

function calc(inputs: Parameters<typeof computeCanonicalLaminate>[1]) {
  return computeCanonicalLaminate(spec, inputs, factorTable);
}

describe("computeCanonicalLaminate — golden snapshot (basic mode)", () => {
  it("стандартная комната 5×4, дефолтные параметры", () => {
    const r = calc({ accuracyMode: "basic" });

    expect(r.totals.area).toBe(20);
    expect(r.totals.perimeter).toBe(17.889);
    expect(r.totals.wastePercent).toBe(10);
    expect(r.totals.baseExactNeedArea).toBe(22);
    expect(r.totals.packsNeeded).toBe(10);
    expect(r.totals.plinthPieces).toBe(7);
    expect(r.totals.wedgesNeeded).toBe(36);
    expect(r.totals.underlaymentRolls).toBe(3);
    expect(r.totals.expansionJointPieces).toBe(0);
    expect(r.scenarios.MIN.exact_need).toBeCloseTo(20.076672, 5);
    expect(r.scenarios.REC.exact_need).toBe(22);
    expect(r.scenarios.MAX.exact_need).toBeCloseTo(29.00128, 5);
    expect(r.scenarios.REC.purchase_quantity).toBeCloseTo(23.97, 3);
  });

  it("realistic mode даёт большее значение, чем basic", () => {
    const basic = calc({ accuracyMode: "basic" });
    const real = calc({ accuracyMode: "realistic" });

    expect(real.totals.baseExactNeedArea).toBeGreaterThan(basic.totals.baseExactNeedArea);
    expect(real.totals.packsNeeded).toBeGreaterThanOrEqual(basic.totals.packsNeeded);
    expect(real.scenarios.REC.exact_need).toBeGreaterThan(basic.scenarios.REC.exact_need);
  });

  it("площадь >50 м² добавляет компенсационный шов (СП 71.13330)", () => {
    const r = calc({ accuracyMode: "basic", inputMode: 1, area: 60, perimeter: 32 });

    expect(r.totals.expansionJointPieces).toBe(8);
    expect(r.totals.expansionJointLengthM).toBeCloseTo(7.746, 3);
    expect(r.materials.some((m) => m.name.includes("компенсационный"))).toBe(true);
    expect(r.warnings.some((w) => w.includes("компенсационный"))).toBe(true);
  });

  it("площадь ≤50 м² не требует компенсационного шва", () => {
    const r = calc({ accuracyMode: "basic", inputMode: 1, area: 30 });
    expect(r.totals.expansionJointPieces).toBe(0);
    expect(r.materials.some((m) => m.name.includes("компенсационный"))).toBe(false);
  });

  it("диагональная укладка (id=4) добавляет предупреждение и больше отходов", () => {
    const r = calc({ accuracyMode: "basic", layoutProfileId: 4 });
    expect(r.totals.wastePercent).toBe(15);
    expect(r.warnings.some((w) => w.includes("Диагональная"))).toBe(true);
  });

  it("маленькая комната (<15 м²) добавляет smallRoomAdjustment", () => {
    const r = calc({ accuracyMode: "basic", inputMode: 1, area: 10 });
    expect(r.totals.smallRoomAdjustment).toBeGreaterThan(0);
    expect(r.totals.wastePercent).toBeGreaterThan(10);
  });

  it("отключение подложки убирает её из материалов", () => {
    const withU = calc({ accuracyMode: "basic", hasUnderlayment: 1 });
    const noU = calc({ accuracyMode: "basic", hasUnderlayment: 0 });

    expect(withU.materials.some((m) => m.name.includes("Подложка"))).toBe(true);
    expect(noU.materials.some((m) => m.name.includes("Подложка"))).toBe(false);
    expect(noU.totals.underlaymentRolls).toBe(0);
  });

  it("структура результата содержит обязательные поля", () => {
    const r = calc({ accuracyMode: "basic" });
    expect(r.canonicalSpecId).toBe("laminate");
    expect(r.formulaVersion).toBe("laminate-canonical-v1");
    expect(r.scenarios.MIN).toBeDefined();
    expect(r.scenarios.REC).toBeDefined();
    expect(r.scenarios.MAX).toBeDefined();
    expect(r.accuracyMode).toBe("basic");
  });
});

describe("computeCanonicalLaminate — companion materials", () => {
  function names(r: ReturnType<typeof calc>) {
    return r.materials.map((m) => m.name);
  }

  it("floorBase=0 (бетон) → пароизоляция включена", () => {
    const r = calc({ accuracyMode: "basic", floorBase: 0 });
    expect(names(r).some((n) => n.includes("Пароизоляц"))).toBe(true);
  });

  it("floorBase=1 (дерево) → пароизоляция НЕ включена (избегаем конденсата)", () => {
    const r = calc({ accuracyMode: "basic", floorBase: 1 });
    expect(names(r).some((n) => n.includes("Пароизоляц"))).toBe(false);
  });

  it("outerCorners=0 → внешние углы не добавляются", () => {
    const r = calc({ accuracyMode: "basic", outerCorners: 0 });
    expect(names(r).some((n) => n.includes("Внешние углы"))).toBe(false);
  });

  it("outerCorners=3 → 3 внешних угла", () => {
    const r = calc({ accuracyMode: "basic", outerCorners: 3 });
    const cornerMat = r.materials.find((m) => m.name.includes("Внешние углы"));
    expect(cornerMat).toBeDefined();
    expect(cornerMat!.purchaseQty).toBe(3);
  });

  it("заглушки плинтуса: 2 шт на каждый дверной проём", () => {
    const r = calc({ accuracyMode: "basic", doorThresholds: 2 });
    const caps = r.materials.find((m) => m.name.includes("Заглушки"));
    expect(caps).toBeDefined();
    expect(caps!.purchaseQty).toBe(4);
  });

  it("скотч стыков подложки — только при наличии подложки", () => {
    const withU = calc({ accuracyMode: "basic", hasUnderlayment: 1 });
    const noU = calc({ accuracyMode: "basic", hasUnderlayment: 0 });
    expect(withU.materials.some((m) => m.name.includes("Скотч"))).toBe(true);
    expect(noU.materials.some((m) => m.name.includes("Скотч"))).toBe(false);
  });
});
