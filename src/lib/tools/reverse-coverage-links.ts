import { getCanonicalCalculatorPath } from "@/lib/calculators/canonical-path";
import { COVERAGE_MATERIALS } from "@/lib/tools/reverse-coverage";

export const REVERSE_COVERAGE_TOOL_SLUG = "skolko-ostalos";

export interface ReverseCoverageCalculatorLink {
  materialId: string;
  calculatorSlug: string;
  calculatorCategorySlug: string;
  calculatorTitle: string;
}

export const REVERSE_COVERAGE_CALCULATOR_LINKS = [
  { materialId: "paint-acrylic", calculatorSlug: "kraska", calculatorCategorySlug: "otdelka", calculatorTitle: "Калькулятор краски" },
  { materialId: "paint-latex", calculatorSlug: "kraska", calculatorCategorySlug: "otdelka", calculatorTitle: "Калькулятор краски" },
  { materialId: "paint-facade", calculatorSlug: "kraska", calculatorCategorySlug: "otdelka", calculatorTitle: "Калькулятор краски" },
  { materialId: "primer-deep", calculatorSlug: "gruntovka", calculatorCategorySlug: "otdelka", calculatorTitle: "Калькулятор грунтовки" },
  { materialId: "primer-contact", calculatorSlug: "gruntovka", calculatorCategorySlug: "otdelka", calculatorTitle: "Калькулятор грунтовки" },
  { materialId: "putty-start", calculatorSlug: "shpaklevka", calculatorCategorySlug: "otdelka", calculatorTitle: "Калькулятор шпаклёвки" },
  { materialId: "putty-finish", calculatorSlug: "shpaklevka", calculatorCategorySlug: "otdelka", calculatorTitle: "Калькулятор шпаклёвки" },
  { materialId: "plaster-gypsum", calculatorSlug: "shtukaturka", calculatorCategorySlug: "steny", calculatorTitle: "Калькулятор штукатурки" },
  { materialId: "plaster-cement", calculatorSlug: "shtukaturka", calculatorCategorySlug: "steny", calculatorTitle: "Калькулятор штукатурки" },
  { materialId: "decor-plaster", calculatorSlug: "dekorativnaya-shtukaturka", calculatorCategorySlug: "fasad", calculatorTitle: "Калькулятор декоративной штукатурки" },
  { materialId: "tile-adhesive-cm11", calculatorSlug: "klej-dlya-plitki", calculatorCategorySlug: "poly", calculatorTitle: "Калькулятор плиточного клея" },
  { materialId: "tile-adhesive-cm14", calculatorSlug: "klej-dlya-plitki", calculatorCategorySlug: "poly", calculatorTitle: "Калькулятор плиточного клея" },
  { materialId: "gasblock-glue", calculatorSlug: "gazobeton", calculatorCategorySlug: "steny", calculatorTitle: "Калькулятор газобетона" },
  { materialId: "grout", calculatorSlug: "zatirka", calculatorCategorySlug: "poly", calculatorTitle: "Калькулятор затирки для плитки" },
  { materialId: "self-leveling", calculatorSlug: "nalivnoy-pol", calculatorCategorySlug: "poly", calculatorTitle: "Калькулятор наливного пола" },
  { materialId: "waterproof", calculatorSlug: "gidroizolyaciya-vlagozaschita", calculatorCategorySlug: "otdelka", calculatorTitle: "Калькулятор гидроизоляции" },
] as const satisfies readonly ReverseCoverageCalculatorLink[];

const CALCULATOR_ALLOWED_MATERIALS: Readonly<Record<string, readonly string[]>> = {
  gruntovka: ["primer-deep", "primer-contact"],
  shtukaturka: ["plaster-gypsum", "plaster-cement"],
  shpaklevka: ["putty-start", "putty-finish"],
  zatirka: ["grout"],
  "gidroizolyaciya-vlagozaschita": ["waterproof"],
};

export function isReverseCoverageMaterialId(value: string | null): value is string {
  return value !== null && COVERAGE_MATERIALS.some((material) => material.id === value);
}

function getReverseCoverageMaterialForCalculator(
  calculatorSlug: string,
  values: Readonly<Record<string, number>>,
): string | null {
  switch (calculatorSlug) {
    case "gruntovka":
      if (values.primerType === 0) return "primer-deep";
      if (values.primerType === 1) return "primer-contact";
      return null;
    case "shtukaturka":
      if (values.plasterType === 0) return "plaster-gypsum";
      if (values.plasterType === 1) return "plaster-cement";
      return null;
    case "shpaklevka":
      if (values.puttyType === 0) return "putty-finish";
      if (values.puttyType === 2) return "putty-start";
      return null;
    case "zatirka":
      return values.groutType === 0 ? "grout" : null;
    case "gidroizolyaciya-vlagozaschita":
      return "waterproof";
    default:
      return null;
  }
}

export function buildReverseCoverageHrefFromCalculator(
  calculatorSlug: string,
  values: Readonly<Record<string, number>>,
): string | null {
  const materialId = getReverseCoverageMaterialForCalculator(calculatorSlug, values);
  if (!materialId) return null;

  const params = new URLSearchParams({ material: materialId, from: calculatorSlug });
  return `/instrumenty/${REVERSE_COVERAGE_TOOL_SLUG}/?${params.toString()}`;
}

export function getCalculatorLinkForCoverageMaterial(
  materialId: string,
): ReverseCoverageCalculatorLink | null {
  return REVERSE_COVERAGE_CALCULATOR_LINKS.find((link) => link.materialId === materialId) ?? null;
}

export function buildCalculatorHrefForCoverageMaterial(materialId: string): string | null {
  const link = getCalculatorLinkForCoverageMaterial(materialId);
  return link
    ? getCanonicalCalculatorPath({
        categorySlug: link.calculatorCategorySlug,
        slug: link.calculatorSlug,
      })
    : null;
}

export interface ReverseCoverageTransfer {
  materialId: string;
  sourceCalculatorSlug: string;
}

export function readReverseCoverageTransfer(
  searchParams: Pick<URLSearchParams, "get">,
): ReverseCoverageTransfer | null {
  const materialId = searchParams.get("material");
  const sourceCalculatorSlug = searchParams.get("from");
  if (!isReverseCoverageMaterialId(materialId) || !sourceCalculatorSlug) return null;

  const allowedMaterials = CALCULATOR_ALLOWED_MATERIALS[sourceCalculatorSlug];
  if (!allowedMaterials?.includes(materialId)) return null;

  return { materialId, sourceCalculatorSlug };
}
