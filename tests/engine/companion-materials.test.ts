import { describe, expect, it } from "vitest";
import {
  evaluateCompanionMaterials,
  evaluateCondition,
  computeFormula,
  type CompanionContext,
} from "../../engine/companion-materials";
import type {
  CompanionCondition,
  CompanionFormula,
  CompanionMaterialSpec,
} from "../../engine/canonical";

function ctx(
  inputs: Record<string, number> = {},
  totals: Record<string, number> = {},
): CompanionContext {
  return { inputs, totals };
}

/* ─── Условия ───────────────────────────────────────────────────────────── */

describe("evaluateCondition", () => {
  it("input_eq — истинно при совпадении", () => {
    expect(
      evaluateCondition(
        { type: "input_eq", input_key: "type", value: 3 },
        ctx({ type: 3 }),
      ),
    ).toBe(true);
  });

  it("input_eq — ложно при несовпадении", () => {
    expect(
      evaluateCondition(
        { type: "input_eq", input_key: "type", value: 3 },
        ctx({ type: 2 }),
      ),
    ).toBe(false);
  });

  it("input_eq — ложно если поле отсутствует", () => {
    expect(
      evaluateCondition(
        { type: "input_eq", input_key: "type", value: 3 },
        ctx({}),
      ),
    ).toBe(false);
  });

  it("input_neq", () => {
    expect(
      evaluateCondition(
        { type: "input_neq", input_key: "type", value: 3 },
        ctx({ type: 2 }),
      ),
    ).toBe(true);
    expect(
      evaluateCondition(
        { type: "input_neq", input_key: "type", value: 3 },
        ctx({ type: 3 }),
      ),
    ).toBe(false);
  });

  it("input_in", () => {
    expect(
      evaluateCondition(
        { type: "input_in", input_key: "grade", values: [1, 2, 3] },
        ctx({ grade: 2 }),
      ),
    ).toBe(true);
    expect(
      evaluateCondition(
        { type: "input_in", input_key: "grade", values: [1, 2, 3] },
        ctx({ grade: 5 }),
      ),
    ).toBe(false);
  });

  it("input_gte и input_lte", () => {
    expect(
      evaluateCondition(
        { type: "input_gte", input_key: "x", value: 10 },
        ctx({ x: 10 }),
      ),
    ).toBe(true);
    expect(
      evaluateCondition(
        { type: "input_gte", input_key: "x", value: 10 },
        ctx({ x: 9 }),
      ),
    ).toBe(false);
    expect(
      evaluateCondition(
        { type: "input_lte", input_key: "x", value: 10 },
        ctx({ x: 10 }),
      ),
    ).toBe(true);
  });

  it("totals_gt и totals_lt", () => {
    expect(
      evaluateCondition(
        { type: "totals_gt", totals_key: "area", value: 50 },
        ctx({}, { area: 60 }),
      ),
    ).toBe(true);
    expect(
      evaluateCondition(
        { type: "totals_lt", totals_key: "area", value: 50 },
        ctx({}, { area: 40 }),
      ),
    ).toBe(true);
  });

  it("and/or — композиция", () => {
    const andCond: CompanionCondition = {
      type: "and",
      all: [
        { type: "input_eq", input_key: "a", value: 1 },
        { type: "input_eq", input_key: "b", value: 2 },
      ],
    };
    expect(evaluateCondition(andCond, ctx({ a: 1, b: 2 }))).toBe(true);
    expect(evaluateCondition(andCond, ctx({ a: 1, b: 3 }))).toBe(false);

    const orCond: CompanionCondition = {
      type: "or",
      any: [
        { type: "input_eq", input_key: "a", value: 1 },
        { type: "input_eq", input_key: "b", value: 2 },
      ],
    };
    expect(evaluateCondition(orCond, ctx({ a: 1, b: 99 }))).toBe(true);
    expect(evaluateCondition(orCond, ctx({ a: 9, b: 9 }))).toBe(false);
  });

  it("never — всегда ложь", () => {
    expect(evaluateCondition({ type: "never" }, ctx({ x: 1 }))).toBe(false);
  });
});

/* ─── Формулы ───────────────────────────────────────────────────────────── */

describe("computeFormula", () => {
  it("fixed: возвращает константу", () => {
    expect(computeFormula({ type: "fixed", value: 5 }, ctx())).toBe(5);
  });

  it("fixed: отрицательные значения зажимаются до 0", () => {
    expect(computeFormula({ type: "fixed", value: -3 }, ctx())).toBe(0);
  });

  it("per_input: умножение на per_unit", () => {
    const f: CompanionFormula = { type: "per_input", input_key: "doors", per_unit: 2 };
    expect(computeFormula(f, ctx({ doors: 3 }))).toBe(6);
    expect(computeFormula(f, ctx({}))).toBe(0);
  });

  it("per_total: умножение на per_unit с totals", () => {
    const f: CompanionFormula = { type: "per_total", totals_key: "perimeter", per_unit: 0.5 };
    expect(computeFormula(f, ctx({}, { perimeter: 20 }))).toBe(10);
  });

  it("area_consumption: учёт расхода и резерва", () => {
    const f: CompanionFormula = {
      type: "area_consumption",
      totals_key: "area",
      consumption_per_m2: 0.15,
      reserve_factor: 1.1,
    };
    expect(computeFormula(f, ctx({}, { area: 40 }))).toBeCloseTo(6.6, 5);
  });

  it("area_consumption: без reserve_factor работает как ×1", () => {
    const f: CompanionFormula = {
      type: "area_consumption",
      totals_key: "area",
      consumption_per_m2: 0.15,
    };
    expect(computeFormula(f, ctx({}, { area: 40 }))).toBeCloseTo(6, 5);
  });

  it("perimeter_consumption и volume_consumption", () => {
    expect(
      computeFormula(
        {
          type: "perimeter_consumption",
          totals_key: "p",
          consumption_per_m: 2,
        },
        ctx({}, { p: 10 }),
      ),
    ).toBe(20);
    expect(
      computeFormula(
        {
          type: "volume_consumption",
          totals_key: "v",
          consumption_per_m3: 290,
        },
        ctx({}, { v: 5 }),
      ),
    ).toBe(1450);
  });

  it("per_count_step: 1 кисть до step, потом по +1 на step", () => {
    const f: CompanionFormula = {
      type: "per_count_step",
      totals_key: "area",
      fixed: 1,
      step: 40,
    };
    expect(computeFormula(f, ctx({}, { area: 20 }))).toBe(1);
    expect(computeFormula(f, ctx({}, { area: 40 }))).toBe(1);
    expect(computeFormula(f, ctx({}, { area: 41 }))).toBe(2);
    expect(computeFormula(f, ctx({}, { area: 80 }))).toBe(2);
    expect(computeFormula(f, ctx({}, { area: 81 }))).toBe(3);
  });

  it("per_count_step: с max — ограничение сверху", () => {
    const f: CompanionFormula = {
      type: "per_count_step",
      totals_key: "area",
      fixed: 1,
      step: 40,
      max: 3,
    };
    expect(computeFormula(f, ctx({}, { area: 200 }))).toBe(3);
  });

  it("per_count_step: 0 при base=0", () => {
    const f: CompanionFormula = {
      type: "per_count_step",
      totals_key: "area",
      fixed: 1,
      step: 40,
    };
    expect(computeFormula(f, ctx({}, { area: 0 }))).toBe(0);
  });

  it("linear_overlap: перекрытие мембран/сеток", () => {
    expect(
      computeFormula(
        {
          type: "linear_overlap",
          totals_key: "area",
          overlap_factor: 1.15,
        },
        ctx({}, { area: 40 }),
      ),
    ).toBeCloseTo(46, 5);
  });
});

/* ─── Упаковки и сборка результата ──────────────────────────────────────── */

describe("evaluateCompanionMaterials — упаковки", () => {
  it("без упаковки: ceil до штуки", () => {
    const spec: CompanionMaterialSpec = {
      key: "wedges",
      label: "Клинья распорные",
      category: "Монтаж",
      unit: "шт",
      formula: { type: "per_total", totals_key: "perimeter", per_unit: 2 },
    };
    const r = evaluateCompanionMaterials([spec], ctx({}, { perimeter: 17.5 }));
    expect(r).toHaveLength(1);
    expect(r[0].quantity).toBe(35);
    expect(r[0].purchaseQty).toBe(35);
  });

  it("с упаковкой: округление до целых упаковок", () => {
    const spec: CompanionMaterialSpec = {
      key: "primer",
      label: "Грунтовка",
      category: "Подготовка",
      unit: "л",
      formula: {
        type: "area_consumption",
        totals_key: "area",
        consumption_per_m2: 0.15,
        reserve_factor: 1.1,
      },
      package: { size: 10, unit: "канистр" },
    };
    // exact = 40 × 0.15 × 1.1 = 6.6 → 1 канистра 10 л
    const r = evaluateCompanionMaterials([spec], ctx({}, { area: 40 }));
    expect(r).toHaveLength(1);
    expect(r[0].quantity).toBeCloseTo(6.6, 3);
    expect(r[0].purchaseQty).toBe(10);
    expect(r[0].packageInfo).toEqual({ count: 1, size: 10, packageUnit: "канистр" });
  });

  it("exact_need=0 → материал не добавляется", () => {
    const spec: CompanionMaterialSpec = {
      key: "primer",
      label: "Грунтовка",
      category: "Подготовка",
      unit: "л",
      formula: { type: "area_consumption", totals_key: "area", consumption_per_m2: 0.15 },
    };
    const r = evaluateCompanionMaterials([spec], ctx({}, { area: 0 }));
    expect(r).toHaveLength(0);
  });
});

describe("evaluateCompanionMaterials — условия", () => {
  const primer: CompanionMaterialSpec = {
    key: "primer",
    label: "Грунтовка",
    category: "Подготовка",
    unit: "л",
    formula: {
      type: "area_consumption",
      totals_key: "area",
      consumption_per_m2: 0.15,
    },
    skip_when: { type: "input_eq", input_key: "surfacePrep", value: 2 },
  };

  it("skip_when=true → пропускаем", () => {
    const r = evaluateCompanionMaterials(
      [primer],
      ctx({ surfacePrep: 2 }, { area: 40 }),
    );
    expect(r).toHaveLength(0);
  });

  it("skip_when=false → включаем", () => {
    const r = evaluateCompanionMaterials(
      [primer],
      ctx({ surfacePrep: 0 }, { area: 40 }),
    );
    expect(r).toHaveLength(1);
  });

  it("only_when=true → включаем", () => {
    const mastic: CompanionMaterialSpec = {
      key: "mastic",
      label: "Мастика",
      category: "Гидроизоляция",
      unit: "кг",
      formula: { type: "fixed", value: 20 },
      only_when: { type: "input_eq", input_key: "application", value: 0 },
    };
    expect(evaluateCompanionMaterials([mastic], ctx({ application: 0 }))).toHaveLength(1);
    expect(evaluateCompanionMaterials([mastic], ctx({ application: 1 }))).toHaveLength(0);
  });
});

describe("evaluateCompanionMaterials — альтернативы", () => {
  // Известь и пластификатор: первый подходящий побеждает.
  const lime: CompanionMaterialSpec = {
    key: "lime",
    label: "Известь гашёная",
    category: "Раствор",
    unit: "кг",
    formula: { type: "fixed", value: 10 },
    alternative_group: "mortar_additive",
    only_when: { type: "input_eq", input_key: "mortarType", value: 0 },
  };
  const plasticizer: CompanionMaterialSpec = {
    key: "plasticizer",
    label: "Пластификатор",
    category: "Раствор",
    unit: "л",
    formula: { type: "fixed", value: 2 },
    alternative_group: "mortar_additive",
    only_when: { type: "input_eq", input_key: "mortarType", value: 1 },
  };

  it("выбран только один материал из группы", () => {
    const r = evaluateCompanionMaterials([lime, plasticizer], ctx({ mortarType: 0 }));
    expect(r).toHaveLength(1);
    expect(r[0].name).toBe("Известь гашёная");
  });

  it("если оба only_when выполнены — побеждает первый в списке", () => {
    // Уберём only_when у обоих, чтобы оба «прошли»
    const a = { ...lime, only_when: undefined };
    const b = { ...plasticizer, only_when: undefined };
    const r = evaluateCompanionMaterials([a, b], ctx({}));
    expect(r).toHaveLength(1);
    expect(r[0].name).toBe("Известь гашёная");
  });
});

describe("evaluateCompanionMaterials — порядок и категории", () => {
  it("сохраняет порядок объявлений", () => {
    const a: CompanionMaterialSpec = {
      key: "a",
      label: "A",
      category: "Cat1",
      unit: "шт",
      formula: { type: "fixed", value: 1 },
    };
    const b: CompanionMaterialSpec = {
      key: "b",
      label: "B",
      category: "Cat2",
      unit: "шт",
      formula: { type: "fixed", value: 1 },
    };
    const c: CompanionMaterialSpec = {
      key: "c",
      label: "C",
      category: "Cat1",
      unit: "шт",
      formula: { type: "fixed", value: 1 },
    };
    const r = evaluateCompanionMaterials([a, b, c], ctx());
    expect(r.map((m) => m.name)).toEqual(["A", "B", "C"]);
  });
});

describe("evaluateCompanionMaterials — реальные кейсы из аудита", () => {
  it("грунтовка не добавляется для эковаты (insulationType=3)", () => {
    const primer: CompanionMaterialSpec = {
      key: "primer",
      label: "Грунтовка",
      category: "Подготовка",
      unit: "л",
      formula: { type: "area_consumption", totals_key: "area", consumption_per_m2: 0.15 },
      skip_when: { type: "input_eq", input_key: "insulationType", value: 3 },
    };
    expect(
      evaluateCompanionMaterials([primer], ctx({ insulationType: 3 }, { area: 40 })),
    ).toHaveLength(0);
    expect(
      evaluateCompanionMaterials([primer], ctx({ insulationType: 0 }, { area: 40 })),
    ).toHaveLength(1);
  });

  it("мастика и плёнка включаются только для применения «фундамент»", () => {
    const mastic: CompanionMaterialSpec = {
      key: "mastic",
      label: "Мастика гидроизоляционная",
      category: "Гидроизоляция",
      unit: "кг",
      formula: { type: "fixed", value: 20 },
      package: { size: 20, unit: "вёдер" },
      only_when: { type: "input_eq", input_key: "application", value: 0 },
    };
    // application=0 (фундамент)
    expect(
      evaluateCompanionMaterials([mastic], ctx({ application: 0 })),
    ).toHaveLength(1);
    // application=2 (декор)
    expect(
      evaluateCompanionMaterials([mastic], ctx({ application: 2 })),
    ).toHaveLength(0);
  });

  it("кисти растут с площадью: 1 шт до 40 м², 2 шт до 80 м²", () => {
    const brush: CompanionMaterialSpec = {
      key: "brush",
      label: "Кисть плоская 50 мм",
      category: "Инструмент",
      unit: "шт",
      formula: {
        type: "per_count_step",
        totals_key: "area",
        fixed: 1,
        step: 40,
        max: 5,
      },
    };
    expect(
      evaluateCompanionMaterials([brush], ctx({}, { area: 20 }))[0].purchaseQty,
    ).toBe(1);
    expect(
      evaluateCompanionMaterials([brush], ctx({}, { area: 80 }))[0].purchaseQty,
    ).toBe(2);
    expect(
      evaluateCompanionMaterials([brush], ctx({}, { area: 200 }))[0].purchaseQty,
    ).toBe(5);
  });
});
