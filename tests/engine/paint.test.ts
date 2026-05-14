import { describe, expect, it } from "vitest";
import { computeCanonicalPaint } from "../../engine/paint";
import type { PaintCanonicalSpec } from "../../engine/canonical";
import type { FactorTable } from "../../engine/factors";
import paintSpec from "../../configs/calculators/paint-canonical.v1.json";
import factorTablesJson from "../../configs/factor-tables.json";

const spec = paintSpec as unknown as PaintCanonicalSpec;
const factorTable = factorTablesJson.factors as unknown as FactorTable;

function calc(inputs: Parameters<typeof computeCanonicalPaint>[1]) {
  return computeCanonicalPaint(spec, inputs, factorTable);
}

describe("computeCanonicalPaint — golden snapshot (basic mode)", () => {
  it("дефолтная площадь 40 м², 2 слоя, расход 10 м²/л → 8 л базового", () => {
    const r = calc({ accuracyMode: "basic" });

    expect(r.totals.area).toBe(40);
    expect(r.totals.coats).toBe(2);
    expect(r.totals.coverage).toBe(10);
    expect(r.totals.lPerSqm).toBe(0.2);
    expect(r.totals.baseExactNeedL).toBe(8);
    expect(r.scenarios.REC.exact_need).toBeCloseTo(8.736096, 5);
    expect(r.scenarios.REC.purchase_quantity).toBe(9);
    expect(r.scenarios.MAX.purchase_quantity).toBe(15);
  });

  it("realistic mode завышает базовый объём", () => {
    const basic = calc({ accuracyMode: "basic" });
    const real = calc({ accuracyMode: "realistic" });

    expect(real.totals.baseExactNeedL).toBeGreaterThan(basic.totals.baseExactNeedL);
    expect(real.scenarios.REC.purchase_quantity).toBeGreaterThanOrEqual(
      basic.scenarios.REC.purchase_quantity,
    );
  });

  it("комната по габаритам 4×5×2.7 — стены 40, потолок 20", () => {
    const r = calc({
      accuracyMode: "basic",
      roomWidth: 4,
      roomLength: 5,
      roomHeight: 2.7,
    });

    expect(r.totals.wallArea).toBeCloseTo(48.6, 1);
    expect(r.totals.ceilingArea).toBe(20);
  });

  it("фасадная краска (paintType=1) не включает потолок", () => {
    const r = calc({
      accuracyMode: "basic",
      paintType: 1,
      roomWidth: 4,
      roomLength: 5,
      roomHeight: 2.7,
    });

    expect(r.totals.paintType).toBe(1);
    expect(r.totals.ceilingArea).toBe(0);
  });

  it("одного слоя → предупреждение", () => {
    const r = calc({ accuracyMode: "basic", coats: 1 });
    expect(r.warnings.some((w) => w.toLowerCase().includes("один слой"))).toBe(true);
  });

  it("грунтовка считается по площади", () => {
    const r = calc({ accuracyMode: "basic" });
    expect(r.totals.primerLiters).toBeCloseTo(4.4, 1);
    const primer = r.materials.find((m) => m.name.includes("Грунтовка"));
    expect(primer).toBeDefined();
  });

  it("малярная лента считается по эстимейту периметра", () => {
    const r = calc({ accuracyMode: "basic" });
    expect(r.totals.tapeRolls).toBeGreaterThanOrEqual(1);
    expect(r.materials.some((m) => m.name.includes("Малярная лента"))).toBe(true);
  });

  it("структура результата содержит обязательные поля", () => {
    const r = calc({ accuracyMode: "basic" });
    expect(r.canonicalSpecId).toBe("paint");
    expect(r.formulaVersion).toBe("paint-canonical-v1");
    expect(r.scenarios.MIN.exact_need).toBeLessThan(r.scenarios.REC.exact_need);
    expect(r.scenarios.REC.exact_need).toBeLessThan(r.scenarios.MAX.exact_need);
  });
});

describe("computeCanonicalPaint — companion materials", () => {
  function names(r: ReturnType<typeof calc>) {
    return r.materials.map((m) => m.name);
  }

  it("дефолт: грунтовка включена, есть валик микрофибра, кисть, кювета, лента, перчатки, плёнка", () => {
    const r = calc({ accuracyMode: "basic" });
    const list = names(r);
    expect(list.some((n) => n.includes("Грунтовка"))).toBe(true);
    expect(list.some((n) => n.includes("микрофибра"))).toBe(true);
    expect(list.some((n) => n.includes("50 мм"))).toBe(true);
    expect(list.some((n) => n.includes("25 мм"))).toBe(true);
    expect(list.some((n) => n.includes("Кювета"))).toBe(true);
    expect(list.some((n) => n.includes("Малярная лента"))).toBe(true);
    expect(list.some((n) => n.includes("Перчатки"))).toBe(true);
    expect(list.some((n) => n.includes("плёнка"))).toBe(true);
  });

  it("surfacePrep=2 (ранее окрашенная) → грунтовка не добавляется", () => {
    const r = calc({ accuracyMode: "basic", surfacePrep: 2 });
    const list = names(r);
    expect(list.some((n) => n.includes("Грунтовка"))).toBe(false);
  });

  it("paintType=1 (фасадная) → велюровый валик вместо микрофибры, нет узкой кисти", () => {
    const r = calc({ accuracyMode: "basic", paintType: 1 });
    const list = names(r);
    expect(list.some((n) => n.includes("велюровый"))).toBe(true);
    expect(list.some((n) => n.includes("микрофибра"))).toBe(false);
    expect(list.some((n) => n.includes("25 мм"))).toBe(false);
  });

  it("coats=1 → шкурка не добавляется (нет шлифовки между слоями)", () => {
    const r = calc({ accuracyMode: "basic", coats: 1 });
    expect(names(r).some((n) => n.includes("Шкурка"))).toBe(false);
  });

  it("coats>=2 → шкурка добавляется", () => {
    const r = calc({ accuracyMode: "basic", coats: 2 });
    expect(names(r).some((n) => n.includes("Шкурка"))).toBe(true);
  });

  it("валик: 1 шт для 40 м², 2 шт для 80 м²", () => {
    const small = calc({ accuracyMode: "basic", area: 40 });
    const big = calc({ accuracyMode: "basic", area: 80 });
    const r1 = small.materials.find((m) => m.name.includes("микрофибра"))!;
    const r2 = big.materials.find((m) => m.name.includes("микрофибра"))!;
    expect(r1.purchaseQty).toBe(1);
    expect(r2.purchaseQty).toBe(2);
  });

  it("грунтовка пакуется канистрами 10 л", () => {
    const r = calc({ accuracyMode: "basic" });
    const primer = r.materials.find((m) => m.name.includes("Грунтовка"));
    expect(primer?.packageInfo?.size).toBe(10);
    expect(primer?.packageInfo?.packageUnit).toBe("канистр");
  });
});
