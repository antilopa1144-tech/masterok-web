/**
 * Golden-тесты для 5 летних калькуляторов (Спринт 8 плана rosy-pondering-lovelace).
 *
 * Эти тесты — самостоятельная защита формул от регрессий, независимая
 * от parity-фикстур. Числа проверены вручную против нормативов (СП/ГОСТ/СНиП)
 * и тех. листов производителей. Допуск ±2% (Math.toBeCloseTo с 2-3 значащими).
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
  it("дворик 50 м²: ЦПС основание, плитка 60 мм — типовая частная задача", () => {
    // Площадь = 50, периметр = 30, тип ЦПС, толщина 60, бордюр
    // Плитка 50 × 1.07 = 53.5 → 54 м²
    // Щебень 50 × 0.15 × 1.25 = 9.375 м³
    // ЦПС 50 × 0.03 × 1.10 = 1.65 м³ (12 мешков цемента)
    // Кварцевый песок 50 × 5 × 1.10 / 25 = 11 мешков
    const r = calcPaving({ area: 50, perimeter: 30, foundationType: 1, tileThickness: 60, borderEnabled: 1 });
    const t = totals(r);
    expect(t.tileM2).toBe(54);
    expect(t.gravelM3).toBeCloseTo(9.375, 2);
    expect(t.cementSandMixM3).toBeCloseTo(1.65, 2);
    expect(t.cementBags).toBe(12);
    expect(t.borderPcs).toBe(32);
  });

  it("парковка 80 м²: бетонное основание, плитка 80 мм — типовой въезд", () => {
    // Бетон М200 = 80 × 0.10 × 1.05 = 8.4 м³
    // Щебень = 80 × 0.15 × 1.25 = 15 м³
    const r = calcPaving({ area: 80, perimeter: 36, foundationType: 2, tileThickness: 80, borderEnabled: 1 });
    const t = totals(r);
    expect(t.concreteM3).toBeCloseTo(8.4, 2);
    expect(t.gravelM3).toBeCloseTo(15.0, 2);
  });

  it("дорожка 30 м² на песке: тонкая плитка 40 мм", () => {
    // Без щебня. Песок подушки увеличен (100 мм × 1.20).
    const r = calcPaving({ area: 30, perimeter: 22, foundationType: 0, tileThickness: 40, borderEnabled: 1 });
    const t = totals(r);
    expect(t.gravelM3).toBe(0);
    expect(t.sandBeddingM3).toBeCloseTo(3.6, 2);
  });
});

describe("Golden tests — Дренаж (drainage)", () => {
  it("ёлочка 40 м, Ø110: суммарная траншея = 60 м (length × 1.5)", () => {
    // pipe = 60 × 1.05 = 63 м
    // sand = 60 × 0.30 × 0.10 × 1.20 = 2.16 м³
    // gravel = 60 × 0.30 × 0.40 × 1.25 = 9.0 м³
    const r = calcDrainage({ length: 40, pipeDiameter: 110, drainageType: 1, groundwaterRisk: 1, withCollector: 1 });
    const t = totals(r);
    expect(t.totalTrenchLength).toBeCloseTo(60, 2);
    expect(t.pipeWithReserveM).toBeCloseTo(63, 2);
    expect(t.sandM3).toBeCloseTo(2.16, 2);
    expect(t.gravelM3).toBeCloseTo(9.0, 2);
  });

  it("линейный 25 м, Ø110: труба = 25 × 1.05 = 26.25 м, без тройников", () => {
    const r = calcDrainage({ length: 25, pipeDiameter: 110, drainageType: 2, groundwaterRisk: 0, withCollector: 0 });
    const t = totals(r);
    expect(t.totalTrenchLength).toBeCloseTo(25, 2);
    expect(t.pipeWithReserveM).toBeCloseTo(26.25, 2);
    expect(t.teeCount).toBe(0);
    expect(t.collectorCount).toBe(0);
  });

  it("высокий УГВ: геотекстиль ×1.30 на глине", () => {
    // base = 40 × 1.61 × 1.30 × 1.15 ≈ 96.28
    const r = calcDrainage({ length: 40, pipeDiameter: 110, drainageType: 2, groundwaterRisk: 2, withCollector: 1 });
    const t = totals(r);
    expect(t.geotextileM2).toBeCloseTo(40 * 1.61 * 1.30 * 1.15, 1);
  });
});

describe("Golden tests — Септик ЖБИ-кольца (septic-rings)", () => {
  it("семья 4 чел, 3 камеры Ø1000: V_septika = 4 × 200 × 3 = 2400 л = 2.4 м³", () => {
    // Колец на камеру = max(2, ceil(0.8/0.71)) = 2
    // Всего колец 6
    // Sealed surface = π × 1.0 × 0.9 × 2 × 2 = 11.31
    // Mastic = 11.31 × 0.7 × 2 = 15.83 кг
    const r = calcSeptic({ residents: 4, chambersCount: 3, ringDiameter: 1000, groundType: 1, withFilterWell: 1, pipeLengthFromHouse: 8 });
    const t = totals(r);
    expect(t.totalVolume).toBeCloseTo(2.4, 2);
    expect(t.totalRings).toBe(6);
    expect(t.sealedSurfaceM2).toBeCloseTo(11.31, 1);
    expect(t.masticKg).toBeCloseTo(15.83, 1);
  });

  it("семья 8 чел: запас 2.5 дня (>5 чел) → 8 × 200 × 2.5 = 4000 л", () => {
    const r = calcSeptic({ residents: 8, chambersCount: 3, ringDiameter: 1000, groundType: 1, withFilterWell: 1, pipeLengthFromHouse: 10 });
    const t = totals(r);
    expect(t.totalVolumeLiters).toBe(4000);
  });

  it("Ø1500: меньше колец нужно (V_кольца = 1.59 м³), но min 2 на камеру", () => {
    const r = calcSeptic({ residents: 6, chambersCount: 3, ringDiameter: 1500, groundType: 1, withFilterWell: 1, pipeLengthFromHouse: 8 });
    const t = totals(r);
    expect(t.ringDiameter).toBe(1500);
    // V_камеры = 6 × 200 × 3 / 1000 / 3 = 1.2; ceil(1.2/1.59)=1, но min=2
    expect(t.ringsPerChamber).toBe(2);
  });
});

describe("Golden tests — Теплица (greenhouse)", () => {
  it("стандарт 6×3 м арка: dArch = π×3/2 = 4.712, S = 4.712×6 + 2×π×9/8 ≈ 35.34 м²", () => {
    const r = calcGreenhouse({ length: 6, width: 3, height: 2.1, roofType: 0, polycarbonateThickness: 6, archStep: 0.65, doorCount: 2, ventCount: 2, foundationType: 1 });
    const t = totals(r);
    expect(t.archLengthM).toBeCloseTo(4.712, 2);
    expect(t.polyArea).toBeCloseTo(35.34, 1);
    expect(t.polySheets).toBe(4); // ceil(35.34 × 1.15 / 12.6) = 4
    expect(t.archCount).toBe(11); // ceil(6/0.65) + 1
    expect(t.thermalWashersTotal).toBe(213); // ceil(35.34 × 6)
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

  it("ленточный фундамент 8×3 м: V_бетона = 22 × 0.30 × 0.40 × 1.05 ≈ 2.77 м³", () => {
    const r = calcGreenhouse({ length: 8, width: 3, height: 2.4, roofType: 1, polycarbonateThickness: 8, archStep: 0.65, doorCount: 2, ventCount: 2, foundationType: 3 });
    const t = totals(r);
    expect(t.concreteM3).toBeCloseTo(2.772, 2);
  });
});

describe("Golden tests — Газон (lawn)", () => {
  it("посевной обычный 50 м²: семян 50 × 40 × 1.10 / 1000 = 2.2 кг", () => {
    const r = calcLawn({ area: 50, lawnType: 0, soilThickness: 12, groundType: 1, usageIntensity: 1, withDrainage: 0, withGeotextile: 0 });
    const t = totals(r);
    expect(t.seedRatePerM2).toBe(40);
    expect(t.seedKg).toBeCloseTo(2.2, 2);
    expect(t.topsoilM3).toBeCloseTo(7.2, 2);
  });

  it("декоративный 100 м²: норма 30 г/м² → семян 3.3 кг", () => {
    const r = calcLawn({ area: 100, lawnType: 0, soilThickness: 10, groundType: 0, usageIntensity: 0, withDrainage: 0, withGeotextile: 0 });
    const t = totals(r);
    expect(t.seedRatePerM2).toBe(30);
    expect(t.seedKg).toBeCloseTo(3.3, 2);
  });

  it("спортивный 100 м²: норма 50 г/м² → семян 5.5 кг", () => {
    const r = calcLawn({ area: 100, lawnType: 0, soilThickness: 15, groundType: 1, usageIntensity: 2, withDrainage: 0, withGeotextile: 0 });
    const t = totals(r);
    expect(t.seedRatePerM2).toBe(50);
    expect(t.seedKg).toBeCloseTo(5.5, 2);
  });

  it("рулонный 100 м²: рулонов = ceil(100 × 1.07 / 0.8) = 134", () => {
    const r = calcLawn({ area: 100, lawnType: 1, soilThickness: 12, groundType: 1, usageIntensity: 1, withDrainage: 0, withGeotextile: 0 });
    const t = totals(r);
    expect(t.rollsCount).toBe(134);
    expect(t.seedKg).toBe(0);
  });

  it("с дренажом и геотекстилем 50 м²: песок 6 м³, 2 рулона", () => {
    const r = calcLawn({ area: 50, lawnType: 0, soilThickness: 12, groundType: 2, usageIntensity: 1, withDrainage: 1, withGeotextile: 1 });
    const t = totals(r);
    expect(t.drainageSandM3).toBeCloseTo(6.0, 2);
    expect(t.geotextileRolls).toBe(2);
  });
});
