import { describe, expect, it } from "vitest";
import { warmFloorPipesDef } from "../formulas/warm-floor-pipes";
import { checkInvariants, findMaterial } from "./_helpers";

const calc = (inputs: Record<string, number> = {}) =>
  warmFloorPipesDef.calculate(inputs);

describe("Калькулятор водяного тёплого пола", () => {
  it("по умолчанию считает только геометрическую длину без скрытых поправок", () => {
    const result = calc();

    expect(result.formulaVersion).toBe("warm-floor-pipes-canonical-v2");
    expect(result.totals.layoutAreaM2).toBe(15);
    expect(result.totals.pipeSpacingMm).toBe(150);
    expect(result.totals.fieldPipeLengthM).toBe(100);
    expect(result.totals.exactPipeLengthM).toBe(100);
    expect(result.totals.purchasePipeLengthM).toBe(100);
    expect(result.totals.requiredCoilCount).toBe(0);
    expect(result.materials).toHaveLength(1);
    expect(findMaterial(result, "Труба")).toMatchObject({
      quantity: 100,
      purchaseQty: 100,
      unit: "м",
    });
    expect(findMaterial(result, "ЭППС")).toBeUndefined();
    expect(findMaterial(result, "Демпфер")).toBeUndefined();
    expect(findMaterial(result, "Клипс")).toBeUndefined();
    expect(findMaterial(result, "Стяжк")).toBeUndefined();
    expect(findMaterial(result, "Коллектор")).toBeUndefined();
    checkInvariants(result);
  });

  it("прибавляет только явно введённую длину подводок", () => {
    const result = calc({
      calculationMode: 0,
      layoutAreaM2: 15,
      pipeSpacingMm: 150,
      connectionLengthM: 6,
    });

    expect(result.totals.fieldPipeLengthM).toBe(100);
    expect(result.totals.connectionLengthM).toBe(6);
    expect(result.totals.exactPipeLengthM).toBe(106);
    expect(result.totals.purchasePipeLengthM).toBe(106);
  });

  it("принимает проектную ведомость и округляет до фактической бухты", () => {
    const result = calc({
      calculationMode: 1,
      projectTotalPipeLengthM: 260,
      circuitCount: 3,
      longestCircuitLengthM: 92,
      maxCircuitLengthM: 90,
      coilLengthM: 200,
      collectorCount: 1,
      manifoldOutletCount: 3,
    });

    expect(result.totals.exactPipeLengthM).toBe(260);
    expect(result.totals.averageCircuitLengthM).toBeCloseTo(86.667, 3);
    expect(result.totals.requiredCoilCount).toBe(2);
    expect(result.totals.purchasePipeLengthM).toBe(400);
    expect(result.totals.leftoverPipeLengthM).toBe(140);
    expect(findMaterial(result, "Труба")?.packageInfo).toEqual({
      count: 2,
      size: 200,
      packageUnit: "бухт",
    });
    expect(findMaterial(result, "Коллектор")).toMatchObject({
      quantity: 1,
      purchaseQty: 1,
    });
    expect(result.warnings.some((item) => item.includes("превышает предел"))).toBe(true);
    expect(result.warnings.some((item) => item.includes("план раскроя"))).toBe(true);
    checkInvariants(result);
  });

  it("не выдаёт общую длину бухт за проверенный раскрой контуров", () => {
    const result = calc({
      calculationMode: 1,
      projectTotalPipeLengthM: 150,
      circuitCount: 2,
      longestCircuitLengthM: 110,
      coilLengthM: 100,
    });

    expect(result.totals.requiredCoilCount).toBe(2);
    expect(result.warnings.some((item) => item.includes("не проверяет план раскроя"))).toBe(true);
    expect(result.warnings.some((item) => item.includes("больше одной выбранной бухты"))).toBe(true);
  });

  it("предупреждает, когда проектных данных недостаточно", () => {
    const result = calc({ calculationMode: 1 });

    expect(result.totals.exactPipeLengthM).toBe(0);
    expect(result.warnings.some((item) => item.includes("суммарную длину"))).toBe(true);
    expect(result.warnings.some((item) => item.includes("Число контуров не введено"))).toBe(true);
  });

  it("не подменяет самый длинный контур средним значением", () => {
    const result = calc({
      calculationMode: 1,
      projectTotalPipeLengthM: 240,
      circuitCount: 3,
      maxCircuitLengthM: 90,
    });

    expect(result.totals.averageCircuitLengthM).toBe(80);
    expect(result.totals.longestCircuitLengthM).toBe(0);
    expect(result.warnings.some((item) => item.includes("самой длинной петли"))).toBe(true);
  });

  it("проверяет соответствие выходов коллектора числу контуров", () => {
    const missingCollector = calc({
      calculationMode: 1,
      projectTotalPipeLengthM: 180,
      circuitCount: 3,
      manifoldOutletCount: 3,
    });
    const tooFewOutlets = calc({
      calculationMode: 1,
      projectTotalPipeLengthM: 180,
      circuitCount: 3,
      collectorCount: 1,
      manifoldOutletCount: 2,
    });

    expect(
      missingCollector.warnings.some((item) =>
        item.includes("без количества самих коллекторов"),
      ),
    ).toBe(true);
    expect(
      tooFewOutlets.warnings.some((item) => item.includes("меньше числа контуров")),
    ).toBe(true);
  });

  it("MIN, REC и MAX совпадают и не добавляют универсальный запас", () => {
    const result = calc({
      layoutAreaM2: 20,
      pipeSpacingMm: 200,
      connectionLengthM: 5,
      coilLengthM: 50,
    });

    expect(result.scenarios?.MIN).toMatchObject({
      exact_need: 105,
      purchase_quantity: 150,
      leftover: 45,
    });
    expect(result.scenarios?.REC).toEqual(result.scenarios?.MIN);
    expect(result.scenarios?.MAX).toEqual(result.scenarios?.MIN);
    expect(result.scenarios?.REC.assumptions).toContain("no_hidden_reserve");
  });

  it("показывает три понятных итоговых карточки", () => {
    const result = calc({
      calculationMode: 1,
      projectTotalPipeLengthM: 260,
      circuitCount: 3,
      coilLengthM: 200,
    });

    expect(result.summaryCards?.map((card) => card.label)).toEqual([
      "Точная потребность",
      "К покупке",
      "Контуры",
    ]);
    expect(result.summaryCards?.[0]).toMatchObject({ value: "260", unit: "м" });
    expect(result.summaryCards?.[1]?.hint).toContain("2 бухты по 200 м");
    expect(result.summaryCards?.[2]?.hint).toContain("86,7 м");
  });

  it("SEO-текст честно ограничивает назначение калькулятора", () => {
    const content = warmFloorPipesDef.seoContent?.descriptionHtml ?? "";

    expect(warmFloorPipesDef.metaDescription).toContain("проверьте проектные контуры");
    expect(content).toContain("не вычитает условные 15%");
    expect(content).toContain("не назначает ЭППС");
    expect(content).toContain("Почему нет автоматических 80 м на контур");
    expect(content).not.toContain("Площадь помещения &times; 0.85");
    expect(content).not.toContain("фиксированный общий слой 50 мм");
  });
});
