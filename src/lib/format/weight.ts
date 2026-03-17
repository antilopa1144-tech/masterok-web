/**
 * Format weight in human-friendly Russian:
 * - < 0.01 кг → "< 10 г"
 * - < 1 кг → grams (e.g., "150 г")
 * - >= 1 кг → kg (e.g., "2,5 кг")
 */
export function formatWeightRu(kg: number): string {
  if (!Number.isFinite(kg) || kg <= 0) return "0 г";
  if (kg < 0.01) return "< 10 г";
  if (kg < 1) return `${Math.round(kg * 1000)} г`;
  if (Number.isInteger(kg)) return `${kg} кг`;
  return `${kg.toLocaleString("ru-RU", { maximumFractionDigits: 2 })} кг`;
}

/**
 * Format weight value without unit suffix (for use with separate unit display).
 * Returns [formattedValue, unit] tuple.
 */
export function formatWeightParts(kg: number): [string, string] {
  if (!Number.isFinite(kg) || kg <= 0) return ["0", "г"];
  if (kg < 0.01) return ["< 10", "г"];
  if (kg < 1) return [Math.round(kg * 1000).toLocaleString("ru-RU"), "г"];
  if (Number.isInteger(kg)) return [kg.toLocaleString("ru-RU"), "кг"];
  return [kg.toLocaleString("ru-RU", { maximumFractionDigits: 1 }), "кг"];
}
