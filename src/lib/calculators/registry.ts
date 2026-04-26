/**
 * Client-side registry of calculator functions.
 * Uses dynamic imports for code splitting — each formula loaded on demand.
 */
import type { CalculateFn } from "./types";
import { withScenarioContract } from "./scenario-adapter";

/** Маппинг slug → имя файла формулы (без расширения) */
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
  "dekorativnyj-kamen": "decor-stone",
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
  "drenazh-uchastka": "drainage",
};

/** Кеш загруженных функций */
const cache = new Map<string, CalculateFn>();

/**
 * Маппинг для dynamic import — Next.js/webpack requires known paths.
 * Each entry is a lazy factory function.
 */
const IMPORT_MAP: Record<string, () => Promise<Record<string, unknown>>> = {
  concrete: () => import("./formulas/concrete"),
  brick: () => import("./formulas/brick"),
  roofing: () => import("./formulas/roofing"),
  tile: () => import("./formulas/tile"),
  laminate: () => import("./formulas/laminate"),
  wallpaper: () => import("./formulas/wallpaper"),
  screed: () => import("./formulas/screed"),
  paint: () => import("./formulas/paint"),
  insulation: () => import("./formulas/insulation"),
  drywall: () => import("./formulas/drywall"),
  "strip-foundation": () => import("./formulas/strip-foundation"),
  "warm-floor": () => import("./formulas/warm-floor"),
  plaster: () => import("./formulas/plaster"),
  primer: () => import("./formulas/primer"),
  putty: () => import("./formulas/putty"),
  linoleum: () => import("./formulas/linoleum"),
  "aerated-concrete": () => import("./formulas/aerated-concrete"),
  gutters: () => import("./formulas/gutters"),
  "tile-grout": () => import("./formulas/tile-grout"),
  "tile-adhesive": () => import("./formulas/tile-adhesive"),
  parquet: () => import("./formulas/parquet"),
  "self-leveling": () => import("./formulas/self-leveling"),
  siding: () => import("./formulas/siding"),
  electric: () => import("./formulas/electric"),
  fence: () => import("./formulas/fence"),
  "decor-plaster": () => import("./formulas/decor-plaster"),
  "decor-stone": () => import("./formulas/decor-stone"),
  "ceiling-stretch": () => import("./formulas/ceiling-stretch"),
  "ceiling-rail": () => import("./formulas/ceiling-rail"),
  "ceiling-cassette": () => import("./formulas/ceiling-cassette"),
  "ceiling-insulation": () => import("./formulas/ceiling-insulation"),
  "gypsum-board": () => import("./formulas/gypsum-board"),
  "wall-panels": () => import("./formulas/wall-panels"),
  partitions: () => import("./formulas/partitions"),
  "foundation-slab": () => import("./formulas/foundation-slab"),
  "blind-area": () => import("./formulas/blind-area"),
  basement: () => import("./formulas/basement"),
  terrace: () => import("./formulas/terrace"),
  "facade-insulation": () => import("./formulas/facade-insulation"),
  "facade-brick": () => import("./formulas/facade-brick"),
  "facade-panels": () => import("./formulas/facade-panels"),
  stairs: () => import("./formulas/stairs"),
  heating: () => import("./formulas/heating"),
  ventilation: () => import("./formulas/ventilation"),
  waterproofing: () => import("./formulas/waterproofing"),
  doors: () => import("./formulas/doors"),
  windows: () => import("./formulas/windows"),
  slopes: () => import("./formulas/slopes"),
  "sound-insulation": () => import("./formulas/sound-insulation"),
  balcony: () => import("./formulas/balcony"),
  attic: () => import("./formulas/attic"),
  fasteners: () => import("./formulas/fasteners"),
  "foam-blocks": () => import("./formulas/foam-blocks"),
  brickwork: () => import("./formulas/brickwork"),
  rebar: () => import("./formulas/rebar"),
  bathroom: () => import("./formulas/bathroom"),
  "drywall-ceiling": () => import("./formulas/drywall-ceiling"),
  "warm-floor-pipes": () => import("./formulas/warm-floor-pipes"),
  sewage: () => import("./formulas/sewage"),
  "frame-house": () => import("./formulas/frame-house"),
  "soft-roofing": () => import("./formulas/soft-roofing"),
  drainage: () => import("./formulas/drainage"),
};

/**
 * Получить функцию расчёта по slug.
 * При первом вызове загружает модуль динамически (code splitting),
 * при повторных — отдаёт из кеша.
 */
export async function getCalculateFn(slug: string): Promise<CalculateFn | undefined> {
  if (cache.has(slug)) return cache.get(slug);

  const file = FORMULA_MAP[slug];
  if (!file) return undefined;

  const importFn = IMPORT_MAP[file];
  if (!importFn) return undefined;

  try {
    const mod = await importFn();
    const def = Object.values(mod).find(
      (v): v is { calculate: CalculateFn } =>
        typeof v === "object" && v !== null && "calculate" in v && typeof (v as Record<string, unknown>).calculate === "function"
    );
    if (!def) return undefined;
    const wrappedCalculate = withScenarioContract(slug, def.calculate);
    cache.set(slug, wrappedCalculate);
    return wrappedCalculate;
  } catch {
    return undefined;
  }
}

/** Синхронная версия — только из кеша */
export function getCalculateFnSync(slug: string): CalculateFn | undefined {
  return cache.get(slug);
}
