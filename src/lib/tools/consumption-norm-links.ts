export const CONSUMPTION_NORMS_TOOL_SLUG = "normy-raskhoda";

const CALCULATOR_NORM_CATEGORY = {
  gruntovka: "gruntovka",
  shtukaturka: "shtukaturka",
  shpaklevka: "shpaklevka",
  kraska: "kraska",
  "klej-dlya-plitki": "plitochnyy-kley",
  zatirka: "zatirka",
  "nalivnoy-pol": "nalivnoy-pol",
  "gidroizolyaciya-vlagozaschita": "gidroizolyatsiya",
  gazobeton: "kladochnyy-kley",
  gipsokarton: "montazh-gkl",
} as const satisfies Record<string, string>;

export function getConsumptionNormCategory(calculatorSlug: string): string | null {
  return CALCULATOR_NORM_CATEGORY[
    calculatorSlug as keyof typeof CALCULATOR_NORM_CATEGORY
  ] ?? null;
}

export function buildConsumptionNormHref(calculatorSlug: string): string | null {
  const categoryId = getConsumptionNormCategory(calculatorSlug);
  return categoryId
    ? `/instrumenty/${CONSUMPTION_NORMS_TOOL_SLUG}/#norm-${categoryId}`
    : null;
}
