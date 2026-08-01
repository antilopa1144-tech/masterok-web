import type { CalcRef } from "@/lib/tools/config";
import {
  consumptionNormRow,
  type ConsumptionNormId,
} from "@/lib/tools/consumption-norms";

export interface NormRow {
  normId?: ConsumptionNormId;
  material: string;
  consumption: string;
  unit: string;
  conditions: string;
  source: string;
  sourceUrl: string;
  verifiedAt: "2026-08-01";
}

export interface NormCategory {
  id: string;
  title: string;
  icon: string;
  calculator?: CalcRef;
  rows: NormRow[];
}

const KNAUF_C611_URL =
  "https://www.knauf.ru/systems/oblitsovki/oblitsovki-gipsokarton/s-611-a/";

function knaufC611Row(
  material: string,
  consumption: string,
  unit: string,
  conditions: string,
): NormRow {
  return {
    material,
    consumption,
    unit,
    conditions,
    source: "Комплектная система КНАУФ C 611",
    sourceUrl: KNAUF_C611_URL,
    verifiedAt: "2026-08-01",
  };
}

export const CONSUMPTION_NORMS: NormCategory[] = [
  {
    id: "gruntovka",
    title: "Грунтовка",
    icon: "💧",
    calculator: { slug: "gruntovka", categorySlug: "otdelka" },
    rows: [
      consumptionNormRow("primer-deep"),
      consumptionNormRow("primer-contact"),
    ],
  },
  {
    id: "shtukaturka",
    title: "Штукатурка",
    icon: "🧱",
    calculator: { slug: "shtukaturka", categorySlug: "steny" },
    rows: [
      consumptionNormRow("plaster-gypsum"),
      consumptionNormRow("plaster-cement"),
      consumptionNormRow("decor-plaster"),
    ],
  },
  {
    id: "shpaklevka",
    title: "Шпаклёвка",
    icon: "🪣",
    calculator: { slug: "shpaklevka", categorySlug: "otdelka" },
    rows: [
      consumptionNormRow("putty-start"),
      consumptionNormRow("putty-finish"),
    ],
  },
  {
    id: "kraska",
    title: "Краска",
    icon: "🎨",
    calculator: { slug: "kraska", categorySlug: "otdelka" },
    rows: [
      consumptionNormRow("paint-acrylic"),
      consumptionNormRow("paint-latex"),
      consumptionNormRow("paint-facade"),
    ],
  },
  {
    id: "plitochnyy-kley",
    title: "Плиточный клей",
    icon: "⬜",
    calculator: { slug: "klej-dlya-plitki", categorySlug: "poly" },
    rows: [
      consumptionNormRow("tile-adhesive-cm11"),
      consumptionNormRow("tile-adhesive-cm14"),
    ],
  },
  {
    id: "zatirka",
    title: "Затирка",
    icon: "🔲",
    calculator: { slug: "zatirka", categorySlug: "poly" },
    rows: [consumptionNormRow("grout")],
  },
  {
    id: "nalivnoy-pol",
    title: "Наливной пол",
    icon: "🏗️",
    calculator: { slug: "styazhka", categorySlug: "poly" },
    rows: [consumptionNormRow("self-leveling")],
  },
  {
    id: "gidroizolyatsiya",
    title: "Гидроизоляция",
    icon: "🛡️",
    calculator: { slug: "gidroizolyaciya-vlagozaschita", categorySlug: "otdelka" },
    rows: [consumptionNormRow("waterproof")],
  },
  {
    id: "kladochnyy-kley",
    title: "Клей для газобетона",
    icon: "🧱",
    calculator: { slug: "kirpich", categorySlug: "steny" },
    rows: [consumptionNormRow("gasblock-glue")],
  },
  {
    id: "montazh-gkl",
    title: "Облицовка ГКЛ КНАУФ C 611",
    icon: "📐",
    calculator: { slug: "gipsokarton", categorySlug: "steny" },
    rows: [
      knaufC611Row(
        "КНАУФ-лист",
        "1.0",
        "м²/м² облицовки",
        "Однослойная бескаркасная облицовка C 611",
      ),
      knaufC611Row(
        "Армирующая лента",
        "0.75",
        "пог. м/м² облицовки",
        "Однослойная бескаркасная облицовка C 611",
      ),
      knaufC611Row(
        "КНАУФ-Фуген для заделки швов",
        "0.3",
        "кг/м² облицовки",
        "Однослойная бескаркасная облицовка C 611",
      ),
    ],
  },
];
