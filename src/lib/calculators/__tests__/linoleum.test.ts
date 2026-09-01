import { describe, expect, it } from "vitest";
import { linoleumDef } from "../formulas/linoleum";
import { checkInvariants, findMaterial, withBasicAccuracy } from "./_helpers";

const calc = withBasicAccuracy(linoleumDef.calculate.bind(linoleumDef));

const defaults = {
  roomLength: 5,
  roomWidth: 4,
  rollWidth: 3.5,
  stripDirection: 0,
  trimAllowanceCm: 10,
  hasPattern: 0,
  patternRepeatCm: 30,
  purchaseStepM: 0.1,
};

describe("Калькулятор линолеума", () => {
  it("в автоматическом режиме сравнивает оба направления и выбирает меньший метраж", () => {
    const result = calc(defaults);
    const linoleum = findMaterial(result, "Линолеум");

    expect(result.totals.selectedDirection).toBe(2);
    expect(result.totals.stripsNeeded).toBe(2);
    expect(result.totals.exactLinearM).toBeCloseTo(8.2, 6);
    expect(result.totals.purchaseLinearM).toBeCloseTo(8.2, 6);
    expect(linoleum?.purchaseQty).toBeCloseTo(8.2, 6);
    checkInvariants(result);
  });

  it("явное направление полос действительно меняет раскрой", () => {
    const alongLength = calc({ ...defaults, stripDirection: 1 });
    const alongWidth = calc({ ...defaults, stripDirection: 2 });

    expect(alongLength.totals.exactLinearM).toBeCloseTo(10.2, 6);
    expect(alongLength.totals.stripsNeeded).toBe(2);
    expect(alongWidth.totals.exactLinearM).toBeCloseTo(8.2, 6);
    expect(alongWidth.totals.stripsNeeded).toBe(2);
  });

  it("рулон шириной 4 м закрывает комнату 5×4 одним полотном", () => {
    const result = calc({ ...defaults, rollWidth: 4, stripDirection: 0 });

    expect(result.totals.selectedDirection).toBe(1);
    expect(result.totals.stripsNeeded).toBe(1);
    expect(result.totals.exactLinearM).toBeCloseTo(5.1, 6);
    expect(result.totals.seamLengthM).toBe(0);
  });

  it("добавляет явный припуск к каждой полосе без скрытого процента", () => {
    const noTrim = calc({ ...defaults, trimAllowanceCm: 0 });
    const withTrim = calc({ ...defaults, trimAllowanceCm: 20 });

    expect(noTrim.totals.exactLinearM).toBeCloseTo(8, 6);
    expect(withTrim.totals.exactLinearM).toBeCloseTo(8.4, 6);
  });

  it("раппорт добавляет одну полную повторяемость на каждую следующую полосу", () => {
    const result = calc({
      ...defaults,
      hasPattern: 1,
      patternRepeatCm: 60,
      stripDirection: 2,
    });

    expect(result.totals.patternAllowanceM).toBeCloseTo(0.6, 6);
    expect(result.totals.exactLinearM).toBeCloseTo(8.8, 6);
    expect(result.warnings.some((warning) => warning.includes("раппорт") && warning.includes("предваритель"))).toBe(true);
  });

  it("округляет погонные метры только до выбранного шага продажи", () => {
    const result = calc({ ...defaults, purchaseStepM: 0.5 });

    expect(result.totals.exactLinearM).toBeCloseTo(8.2, 6);
    expect(result.totals.purchaseLinearM).toBeCloseTo(8.5, 6);
    expect(result.totals.linearLeftoverM).toBeCloseTo(0.3, 6);
  });

  it("не назначает грунтовку, клей, скотч, плинтус и холодную сварку", () => {
    const result = calc(defaults);
    const names = result.materials.map((material) => material.name).join(" ");

    expect(result.materials).toHaveLength(1);
    expect(names).not.toMatch(/Грунтов|Клей|Скотч|Плинтус|Холодная сварка/);
    expect(result.warnings.some((warning) => warning.includes("Клей") && warning.includes("не рассчитаны"))).toBe(true);
  });

  it("MIN, REC, MAX и режим точности не умножают раскрой", () => {
    const result = calc(defaults);

    expect(result.scenarios?.MIN).toEqual(result.scenarios?.REC);
    expect(result.scenarios?.REC).toEqual(result.scenarios?.MAX);
    expect(result.accuracyExplanation?.combinedMultiplier).toBe(1);
  });

  it("скрывает раппорт, пока пользователь не включил рисунок", () => {
    const rapport = linoleumDef.fields.find((field) => field.key === "patternRepeatCm");

    expect(rapport?.hideIf).toEqual({ key: "hasPattern", op: "eq", value: 0 });
  });

  it("объясняет прямоугольную модель, направление и границу швов", () => {
    const result = calc(defaults);
    const text = [...result.warnings, ...(result.practicalNotes ?? [])].join(" ");

    expect(text).toContain("прямоугольн");
    expect(text).toContain("направлен");
    expect(text).toContain("шв");
    expect(result.materialListBanner).toContain("только линолеум");
  });

  it("использует действующие профильные источники", () => {
    const content = `${linoleumDef.formulaDescription ?? ""} ${linoleumDef.seoContent?.descriptionHtml ?? ""}`;

    expect(content).toContain("ГОСТ 18108-2016");
    expect(content).toContain("ГОСТ 7251-2016");
    expect(content).toContain("СП 71.13330.2017");
    expect(content).not.toContain("ГОСТ 18108-80");
    expect(content).not.toContain("ГОСТ 7251-77");
    expect(content).toContain("https://protect.gost.ru/gost/details/64201222-28b9-49ce-a72a-40eef8e08fa9");
    expect(content).toContain("https://protect.gost.ru/gost/details/64e7d7c1-fa24-476c-a247-4a7701c9ff99");
    expect(content).toContain("https://protect.gost.ru/sp/details/ca915ed9-5bce-4de4-94af-debfd041a939");
  });

  it("сохраняет интент расчёта линолеума без обещания связанных материалов", () => {
    expect(linoleumDef.h1).toContain("Калькулятор линолеума");
    expect(linoleumDef.metaDescription).toMatch(/^Бесплатный калькулятор/);
    expect(linoleumDef.metaDescription).toContain("рассчитайте");
    expect(linoleumDef.description).not.toMatch(/кле[йя]|плинтус|грунтов|скотч/i);
    expect(linoleumDef.metaDescription).not.toMatch(/кле[йя]|плинтус|грунтов|скотч/i);
  });
});
