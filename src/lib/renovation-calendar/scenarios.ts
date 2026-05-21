import { curingTimerHref } from "@/lib/curing-timer/presets";
import { calcHref } from "@/lib/tools/config";

export type RenovationScenarioId = "bathroom" | "kitchen" | "room" | "apartment";

export interface RenovationStageLink {
  type: "checklist" | "timer" | "calc" | "master" | "layout";
  label: string;
  href: string;
}

export interface RenovationStage {
  id: string;
  title: string;
  summary: string;
  /** Ориентир срока от старта работ (дни). */
  dayFrom: number;
  dayTo: number;
  links: RenovationStageLink[];
}

export interface RenovationScenario {
  id: RenovationScenarioId;
  title: string;
  icon: string;
  durationLabel: string;
  description: string;
  stages: RenovationStage[];
}

const checklist = (slug: string, label: string): RenovationStageLink => ({
  type: "checklist",
  label,
  href: `/instrumenty/chek-listy/${slug}/`,
});

export const RENOVATION_SCENARIOS: Record<RenovationScenarioId, RenovationScenario> = {
  bathroom: {
    id: "bathroom",
    title: "Ванная",
    icon: "🚿",
    durationLabel: "2–4 недели",
    description: "Гидроизоляция, стяжка, плитка, затирка и сантехника — в правильном порядке.",
    stages: [
      {
        id: "prep",
        title: "Подготовка и демонтаж",
        summary: "Отключить воду, снять старую отделку и сантехнику, вывезти мусор.",
        dayFrom: 0,
        dayTo: 2,
        links: [checklist("ukladka-plitki", "Чек-лист: подготовка основания")],
      },
      {
        id: "rough",
        title: "Черновая разводка",
        summary: "Штробы, трубы, электрика под плитку — до гидроизоляции и стяжки.",
        dayFrom: 2,
        dayTo: 5,
        links: [
          checklist("razvodka-elektriki", "Чек-лист: электрика"),
          checklist("ustanovka-santehniki", "Чек-лист: сантехника"),
        ],
      },
      {
        id: "waterproof",
        title: "Гидроизоляция",
        summary: "Пол и примыкания, 2 слоя мастики, лента в углах.",
        dayFrom: 5,
        dayTo: 7,
        links: [
          { type: "timer", label: "Таймер: мастика", href: curingTimerHref("waterproof") },
          { type: "calc", label: "Калькулятор гидроизоляции", href: calcHref({ slug: "gidroizolyaciya-vlagozaschita", categorySlug: "otdelka" }) },
        ],
      },
      {
        id: "screed",
        title: "Стяжка пола",
        summary: "Маяки, заливка, плёнка на 7–14 дней. Плитку — после набора прочности.",
        dayFrom: 7,
        dayTo: 35,
        links: [
          checklist("styazhka-pola", "Чек-лист: стяжка"),
          { type: "timer", label: "Таймер: стяжка ЦПС", href: curingTimerHref("screed-cement") },
          { type: "calc", label: "Калькулятор стяжки", href: calcHref({ slug: "styazhka", categorySlug: "poly" }) },
        ],
      },
      {
        id: "tile-layout",
        title: "Раскладка и закупка плитки",
        summary: "Схема укладки, подрезка, расчёт клея и затирки.",
        dayFrom: 35,
        dayTo: 36,
        links: [
          { type: "layout", label: "Раскладка плитки", href: "/instrumenty/raskladka-plitki/" },
          { type: "master", label: "Мастер «Мой ремонт»", href: "/instrumenty/moy-remont/" },
          { type: "calc", label: "Калькулятор ванной", href: calcHref({ slug: "vannaya-komnata", categorySlug: "otdelka" }) },
        ],
      },
      {
        id: "tile",
        title: "Укладка плитки",
        summary: "Клей, укладка, крестики. Не ходить по свежей плитке.",
        dayFrom: 36,
        dayTo: 40,
        links: [
          checklist("ukladka-plitki", "Чек-лист: укладка плитки"),
          { type: "timer", label: "Таймер: плиточный клей", href: curingTimerHref("tile-adhesive") },
        ],
      },
      {
        id: "grout",
        title: "Затирка и герметизация",
        summary: "Через 24–72 ч после укладки. Силикон в углах и примыканиях.",
        dayFrom: 40,
        dayTo: 43,
        links: [
          { type: "timer", label: "Таймер: затирка", href: curingTimerHref("grout") },
          { type: "calc", label: "Калькулятор затирки", href: calcHref({ slug: "zatirka", categorySlug: "poly" }) },
        ],
      },
      {
        id: "finish",
        title: "Сантехника и финиш",
        summary: "Установка унитаза, раковины, смесителей, проверка на протечки.",
        dayFrom: 43,
        dayTo: 48,
        links: [checklist("ustanovka-santehniki", "Чек-лист: установка сантехники")],
      },
    ],
  },
  kitchen: {
    id: "kitchen",
    title: "Кухня",
    icon: "🍳",
    durationLabel: "3–6 недель",
    description: "Стяжка, напольное покрытие, стены, фартук.",
    stages: [
      {
        id: "prep",
        title: "Подготовка",
        summary: "Демонтаж, разводка под кухню, вынос мусора.",
        dayFrom: 0,
        dayTo: 3,
        links: [checklist("remont-kvartiry", "Чек-лист: ремонт квартиры")],
      },
      {
        id: "screed",
        title: "Стяжка",
        summary: "Выравнивание пола под ламинат или плитку.",
        dayFrom: 3,
        dayTo: 30,
        links: [
          checklist("styazhka-pola", "Чек-лист: стяжка"),
          { type: "timer", label: "Таймер: стяжка", href: curingTimerHref("screed-cement") },
          { type: "calc", label: "Калькулятор стяжки", href: calcHref({ slug: "styazhka", categorySlug: "poly" }) },
        ],
      },
      {
        id: "floor",
        title: "Напольное покрытие",
        summary: "Ламинат, плитка или другое — после набора прочности стяжки.",
        dayFrom: 30,
        dayTo: 35,
        links: [
          { type: "master", label: "Мастер «Мой ремонт»", href: "/instrumenty/moy-remont/" },
          { type: "calc", label: "Калькулятор ламината", href: calcHref({ slug: "laminat", categorySlug: "poly" }) },
        ],
      },
      {
        id: "walls",
        title: "Стены",
        summary: "Шпаклёвка, грунтовка, покраска или обои.",
        dayFrom: 10,
        dayTo: 38,
        links: [
          checklist("pokraska-sten", "Чек-лист: покраска"),
          checklist("pokleivaniye-oboev", "Чек-лист: обои"),
          { type: "timer", label: "Таймер: грунтовка", href: curingTimerHref("primer-deep") },
          { type: "timer", label: "Таймер: краска", href: curingTimerHref("paint-latex") },
        ],
      },
      {
        id: "backsplash",
        title: "Фартук",
        summary: "Плитка или керамогранит за столешницей.",
        dayFrom: 35,
        dayTo: 40,
        links: [
          checklist("ukladka-plitki", "Чек-лист: плитка"),
          { type: "calc", label: "Калькулятор плитки", href: calcHref({ slug: "plitka", categorySlug: "poly" }) },
        ],
      },
    ],
  },
  room: {
    id: "room",
    title: "Комната",
    icon: "🛋️",
    durationLabel: "2–5 недель",
    description: "Стяжка, пол, отделка стен и потолка.",
    stages: [
      {
        id: "prep",
        title: "Подготовка",
        summary: "Демонтаж покрытий, выравнивание стен при необходимости.",
        dayFrom: 0,
        dayTo: 2,
        links: [checklist("remont-kvartiry", "Чек-лист: ремонт")],
      },
      {
        id: "screed",
        title: "Стяжка пола",
        summary: "ЦПС или наливной пол — сроки высыхания по толщине.",
        dayFrom: 2,
        dayTo: 28,
        links: [
          checklist("styazhka-pola", "Чек-лист: стяжка"),
          { type: "timer", label: "Таймер: стяжка", href: curingTimerHref("screed-cement") },
        ],
      },
      {
        id: "floor",
        title: "Напольное покрытие",
        summary: "Ламинат, паркет, линолеум.",
        dayFrom: 28,
        dayTo: 32,
        links: [
          { type: "master", label: "Мастер «Мой ремонт»", href: "/instrumenty/moy-remont/" },
          { type: "calc", label: "Калькулятор ламината", href: calcHref({ slug: "laminat", categorySlug: "poly" }) },
        ],
      },
      {
        id: "walls",
        title: "Стены",
        summary: "Покраска или обои после шпаклёвки.",
        dayFrom: 5,
        dayTo: 30,
        links: [
          checklist("pokraska-sten", "Чек-лист: покраска"),
          { type: "timer", label: "Таймер: шпаклёвка", href: curingTimerHref("putty-finish") },
        ],
      },
      {
        id: "ceiling",
        title: "Потолок",
        summary: "Покраска, натяжной или ГКЛ — после стен или параллельно.",
        dayFrom: 30,
        dayTo: 35,
        links: [
          checklist("montazh-gipsokartona", "Чек-лист: ГКЛ"),
          { type: "calc", label: "Натяжной потолок", href: calcHref({ slug: "natyazhnoj-potolok", categorySlug: "potolki" }) },
        ],
      },
    ],
  },
  apartment: {
    id: "apartment",
    title: "Квартира целиком",
    icon: "🏠",
    durationLabel: "2–6 месяцев",
    description: "Крупные этапы капремонта со ссылкой на полный чек-лист.",
    stages: [
      {
        id: "plan",
        title: "Планирование",
        summary: "Смета, порядок помещений, согласования.",
        dayFrom: 0,
        dayTo: 7,
        links: [
          checklist("remont-kvartiry", "Полный чек-лист ремонта"),
          { type: "calc", label: "Смета ремонта", href: "/instrumenty/stoimost-remonta/" },
        ],
      },
      {
        id: "demo",
        title: "Демонтаж",
        summary: "Снятие покрытий, вывоз мусора.",
        dayFrom: 7,
        dayTo: 14,
        links: [checklist("remont-kvartiry", "Чек-лист: демонтаж")],
      },
      {
        id: "engineering",
        title: "Инженерия",
        summary: "Электрика, сантехника, вентиляция.",
        dayFrom: 14,
        dayTo: 28,
        links: [
          checklist("razvodka-elektriki", "Электрика"),
          checklist("ustanovka-santehniki", "Сантехника"),
        ],
      },
      {
        id: "rough",
        title: "Черновая отделка",
        summary: "Стяжка, штукатурка, перегородки.",
        dayFrom: 28,
        dayTo: 60,
        links: [
          checklist("styazhka-pola", "Стяжка"),
          checklist("montazh-gipsokartona", "ГКЛ"),
          { type: "timer", label: "Таймер: стяжка", href: curingTimerHref("screed-cement") },
        ],
      },
      {
        id: "wet",
        title: "Мокрые зоны",
        summary: "Ванная и кухня — по отдельным сценариям.",
        dayFrom: 45,
        dayTo: 90,
        links: [
          { type: "master", label: "Мастер: ванная", href: "/instrumenty/moy-remont/?pack=bathroom" },
          { type: "master", label: "Мастер: кухня", href: "/instrumenty/moy-remont/?pack=kitchen" },
        ],
      },
      {
        id: "finish",
        title: "Чистовая отделка",
        summary: "Полы, стены, потолки, двери.",
        dayFrom: 90,
        dayTo: 150,
        links: [
          checklist("ukladka-plitki", "Плитка"),
          checklist("pokraska-sten", "Покраска"),
          { type: "master", label: "Мой ремонт — закупка", href: "/proekty/" },
        ],
      },
    ],
  },
};

export function getScenarioList(): RenovationScenario[] {
  return [
    RENOVATION_SCENARIOS.bathroom,
    RENOVATION_SCENARIOS.kitchen,
    RENOVATION_SCENARIOS.room,
    RENOVATION_SCENARIOS.apartment,
  ];
}

export function parseScenarioId(value: string | null): RenovationScenarioId {
  if (value === "kitchen" || value === "room" || value === "apartment") return value;
  return "bathroom";
}
