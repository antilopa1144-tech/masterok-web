import { getCanonicalCalculatorPath } from "@/lib/calculators/canonical-path";

export const CURING_TIMER_TOOL_SLUG = "tajmer-skhvatyvaniya";

export interface CuringTimerCalculatorLink {
  presetId: string;
  calculatorSlug: string;
  calculatorCategorySlug: string;
  calculatorTitle: string;
}

export const CURING_TIMER_CALCULATOR_LINKS = [
  { presetId: "primer-deep", calculatorSlug: "gruntovka", calculatorCategorySlug: "otdelka", calculatorTitle: "Калькулятор грунтовки" },
  { presetId: "primer-contact", calculatorSlug: "gruntovka", calculatorCategorySlug: "otdelka", calculatorTitle: "Калькулятор грунтовки" },
  { presetId: "plaster-gypsum", calculatorSlug: "shtukaturka", calculatorCategorySlug: "steny", calculatorTitle: "Калькулятор штукатурки" },
  { presetId: "plaster-cement", calculatorSlug: "shtukaturka", calculatorCategorySlug: "steny", calculatorTitle: "Калькулятор штукатурки" },
  { presetId: "putty-start", calculatorSlug: "shpaklevka", calculatorCategorySlug: "otdelka", calculatorTitle: "Калькулятор шпаклёвки" },
  { presetId: "putty-finish", calculatorSlug: "shpaklevka", calculatorCategorySlug: "otdelka", calculatorTitle: "Калькулятор шпаклёвки" },
  { presetId: "screed-cement", calculatorSlug: "styazhka", calculatorCategorySlug: "poly", calculatorTitle: "Калькулятор стяжки пола" },
  { presetId: "self-leveling", calculatorSlug: "nalivnoy-pol", calculatorCategorySlug: "poly", calculatorTitle: "Калькулятор наливного пола" },
  { presetId: "tile-adhesive", calculatorSlug: "klej-dlya-plitki", calculatorCategorySlug: "poly", calculatorTitle: "Калькулятор плиточного клея" },
  { presetId: "wallpaper-glue", calculatorSlug: "oboi", calculatorCategorySlug: "otdelka", calculatorTitle: "Калькулятор обоев" },
  { presetId: "grout", calculatorSlug: "zatirka", calculatorCategorySlug: "poly", calculatorTitle: "Калькулятор затирки для плитки" },
  { presetId: "paint-acrylic", calculatorSlug: "kraska", calculatorCategorySlug: "otdelka", calculatorTitle: "Калькулятор краски" },
  { presetId: "paint-latex", calculatorSlug: "kraska", calculatorCategorySlug: "otdelka", calculatorTitle: "Калькулятор краски" },
  { presetId: "waterproof", calculatorSlug: "gidroizolyaciya-vlagozaschita", calculatorCategorySlug: "otdelka", calculatorTitle: "Калькулятор гидроизоляции" },
] as const satisfies readonly CuringTimerCalculatorLink[];

const CALCULATOR_ALLOWED_PRESETS: Readonly<Record<string, readonly string[]>> = {
  gruntovka: ["primer-deep", "primer-contact"],
  shtukaturka: ["plaster-gypsum", "plaster-cement"],
  shpaklevka: ["putty-start", "putty-finish"],
  styazhka: ["screed-cement"],
  "klej-dlya-plitki": ["tile-adhesive"],
  oboi: ["wallpaper-glue"],
  zatirka: ["grout"],
  "gidroizolyaciya-vlagozaschita": ["waterproof"],
};

function getCuringPresetForCalculator(
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
    case "styazhka":
      return values.thickness >= 40
        && values.thickness <= 50
        && (values.screedType === 0 || values.screedType === 1)
        ? "screed-cement"
        : null;
    case "klej-dlya-plitki":
      return "tile-adhesive";
    case "oboi":
      return "wallpaper-glue";
    case "zatirka":
      return values.groutType === 0 ? "grout" : null;
    case "gidroizolyaciya-vlagozaschita":
      return null;
    default:
      return null;
  }
}

export function buildCuringTimerHrefFromCalculator(
  calculatorSlug: string,
  values: Readonly<Record<string, number>>,
): string | null {
  const presetId = getCuringPresetForCalculator(calculatorSlug, values);
  if (!presetId) return null;

  const params = new URLSearchParams({ preset: presetId, from: calculatorSlug });
  return `/instrumenty/${CURING_TIMER_TOOL_SLUG}/?${params.toString()}`;
}

export function getCalculatorLinkForCuringPreset(
  presetId: string,
): CuringTimerCalculatorLink | null {
  return CURING_TIMER_CALCULATOR_LINKS.find((link) => link.presetId === presetId) ?? null;
}

export function buildCalculatorHrefForCuringPreset(presetId: string): string | null {
  const link = getCalculatorLinkForCuringPreset(presetId);
  return link
    ? getCanonicalCalculatorPath({
        categorySlug: link.calculatorCategorySlug,
        slug: link.calculatorSlug,
      })
    : null;
}

export interface CuringTimerTransfer {
  presetId: string;
  sourceCalculatorSlug: string;
}

export function readCuringTimerTransfer(
  searchParams: Pick<URLSearchParams, "get">,
): CuringTimerTransfer | null {
  const presetId = searchParams.get("preset");
  const sourceCalculatorSlug = searchParams.get("from");
  if (!presetId || !sourceCalculatorSlug) return null;

  const allowedPresets = CALCULATOR_ALLOWED_PRESETS[sourceCalculatorSlug];
  if (!allowedPresets?.includes(presetId)) return null;

  return { presetId, sourceCalculatorSlug };
}
