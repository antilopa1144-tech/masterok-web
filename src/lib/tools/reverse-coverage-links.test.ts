import { describe, expect, it } from "vitest";
import { getCalculatorMetaBySlug } from "@/lib/calculators/meta.generated";
import { COVERAGE_MATERIALS } from "@/lib/tools/reverse-coverage";
import {
  buildCalculatorHrefForCoverageMaterial,
  buildReverseCoverageHrefFromCalculator,
  getCalculatorLinkForCoverageMaterial,
  readReverseCoverageTransfer,
  REVERSE_COVERAGE_CALCULATOR_LINKS,
} from "./reverse-coverage-links";

describe("связка обратного расчёта остатка с калькуляторами", () => {
  it("переносит только однозначный тип материала без количества и условий", () => {
    expect(buildReverseCoverageHrefFromCalculator("gruntovka", { primerType: 1, coats: 2 })).toBe(
      "/instrumenty/skolko-ostalos/?material=primer-contact&from=gruntovka",
    );
    expect(buildReverseCoverageHrefFromCalculator("shtukaturka", { plasterType: 0, thickness: 25 })).toBe(
      "/instrumenty/skolko-ostalos/?material=plaster-gypsum&from=shtukaturka",
    );
    expect(buildReverseCoverageHrefFromCalculator("shpaklevka", { puttyType: 2 })).toContain(
      "material=putty-start",
    );
  });

  it("не угадывает продукт или несовместимый состав", () => {
    expect(buildReverseCoverageHrefFromCalculator("gruntovka", { primerType: 2 })).toBeNull();
    expect(buildReverseCoverageHrefFromCalculator("shtukaturka", { plasterType: 2 })).toBeNull();
    expect(buildReverseCoverageHrefFromCalculator("shpaklevka", { puttyType: 1 })).toBeNull();
    expect(buildReverseCoverageHrefFromCalculator("zatirka", { groutType: 1 })).toBeNull();
    expect(buildReverseCoverageHrefFromCalculator("gidroizolyaciya-vlagozaschita", { masticType: 2 })).toBeNull();
    expect(buildReverseCoverageHrefFromCalculator("kraska", {})).toBeNull();
    expect(buildReverseCoverageHrefFromCalculator("klej-dlya-plitki", { tileSize: 0 })).toBeNull();
    expect(buildReverseCoverageHrefFromCalculator("nalivnoy-pol", { mixtureType: 1 })).toBeNull();
    expect(buildReverseCoverageHrefFromCalculator("gazobeton", { blockThickness: 100 })).toBeNull();
  });

  it("принимает только согласованную пару material и source", () => {
    expect(readReverseCoverageTransfer(new URLSearchParams("material=grout&from=zatirka"))).toEqual({
      materialId: "grout",
      sourceCalculatorSlug: "zatirka",
    });
    expect(readReverseCoverageTransfer(new URLSearchParams("material=grout&from=gruntovka"))).toBeNull();
    expect(readReverseCoverageTransfer(new URLSearchParams("material=unknown&from=zatirka"))).toBeNull();
  });

  it("даёт каждому материалу существующий canonical калькулятор", () => {
    const materialIds = COVERAGE_MATERIALS.map((material) => material.id).sort();
    const linkedIds = REVERSE_COVERAGE_CALCULATOR_LINKS.map((link) => link.materialId).sort();
    expect(new Set(linkedIds).size).toBe(linkedIds.length);
    expect(linkedIds).toEqual(materialIds);

    for (const materialId of materialIds) {
      const link = getCalculatorLinkForCoverageMaterial(materialId);
      const calculator = link ? getCalculatorMetaBySlug(link.calculatorSlug) : null;
      expect(calculator?.title).toBe(link?.calculatorTitle);
      expect(calculator?.categorySlug).toBe(link?.calculatorCategorySlug);
      expect(buildCalculatorHrefForCoverageMaterial(materialId)).toBe(
        `/kalkulyatory/${link?.calculatorCategorySlug}/${link?.calculatorSlug}/`,
      );
    }
  });

  it("не создаёт ссылку для неизвестного материала", () => {
    expect(getCalculatorLinkForCoverageMaterial("unknown")).toBeNull();
    expect(buildCalculatorHrefForCoverageMaterial("unknown")).toBeNull();
  });
});
