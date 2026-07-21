import type { CalculatorResult } from "@/lib/calculators/types";
import { formatNumber } from "../useCalculator";
import {
  HIDDEN_TOTALS,
  TOTAL_LABELS,
  TOTAL_UNITS,
  INTEGER_TOTAL_KEYS,
  WEIGHT_KG_TOTAL_KEYS,
  TOTAL_LABEL_FORMS,
} from "../totalsDisplay";
import { CALCULATOR_UI_TEXT } from "../uiText";
import { pluralizeRu, pluralizePackageUnit, PACKAGE_UNIT_FORMS } from "@/lib/format/pluralize";
import { formatWeightParts } from "@/lib/format/weight";
import type { MaterialPriceMap } from "@/lib/pricing/materialPriceBasis";

// Общие хелперы блоков калькулятора: форматирование количеств и итогов,
// справочники цен на работы. Вынесено из монолитного CalculatorParts.tsx.
// ── Округление материалов по единицам ────────────────────────────────────────

/** Единицы, для которых количество всегда целое число */
const INTEGER_UNITS = new Set(["шт", "мешков", "рулонов", "листов", "упаковок", "канистр", "уп", "упак.", "рулон", "ведро", "баллон", "вёдер", "банок", "туб", "г"]);

/**
 * Дискретные единицы (штучные товары и тары). Для них:
 *  - количество всегда целое — невозможны «0.5 рулона» или «1.4 мешка»;
 *  - не показываем подпись «без запаса / расход» — она бессмысленна
 *    (расход в штуках = округлённая покупка минус целое = 0).
 */
export function isDiscreteUnit(unit: string): boolean {
  return INTEGER_UNITS.has(unit) && unit !== "г";
}

export function formatMaterialQty(value: number, unit: string): string {
  if (value === undefined || value === null || isNaN(value)) return "—";
  // Целые единицы (штуки, мешки, рулоны) — всегда округляем вверх
  if (INTEGER_UNITS.has(unit)) {
    return Math.ceil(value).toLocaleString("ru-RU");
  }
  // Весовые/объёмные — до 1 знака
  if (Number.isInteger(value)) return value.toLocaleString("ru-RU");
  return value.toLocaleString("ru-RU", { maximumFractionDigits: 1 });
}

// ── Русские названия для key_factors ─────────────────────────────────────────

export const KEY_FACTOR_LABELS: Record<string, string> = {
  // Core scenario factors (from engine/factors.ts)
  surface_quality: "Качество основания",
  geometry_complexity: "Сложность геометрии",
  installation_method: "Способ монтажа",
  worker_skill: "Уровень мастера",
  waste_factor: "Отходы",
  logistics_buffer: "Запас на доставку",
  packaging_rounding: "Округление упаковки",
  // Other possible factors
  base_consumption: "Базовый расход",
  area_factor: "Площадь",
  volume_factor: "Объём",
  layer_factor: "Слои",
  thickness_factor: "Толщина",
  coverage_rate: "Норма покрытия",
  material_density: "Плотность материала",
  joint_factor: "Фактор швов",
  overlap_factor: "Нахлёст",
  cutting_factor: "Подрезка",
  reserve_factor: "Запас",
  packaging_factor: "Упаковка",
  round_up: "Округление",
};


// ── Список материалов ────────────────────────────────────────────────────────

/** Pluralize a material unit by quantity */
export function pluralizeUnit(qty: number, unit: string): string {
  const forms = PACKAGE_UNIT_FORMS[unit];
  return forms ? pluralizeRu(Math.ceil(qty), forms) : unit;
}

/** Подбор круглой цветной иконки и тона по названию категории */
export function getCategoryVisual(name: string, fallbackIndex: number): { icon: string; tone: "accent" | "violet" | "emerald" | "amber" | "slate" } {
  const n = name.toLowerCase();
  // Подложка / подкладка — отдельно (до общего "покрытия", т.к. "под" может мэтчить лишнее)
  if (/подложк|подкладк|подбив/.test(n))
    return { icon: "📐", tone: "emerald" };
  // Плинтус / пороги / окантовка
  if (/плинтус|порож|порог|окантов|молдинг/.test(n))
    return { icon: "📏", tone: "amber" };
  // Монтаж / установка / клинья
  if (/монтаж|установк|клинь|распорн/.test(n))
    return { icon: "🔨", tone: "amber" };
  // Покрытия и финиш
  if (/покрыт|напольн|кровл|облиц|плитк|ламин|паркет|линол|обои|штукатур|крас|шпакл/.test(n))
    return { icon: "📦", tone: "violet" };
  // Каркас / профили / стропила
  if (/каркас|профил|стойк|обреш|балк|стропил|лаг|косоур|тетив/.test(n))
    return { icon: "🏗", tone: "violet" };
  // Крепёж
  if (/креп|саморе|шуруп|дюбел|гвозд|анкер|термошайб|болт|шайб|гайк/.test(n))
    return { icon: "🪛", tone: "violet" };
  // Двери / окна / форточки / фурнитура
  if (/двер|форточ|окн|петл|шпингал|фурнитур|ручк|замок/.test(n))
    return { icon: "🚪", tone: "violet" };
  // Уплотнение / герметизация
  if (/уплотн|герметик|пен|скотч|лент(?!а арматур)/.test(n))
    return { icon: "🌀", tone: "violet" };
  // Изоляция и утепление
  if (/изол|утепл|мембран|пароизол|гидроизол|вата|пенопласт|пеноплэкс|эковат/.test(n))
    return { icon: "🛡", tone: "emerald" };
  // Грунтовка / подготовка основания
  if (/подгот|основан|выравн|стяжк|наливн|грунт/.test(n))
    return { icon: "🪣", tone: "emerald" };
  // Фундамент / бетон / арматура
  if (/фундамент|бетон|раствор|цемент|арматур|щеб|песок|брус|свай/.test(n))
    return { icon: "🧱", tone: "amber" };
  // Электрика
  if (/электр|кабел|провод|розетк|выключател|автомат|узо|светильник/.test(n))
    return { icon: "⚡", tone: "amber" };
  // Сантехника и трубы
  if (/труб|кран|сантехн|радиатор|стояк|вентил|канализ/.test(n))
    return { icon: "🔧", tone: "emerald" };
  // Основное (бэйдж по умолчанию для "Основное")
  if (/основн/.test(n))
    return { icon: "📦", tone: "accent" };
  // Fallback: ротация по индексу группы
  const tones = ["violet", "emerald", "amber", "accent"] as const;
  return { icon: "📦", tone: tones[fallbackIndex % tones.length] };
}


// ── Вспомогательная функция: скопировать список материалов ───────────────────

export async function copyMaterialsAsText(materials: CalculatorResult["materials"]): Promise<boolean> {
  const lines = materials.map((m) => {
    const qty = m.purchaseQty ?? m.withReserve ?? m.quantity;
    const useGrams = m.unit === "кг" && qty > 0 && qty < 1;
    const [val, unit] = useGrams ? formatWeightParts(qty) : [formatNumber(qty), m.unit];
    const pkgSuffix = m.packageInfo
      ? ` (${m.packageInfo.count} ${pluralizePackageUnit(m.packageInfo.count, m.packageInfo.packageUnit)} × ${m.packageInfo.size} ${m.unit})`
      : "";
    const detail = m.subtitle ? `\n  ${m.subtitle}` : "";
    return `• ${m.name}: ${val} ${unit}${pkgSuffix}${detail}`;
  });
  const text = `${CALCULATOR_UI_TEXT.copyMaterialsHeading}\n\n${lines.join("\n")}`;
  const { copyText } = await import("@/lib/clipboard");
  return copyText(text);
}


// ── Оценка стоимости ──────────────────────────────────────────────────────

export type MaterialPrices = MaterialPriceMap;

type WorkPriceBenchmark = {
  id: string;
  label: string;
  unit: string;
  min: number;
  avg: number;
  max: number;
  keywords: string[];
  source: string;
};

// Справочные рыночные ориентиры работ, Москва/крупные города, 2026.
// Источники: СметаЧек (smetacheck.ru), Ремо-нт (remo-nt.ru), Лето Ремонт (letoremont.ru).
// Не включаем их в итог автоматически: регион, объём, демонтаж и сложность могут менять цену в разы.
const WORK_PRICE_BENCHMARKS: WorkPriceBenchmark[] = [
  { id: "brickwork-m2", label: "Кладка кирпича / перегородки", unit: "м²", min: 800, avg: 2600, max: 3500, keywords: ["кирпич", "кладк", "кладочн"], source: "Profi.ru / Workerprice" },
  { id: "brickwork-m3", label: "Кладка стен из кирпича", unit: "м³", min: 5900, avg: 6500, max: 7000, keywords: ["кирпич", "кладк", "кладочн"], source: "Workerprice" },
  { id: "brickwork-facing", label: "Облицовочная кладка кирпича", unit: "м²", min: 2500, avg: 3000, max: 3800, keywords: ["облицов", "кирпич"], source: "Workerprice" },
  { id: "tile-floor", label: "Укладка плитки на пол", unit: "м²", min: 1250, avg: 2125, max: 3750, keywords: ["плитк", "кафель", "керамогранит", "затирк"], source: "СметаЧек" },
  { id: "tile-wall", label: "Укладка плитки на стены", unit: "м²", min: 1600, avg: 2720, max: 4800, keywords: ["плитк", "кафель", "керамогранит", "мозаик"], source: "СметаЧек" },
  { id: "tile-grout", label: "Затирка швов плитки", unit: "м²", min: 200, avg: 340, max: 600, keywords: ["затирк"], source: "СметаЧек" },
  { id: "plaster", label: "Штукатурка стен по маякам", unit: "м²", min: 500, avg: 850, max: 1500, keywords: ["штукатур", "маяк", "ротбанд"], source: "СметаЧек" },
  { id: "decor-plaster", label: "Декоративная штукатурка", unit: "м²", min: 800, avg: 1360, max: 2400, keywords: ["декоратив", "штукатур"], source: "СметаЧек" },
  { id: "paint", label: "Покраска стен", unit: "м²", min: 250, avg: 425, max: 750, keywords: ["краск", "покраск", "окраск"], source: "СметаЧек" },
  { id: "wallpaper", label: "Поклейка обоев", unit: "м²", min: 290, avg: 300, max: 750, keywords: ["обо", "клей для обоев"], source: "Ремо-нт / Лето Ремонт" },
  { id: "laminate", label: "Укладка ламината", unit: "м²", min: 400, avg: 680, max: 1200, keywords: ["ламинат", "подложк", "плинтус"], source: "СметаЧек" },
  { id: "linoleum", label: "Укладка линолеума", unit: "м²", min: 330, avg: 561, max: 990, keywords: ["линолеум"], source: "СметаЧек" },
  { id: "parquet", label: "Укладка паркетной доски", unit: "м²", min: 750, avg: 1275, max: 2250, keywords: ["паркет"], source: "СметаЧек" },
  { id: "screed", label: "Стяжка пола", unit: "м²", min: 600, avg: 1020, max: 1800, keywords: ["стяжк", "цпс", "смесь", "наливн"], source: "СметаЧек" },
  { id: "self-leveling", label: "Устройство наливного пола", unit: "м²", min: 500, avg: 850, max: 1500, keywords: ["наливн"], source: "СметаЧек" },
  { id: "drywall", label: "Монтаж гипсокартона", unit: "м²", min: 590, avg: 850, max: 1350, keywords: ["гипсокартон", "гкл", "профил", "серпянк"], source: "Ремо-нт / СметаЧек" },
  { id: "waterproofing", label: "Гидроизоляционные работы", unit: "м²", min: 350, avg: 595, max: 1050, keywords: ["гидроизоляц", "мастик"], source: "СметаЧек" },
  { id: "insulation", label: "Утепление стен минватой", unit: "м²", min: 600, avg: 1020, max: 1800, keywords: ["утепл", "минват", "пенопл", "пароизоляц"], source: "СметаЧек" },
  { id: "siding", label: "Монтаж сайдинга", unit: "м²", min: 570, avg: 969, max: 1710, keywords: ["сайдинг", "фасад"], source: "СметаЧек" },
  { id: "wall-panels", label: "Монтаж стеновых панелей", unit: "м²", min: 400, avg: 680, max: 1200, keywords: ["панел"], source: "СметаЧек" },
  { id: "stretch-ceiling", label: "Монтаж натяжного потолка", unit: "м²", min: 490, avg: 870, max: 1360, keywords: ["натяжн"], source: "Ремо-нт / Лето Ремонт" },
  { id: "suspended-ceiling", label: "Монтаж подвесного потолка", unit: "м²", min: 450, avg: 765, max: 1350, keywords: ["подвесн", "реечн", "кассет"], source: "СметаЧек" },
  { id: "paving", label: "Укладка тротуарной плитки", unit: "м²", min: 1650, avg: 2805, max: 4950, keywords: ["тротуар", "брусчат"], source: "СметаЧек" },
  { id: "electric-cable", label: "Прокладка кабеля", unit: "п.м.", min: 100, avg: 170, max: 300, keywords: ["кабель", "электр"], source: "СметаЧек" },
  { id: "electric-floor", label: "Монтаж электрического тёплого пола", unit: "м²", min: 600, avg: 1020, max: 1800, keywords: ["тёплый пол"], source: "СметаЧек" },
  { id: "water-floor", label: "Монтаж водяного тёплого пола", unit: "м²", min: 900, avg: 1530, max: 2700, keywords: ["водяной тёплый пол"], source: "СметаЧек" },
];

const WORK_PRICE_HINTS_BY_CALCULATOR: Record<string, string[]> = {
  kirpich: ["brickwork-m2", "brickwork-m3"],
  "kladka-kirpicha": ["brickwork-m2", "brickwork-m3"],
  "oblitsovochnyj-kirpich": ["brickwork-facing", "brickwork-m2"],
  plitka: ["tile-floor", "tile-wall", "tile-grout"],
  zatirka: ["tile-grout"],
  "klej-dlya-plitki": ["tile-floor", "tile-wall"],
  laminat: ["laminate"],
  parket: ["parquet"],
  linoleum: ["linoleum"],
  styazhka: ["screed"],
  "nalivnoy-pol": ["self-leveling", "screed"],
  "teplyy-pol": ["electric-floor"],
  "vodyanoy-teplyy-pol": ["water-floor", "screed"],
  gipsokarton: ["drywall"],
  "gipsokarton-potolok": ["drywall"],
  "podvesnoy-potolok-gkl": ["drywall", "suspended-ceiling"],
  shtukaturka: ["plaster"],
  "dekorativnaya-shtukaturka": ["decor-plaster", "plaster"],
  kraska: ["paint"],
  oboi: ["wallpaper"],
  shpaklevka: ["plaster"],
  "gidroizolyaciya-vlagozaschita": ["waterproofing"],
  "vannaya-komnata": ["tile-floor", "tile-wall", "tile-grout", "waterproofing"],
  uteplenie: ["insulation"],
  "uteplenie-fasada-minvatoj": ["insulation", "plaster"],
  sayding: ["siding", "insulation"],
  "paneli-dlya-sten": ["wall-panels"],
  "otdelka-balkona": ["wall-panels", "insulation"],
  "otdelka-mansardy": ["insulation", "drywall"],
  "natyazhnoj-potolok": ["stretch-ceiling"],
  "reechnyj-potolok": ["suspended-ceiling"],
  "kassetnyi-potolok": ["suspended-ceiling"],
  "uteplenie-potolka": ["insulation"],
  "trotuarnaya-plitka": ["paving"],
  elektrika: ["electric-cable"],
};

export const qtyForMaterial = (m: CalculatorResult["materials"][number]) =>
  m.purchaseQty ?? m.withReserve ?? m.quantity;

export function getVisibleTotals(totals: CalculatorResult["totals"]) {
  return Object.entries(totals).filter(([key, value]) =>
    key in TOTAL_LABELS
    && !HIDDEN_TOTALS.has(key)
    && Number.isFinite(value)
    && value !== 0
  );
}

export function formatTotalMetric(key: string, value: number) {
  const isInteger = INTEGER_TOTAL_KEYS.has(key);
  const isWeightKg = WEIGHT_KG_TOTAL_KEYS.has(key);
  const displayValue = isInteger ? Math.ceil(value) : value;
  const labelForms = TOTAL_LABEL_FORMS[key];
  const label = labelForms ? pluralizeRu(displayValue, labelForms) : (TOTAL_LABELS[key] ?? key);
  let unit = TOTAL_UNITS[key] ?? "";
  let formattedValue: string;

  if (isWeightKg && value > 0 && value < 1) {
    const [wVal, wUnit] = formatWeightParts(value);
    formattedValue = wVal;
    unit = wUnit;
  } else {
    formattedValue = formatNumber(displayValue);
  }

  return { label, value: formattedValue, unit };
}

const FEATURED_TOTAL_PRIORITY = [
  "area", "totalArea", "realArea", "netArea", "wallArea", "floorArea", "roofArea", "facadeArea",
  "volume", "totalVolume", "totalVolumeM3", "length", "totalLinearM", "perimeter", "totalPerimeter",
];

export function pickFeaturedTotal(totals: CalculatorResult["totals"]) {
  const visible = getVisibleTotals(totals);
  if (visible.length === 0) return null;

  for (const key of FEATURED_TOTAL_PRIORITY) {
    const found = visible.find(([totalKey]) => totalKey === key);
    if (found) return { key: found[0], rawValue: found[1], ...formatTotalMetric(found[0], found[1]) };
  }

  const [key, value] = visible[0];
  return { key, rawValue: value, ...formatTotalMetric(key, value) };
}

const SECONDARY_TOTAL_PRIORITY = [
  // Вес — самое полезное на стройке после площади/объёма
  "totalKg", "cementKg", "cpsTotalKg", "rebarWeightKg", "rebarTons", "ecoWoolKg",
  // Жидкости и расход
  "litersWithReserve", "litersNeeded", "totalL", "kgPerSqm", "lPerSqm",
  // Длины — если ключевой параметр был площадью
  "perimeter", "totalPerimeter", "totalLinearM", "ridgeLength", "totalPipe",
  // Объёмы — если ключевой параметр был площадью
  "totalVolume", "volume", "concreteM3", "mortarVolume",
  // Площади — если ключевой параметр был объёмом/длиной
  "totalArea", "area", "realArea", "wallArea", "floorArea", "roofArea",
  // Счётные итоги
  "totalSheets", "sheetsNeeded", "tilesNeeded", "blocksNeeded", "bricksNeeded",
  "packs", "rolls", "stepCount",
];

export function pickSecondaryTotal(totals: CalculatorResult["totals"], excludeKey?: string) {
  const excludeUnit = excludeKey ? (TOTAL_UNITS[excludeKey] ?? "") : "";
  // Filter out: the primary key itself, AND any total with the same unit
  // (avoids "Площадь 50 м² + Площадь плиты 0.72 м²").
  const visible = getVisibleTotals(totals).filter(([k]) => {
    if (k === excludeKey) return false;
    if (excludeUnit && (TOTAL_UNITS[k] ?? "") === excludeUnit) return false;
    return true;
  });
  if (visible.length === 0) return null;

  for (const key of SECONDARY_TOTAL_PRIORITY) {
    const found = visible.find(([totalKey]) => totalKey === key);
    if (found) return { key: found[0], rawValue: found[1], ...formatTotalMetric(found[0], found[1]) };
  }

  const [key, value] = visible[0];
  return { key, rawValue: value, ...formatTotalMetric(key, value) };
}

export function formatCurrency(value: number) {
  return value.toLocaleString("ru-RU", { maximumFractionDigits: 0 });
}

export function parsePriceInput(value: string) {
  const normalized = value.replace(/\s/g, "").replace(",", ".");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

export function pickWorkPriceBenchmarks(materials: CalculatorResult["materials"], calculatorSlug?: string) {
  if (calculatorSlug) {
    const allowedIds = WORK_PRICE_HINTS_BY_CALCULATOR[calculatorSlug];
    if (allowedIds) {
      return allowedIds
        .map((id) => WORK_PRICE_BENCHMARKS.find((item) => item.id === id))
        .filter((item): item is WorkPriceBenchmark => Boolean(item))
        .slice(0, 4);
    }
    return [];
  }

  const text = materials
    .map((m) => `${m.category ?? ""} ${m.name}`)
    .join(" ")
    .toLowerCase();

  const picked = WORK_PRICE_BENCHMARKS.filter((item) =>
    item.keywords.some((keyword) => text.includes(keyword))
  );

  return picked.slice(0, 4);
}

export function isResultEmpty(result: CalculatorResult): boolean {
  return result.materials.length === 0 ||
    result.materials.every((m) => !m.quantity || isNaN(m.quantity) || m.quantity === 0);
}
