import { describe, it, expect } from "vitest";
import { warmFloorDef } from "../formulas/warm-floor";
import { findMaterial, checkInvariants, withBasicAccuracy } from "./_helpers";

const calc = withBasicAccuracy(warmFloorDef.calculate.bind(warmFloorDef));

describe("Калькулятор электрического тёплого пола v3", () => {
  it("проверяет выбранный мат по плану и паспортной мощности", () => {
    const result = calc({
      roomAreaM2: 10,
      excludedAreaM2: 2,
      layoutAreaM2: 8,
      systemType: 0,
      kitCount: 1,
      kitCoverageAreaM2: 8,
      kitRatedPowerW: 1200,
      supplyVoltageV: 230,
    });

    expect(result.formulaVersion).toBe("warm-floor-canonical-v3");
    expect(result.totals.availableAreaM2).toBe(8);
    expect(result.totals.heatingArea).toBe(8);
    expect(result.totals.totalPowerW).toBe(1200);
    expect(result.totals.circuitCurrentA).toBeCloseTo(1200 / 230, 3);
    expect(findMaterial(result, "нагревательного мата")?.purchaseQty).toBe(1);
    checkInvariants(result);
  });

  it("не придумывает клей, стяжку, утеплитель и автоматику", () => {
    const result = calc({});
    const names = result.materials.map((material) => material.name).join(" ");

    expect(result.materials).toHaveLength(1);
    expect(names).not.toMatch(/клей|стяжк|утепл|автомат|УЗО|УДТ/i);
    expect(result.warnings.some((warning) => warning.includes("УДТ"))).toBe(true);
  });

  it("для кабельного комплекта использует паспортную длину без запаса", () => {
    const result = calc({
      roomAreaM2: 12,
      excludedAreaM2: 2,
      layoutAreaM2: 10,
      systemType: 1,
      kitCount: 2,
      kitCoverageAreaM2: 5,
      kitRatedPowerW: 800,
      cableLengthPerKitM: 40,
    });

    expect(result.totals.cableLength).toBe(80);
    expect(result.totals.cableStepMm).toBe(125);
    expect(result.scenarios?.MIN.exact_need).toBe(2);
    expect(result.scenarios?.REC.exact_need).toBe(2);
    expect(result.scenarios?.MAX.purchase_quantity).toBe(2);
    expect(findMaterial(result, "нагревательного кабеля")?.quantity).toBe(2);
    expect(result.summaryCards?.[0]?.hint).toContain("кабель 80 м");
    expect(result.summaryCards?.[0]?.hint).toContain("125 мм");
  });

  it("сигнализирует, если паспортная площадь комплектов не помещается", () => {
    const result = calc({
      roomAreaM2: 10,
      excludedAreaM2: 2,
      layoutAreaM2: 8,
      kitCount: 2,
      kitCoverageAreaM2: 5,
    });

    expect(result.totals.selectedCoverageAreaM2).toBe(10);
    expect(result.warnings.some((warning) => warning.includes("больше площади раскладки"))).toBe(true);
  });

  it("ограничивает раскладку доступной площадью и объясняет исправление", () => {
    const result = calc({
      roomAreaM2: 10,
      excludedAreaM2: 4,
      layoutAreaM2: 9,
    });

    expect(result.totals.availableAreaM2).toBe(6);
    expect(result.totals.heatingArea).toBe(6);
    expect(result.warnings.some((warning) => warning.includes("ограничена доступной"))).toBe(true);
  });

  it("сравнивает нагрузку с проектом и паспортом терморегулятора", () => {
    const result = calc({
      kitCount: 2,
      kitRatedPowerW: 2000,
      designHeatLoadW: 5000,
      supplyVoltageV: 230,
      thermostatRatedCurrentA: 16,
    });

    expect(result.totals.totalPowerW).toBe(4000);
    expect(result.totals.circuitCurrentA).toBeCloseTo(4000 / 230, 3);
    expect(result.warnings.some((warning) => warning.includes("ниже введённой проектной"))).toBe(true);
    expect(result.warnings.some((warning) => warning.includes("выше паспортного тока"))).toBe(true);
  });

  it("добавляет только явно введённую ведомость и округляет трубку", () => {
    const result = calc({
      thermostatCount: 1,
      floorSensorCount: 2,
      sensorConduitLengthM: 2.2,
      sensorConduitStockLengthM: 1,
    });

    expect(findMaterial(result, "Терморегулятор")?.purchaseQty).toBe(1);
    expect(findMaterial(result, "Датчик температуры")?.purchaseQty).toBe(2);
    const conduit = findMaterial(result, "Защитная трубка");
    expect(conduit?.quantity).toBe(2.2);
    expect(conduit?.purchaseQty).toBe(3);
    expect(conduit?.packageInfo).toEqual({ count: 3, size: 1, packageUnit: "отрезков" });
  });

  it("старый водяной режим безопасно отправляет в отдельный калькулятор", () => {
    const result = calc({ roomArea: 10, furnitureArea: 2, heatingType: 2 });

    expect(result.materials).toHaveLength(0);
    expect(result.totals.legacyWaterMode).toBe(1);
    expect(result.warnings.some((warning) => warning.includes("отдельный калькулятор"))).toBe(true);
  });

  it("не подтверждает основное отопление без проектной нагрузки", () => {
    const result = calc({ designHeatLoadW: 0 });
    expect(result.warnings.some((warning) => warning.includes("основным отоплением"))).toBe(true);
  });
});
