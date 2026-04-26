import { describe, it, expect } from "vitest";
import { septicRingsDef } from "../formulas/septic-rings";
import { findMaterial, checkInvariants, withBasicAccuracy } from "./_helpers";

const calc = withBasicAccuracy(septicRingsDef.calculate.bind(septicRingsDef));

describe("Калькулятор септика из ЖБИ-колец", () => {
  describe("Defaults: семья 4 чел, 3 камеры, Ø1000, суглинок, фильтр-колодец", () => {
    const result = calc({
      residents: 4,
      chambersCount: 3,
      ringDiameter: 1000,
      groundType: 1,
      withFilterWell: 1,
      pipeLengthFromHouse: 8,
    });

    it("суточный объём = 4 × 200 = 800 л", () => {
      expect(result.totals.dailyVolumeLiters).toBe(800);
    });

    it("полезный объём (3-кратный запас) = 2.4 м³", () => {
      expect(result.totals.totalVolume).toBeCloseTo(2.4, 2);
    });

    it("колец на камеру = max(2, ceil(0.8/0.71)) = 2", () => {
      expect(result.totals.ringsPerChamber).toBe(2);
    });

    it("всего колец = 2 × 3 = 6", () => {
      expect(result.totals.totalRings).toBe(6);
    });

    it("днищ = 2 (только герметичные камеры, фильтр без днища)", () => {
      expect(result.totals.bottomPlates).toBe(2);
    });

    it("плит перекрытия и люков = 3 (на каждую камеру)", () => {
      expect(result.totals.topPlates).toBe(3);
      expect(result.totals.covers).toBe(3);
    });

    it("горловин КС-7 = 3 (на каждую камеру)", () => {
      expect(result.totals.neckRings).toBe(3);
      expect(findMaterial(result, "КС-7-9")).toBeDefined();
    });

    it("уплотнительных колец = 2×(2+1) + 1×2 = 8", () => {
      expect(result.totals.sealRings).toBe(8);
    });

    it("гидроизоляция мастика — 1 ведро (15.83 кг < 20 кг)", () => {
      expect(result.totals.masticCans).toBe(1);
    });

    it("гидростеклоизол = 1 рулон", () => {
      expect(result.totals.bitumenSheetRolls).toBe(1);
    });

    it("фильтрующий щебень = π × 0.5² × 0.6 × 1.25 ≈ 0.589 м³", () => {
      expect(result.totals.filterGravelM3).toBeCloseTo(0.589, 2);
    });

    it("труба от дома 8 × 1.05 = 8.4 м, секций = 3", () => {
      expect(result.totals.pipeWithReserveM).toBeCloseTo(8.4, 2);
      expect(result.totals.pipeSections).toBe(3);
    });

    it("в материалах основное кольцо КС-10-9", () => {
      expect(findMaterial(result, "КС-10-9")).toBeDefined();
    });

    it("в материалах есть фильтрующий щебень", () => {
      expect(findMaterial(result, "Щебень фр. 20-40")).toBeDefined();
    });

    it("инварианты", () => {
      checkInvariants(result);
    });
  });

  describe("Все камеры герметичные (без фильтр-колодца)", () => {
    const result = calc({
      residents: 4,
      chambersCount: 3,
      ringDiameter: 1000,
      groundType: 2,
      withFilterWell: 0,
      pipeLengthFromHouse: 8,
    });

    it("днищ = 3 (все камеры герметичные)", () => {
      expect(result.totals.bottomPlates).toBe(3);
    });

    it("без фильтрующего слоя", () => {
      expect(result.totals.filterGravelM3).toBe(0);
      expect(result.totals.filterSandM3).toBe(0);
      expect(findMaterial(result, "Щебень фр. 20-40")).toBeUndefined();
    });

    it("инварианты", () => {
      checkInvariants(result);
    });
  });

  describe("Большая семья 8 человек", () => {
    const result = calc({
      residents: 8,
      chambersCount: 3,
      ringDiameter: 1000,
      groundType: 1,
      withFilterWell: 1,
      pipeLengthFromHouse: 10,
    });

    it("запас 2.5 дня (для семьи > 5 чел)", () => {
      // 8 × 200 × 2.5 = 4000 л
      expect(result.totals.totalVolumeLiters).toBe(4000);
    });

    it("больше колец на камеру", () => {
      // volumePerChamber = 4 / 3 ≈ 1.33; ceil(1.33/0.71) = 2
      expect(result.totals.ringsPerChamber).toBeGreaterThanOrEqual(2);
    });

    it("инварианты", () => {
      checkInvariants(result);
    });
  });

  describe("Большие кольца Ø1500", () => {
    const result = calc({
      residents: 6,
      chambersCount: 3,
      ringDiameter: 1500,
      groundType: 1,
      withFilterWell: 1,
      pipeLengthFromHouse: 8,
    });

    it("выбраны кольца КС-15-9", () => {
      expect(result.totals.ringDiameter).toBe(1500);
      expect(findMaterial(result, "КС-15-9")).toBeDefined();
    });

    it("днища ПН-15 (Ø1500)", () => {
      expect(findMaterial(result, "ПН-15")).toBeDefined();
    });

    it("колец на камеру = минимум 2", () => {
      // V_кольца = 1.59, V_камеры = 6×200×3/3000 = 1.2 → ceil(1.2/1.59)=1, но min=2
      expect(result.totals.ringsPerChamber).toBe(2);
    });
  });

  describe("Предупреждения", () => {
    it("семья > 10 человек → биостанция", () => {
      const result = calc({
        residents: 12,
        chambersCount: 3,
        ringDiameter: 1500,
        groundType: 1,
        withFilterWell: 1,
        pipeLengthFromHouse: 8,
      });
      expect(result.warnings.some((w) => w.includes("биологическ"))).toBe(true);
    });

    it("1 камера для большой семьи → предупреждение", () => {
      const result = calc({
        residents: 5,
        chambersCount: 1,
        ringDiameter: 1000,
        groundType: 1,
        withFilterWell: 0,
        pipeLengthFromHouse: 8,
      });
      expect(result.warnings.some((w) => w.includes("Однокамерный") || w.includes("камер"))).toBe(true);
    });

    it("глина + фильтр-колодец → предупреждение", () => {
      const result = calc({
        residents: 4,
        chambersCount: 3,
        ringDiameter: 1000,
        groundType: 2,
        withFilterWell: 1,
        pipeLengthFromHouse: 8,
      });
      expect(result.warnings.some((w) => w.includes("Глинист") || w.includes("заиливается"))).toBe(true);
    });

    it("длинная труба от дома → предупреждение про колодец", () => {
      const result = calc({
        residents: 4,
        chambersCount: 3,
        ringDiameter: 1000,
        groundType: 1,
        withFilterWell: 1,
        pipeLengthFromHouse: 30,
      });
      expect(result.warnings.some((w) => w.includes("промежуточный смотровой колодец"))).toBe(true);
    });

    it("> 5 чел и < 3 камер → рекомендация 3 камеры", () => {
      const result = calc({
        residents: 6,
        chambersCount: 2,
        ringDiameter: 1000,
        groundType: 1,
        withFilterWell: 1,
        pipeLengthFromHouse: 8,
      });
      expect(result.warnings.some((w) => w.includes("3 камеры"))).toBe(true);
    });
  });

  describe("Сценарии MIN ≤ REC ≤ MAX", () => {
    const result = calc({
      residents: 4,
      chambersCount: 3,
      ringDiameter: 1000,
      groundType: 1,
      withFilterWell: 1,
      pipeLengthFromHouse: 8,
    });

    it("MIN ≤ REC ≤ MAX", () => {
      expect(result.scenarios!.MIN.exact_need).toBeLessThanOrEqual(result.scenarios!.REC.exact_need);
      expect(result.scenarios!.REC.exact_need).toBeLessThanOrEqual(result.scenarios!.MAX.exact_need);
    });
  });
});
