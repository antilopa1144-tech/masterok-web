/**
 * Russian pluralization by number.
 * pluralizeRu(1, ['мешок','мешка','мешков']) → 'мешок'
 * pluralizeRu(2, ['мешок','мешка','мешков']) → 'мешка'
 * pluralizeRu(5, ['мешок','мешка','мешков']) → 'мешков'
 */
export function pluralizeRu(n: number, forms: [string, string, string]): string {
  const abs = Math.abs(Math.round(n)) % 100;
  const lastDigit = abs % 10;
  if (abs >= 11 && abs <= 19) return forms[2];
  if (lastDigit === 1) return forms[0];
  if (lastDigit >= 2 && lastDigit <= 4) return forms[1];
  return forms[2];
}

/** Lookup table: genitive plural → [nominative, genitive singular, genitive plural] */
export const PACKAGE_UNIT_FORMS: Record<string, [string, string, string]> = {
  "мешков":   ["мешок", "мешка", "мешков"],
  "вёдер":    ["ведро", "ведра", "вёдер"],
  "канистр":  ["канистра", "канистры", "канистр"],
  "рулонов":  ["рулон", "рулона", "рулонов"],
  "упаковок": ["упаковка", "упаковки", "упаковок"],
  "банок":    ["банка", "банки", "банок"],
  "бухт":     ["бухта", "бухты", "бухт"],
  "доставок": ["доставка", "доставки", "доставок"],
  "прутков":  ["пруток", "прутка", "прутков"],
  "досок":    ["доска", "доски", "досок"],
  "щитков":   ["щиток", "щитка", "щитков"],
  "листов":   ["лист", "листа", "листов"],
  "баллонов": ["баллон", "баллона", "баллонов"],
  "модулей":  ["модуль", "модуля", "модулей"],
};

/** Pluralize a packageUnit string by count */
export function pluralizePackageUnit(count: number, rawUnit: string): string {
  const forms = PACKAGE_UNIT_FORMS[rawUnit];
  return forms ? pluralizeRu(count, forms) : rawUnit;
}

/** Map internal/english unit keys to Russian display labels */
const UNIT_DISPLAY: Record<string, string> = {
  kg: "кг",
  g: "г",
  m2: "м²",
  m: "м",
  mm: "мм",
  l: "л",
  unit: "шт.",
  pcs: "шт.",
};

/** Convert engine unit to Russian display string */
export function displayUnit(rawUnit: string): string {
  return UNIT_DISPLAY[rawUnit] ?? rawUnit;
}
