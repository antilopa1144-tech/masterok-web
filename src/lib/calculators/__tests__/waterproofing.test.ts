import { describe, expect, it } from "vitest";
import { waterproofingDef } from "../formulas/waterproofing";
import { checkInvariants, findMaterial, withBasicAccuracy } from "./_helpers";

const calc = withBasicAccuracy(
  waterproofingDef.calculate.bind(waterproofingDef),
) as (inputs: Record<string, number>) => ReturnType<typeof waterproofingDef.calculate>;

describe("Гидроизоляция", () => {
  it("описывает паспортный расчёт и опирается на первичные источники", () => {
    expect(waterproofingDef.formulaVersion).toBe("waterproofing-web-passport-v1");
    expect(waterproofingDef.metaTitle).toContain("расход по техкарте");
    expect(waterproofingDef.metaDescription).toContain("рассчитайте");
    expect(waterproofingDef.metaDescription).toContain("упаков");

    const html = waterproofingDef.seoContent?.descriptionHtml ?? "";
    expect(html).toContain("www.knauf.ru/catalog");
    expect(html).toContain("cdnmedia.mapei.com");
    expect(html).toContain("https://protect.gost.ru/sp/details/a2711156-c40f-4d0f-89f1-7e3c366bc430");
    expect(html).toContain("https://protect.gost.ru/sp/details/ca915ed9-5bce-4de4-94af-debfd041a939");
    expect(html).not.toMatch(/Ceresit CL 51|Профиль A|жидкая резина/i);
  });

  it("не предлагает фиктивные типы мастики и автоматические узлы", () => {
    const keys = waterproofingDef.fields.map((field) => field.key);
    expect(keys).toEqual(expect.arrayContaining([
      "inputMode",
      "projectAreaM2",
      "consumptionBasis",
      "passportConsumptionKgM2",
      "allowancePercent",
      "packageWeightKg",
    ]));
    expect(keys).not.toEqual(expect.arrayContaining([
      "masticType",
      "pipePenetrations",
      "insetCount",
      "floorCurvatureClass",
      "roomPerimeter",
      "wallHeight",
    ]));
  });

  it("считает готовую площадь по суммарному расходу на весь цикл", () => {
    const result = calc({
      inputMode: 0,
      projectAreaM2: 8,
      consumptionBasis: 0,
      passportConsumptionKgM2: 1.2,
      allowancePercent: 5,
      packageWeightKg: 5,
    });

    checkInvariants(result);
    const material = findMaterial(result, "Гидроизоляционный состав");
    expect(result.totals.workAreaM2).toBe(8);
    expect(result.totals.baseNeedKg).toBeCloseTo(9.6, 6);
    expect(result.totals.requiredNeedKg).toBeCloseTo(10.08, 6);
    expect(result.totals.packages).toBe(3);
    expect(result.totals.purchaseKg).toBe(15);
    expect(result.totals.leftoverKg).toBeCloseTo(4.92, 6);
    expect(result.scenarios?.REC.leftover).toBeCloseTo(5.4, 6);
    expect(material?.quantity).toBeCloseTo(9.6, 6);
    expect(material?.withReserve).toBeCloseTo(10.08, 6);
    expect(material?.purchaseQty).toBe(15);
    expect(result.materials).toHaveLength(1);
  });

  it("в режиме расхода на слой применяет только явное число слоёв", () => {
    const result = calc({
      inputMode: 0,
      projectAreaM2: 12,
      consumptionBasis: 1,
      passportConsumptionKgM2: 0.7,
      coatCount: 2,
      allowancePercent: 0,
      packageWeightKg: 5,
    });

    expect(result.totals.baseNeedKg).toBeCloseTo(16.8, 6);
    expect(result.totals.requiredNeedKg).toBeCloseTo(16.8, 6);
    expect(result.totals.packages).toBe(4);
    expect(result.totals.purchaseKg).toBe(20);
    expect(result.practicalNotes?.join(" ")).toContain("на слой");
    expect(result.practicalNotes?.join(" ")).toContain("2 слоя");
  });

  it("не умножает суммарный паспортный расход на скрытое число слоёв", () => {
    const one = calc({
      inputMode: 0,
      projectAreaM2: 10,
      consumptionBasis: 0,
      passportConsumptionKgM2: 1.4,
      coatCount: 1,
      allowancePercent: 0,
      packageWeightKg: 5,
    });
    const three = calc({
      inputMode: 0,
      projectAreaM2: 10,
      consumptionBasis: 0,
      passportConsumptionKgM2: 1.4,
      coatCount: 3,
      allowancePercent: 0,
      packageWeightKg: 5,
    });

    expect(one.totals.baseNeedKg).toBe(14);
    expect(three.totals.baseNeedKg).toBe(14);
  });

  it("считает пол и фактическую полосу стен без скрытого полного периметра", () => {
    const result = calc({
      inputMode: 1,
      roomLengthM: 3,
      roomWidthM: 2,
      includeFloor: 1,
      wallCoverageLengthM: 10,
      wallCoverageHeightM: 0.2,
      wallOpeningAreaM2: 0,
      consumptionBasis: 0,
      passportConsumptionKgM2: 1,
      allowancePercent: 0,
      packageWeightKg: 5,
    });

    expect(result.totals.floorAreaM2).toBe(6);
    expect(result.totals.grossWallAreaM2).toBe(2);
    expect(result.totals.netWallAreaM2).toBe(2);
    expect(result.totals.workAreaM2).toBe(8);
    expect(result.practicalNotes?.join(" ")).toContain("10 м фактической длины");
  });

  it("позволяет считать только выбранные стены", () => {
    const result = calc({
      inputMode: 1,
      roomLengthM: 3,
      roomWidthM: 2,
      includeFloor: 0,
      wallCoverageLengthM: 2.5,
      wallCoverageHeightM: 2,
      wallOpeningAreaM2: 1,
      consumptionBasis: 0,
      passportConsumptionKgM2: 1,
      allowancePercent: 0,
      packageWeightKg: 5,
    });

    expect(result.totals.floorAreaM2).toBe(0);
    expect(result.totals.grossWallAreaM2).toBe(5);
    expect(result.totals.appliedWallOpeningAreaM2).toBe(1);
    expect(result.totals.workAreaM2).toBe(4);
  });

  it("ограничивает вычет проёмов площадью покрываемых стен", () => {
    const result = calc({
      inputMode: 1,
      includeFloor: 0,
      wallCoverageLengthM: 2,
      wallCoverageHeightM: 2,
      wallOpeningAreaM2: 10,
    });

    expect(result.totals.appliedWallOpeningAreaM2).toBe(4);
    expect(result.totals.workAreaM2).toBe(0);
    expect(result.warnings.join(" ")).toContain("введённый вычет ограничен");
  });

  it("применяет надбавку один раз и округляет только до фактической фасовки", () => {
    const result = calc({
      inputMode: 0,
      projectAreaM2: 20,
      consumptionBasis: 0,
      passportConsumptionKgM2: 1.1,
      allowancePercent: 10,
      packageWeightKg: 7.5,
    });

    expect(result.totals.baseNeedKg).toBe(22);
    expect(result.totals.requiredNeedKg).toBeCloseTo(24.2, 6);
    expect(result.totals.packages).toBe(4);
    expect(result.totals.purchaseKg).toBe(30);
    expect(result.totals.leftoverKg).toBeCloseTo(5.8, 6);
  });

  it("не добавляет ленту, грунт, герметик, манжеты или инструмент", () => {
    const result = calc({ inputMode: 0, projectAreaM2: 8 });
    const text = result.materials.map((material) => material.name).join(" ");

    expect(result.materials).toHaveLength(1);
    expect(text).not.toMatch(/лент|грунт|праймер|герметик|манжет|валик|кист/i);
    expect(result.warnings.join(" ")).toContain("не добавляются автоматически");
  });

  it("не скрывает надбавки в MIN, REC, MAX и режиме точности", () => {
    const result = waterproofingDef.calculate({
      inputMode: 0,
      projectAreaM2: 8,
      consumptionBasis: 0,
      passportConsumptionKgM2: 1.2,
      allowancePercent: 5,
      packageWeightKg: 5,
      accuracyMode: "professional",
    });

    expect(result.scenarios?.MIN).toEqual(result.scenarios?.REC);
    expect(result.scenarios?.REC).toEqual(result.scenarios?.MAX);
    expect(result.accuracyMode).toBe("professional");
    expect(result.accuracyExplanation?.combinedMultiplier).toBe(1);
    expect(result.accuracyExplanation?.notes.join(" ")).toContain("не меняет расход");
  });

  it("сохраняет canonical id, но явно маркирует отдельный web-контракт", () => {
    const result = calc({ inputMode: 0, projectAreaM2: 8 });
    expect(result.canonicalSpecId).toBe("waterproofing");
    expect(result.formulaVersion).toBe("waterproofing-web-passport-v1");
  });
});
