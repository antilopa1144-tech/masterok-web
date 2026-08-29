import { describe, expect, it } from "vitest";
import { rebarDef } from "../formulas/rebar";
import { checkInvariants, findMaterial } from "./_helpers";

const calc = (inputs: Record<string, number> = {}) =>
  rebarDef.calculate({ accuracyMode: "basic", ...inputs } as any);

describe("Калькулятор арматуры v2", () => {
  it("не обещает подбор армирования и описывает закупочный результат", () => {
    expect(rebarDef.h1).toContain("прутки к покупке");
    expect(rebarDef.description).toContain("готовую схему");
    expect(rebarDef.formulaDescription).toContain("не назначает армирование");
    expect(rebarDef.formulaDescription).not.toContain("4 продольных прутка");
  });

  it("считает два слоя сетки по чистым размерам и максимальному шагу", () => {
    const result = calc();

    expect(result.formulaVersion).toBe("rebar-canonical-v2");
    expect(result.totals.barsAlongLength).toBe(41);
    expect(result.totals.barsAlongWidth).toBe(51);
    expect(result.totals.mainExactLengthM).toBe(1617.6);
    expect(result.totals.mainExactWeightKg).toBeCloseTo(1436.429, 3);
    expect(result.totals.mainPlanningLengthM).toBe(1779.36);
    expect(result.totals.mainRods).toBe(153);
    expect(result.totals.mainPurchaseLengthM).toBe(1790.1);
    checkInvariants(result);
  });

  it("округляет основную арматуру до целых прутков выбранной длины", () => {
    const result = calc({ reservePercent: 10, rodLengthM: 6 });
    const main = findMaterial(result, "Арматура сетки");

    expect(result.totals.mainRods).toBe(297);
    expect(main?.packageInfo).toEqual({ count: 297, size: 6, packageUnit: "прутков" });
    expect(main?.purchaseQty).toBe(1782);
  });

  it("применяет закупочный запас один раз", () => {
    const withoutReserve = calc({ reservePercent: 0 });
    const withReserve = calc({ reservePercent: 10 });

    expect(withoutReserve.totals.mainExactLengthM).toBe(1617.6);
    expect(withoutReserve.totals.mainPlanningLengthM).toBe(1617.6);
    expect(withoutReserve.totals.mainRods).toBe(139);
    expect(withReserve.totals.mainPlanningLengthM).toBe(1779.36);
    expect(withReserve.totals.mainRods).toBe(153);
  });

  it("один слой сетки вдвое уменьшает чистый метраж", () => {
    const result = calc({ gridLayers: 1 });
    expect(result.totals.mainExactLengthM).toBe(808.8);
    expect(result.totals.intersections).toBe(2091);
  });

  it("явный отступ от кромки меняет длину и число стержней", () => {
    const noCover = calc({ edgeCoverMm: 0 });
    const withCover = calc({ edgeCoverMm: 50 });

    expect(noCover.totals.mainExactLengthM).toBe(1636);
    expect(withCover.totals.mainExactLengthM).toBe(1617.6);
  });

  it("считает вязальную проволоку по явной доле узлов и фасовке", () => {
    const result = calc({ tieSharePercent: 100, wireLengthPerTieM: 0.3, wireReservePercent: 10, wirePackageKg: 1 });
    const wire = findMaterial(result, "Проволока вязальная");

    expect(result.totals.intersections).toBe(4182);
    expect(result.totals.tieCount).toBe(4182);
    expect(result.totals.wireExactLengthM).toBe(1254.6);
    expect(result.totals.wireExactKg).toBeCloseTo(7.528, 3);
    expect(result.totals.wirePlanningKg).toBeCloseTo(8.28, 2);
    expect(result.totals.wirePurchaseKg).toBe(9);
    expect(wire?.packageInfo).toEqual({ count: 9, size: 1, packageUnit: "упаковок" });
  });

  it("может считать только часть перевязываемых узлов", () => {
    const result = calc({ tieSharePercent: 25 });
    expect(result.totals.tieCount).toBe(1046);
    expect(result.totals.wireExactKg).toBeCloseTo(1.883, 3);
  });

  it("считает продольный каркас и хомуты как разные товарные позиции", () => {
    const result = calc({ structureType: 1 });
    const main = findMaterial(result, "Продольная арматура");
    const stirrups = findMaterial(result, "Хомуты");

    expect(result.totals.mainExactLengthM).toBe(144);
    expect(result.totals.mainRods).toBe(14);
    expect(result.totals.stirrupCount).toBe(91);
    expect(result.totals.stirrupPieceLengthM).toBe(1.5);
    expect(result.totals.secondaryExactLengthM).toBe(136.5);
    expect(result.totals.secondaryRods).toBe(13);
    expect(main?.packageInfo?.count).toBe(14);
    expect(stirrups?.packageInfo?.count).toBe(13);
    checkInvariants(result);
  });

  it("использует введённые размеры, шаг и число стержней каркаса", () => {
    const result = calc({
      structureType: 1,
      frameLengthM: 10,
      longitudinalBars: 6,
      stirrupWidthMm: 400,
      stirrupHeightMm: 600,
      stirrupStepMm: 500,
      stirrupHookAllowanceMm: 200,
    });

    expect(result.totals.mainExactLengthM).toBe(60);
    expect(result.totals.stirrupCount).toBe(21);
    expect(result.totals.stirrupPieceLengthM).toBe(2.2);
    expect(result.totals.secondaryExactLengthM).toBe(46.2);
    expect(result.totals.intersections).toBe(126);
  });

  it("MIN/REC/MAX используют только явную политику запаса", () => {
    const result = calc({ reservePercent: 10 });

    expect(result.scenarios.MIN.exact_need).toBe(1617.6);
    expect(result.scenarios.MIN.purchase_quantity).toBe(1626.3);
    expect(result.scenarios.REC.exact_need).toBe(1779.36);
    expect(result.scenarios.REC.purchase_quantity).toBe(1790.1);
    expect(result.scenarios.MAX.exact_need).toBe(1860.24);
    expect(result.scenarios.MAX.purchase_quantity).toBe(1860.3);
    expect(result.scenarios.REC.key_factors.reserve_percent).toBe(10);
  });

  it("режим точности не добавляет скрытый множитель", () => {
    const basic = rebarDef.calculate({ accuracyMode: "basic" } as any);
    const professional = rebarDef.calculate({ accuracyMode: "professional" } as any);

    expect(basic.totals.mainExactLengthM).toBe(professional.totals.mainExactLengthM);
    expect(basic.totals.mainRods).toBe(professional.totals.mainRods);
    expect(professional.accuracyExplanation?.combinedMultiplier).toBe(1);
  });

  it("не выдаёт категоричных советов по диаметру и шагу", () => {
    const result = calc({ mainDiameter: 6, gridStepMm: 500 });
    expect(result.warnings.join(" ")).toContain("перенесите из проекта");
    expect(result.warnings.join(" ")).not.toContain("не менее");
    expect(result.warnings.join(" ")).not.toContain("снижает несущую способность");
  });
});
