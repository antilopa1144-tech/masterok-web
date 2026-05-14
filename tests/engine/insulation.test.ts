import { describe, expect, it } from "vitest";
import { computeCanonicalInsulation } from "../../engine/insulation";
import type { InsulationCanonicalSpec } from "../../engine/canonical";
import type { FactorTable } from "../../engine/factors";
import insulationSpec from "../../configs/calculators/insulation-canonical.v1.json";
import factorTablesJson from "../../configs/factor-tables.json";

const spec = insulationSpec as unknown as InsulationCanonicalSpec;
const factorTable = factorTablesJson.factors as unknown as FactorTable;

function calc(inputs: Parameters<typeof computeCanonicalInsulation>[1]) {
  return computeCanonicalInsulation(spec, inputs, factorTable);
}

const hasMaterial = (
  r: ReturnType<typeof computeCanonicalInsulation>,
  predicate: (name: string) => boolean,
): boolean => r.materials.some((m) => predicate(m.name));

describe("computeCanonicalInsulation — основной расчёт (basic mode)", () => {
  it("минвата 40 м², плита 1200×600 × 100 мм, запас 5%, штукатурный фасад → 66 плит = 11 упаковок", () => {
    const r = calc({ accuracyMode: "basic" });

    expect(r.totals.area).toBe(40);
    expect(r.totals.insulationType).toBe(0);
    expect(r.totals.plateSize).toBe(0);
    expect(r.totals.reserve).toBe(5);
    expect(r.totals.mountSystem).toBe(0);
    expect(r.totals.areaWithReserve).toBe(42);
    expect(r.totals.plateArea).toBe(0.72);
    // Покупка теперь кратна упаковке. Минвата 100 мм: 6 шт в упаковке.
    // 62 плиты / 6 ≈ 10.33 → 11 упаковок × 6 = 66 плит к покупке.
    expect(r.totals.piecesPerPack).toBe(6);
    expect(r.totals.packsNeeded).toBe(11);
    expect(r.totals.platesNeeded).toBe(66);
    expect(r.totals.dowelsNeeded).toBe(294);
    expect(r.scenarios.REC.exact_need).toBeCloseTo(61.83, 2);
    expect(r.scenarios.REC.purchase_quantity).toBe(66);
    expect(r.scenarios.MAX.purchase_quantity).toBe(84);
  });

  it("упаковка автоматически зависит от толщины: 50 мм → 12 шт, 100 мм → 6, 150 мм → 4", () => {
    expect(calc({ accuracyMode: "basic", thickness: 50 }).totals.piecesPerPack).toBe(12);
    expect(calc({ accuracyMode: "basic", thickness: 100 }).totals.piecesPerPack).toBe(6);
    expect(calc({ accuracyMode: "basic", thickness: 150 }).totals.piecesPerPack).toBe(4);
    expect(calc({ accuracyMode: "basic", thickness: 200 }).totals.piecesPerPack).toBe(3);
  });

  it("упаковка зависит от типа: ЭППС 100мм → 4 шт, минвата 100мм → 6, ППС 100мм → 5", () => {
    expect(calc({ accuracyMode: "basic", insulationType: 0, thickness: 100 }).totals.piecesPerPack).toBe(6);
    expect(calc({ accuracyMode: "basic", insulationType: 1, thickness: 100 }).totals.piecesPerPack).toBe(4);
    expect(calc({ accuracyMode: "basic", insulationType: 2, thickness: 100 }).totals.piecesPerPack).toBe(5);
  });

  it("piecesPerPack=8 (явный override) → используется заданное число вместо авто", () => {
    const r = calc({ accuracyMode: "basic", thickness: 100, piecesPerPack: 8 });
    expect(r.totals.piecesPerPack).toBe(8);
  });

  it("realistic mode завышает количество плит по сравнению с basic", () => {
    const basic = calc({ accuracyMode: "basic" });
    const real = calc({ accuracyMode: "realistic" });

    expect(real.scenarios.REC.purchase_quantity).toBeGreaterThan(
      basic.scenarios.REC.purchase_quantity,
    );
  });

  it("эковата (type=3) — мешки вместо плит", () => {
    const r = calc({
      accuracyMode: "basic",
      insulationType: 3,
      thickness: 150,
    });

    expect(r.totals.platesNeeded).toBe(0);
    expect(r.totals.dowelsNeeded).toBe(0);
    expect(r.totals.ecowoolVolume).toBe(6);
    // ecowoolBags = REC.purchase_quantity (раньше показывалось 16, до развязки округлений).
    expect(r.totals.ecowoolBags).toBe(17);
    expect(hasMaterial(r, (n) => n.includes("Эковата"))).toBe(true);
  });

  it("эковата с толщиной >150 мм → предупреждение про оседание", () => {
    const r = calc({
      accuracyMode: "basic",
      insulationType: 3,
      thickness: 200,
    });
    expect(r.warnings.some((w) => w.toLowerCase().includes("эковата"))).toBe(true);
  });

  it("большая площадь (>100 м²) → предупреждение про профессиональный монтаж", () => {
    const r = calc({ accuracyMode: "basic", area: 150 });
    expect(r.warnings.some((w) => w.includes("профессиональ"))).toBe(true);
  });

  it("структура результата корректна", () => {
    const r = calc({ accuracyMode: "basic" });
    expect(r.canonicalSpecId).toBe("insulation");
    expect(r.formulaVersion).toBe("insulation-canonical-v1");
    expect(r.scenarios.MIN.exact_need).toBeLessThan(r.scenarios.REC.exact_need);
    expect(r.scenarios.REC.exact_need).toBeLessThan(r.scenarios.MAX.exact_need);
  });
});

describe("климатическая зона (СП 50.13330)", () => {
  it("Юг (zone=0): 80 мм соответствует норме", () => {
    const r = calc({ accuracyMode: "basic", climateZone: 0, thickness: 80 });
    expect(r.warnings.some((w) => w.includes("меньше нормы"))).toBe(false);
  });

  it("Юг (zone=0): 50 мм — меньше нормы (минимум 80)", () => {
    const r = calc({ accuracyMode: "basic", climateZone: 0, thickness: 50 });
    expect(r.warnings.some((w) => w.includes("Юг") && w.includes("меньше нормы"))).toBe(true);
  });

  it("Центр (zone=1): 80 мм — меньше нормы (минимум 100)", () => {
    const r = calc({ accuracyMode: "basic", climateZone: 1, thickness: 80 });
    expect(r.warnings.some((w) => w.includes("Центр") && w.includes("меньше нормы"))).toBe(true);
  });

  it("Центр (zone=1): 100 мм — соответствует минимуму, но советует 150", () => {
    const r = calc({ accuracyMode: "basic", climateZone: 1, thickness: 100 });
    expect(r.warnings.some((w) => w.includes("меньше нормы"))).toBe(false);
    expect(r.practicalNotes?.some((n) => n.includes("Центр") && n.includes("рекомендуется"))).toBe(true);
  });

  it("Центр (zone=1): 150 мм — соответствует рекомендации", () => {
    const r = calc({ accuracyMode: "basic", climateZone: 1, thickness: 150 });
    expect(r.warnings.some((w) => w.includes("меньше нормы"))).toBe(false);
    expect(r.practicalNotes?.some((n) => n.includes("соответствует рекомендации"))).toBe(true);
  });

  it("Сибирь (zone=3): 150 мм — минимум, рекомендация 200", () => {
    const r = calc({ accuracyMode: "basic", climateZone: 3, thickness: 150 });
    expect(r.warnings.some((w) => w.includes("меньше нормы"))).toBe(false);
    expect(r.practicalNotes?.some((n) => n.includes("Сибирь"))).toBe(true);
  });

  it("Сибирь (zone=3): 100 мм — меньше нормы (минимум 150)", () => {
    const r = calc({ accuracyMode: "basic", climateZone: 3, thickness: 100 });
    expect(r.warnings.some((w) => w.includes("Сибирь") && w.includes("меньше нормы"))).toBe(true);
  });

  it("Крайний Север (zone=4): 250 мм — соответствует рекомендации", () => {
    const r = calc({ accuracyMode: "basic", climateZone: 4, thickness: 250 });
    expect(r.warnings.some((w) => w.includes("меньше нормы"))).toBe(false);
  });

  it("totals.climateZone сохраняется", () => {
    const r = calc({ accuracyMode: "basic", climateZone: 3 });
    expect(r.totals.climateZone).toBe(3);
  });

  it("дефолт climateZone=1 (Центр)", () => {
    const r = calc({ accuracyMode: "basic" });
    expect(r.totals.climateZone).toBe(1);
  });
});

describe("упаковки утеплителя (auto-расчёт от толщины)", () => {
  it("минвата 100 мм → 6 плит в упаковке (pack_height=600 мм)", () => {
    const r = calc({ accuracyMode: "basic", insulationType: 0, thickness: 100 });
    expect(r.totals.piecesPerPack).toBe(6);
    const plate = r.materials.find((m) => m.category === "Основное");
    expect(plate?.packageInfo?.size).toBe(6);
    expect(plate?.packageInfo?.packageUnit).toBe("упаковок");
  });

  it("минвата 50 мм → 12 плит в упаковке", () => {
    const r = calc({ accuracyMode: "basic", insulationType: 0, thickness: 50 });
    expect(r.totals.piecesPerPack).toBe(12);
  });

  it("минвата 150 мм → 4 плиты в упаковке", () => {
    const r = calc({ accuracyMode: "basic", insulationType: 0, thickness: 150 });
    expect(r.totals.piecesPerPack).toBe(4);
  });

  it("ЭППС 100 мм → 4 плиты (pack_height=400 мм)", () => {
    const r = calc({ accuracyMode: "basic", insulationType: 1, thickness: 100 });
    expect(r.totals.piecesPerPack).toBe(4);
  });

  it("ППС 100 мм → 5 плит (pack_height=500 мм)", () => {
    const r = calc({ accuracyMode: "basic", insulationType: 2, thickness: 100 });
    expect(r.totals.piecesPerPack).toBe(5);
  });

  it("эковата → piecesPerPack=0 (это мешки)", () => {
    const r = calc({ accuracyMode: "basic", insulationType: 3, thickness: 150 });
    expect(r.totals.piecesPerPack).toBe(0);
  });

  it("ручной override через input piecesPerPack=10", () => {
    const r = calc({ accuracyMode: "basic", insulationType: 0, thickness: 100, piecesPerPack: 10 });
    expect(r.totals.piecesPerPack).toBe(10);
  });

  it("число плит к покупке всегда кратно упаковке", () => {
    const r = calc({ accuracyMode: "basic", insulationType: 0, thickness: 100 });
    const pieces = r.totals.platesNeeded;
    const perPack = r.totals.piecesPerPack;
    expect(pieces % perPack).toBe(0);
  });

  it("totals.packsNeeded = platesNeeded / piecesPerPack", () => {
    const r = calc({ accuracyMode: "basic", insulationType: 0, thickness: 100 });
    expect(r.totals.packsNeeded * r.totals.piecesPerPack).toBe(r.totals.platesNeeded);
  });
});

describe("companion materials — сценарии", () => {
  it("штукатурный фасад с минватой: дюбели + ветрозащита + сетка + штукатурка + клей + грунт", () => {
    const r = calc({ accuracyMode: "basic", insulationType: 0, mountSystem: 0 });

    expect(hasMaterial(r, (n) => n.includes("Дюбели"))).toBe(true);
    expect(hasMaterial(r, (n) => n.toLowerCase().includes("гидроветрозащитная"))).toBe(true);
    expect(hasMaterial(r, (n) => n.toLowerCase().includes("стеклосетка"))).toBe(true);
    expect(hasMaterial(r, (n) => n.toLowerCase().includes("базовая штукатурка"))).toBe(true);
    expect(hasMaterial(r, (n) => n.toLowerCase().includes("клей фасадный"))).toBe(true);
    expect(hasMaterial(r, (n) => n.toLowerCase().includes("грунтовка"))).toBe(true);

    // Пароизоляция (изнутри помещения) для каркаса — НЕ должна быть в штукатурном фасаде
    expect(hasMaterial(r, (n) => n.toLowerCase().includes("пароизоляц"))).toBe(false);
    // Бруса каркаса быть не должно
    expect(hasMaterial(r, (n) => n.toLowerCase().includes("брус"))).toBe(false);
  });

  it("каркасная система с минватой: пароизоляция изнутри, ветрозащита, брус, саморезы — БЕЗ дюбелей/клея/грунта/штукатурки", () => {
    const r = calc({ accuracyMode: "basic", insulationType: 0, mountSystem: 1 });

    expect(hasMaterial(r, (n) => n.toLowerCase().includes("пароизоляц"))).toBe(true);
    expect(hasMaterial(r, (n) => n.toLowerCase().includes("гидроветрозащитная"))).toBe(true);
    expect(hasMaterial(r, (n) => n.toLowerCase().includes("брус"))).toBe(true);
    expect(hasMaterial(r, (n) => n.toLowerCase().includes("саморез"))).toBe(true);

    // Этих быть НЕ должно в каркасе
    expect(hasMaterial(r, (n) => n.includes("Дюбели"))).toBe(false);
    expect(hasMaterial(r, (n) => n.toLowerCase().includes("клей"))).toBe(false);
    expect(hasMaterial(r, (n) => n.toLowerCase().includes("грунтовка"))).toBe(false);
    expect(hasMaterial(r, (n) => n.toLowerCase().includes("стеклосетка"))).toBe(false);
    expect(hasMaterial(r, (n) => n.toLowerCase().includes("базовая штукатурка"))).toBe(false);
  });

  it("ЭППС в штукатурном фасаде: клей есть, мембран НЕТ (это для минваты)", () => {
    const r = calc({ accuracyMode: "basic", insulationType: 1, mountSystem: 0 });

    expect(hasMaterial(r, (n) => n.toLowerCase().includes("клей фасадный"))).toBe(true);
    expect(hasMaterial(r, (n) => n.toLowerCase().includes("гидроветрозащитная"))).toBe(false);
    expect(hasMaterial(r, (n) => n.toLowerCase().includes("пароизоляц"))).toBe(false);
  });

  it("эковата (type=3): НЕТ грунтовки (фикс главной ошибки)", () => {
    const r = calc({ accuracyMode: "basic", insulationType: 3, thickness: 150 });
    expect(hasMaterial(r, (n) => n.toLowerCase().includes("грунтовка"))).toBe(false);
  });

  it("эковата в штукатурном фасаде (нетипично, но возможно): нет дюбелей, нет клея", () => {
    const r = calc({ accuracyMode: "basic", insulationType: 3, mountSystem: 0 });
    expect(hasMaterial(r, (n) => n.includes("Дюбели"))).toBe(false);
    expect(hasMaterial(r, (n) => n.toLowerCase().includes("клей"))).toBe(false);
  });

  it("количество клея на 40 м²: 5 кг/м² → 200 кг → 8 мешков × 25 кг", () => {
    const r = calc({ accuracyMode: "basic", insulationType: 0, mountSystem: 0, area: 40 });
    const glue = r.materials.find((m) => m.name.toLowerCase().includes("клей фасадный"));
    expect(glue).toBeDefined();
    expect(glue!.purchaseQty).toBe(200);
    expect(glue!.packageInfo).toEqual({ count: 8, size: 25, packageUnit: "мешков" });
  });

  it("грунтовка на 40 м²: 0.15 л/м² × 1.15 = 6.9 л → 1 канистра 10 л", () => {
    const r = calc({ accuracyMode: "basic", insulationType: 0, mountSystem: 0, area: 40 });
    const primer = r.materials.find((m) => m.name.toLowerCase().includes("грунтовка"));
    expect(primer).toBeDefined();
    expect(primer!.quantity).toBeCloseTo(6.9, 1);
    expect(primer!.purchaseQty).toBe(10);
    expect(primer!.packageInfo).toEqual({ count: 1, size: 10, packageUnit: "канистр" });
  });

  it("брус каркаса на 40 м²: 2.2 пог.м/м² × 1.05 = 92.4 пог.м → ceil 93", () => {
    const r = calc({ accuracyMode: "basic", insulationType: 0, mountSystem: 1, area: 40 });
    const lumber = r.materials.find((m) => m.name.toLowerCase().includes("брус"));
    expect(lumber).toBeDefined();
    expect(lumber!.quantity).toBeCloseTo(92.4, 1);
    expect(lumber!.purchaseQty).toBe(93);
  });
});
