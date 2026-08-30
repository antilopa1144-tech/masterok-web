import { describe, expect, it } from "vitest";
import { heatingDef } from "../formulas/heating";
import { checkInvariants, findMaterial, withBasicAccuracy } from "./_helpers";

const calc = withBasicAccuracy(heatingDef.calculate.bind(heatingDef));

describe("Радиаторное отопление v4", () => {
  it("принимает готовую нагрузку и паспортную мощность для рабочего режима", () => {
    const result = calc({
      loadMode: 0,
      designHeatLoadW: 8000,
      deviceKind: 0,
      devicePowerMode: 0,
      deviceOutputAtDesignW: 180,
    });

    checkInvariants(result);
    expect(result.formulaVersion).toBe("heating-canonical-v4");
    expect(result.totals.heatLoadW).toBe(8000);
    expect(result.totals.effectiveDeviceOutputW).toBe(180);
    expect(result.scenarios?.MIN.exact_need).toBeCloseTo(8000 / 180, 6);
    expect(result.scenarios?.REC.purchase_quantity).toBe(45);
    expect(result.materials[0].unit).toBe("секций");
  });

  it("предварительный режим использует только явно введённые площадь и Вт/м²", () => {
    const result = calc({
      loadMode: 1,
      heatedAreaM2: 60,
      specificHeatLoadWm2: 120,
      deviceOutputAtDesignW: 200,
    });

    expect(result.totals.heatLoadW).toBe(7200);
    expect(result.totals.totalPowerW).toBe(7200);
    expect(result.scenarios?.REC.purchase_quantity).toBe(36);
    expect(result.warnings.some((warning) => warning.includes("Вт/м²"))).toBe(true);
  });

  it("старый URL с totalArea открывается как предварительная оценка, а не как ложный проект", () => {
    const result = calc({ totalArea: 60 });

    expect(result.totals.loadMode).toBe(1);
    expect(result.totals.heatedAreaM2).toBe(60);
    expect(result.totals.heatLoadW).toBe(6000);
  });

  it("для готового прибора округляет покупку в штуках", () => {
    const result = calc({
      designHeatLoadW: 8000,
      deviceKind: 1,
      deviceOutputAtDesignW: 1500,
    });

    expect(result.scenarios?.MIN.exact_need).toBeCloseTo(8000 / 1500, 6);
    expect(result.scenarios?.REC.purchase_quantity).toBe(6);
    expect(result.materials[0].unit).toBe("шт");
    expect(result.scenarios?.REC.buy_plan.unit).toBe("шт");
  });

  it("пересчитывает паспортную теплоотдачу по ΔT и показателю n", () => {
    const result = calc({
      designHeatLoadW: 8000,
      devicePowerMode: 1,
      nominalDeviceOutputW: 1000,
      ratedDeltaTK: 50,
      supplyTempC: 55,
      returnTempC: 45,
      roomTempC: 20,
      temperatureExponent: 1.3,
    });
    const expectedOutput = 1000 * (30 / 50) ** 1.3;

    expect(result.totals.designDeltaTK).toBe(30);
    expect(result.totals.effectiveDeviceOutputW).toBeCloseTo(expectedOutput, 3);
    expect(result.scenarios?.REC.purchase_quantity).toBe(Math.ceil(8000 / expectedOutput));
  });

  it("при совпадающем ΔT сохраняет номинальную мощность", () => {
    const result = calc({
      devicePowerMode: 1,
      nominalDeviceOutputW: 180,
      ratedDeltaTK: 50,
      supplyTempC: 75,
      returnTempC: 65,
      roomTempC: 20,
      temperatureExponent: 1.3,
    });

    expect(result.totals.designDeltaTK).toBe(50);
    expect(result.totals.effectiveDeviceOutputW).toBe(180);
  });

  it("предупреждает о некорректном температурном режиме", () => {
    const result = calc({
      devicePowerMode: 1,
      supplyTempC: 30,
      returnTempC: 40,
      roomTempC: 35,
    });

    expect(result.warnings.some((warning) => warning.includes("заданы некорректно"))).toBe(true);
  });

  it("предупреждает при сильном падении температурного напора", () => {
    const result = calc({
      devicePowerMode: 1,
      nominalDeviceOutputW: 180,
      ratedDeltaTK: 70,
      supplyTempC: 45,
      returnTempC: 35,
      roomTempC: 20,
    });

    expect(result.totals.temperatureRatio).toBeCloseTo(20 / 70, 6);
    expect(result.warnings.some((warning) => warning.includes("сильно уменьшится"))).toBe(true);
  });

  it("MIN не использует запас, REC и MAX используют только явный запас", () => {
    const result = calc({
      designHeatLoadW: 8000,
      deviceOutputAtDesignW: 200,
      designReservePercent: 10,
    });

    expect(result.scenarios?.MIN.exact_need).toBe(40);
    expect(result.scenarios?.MIN.purchase_quantity).toBe(40);
    expect(result.scenarios?.REC.exact_need).toBe(44);
    expect(result.scenarios?.REC.purchase_quantity).toBe(44);
    expect(result.scenarios?.MAX.exact_need).toBe(44);
    expect(result.materials[0].quantity).toBe(40);
    expect(result.materials[0].withReserve).toBe(44);
  });

  it("режим точности не добавляет скрытый запас", () => {
    const inputs = {
      designHeatLoadW: 8000,
      deviceOutputAtDesignW: 180,
      designReservePercent: 0,
    };
    const results = ["basic", "realistic", "professional"].map((accuracyMode) =>
      heatingDef.calculate({ ...inputs, accuracyMode }),
    );

    for (const result of results) {
      expect(result.scenarios?.REC.exact_need).toBeCloseTo(8000 / 180, 6);
      expect(result.scenarios?.REC.purchase_quantity).toBe(45);
      expect(result.accuracyExplanation?.combinedMultiplier).toBe(1);
    }
  });

  it("не придумывает трубы, фитинги и арматуру по тепловой нагрузке", () => {
    const result = calc({ designHeatLoadW: 8000, deviceOutputAtDesignW: 180 });

    expect(result.materials).toHaveLength(1);
    expect(findMaterial(result, "Труба")).toBeUndefined();
    expect(findMaterial(result, "Фитинги")).toBeUndefined();
    expect(findMaterial(result, "Кронштейны")).toBeUndefined();
    expect(result.warnings.some((warning) => warning.includes("ведомости"))).toBe(true);
  });

  it("округляет явную длину трубы до покупных отрезков", () => {
    const result = calc({
      pipeLengthM: 10,
      pipeStockLengthM: 4,
      pipeReservePercent: 10,
    });
    const pipe = findMaterial(result, "Труба отопления");

    expect(pipe?.quantity).toBe(10);
    expect(pipe?.withReserve).toBe(11);
    expect(pipe?.purchaseQty).toBe(12);
    expect(pipe?.packageInfo).toEqual({ count: 3, size: 4, packageUnit: "отрезков" });
  });

  it("добавляет только явно заданные штучные позиции", () => {
    const result = calc({
      fittingCount: 8,
      bracketCount: 4,
      valveSetCount: 2,
      airVentCount: 2,
    });

    expect(findMaterial(result, "Фитинги")?.purchaseQty).toBe(8);
    expect(findMaterial(result, "Кронштейны")?.purchaseQty).toBe(4);
    expect(findMaterial(result, "регулирующей")?.purchaseQty).toBe(2);
    expect(findMaterial(result, "Воздухоотводчики")?.purchaseQty).toBe(2);
  });

  it("фиксирует расчёт по одному помещению и границы гидравлики", () => {
    const result = calc({});

    expect(result.warnings.some((warning) => warning.includes("одного помещения"))).toBe(true);
    expect(result.warnings.some((warning) => warning.includes("Гидравлический"))).toBe(true);
    expect(result.practicalNotes?.some((note) => note.includes("каждое помещение"))).toBe(true);
  });

  it("ограничивает входы canonical-диапазонами", () => {
    const result = calc({
      designHeatLoadW: -1,
      deviceOutputAtDesignW: 999999,
      designReservePercent: 90,
      fittingCount: 2.6,
    });

    expect(result.totals.heatLoadW).toBe(100);
    expect(result.totals.effectiveDeviceOutputW).toBe(50000);
    expect(result.totals.designReservePercent).toBe(30);
    expect(result.totals.fittings).toBe(3);
  });
});
