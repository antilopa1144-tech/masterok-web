import { describe, expect, it } from "vitest";
import { sewageDef } from "../formulas/sewage";
import { checkInvariants, findMaterial } from "./_helpers";

const calculate = sewageDef.calculate.bind(sewageDef);

describe("Калькулятор септика v2", () => {
  it("считает предварительный приток и трёхкратный минимум для 4 ЭЧЖ", () => {
    const result = calculate({
      calculationMode: 0,
      equivalentResidents: 4,
      wastewaterPerResidentL: 200,
    });

    expect(result.formulaVersion).toBe("sewage-canonical-v2");
    expect(result.totals.dailyFlowM3).toBe(0.8);
    expect(result.totals.retentionMultiplier).toBe(3);
    expect(result.totals.minimumWorkingVolumeM3).toBe(2.4);
    expect(result.totals.minimumChamberCount).toBe(1);
    expect(result.scenarios?.MIN.exact_need).toBe(2.4);
    expect(result.scenarios?.REC.exact_need).toBe(2.4);
    expect(result.scenarios?.MAX.exact_need).toBe(2.4);
    expect(result.summaryCards?.find((card) => card.label === "Выбранная система"))
      .toMatchObject({ value: "не введена", icon: "📋", tone: "slate" });
  });

  it("принимает суточный приток из проекта без пересчёта по литрам на человека", () => {
    const result = calculate({
      calculationMode: 1,
      equivalentResidents: 6,
      wastewaterPerResidentL: 999,
      projectDailyFlowM3: 1.1,
    });

    expect(result.totals.dailyFlowM3).toBe(1.1);
    expect(result.totals.minimumWorkingVolumeM3).toBe(3.3);
    expect(result.totals.minimumChamberCount).toBe(2);
  });

  it("использует коэффициент 2,5 свыше 25 ЭЧЖ", () => {
    const result = calculate({
      calculationMode: 1,
      equivalentResidents: 30,
      projectDailyFlowM3: 6,
    });

    expect(result.totals.retentionMultiplier).toBe(2.5);
    expect(result.totals.minimumWorkingVolumeM3).toBe(15);
    expect(result.totals.minimumChamberCount).toBe(2);
  });

  it("для 51–100 ЭЧЖ показывает минимум три камеры", () => {
    const result = calculate({
      calculationMode: 1,
      equivalentResidents: 60,
      projectDailyFlowM3: 10,
      selectedChamberCount: 2,
    });

    expect(result.totals.minimumChamberCount).toBe(3);
    expect(result.warnings.some((warning) => warning.includes("не менее 3"))).toBe(true);
  });

  it("показывает дефицит рабочего объёма выбранной системы", () => {
    const result = calculate({
      calculationMode: 0,
      equivalentResidents: 4,
      wastewaterPerResidentL: 200,
      selectedWorkingVolumeM3: 2,
    });

    expect(result.totals.volumeShortfallM3).toBe(0.4);
    expect(result.totals.volumeMarginM3).toBe(0);
    expect(result.scenarios?.REC.purchase_quantity).toBe(2.4);
    expect(result.warnings.some((warning) => warning.includes("меньше расчётного"))).toBe(true);
    checkInvariants(result);
  });

  it("при достаточном объёме показывает явный запас выбранной системы", () => {
    const result = calculate({
      equivalentResidents: 4,
      wastewaterPerResidentL: 200,
      selectedWorkingVolumeM3: 3,
      selectedChamberCount: 1,
    });

    expect(result.totals.volumeMarginM3).toBe(0.6);
    expect(result.totals.volumeShortfallM3).toBe(0);
    expect(result.scenarios?.REC.purchase_quantity).toBe(3);
    expect(result.scenarios?.REC.leftover).toBe(0.6);
    checkInvariants(result);
  });

  it("округляет проектную трубу только по явно введённому товарному отрезку", () => {
    const result = calculate({
      pipeLengthM: 10.2,
      pipeSectionLengthM: 3,
      inspectionWellCount: 1,
      fittingCount: 4,
    });

    const pipe = findMaterial(result, "Труба наружной канализации");
    expect(pipe?.quantity).toBe(10.2);
    expect(pipe?.purchaseQty).toBe(12);
    expect(pipe?.packageInfo).toEqual({ count: 4, size: 3, packageUnit: "отрезк." });
    expect(findMaterial(result, "Смотровой колодец")?.quantity).toBe(1);
    expect(findMaterial(result, "Фасонные части")?.quantity).toBe(4);
  });

  it("не добавляет кольца, фитинги, щебень и геотекстиль автоматически", () => {
    const result = calculate({
      equivalentResidents: 4,
      wastewaterPerResidentL: 200,
    });

    expect(result.materials).toHaveLength(0);
    for (const fragment of ["КС 10-9", "Отвод", "Тройник", "Щебень", "Геотекстиль"]) {
      expect(findMaterial(result, fragment)).toBeUndefined();
    }
  });

  it("не выдаёт условия участка за проверенные по умолчанию", () => {
    const result = calculate({
      naturalTreatmentStatus: 0,
      groundwaterStatus: 0,
    });

    expect(result.warnings.some((warning) => warning.includes("Пригодность грунта"))).toBe(true);
    expect(result.warnings.some((warning) => warning.includes("уровень грунтовых вод"))).toBe(true);
  });

  it("предупреждает о высоком УГВ и неподтверждённой естественной доочистке", () => {
    const result = calculate({
      naturalTreatmentStatus: 2,
      groundwaterStatus: 2,
    });

    expect(result.warnings.some((warning) => warning.includes("инженерное решение"))).toBe(true);
    expect(result.warnings.some((warning) => warning.includes("Высокий или сезонно высокий"))).toBe(true);
  });
});
