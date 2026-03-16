/**
 * Client-side registry of calculator functions.
 * Uses static imports from index.ts — reliable in all Next.js environments.
 */
import type { CalculateFn } from "./types";
import { ALL_CALCULATORS } from "./index";
import { withScenarioContract } from "./scenario-adapter";

/** Кеш обёрнутых функций расчёта */
const cache = new Map<string, CalculateFn>();

/**
 * Получить функцию расчёта по slug.
 * Использует статические импорты, поэтому всегда доступна без async.
 */
export async function getCalculateFn(slug: string): Promise<CalculateFn | undefined> {
  if (cache.has(slug)) return cache.get(slug);

  const calc = ALL_CALCULATORS.find((c) => c.slug === slug);
  if (!calc) return undefined;

  const wrapped = withScenarioContract(slug, calc.calculate);
  cache.set(slug, wrapped);
  return wrapped;
}

/** Синхронная версия — сначала пробует кеш, потом ищет напрямую */
export function getCalculateFnSync(slug: string): CalculateFn | undefined {
  if (cache.has(slug)) return cache.get(slug);

  const calc = ALL_CALCULATORS.find((c) => c.slug === slug);
  if (!calc) return undefined;

  const wrapped = withScenarioContract(slug, calc.calculate);
  cache.set(slug, wrapped);
  return wrapped;
}
