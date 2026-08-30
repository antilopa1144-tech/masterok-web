import { describe, expect, it } from "vitest";
import { ventilationDef } from "../formulas/ventilation";
import { checkInvariants, findMaterial, withBasicAccuracy } from "./_helpers";

const calc = withBasicAccuracy(ventilationDef.calculate.bind(ventilationDef));

describe("Вентиляция — canonical v2", () => {
  describe("предварительный жилой расход", () => {
    it("при площади более 20 м²/чел берёт максимум по людям и 0,35 объёма", () => {
      const result = calc({
        calculationMode: 0,
        totalArea: 80,
        ceilingHeight: 2.7,
        peopleCount: 3,
      });

      expect(result.totals.roomVolume).toBe(216);
      expect(result.totals.airByPeople).toBe(90);
      expect(result.totals.airByVolume).toBe(75.6);
      expect(result.totals.requiredAirflow).toBe(90);
    });

    it("на границе 20 м²/чел применяет 3 м³/(ч·м²)", () => {
      const result = calc({
        calculationMode: 0,
        totalArea: 60,
        ceilingHeight: 2.7,
        peopleCount: 3,
      });

      expect(result.totals.areaPerPerson).toBe(20);
      expect(result.totals.airByArea).toBe(180);
      expect(result.totals.requiredAirflow).toBe(180);
    });

    it("высоту 2,7 трактует как метры без прежнего зажима 270 → 3,5", () => {
      const result = calc({
        calculationMode: 0,
        totalArea: 100,
        ceilingHeight: 2.7,
        peopleCount: 2,
      });

      expect(result.totals.ceilingHeight).toBe(2.7);
      expect(result.totals.roomVolume).toBe(270);
      expect(result.totals.airByVolume).toBe(94.5);
    });
  });

  describe("проектный режим и сечение", () => {
    it("принимает готовый расход без выдуманной кратности", () => {
      const result = calc({ calculationMode: 1, projectAirflowM3h: 720 });

      expect(result.totals.requiredAirflow).toBe(720);
      expect(result.warnings.some((warning) => warning.includes("готовое исходное"))).toBe(true);
    });

    it("считает скорость в круглом канале", () => {
      const result = calc({
        calculationMode: 1,
        projectAirflowM3h: 360,
        ductShape: 0,
        roundDiameterMm: 200,
        targetVelocityMps: 3,
      });

      expect(result.totals.selectedFreeAreaM2).toBeCloseTo(0.031416, 6);
      expect(result.totals.actualVelocityMps).toBeCloseTo(3.183, 3);
      expect(result.warnings.some((warning) => warning.includes("выше заданной цели"))).toBe(true);
    });

    it("считает скорость в прямоугольном канале", () => {
      const result = calc({
        calculationMode: 1,
        projectAirflowM3h: 720,
        ductShape: 1,
        rectWidthMm: 300,
        rectHeightMm: 200,
      });

      expect(result.totals.selectedFreeAreaM2).toBe(0.06);
      expect(result.totals.actualVelocityMps).toBeCloseTo(3.333, 3);
    });

    it("показывает теоретическое сечение для целевой скорости", () => {
      const result = calc({
        calculationMode: 1,
        projectAirflowM3h: 360,
        targetVelocityMps: 2,
      });

      expect(result.totals.requiredFreeAreaM2).toBe(0.05);
      expect(result.totals.requiredRoundDiameterMm).toBeCloseTo(252.3, 1);
    });
  });

  describe("вентилятор", () => {
    it("не добавляет вентилятор в закупку автоматически", () => {
      const result = calc({
        calculationMode: 1,
        projectAirflowM3h: 500,
        selectedFanCapacityM3h: 700,
        ductLengthM: 6,
      });

      expect(findMaterial(result, "Вентилятор")).toBeUndefined();
      expect(result.totals.selectedFanMarginM3h).toBe(200);
      expect(result.warnings.some((warning) => warning.includes("рабочей точке"))).toBe(true);
    });

    it("предупреждает, если паспортная производительность ниже расхода", () => {
      const result = calc({
        calculationMode: 1,
        projectAirflowM3h: 500,
        selectedFanCapacityM3h: 400,
      });

      expect(result.totals.selectedFanMarginM3h).toBe(-100);
      expect(result.warnings.some((warning) => warning.includes("ниже расчётного расхода"))).toBe(true);
    });
  });

  describe("закупка по проектной ведомости", () => {
    it("округляет длину с явным запасом до покупных отрезков", () => {
      const result = calc({
        calculationMode: 1,
        projectAirflowM3h: 300,
        ductLengthM: 10,
        stockLengthM: 3,
        ductReservePercent: 10,
        fittingCount: 4,
        airTerminalCount: 3,
        clampCount: 8,
      });

      checkInvariants(result);
      expect(result.scenarios?.MIN.exact_need).toBe(10);
      expect(result.scenarios?.MIN.purchase_quantity).toBe(12);
      expect(result.scenarios?.REC.exact_need).toBe(11);
      expect(result.scenarios?.REC.purchase_quantity).toBe(12);
      expect(result.scenarios?.REC.leftover).toBe(1);
      expect(result.scenarios?.MAX).toEqual(result.scenarios?.REC);

      const duct = findMaterial(result, "Воздуховод");
      expect(duct?.quantity).toBe(10);
      expect(duct?.withReserve).toBe(11);
      expect(duct?.purchaseQty).toBe(12);
      expect(duct?.packageInfo).toEqual({ count: 4, size: 3, packageUnit: "отрезков" });
      expect(findMaterial(result, "Фасонные")).toMatchObject({ purchaseQty: 4 });
      expect(findMaterial(result, "Воздухораспределители")).toMatchObject({ purchaseQty: 3 });
      expect(findMaterial(result, "Хомуты")).toMatchObject({ purchaseQty: 8 });
    });

    it("без длины не выдумывает трассу и показывает границу расчёта", () => {
      const result = calc({ calculationMode: 0, totalArea: 80, ceilingHeight: 2.7, peopleCount: 3 });

      expect(result.materials).toEqual([]);
      expect(result.totals.mainDuctLength).toBe(0);
      expect(result.scenarios?.REC.purchase_quantity).toBe(0);
      expect(result.summaryCards?.[0]).toMatchObject({
        label: "Расчётный расход",
        value: "90",
        unit: "м³/ч",
      });
      expect(result.summaryCards?.[2]).toMatchObject({
        label: "Закупка трассы",
        value: "Не задана",
      });
      expect(result.warnings.some((warning) => warning.includes("длину трассы"))).toBe(true);
    });

    it("режим точности не добавляет скрытый запас", () => {
      const basic = ventilationDef.calculate({ ductLengthM: 10, stockLengthM: 3, ductReservePercent: 10, accuracyMode: "basic" as unknown as number });
      const professional = ventilationDef.calculate({ ductLengthM: 10, stockLengthM: 3, ductReservePercent: 10, accuracyMode: "professional" as unknown as number });

      expect(professional.scenarios).toEqual(basic.scenarios);
      expect(professional.accuracyExplanation?.combinedMultiplier).toBe(1);
    });
  });

  it("всегда сообщает профессиональные границы применимости", () => {
    const result = calc({ calculationMode: 1, projectAirflowM3h: 300, ductLengthM: 3 });

    expect(result.warnings.some((warning) => warning.includes("потери давления"))).toBe(true);
    expect(result.warnings.some((warning) => warning.includes("Противопожарные"))).toBe(true);
    expect(result.practicalNotes?.some((note) => note.includes("не подбираются по площади"))).toBe(true);
  });
});
