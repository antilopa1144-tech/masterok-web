export interface RenovationCostItem {
  name: string;
  unit: string;
  consumptionPerM2: number;
}

export type RenovationTypeId = "cosmetic" | "standard" | "capital";

export interface RenovationType {
  id: RenovationTypeId;
  label: string;
  description: string;
  icon: string;
  materials: RenovationCostItem[];
  works: RenovationCostItem[];
  durationDaysPerM2: number;
}

export interface RenovationCostLine extends RenovationCostItem {
  qty: number;
  price: number;
  cost: number;
}

export interface RenovationCostResult {
  materialLines: RenovationCostLine[];
  workLines: RenovationCostLine[];
  materialTotal: number;
  workTotal: number;
  total: number;
  perM2: number;
  durationDays: number;
  hasAnyPrice: boolean;
}

export const RENOVATION_TYPES: RenovationType[] = [
  {
    id: "cosmetic",
    label: "Косметический",
    description: "Обои, покраска потолка, замена плинтусов. Без демонтажа и замены коммуникаций.",
    icon: "🎨",
    durationDaysPerM2: 0.3,
    materials: [
      { name: "Обои виниловые", unit: "рулон", consumptionPerM2: 0.18 },
      { name: "Клей обойный", unit: "уп", consumptionPerM2: 0.02 },
      { name: "Краска потолочная", unit: "л", consumptionPerM2: 0.3 },
      { name: "Грунтовка", unit: "л", consumptionPerM2: 0.2 },
      { name: "Плинтус напольный", unit: "м.п.", consumptionPerM2: 0.5 },
      { name: "Расходники (скотч, валики, кисти)", unit: "компл", consumptionPerM2: 0.015 },
    ],
    works: [
      { name: "Поклейка обоев", unit: "м²", consumptionPerM2: 2.5 },
      { name: "Покраска потолка", unit: "м²", consumptionPerM2: 1 },
      { name: "Монтаж плинтуса", unit: "м.п.", consumptionPerM2: 0.5 },
      { name: "Грунтовка стен", unit: "м²", consumptionPerM2: 2.5 },
    ],
  },
  {
    id: "standard",
    label: "Стандартный",
    description: "Выравнивание стен, стяжка, плитка в ванной, ламинат, электрика. Основной вариант для жилья.",
    icon: "🏠",
    durationDaysPerM2: 0.7,
    materials: [
      { name: "Штукатурка гипсовая", unit: "мешок 30кг", consumptionPerM2: 0.35 },
      { name: "Шпаклёвка финишная", unit: "мешок 25кг", consumptionPerM2: 0.08 },
      { name: "Грунтовка глубокого проникновения", unit: "л", consumptionPerM2: 0.4 },
      { name: "Ламинат", unit: "м²", consumptionPerM2: 0.7 },
      { name: "Подложка", unit: "м²", consumptionPerM2: 0.7 },
      { name: "Обои / краска стен", unit: "м²", consumptionPerM2: 2.5 },
      { name: "Плитка (ванная, кухня)", unit: "м²", consumptionPerM2: 0.3 },
      { name: "Плиточный клей", unit: "мешок 25кг", consumptionPerM2: 0.05 },
      { name: "Стяжка из цементно-песчаной смеси", unit: "мешок 25 кг", consumptionPerM2: 0.4 },
      { name: "Электрика (кабель, автоматы)", unit: "компл", consumptionPerM2: 0.06 },
      { name: "Натяжной потолок", unit: "м²", consumptionPerM2: 1 },
      { name: "Двери межкомнатные", unit: "шт", consumptionPerM2: 0.04 },
      { name: "Расходники", unit: "компл", consumptionPerM2: 0.02 },
    ],
    works: [
      { name: "Штукатурка стен", unit: "м²", consumptionPerM2: 2.5 },
      { name: "Шпаклёвка", unit: "м²", consumptionPerM2: 2.5 },
      { name: "Укладка ламината", unit: "м²", consumptionPerM2: 0.7 },
      { name: "Укладка плитки", unit: "м²", consumptionPerM2: 0.3 },
      { name: "Стяжка пола", unit: "м²", consumptionPerM2: 1 },
      { name: "Электромонтаж", unit: "точка", consumptionPerM2: 0.3 },
      { name: "Натяжной потолок (монтаж)", unit: "м²", consumptionPerM2: 1 },
      { name: "Установка дверей", unit: "шт", consumptionPerM2: 0.04 },
    ],
  },
  {
    id: "capital",
    label: "Капитальный",
    description: "Полный демонтаж, замена всех коммуникаций, перепланировка, тёплые полы, дизайнерская отделка.",
    icon: "🏗️",
    durationDaysPerM2: 1.2,
    materials: [
      { name: "Штукатурка гипсовая", unit: "мешок 30кг", consumptionPerM2: 0.5 },
      { name: "Шпаклёвка финишная", unit: "мешок 25кг", consumptionPerM2: 0.12 },
      { name: "Грунтовка", unit: "л", consumptionPerM2: 0.6 },
      { name: "Керамогранит / плитка", unit: "м²", consumptionPerM2: 0.5 },
      { name: "Плиточный клей", unit: "мешок 25кг", consumptionPerM2: 0.1 },
      { name: "Ламинат / паркетная доска", unit: "м²", consumptionPerM2: 0.5 },
      { name: "Подложка", unit: "м²", consumptionPerM2: 0.5 },
      { name: "Стяжка с тёплым полом", unit: "м²", consumptionPerM2: 1 },
      { name: "Гипсокартон (перегородки)", unit: "лист", consumptionPerM2: 0.15 },
      { name: "Электрика полная замена", unit: "компл", consumptionPerM2: 0.08 },
      { name: "Сантехника (трубы, фитинги)", unit: "компл", consumptionPerM2: 0.05 },
      { name: "Натяжной потолок", unit: "м²", consumptionPerM2: 1 },
      { name: "Двери", unit: "шт", consumptionPerM2: 0.04 },
      { name: "Краска / декоративная штукатурка", unit: "м²", consumptionPerM2: 2.5 },
      { name: "Демонтажные работы (вывоз)", unit: "м²", consumptionPerM2: 1 },
      { name: "Расходники", unit: "компл", consumptionPerM2: 0.025 },
    ],
    works: [
      { name: "Демонтаж старой отделки", unit: "м²", consumptionPerM2: 3.5 },
      { name: "Штукатурка стен", unit: "м²", consumptionPerM2: 2.5 },
      { name: "Шпаклёвка + покраска", unit: "м²", consumptionPerM2: 2.5 },
      { name: "Стяжка с тёплым полом", unit: "м²", consumptionPerM2: 1 },
      { name: "Укладка напольного покрытия", unit: "м²", consumptionPerM2: 1 },
      { name: "Укладка плитки", unit: "м²", consumptionPerM2: 0.5 },
      { name: "Электромонтаж", unit: "точка", consumptionPerM2: 0.4 },
      { name: "Сантехмонтаж", unit: "точка", consumptionPerM2: 0.08 },
      { name: "Монтаж перегородок из гипсокартона", unit: "м²", consumptionPerM2: 0.15 },
      { name: "Натяжной потолок", unit: "м²", consumptionPerM2: 1 },
      { name: "Установка дверей", unit: "шт", consumptionPerM2: 0.04 },
    ],
  },
];

export const ROOM_PRESETS = [
  { label: "Студия 25 м²", area: 25 },
  { label: "1-комнатная 35 м²", area: 35 },
  { label: "2-комнатная 55 м²", area: 55 },
  { label: "3-комнатная 75 м²", area: 75 },
  { label: "Дом 120 м²", area: 120 },
] as const;

export function getRenovationType(id: string): RenovationType {
  return RENOVATION_TYPES.find((type) => type.id === id) ?? RENOVATION_TYPES[1];
}

function normalizeArea(area: number): number {
  return Number.isFinite(area) && area > 0 ? area : 0;
}

function normalizePrice(price: number | undefined): number {
  return Number.isFinite(price) && price! > 0 ? price! : 0;
}

function buildLine(
  item: RenovationCostItem,
  area: number,
  price: number,
): RenovationCostLine {
  const qty = Math.ceil(area * item.consumptionPerM2 * 10) / 10;
  return {
    ...item,
    qty,
    price,
    cost: Math.round(qty * price),
  };
}

export function calculateRenovationCost({
  area,
  typeId,
  withWork,
  prices,
}: {
  area: number;
  typeId: string;
  withWork: boolean;
  prices: Record<string, number>;
}): RenovationCostResult {
  const normalizedArea = normalizeArea(area);
  const type = getRenovationType(typeId);
  const materialLines = type.materials.map((item) =>
    buildLine(item, normalizedArea, normalizePrice(prices[item.name])),
  );
  const workLines = withWork
    ? type.works.map((item) =>
        buildLine(item, normalizedArea, normalizePrice(prices[`work:${item.name}`])),
      )
    : [];
  const materialTotal = materialLines.reduce((sum, line) => sum + line.cost, 0);
  const workTotal = workLines.reduce((sum, line) => sum + line.cost, 0);
  const total = materialTotal + workTotal;

  return {
    materialLines,
    workLines,
    materialTotal,
    workTotal,
    total,
    perM2: total > 0 && normalizedArea > 0 ? Math.round(total / normalizedArea) : 0,
    durationDays: Math.ceil(normalizedArea * type.durationDaysPerM2),
    hasAnyPrice: total > 0,
  };
}

export function formatRenovationPrice(value: number): string {
  return Math.round(value).toLocaleString("ru-RU");
}

export function formatRenovationPriceRange(value: number): [string, string] {
  return [
    formatRenovationPrice(value * 0.85),
    formatRenovationPrice(value * 1.15),
  ];
}
