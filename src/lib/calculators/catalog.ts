import type { CalculatorMeta, CategoryId } from "./types";
import { rankCalculatorSearch } from "@/lib/site-search";

export const CATALOG_TOP_LIMIT = 8;

export function getCatalogTopIds(
  calculators: readonly CalculatorMeta[],
  limit = CATALOG_TOP_LIMIT,
): string[] {
  return [...calculators]
    .sort((a, b) => b.popularity - a.popularity || a.title.localeCompare(b.title, "ru"))
    .slice(0, Math.max(0, limit))
    .map((calculator) => calculator.id);
}

export function filterCatalogCalculators(
  calculators: readonly CalculatorMeta[],
  query: string,
  category: CategoryId | "all",
): CalculatorMeta[] {
  const categoryFiltered = category === "all"
    ? [...calculators]
    : calculators.filter((calculator) => calculator.category === category);
  const trimmedQuery = query.trim();
  return trimmedQuery ? rankCalculatorSearch(trimmedQuery, categoryFiltered, 40) : categoryFiltered;
}
