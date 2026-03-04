/**
 * Client-side registry of calculator functions.
 * Uses dynamic imports for code splitting — each formula is loaded only when needed.
 */
import type { CalculateFn } from "./types";

/** Маппинг slug → имя файла формулы */
const FORMULA_MAP: Record<string, string> = {
  beton: "concrete",
  kirpich: "brick",
  krovlya: "roofing",
  plitka: "tile",
  laminat: "laminate",
  oboi: "wallpaper",
  styazhka: "screed",
  kraska: "paint",
  uteplenie: "insulation",
  gipsokarton: "drywall",
  "lentochnyy-fundament": "strip-foundation",
  "teplyy-pol": "warm-floor",
  shtukaturka: "plaster",
  gruntovka: "primer",
  shpaklevka: "putty",
  linoleum: "linoleum",
  gazobeton: "aerated-concrete",
  vodostok: "gutters",
  zatirka: "tile-grout",
  "klej-dlya-plitki": "tile-adhesive",
  parket: "parquet",
  "nalivnoy-pol": "self-leveling",
  sayding: "siding",
  elektrika: "electric",
  zabor: "fence",
  "dekorativnaya-shtukaturka": "decor-plaster",
  "natyazhnoj-potolok": "ceiling-stretch",
  "reechnyj-potolok": "ceiling-rail",
  "kassetnyi-potolok": "ceiling-cassette",
  "uteplenie-potolka": "ceiling-insulation",
  "gipsokarton-potolok": "gypsum-board",
  "paneli-dlya-sten": "wall-panels",
  "peregorodki-iz-blokov": "partitions",
  "plitnyj-fundament": "foundation-slab",
  otmostka: "blind-area",
  "podval-fundamenta": "basement",
  "kalkulyator-terrasnoy-doski": "terrace",
  "uteplenie-fasada-minvatoj": "facade-insulation",
  "oblitsovochnyj-kirpich": "facade-brick",
  "fasadnye-paneli": "facade-panels",
  "kalkulyator-lestnicy": "stairs",
  "otoplenie-radiatory": "heating",
  ventilyaciya: "ventilation",
  "gidroizolyaciya-vlagozaschita": "waterproofing",
  "ustanovka-dverej": "doors",
  "ustanovka-okon": "windows",
  "otkosy-okon-i-dverej": "slopes",
  zvukoizolyaciya: "sound-insulation",
  "otdelka-balkona": "balcony",
  "otdelka-mansardy": "attic",
  // Новые калькуляторы (10 шт)
  krepezh: "fasteners",
  penobloki: "foam-blocks",
  "kladka-kirpicha": "brickwork",
  armatura: "rebar",
  "vannaya-komnata": "bathroom",
  "podvesnoy-potolok-gkl": "drywall-ceiling",
  "vodyanoy-teplyy-pol": "warm-floor-pipes",
  septik: "sewage",
  "karkasnyj-dom": "frame-house",
  "myagkaya-krovlya": "soft-roofing",
};

/** Кеш загруженных функций */
const cache = new Map<string, CalculateFn>();

/**
 * Получить функцию расчёта по slug.
 * При первом вызове загружает модуль динамически (code splitting),
 * при повторных — отдаёт из кеша.
 */
export async function getCalculateFn(slug: string): Promise<CalculateFn | undefined> {
  if (cache.has(slug)) return cache.get(slug);

  const file = FORMULA_MAP[slug];
  if (!file) return undefined;

  try {
    const mod = await import(`./formulas/${file}.ts`);
    // Каждый модуль экспортирует xyzDef с полем calculate
    const def = Object.values(mod)[0] as { calculate: CalculateFn };
    cache.set(slug, def.calculate);
    return def.calculate;
  } catch {
    return undefined;
  }
}

/** Синхронная версия — только из кеша (для обратной совместимости) */
export function getCalculateFnSync(slug: string): CalculateFn | undefined {
  return cache.get(slug);
}
