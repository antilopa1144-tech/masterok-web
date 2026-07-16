import type { CalculatorMeta } from "@/lib/calculators/types";

type SearchableCalculator = Pick<
  CalculatorMeta,
  "slug" | "title" | "description" | "tags"
>;

/**
 * Фразы, которыми люди описывают задачу, не зная названия калькулятора.
 * Словарь живёт отдельно от SEO-тегов: он влияет только на внутренний поиск.
 */
export const CALCULATOR_SEARCH_ALIASES: Record<string, readonly string[]> = {
  styazhka: [
    "залить пол",
    "сделать стяжку",
    "выровнять пол цементом",
    "сколько мешков на пол",
    "сколько мешков пескобетона",
  ],
  "nalivnoy-pol": [
    "залить наливной пол",
    "выровнять пол смесью",
    "сколько мешков смеси",
  ],
  shtukaturka: [
    "оштукатурить стены",
    "сколько мешков штукатурки",
    "сколько мешков на стены",
  ],
  gazobeton: [
    "посчитать блоки",
    "сколько блоков на дом",
    "сколько газоблоков на стену",
  ],
  penobloki: [
    "посчитать блоки",
    "сколько пеноблоков на стену",
    "блоки для дома",
  ],
  "peregorodki-iz-blokov": [
    "посчитать блоки на перегородку",
    "перегородка из блоков",
  ],
  "otdelka-balkona": [
    "утеплить лоджию",
    "обшить лоджию",
    "утеплить балкон",
    "обшить балкон",
  ],
  "paneli-dlya-sten": [
    "обшить стены",
    "обшить баню",
    "отделать стены панелями",
    "вагонка на стены",
  ],
  gipsokarton: [
    "обшить стены",
    "обшить стены гипсокартоном",
    "сделать стену из гипсокартона",
  ],
};

export function normalizeSearchText(value: string): string {
  return value
    .toLocaleLowerCase("ru-RU")
    .replaceAll("ё", "е")
    .replace(/[^a-zа-я0-9]+/gi, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function scoreCalculator(query: string, calculator: SearchableCalculator): number {
  const normalizedQuery = normalizeSearchText(query);
  if (!normalizedQuery) return 0;

  const aliases = CALCULATOR_SEARCH_ALIASES[calculator.slug] ?? [];
  const primaryText = normalizeSearchText([
    calculator.title,
    calculator.description,
    ...calculator.tags,
  ].join(" "));
  const aliasText = normalizeSearchText(aliases.join(" "));
  const allText = `${primaryText} ${aliasText}`;

  let score = 0;
  if (primaryText.includes(normalizedQuery)) score += 100;
  if (aliases.some((alias) => normalizeSearchText(alias).includes(normalizedQuery))) score += 120;

  const tokens = normalizedQuery.split(" ").filter((token) => token.length > 2);
  const matchedTokens = tokens.filter((token) => allText.includes(token)).length;
  if (tokens.length > 0 && matchedTokens === tokens.length) score += 40;
  score += matchedTokens * 5;

  return score;
}

export function rankCalculatorSearch<T extends SearchableCalculator>(
  query: string,
  calculators: readonly T[],
): T[] {
  return calculators
    .map((calculator, index) => ({
      calculator,
      index,
      score: scoreCalculator(query, calculator),
    }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .map((item) => item.calculator);
}

export function matchesSearchText(query: string, values: readonly string[]): boolean {
  const normalizedQuery = normalizeSearchText(query);
  if (!normalizedQuery) return false;
  return normalizeSearchText(values.join(" ")).includes(normalizedQuery);
}
