/**
 * Golden-тесты для 5 летних калькуляторов (Спринт 8 плана rosy-pondering-lovelace).
 *
 * Эти тесты — самостоятельная защита формул от регрессий, независимая
 * от parity-фикстур. Каждый блок фиксирует принятые входы и ожидаемую математику;
 * проектные параметры не считаются универсальной нормативной рекомендацией.
 *
 * Если parity-фикстура была случайно перегенерирована вместе с регрессией формулы —
 * golden-тесты упадут и поймают изменение.
 */
import { describe, it, expect } from "vitest";
import { pavingTilesDef } from "../../src/lib/calculators/formulas/paving-tiles";
import { drainageDef } from "../../src/lib/calculators/formulas/drainage";
import { septicRingsDef } from "../../src/lib/calculators/formulas/septic-rings";
import { greenhouseDef } from "../../src/lib/calculators/formulas/greenhouse";
import { lawnDef } from "../../src/lib/calculators/formulas/lawn";

const calc = <T extends { calculate: (i: Record<string, number>) => unknown }>(def: T) =>
  (inputs: Record<string, number>) =>
    (def.calculate as (i: Record<string, number>) => Record<string, unknown>)({
      ...inputs,
      accuracyMode: "basic" as unknown as number,
    });

const calcPaving = calc(pavingTilesDef);
const calcDrainage = calc(drainageDef);
const calcSeptic = calc(septicRingsDef);
const calcGreenhouse = calc(greenhouseDef);
const calcLawn = calc(lawnDef);

const totals = (r: unknown) => (r as { totals: Record<string, number> }).totals;

describe("Golden tests — Тротуарная плитка (paving-tiles)", () => {
  it("50 м²: явный запас 7%, продажа по 0,1 м² и бордюр по 1 м", () => {
    const r = calcPaving({
      area: 50,
      tileReservePercent: 7,
      tileSaleStepM2: 0.1,
      perimeter: 30,
      borderEnabled: 1,
      borderPieceLengthM: 1,
      borderReservePercent: 0,
    });
    const t = totals(r);
    expect(t.tileReservedM2).toBe(53.5);
    expect(t.tilePurchaseM2).toBe(53.5);
    expect(t.borderPurchasePcs).toBe(30);
  });

  it("80 м²: введённый щебёночный слой 150 мм и коэффициент 1,25", () => {
    const r = calcPaving({
      area: 80,
      layersEnabled: 1,
      gravelLayerThicknessMm: 150,
      gravelPurchaseFactor: 1.25,
      bulkSaleStepM3: 0.1,
    });
    const t = totals(r);
    expect(t.gravelGeometricM3).toBeCloseTo(12, 2);
    expect(t.gravelPurchaseNeedM3).toBeCloseTo(15, 2);
    expect(t.gravelPurchaseM3).toBeCloseTo(15, 2);
  });

  it("30 м²: введённый песчаный слой 100 мм и коэффициент 1,20", () => {
    const r = calcPaving({
      area: 30,
      layersEnabled: 1,
      sandLayerThicknessMm: 100,
      sandPurchaseFactor: 1.2,
      bulkSaleStepM3: 0.1,
    });
    const t = totals(r);
    expect(t.gravelGeometricM3).toBe(0);
    expect(t.sandGeometricM3).toBeCloseTo(3, 2);
    expect(t.sandPurchaseM3).toBeCloseTo(3.6, 2);
  });
});

describe("Golden tests — Дренаж (drainage)", () => {
  it("проектная трасса 40 м: явный запас 5% и продажа по 1 м", () => {
    const r = calcDrainage({
      pipeLengthM: 40,
      pipeDiameterMm: 110,
      pipeReservePercent: 5,
      pipeSaleStepM: 1,
    });
    const t = totals(r);
    expect(t.pipeLengthM).toBeCloseTo(40, 2);
    expect(t.pipeReservedM).toBeCloseTo(42, 2);
    expect(t.pipePurchaseM).toBeCloseTo(42, 2);
    expect(r.materials).toHaveLength(1);
  });

  it("проектная трасса 25 м: явный запас 5% и шаг 0,25 м", () => {
    const r = calcDrainage({
      pipeLengthM: 25,
      pipeDiameterMm: 110,
      pipeReservePercent: 5,
      pipeSaleStepM: 0.25,
    });
    const t = totals(r);
    expect(t.pipeLengthM).toBeCloseTo(25, 2);
    expect(t.pipeReservedM).toBeCloseTo(26.25, 2);
    expect(t.pipePurchaseM).toBeCloseTo(26.25, 2);
    expect(t.teeCount).toBe(0);
    expect(t.collectorWellCount).toBe(0);
  });

  it("геотекстиль: введённая развёртка 1,61 м и явный запас 15%", () => {
    const r = calcDrainage({
      pipeLengthM: 40,
      geotextileEnabled: 1,
      geotextileDevelopedWidthM: 1.61,
      geotextileReservePercent: 15,
      geotextileRollM2: 50,
    });
    const t = totals(r);
    expect(t.geotextileCleanM2).toBeCloseTo(64.4, 2);
    expect(t.geotextileReservedM2).toBeCloseTo(74.06, 2);
    expect(t.geotextileRolls).toBe(2);
  });
});

describe("Golden tests — Септик ЖБИ-кольца (septic-rings)", () => {
  it("семья 4 чел, 3 герметичные камеры Ø1000: V_min = max(4 × 200 × 3, 2400) = 2400 л", () => {
    // Геометрический минимум: ceil((2.4 / 3) / 0.71) = 2 кольца на камеру.
    // Фильтрующий колодец — отдельное сооружение, поэтому все три камеры имеют днища.
    const r = calcSeptic({ residents: 4, chambersCount: 3, ringDiameter: 1000, groundType: 1, withFilterWell: 1, pipeLengthFromHouse: 8 });
    const t = totals(r);
    expect(t.totalVolume).toBeCloseTo(2.4, 2);
    expect(t.totalRings).toBe(6);
    expect(t.bottomPlates).toBe(3);
    expect(r.materials.some((material) => material.name.includes("Мастика"))).toBe(false);
  });

  it("семья 8 чел: до 5 м³/сут сохраняется трёхкратный приток → 8 × 200 × 3 = 4800 л", () => {
    const r = calcSeptic({ residents: 8, chambersCount: 3, ringDiameter: 1000, groundType: 1, withFilterWell: 1, pipeLengthFromHouse: 10 });
    const t = totals(r);
    expect(t.totalVolumeLiters).toBe(4800);
    expect(t.totalRings).toBe(9);
  });

  it("Ø1500: не добавляет выдуманный минимум два кольца на камеру", () => {
    const r = calcSeptic({ residents: 6, chambersCount: 3, ringDiameter: 1500, groundType: 1, withFilterWell: 1, pipeLengthFromHouse: 8 });
    const t = totals(r);
    expect(t.ringDiameter).toBe(1500);
    // V_камеры = 6 × 200 × 3 / 1000 / 3 = 1.2; ceil(1.2 / 1.59) = 1.
    expect(t.ringsPerChamber).toBe(1);
    expect(t.totalRings).toBe(3);
  });
});

describe("Golden tests — Теплица (greenhouse)", () => {
  it("стандарт 6×3×2,1 м: арка зависит от фактической высоты, а не скрытого полуцилиндра", () => {
    const r = calcGreenhouse({ length: 6, width: 3, height: 2.1, roofType: 0, polycarbonateThickness: 6, archStep: 0.65, doorCount: 2, ventCount: 2, foundationType: 1 });
    const t = totals(r);
    expect(t.archLengthM).toBeCloseTo(5.694, 2);
    expect(t.polyArea).toBeCloseTo(44.061, 2);
    expect(t.polySheets).toBe(4); // ceil(44.061 × 1.10 / 12.6) = 4
    expect(t.archCount).toBe(11); // ceil(6/0.65) + 1
  });

  it("двускатная 4×3×2.4: 2 ската × длину + боковины + торцы", () => {
    const r = calcGreenhouse({ length: 4, width: 3, height: 2.4, roofType: 1, polycarbonateThickness: 6, archStep: 0.65, doorCount: 1, ventCount: 1, foundationType: 1 });
    const t = totals(r);
    expect(t.roofType).toBe(1);
    // полная площадь = 2 × √((1.5)² + (0.9)²) × 4 + 2 × 1.5 × 4 + 2 × (3 × 1.5 + 3 × 0.9 / 2)
    // = 2 × 1.749 × 4 + 12 + 2 × (4.5 + 1.35)
    // = 13.99 + 12 + 11.7 = 37.69 м²
    expect(t.polyArea).toBeGreaterThan(20);
    expect(t.polyArea).toBeLessThan(50);
  });

  it("ленточное основание не превращается в выдуманный объём бетона", () => {
    const r = calcGreenhouse({ length: 8, width: 3, height: 2.4, roofType: 1, polycarbonateThickness: 8, archStep: 0.65, doorCount: 2, ventCount: 2, foundationType: 3 });
    const result = r as { materials: { name: string }[]; warnings: string[] };
    expect(result.materials.some((material) => material.name.includes("Бетон"))).toBe(false);
    expect(result.warnings.some((warning) => warning.includes("фундамент") && warning.includes("не рассчит"))).toBe(true);
  });
});

describe("Golden tests — Газон (lawn)", () => {
  it("семена 50 м² по 40 г/м²: точная потребность 2 кг", () => {
    const r = calcLawn({ areaM2: 50, lawnType: 0, seedRateGm2: 40, seedReservePercent: 0, seedPackKg: 1 });
    const t = totals(r);
    expect(t.exactNeed).toBe(2);
    expect(t.packagesCount).toBe(2);
    expect(t.purchaseQuantity).toBe(2);
  });

  it("семена округляются по фактической фасовке", () => {
    const r = calcLawn({ areaM2: 252.5, lawnType: 0, seedRateGm2: 40, seedReservePercent: 0, seedPackKg: 5 });
    const t = totals(r);
    expect(t.exactNeed).toBeCloseTo(10.1, 6);
    expect(t.packagesCount).toBe(3);
    expect(t.purchaseQuantity).toBe(15);
  });

  it("явный запас семян применяется один раз", () => {
    const r = calcLawn({ areaM2: 100, lawnType: 0, seedRateGm2: 40, seedReservePercent: 10, seedPackKg: 2 });
    const t = totals(r);
    expect(t.exactNeed).toBe(4);
    expect(t.needWithReserve).toBeCloseTo(4.4, 6);
    expect(t.purchaseQuantity).toBe(6);
  });

  it("рулонный газон 100 м²: 5% запаса и рулон 0,8 м² дают 132 рулона", () => {
    const r = calcLawn({ areaM2: 100, lawnType: 1, rollAreaM2: 0.8, rollReservePercent: 5 });
    const t = totals(r);
    expect(t.needWithReserve).toBe(105);
    expect(t.packagesCount).toBe(132);
    expect(t.purchaseQuantity).toBeCloseTo(105.6, 6);
  });

  it("не создаёт условную ведомость основания по одной площади", () => {
    const r = calcLawn({ areaM2: 50, lawnType: 0, seedRateGm2: 40, seedPackKg: 1 });
    const result = r as { materials: { name: string }[]; warnings: string[] };
    expect(result.materials).toHaveLength(1);
    expect(result.materials.some((material) => /грунт|песок|геотекст|удобрен|каток/i.test(material.name))).toBe(false);
    expect(result.warnings.some((warning) => warning.includes("автоматически не добавляются"))).toBe(true);
  });
});
