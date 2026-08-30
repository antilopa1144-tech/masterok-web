import { describe, expect, it } from "vitest";
import { getCalculatorMetaBySlug } from "@/lib/calculators/meta.generated";
import {
  buildCalculatorHrefForComparedMaterial,
  buildMaterialComparisonHrefFromCalculator,
  getCalculatorLinkForComparedMaterial,
  LINKED_COMPARISON_MATERIAL_NAMES,
  readMaterialComparisonTransfer,
} from "./material-comparison-links";

describe("связка сравнения материалов с калькуляторами", () => {
  it("передаёт из калькулятора только однозначную категорию", () => {
    expect(buildMaterialComparisonHrefFromCalculator("laminat")).toBe(
      "/instrumenty/sravnenie-materialov/?category=flooring&from=laminat",
    );
    expect(buildMaterialComparisonHrefFromCalculator("uteplenie")).toContain(
      "category=insulation",
    );
    expect(buildMaterialComparisonHrefFromCalculator("krovlya")).toContain(
      "category=roofing",
    );
  });

  it("не угадывает категорию для многозонного или отсутствующего материала", () => {
    expect(buildMaterialComparisonHrefFromCalculator("plitka")).toBeNull();
    expect(buildMaterialComparisonHrefFromCalculator("kraska")).toBeNull();
    expect(buildMaterialComparisonHrefFromCalculator("dekorativnaya-shtukaturka")).toBeNull();
    expect(buildMaterialComparisonHrefFromCalculator("beton")).toBeNull();
  });

  it("принимает только согласованную пару category и source", () => {
    expect(readMaterialComparisonTransfer(new URLSearchParams("category=walls&from=oboi"))).toEqual({
      categoryId: "walls",
      sourceCalculatorSlug: "oboi",
    });
    expect(readMaterialComparisonTransfer(new URLSearchParams("category=roofing&from=oboi"))).toBeNull();
    expect(readMaterialComparisonTransfer(new URLSearchParams("category=unknown&from=oboi"))).toBeNull();
  });

  it("ведёт связанные материалы только в существующие canonical калькуляторы", () => {
    expect(new Set(LINKED_COMPARISON_MATERIAL_NAMES).size).toBe(
      LINKED_COMPARISON_MATERIAL_NAMES.length,
    );

    for (const materialName of LINKED_COMPARISON_MATERIAL_NAMES) {
      const link = getCalculatorLinkForComparedMaterial(materialName);
      const calculator = link ? getCalculatorMetaBySlug(link.calculatorSlug) : null;
      expect(calculator?.title).toBe(link?.calculatorTitle);
      expect(calculator?.categorySlug).toBe(link?.calculatorCategorySlug);
      expect(buildCalculatorHrefForComparedMaterial(materialName)).toBe(
        `/kalkulyatory/${link?.calculatorCategorySlug}/${link?.calculatorSlug}/`,
      );
    }
  });

  it("не подменяет SPC, PIR и неподдерживаемые виды кровли ближайшим калькулятором", () => {
    expect(getCalculatorLinkForComparedMaterial("Кварцвиниловая плитка на жёсткой основе (SPC)")).toBeNull();
    expect(getCalculatorLinkForComparedMaterial("Плиты из полиизоцианурата (PIR)")).toBeNull();
    expect(getCalculatorLinkForComparedMaterial("Фальцевая кровля")).toBeNull();
    expect(getCalculatorLinkForComparedMaterial("Композитная черепица")).toBeNull();
  });
});
