/**
 * Registry of tool pages under /instrumenty/.
 * Used by sitemap, navigation, and tool listing page.
 */

export interface ToolPage {
  slug: string;
  title: string;
  description: string;
  priority: number;
}

export const ALL_TOOLS: ToolPage[] = [
  {
    slug: "",
    title: "Инструменты",
    description: "Онлайн-инструменты для ремонта и строительства",
    priority: 0.7,
  },
  {
    slug: "konverter",
    title: "Конвертер единиц",
    description: "Перевод единиц измерения: длина, площадь, объём, масса",
    priority: 0.6,
  },
  {
    slug: "ploshchad-komnaty",
    title: "Калькулятор площади комнаты",
    description: "Расчёт площади стен, пола и потолка по размерам помещения",
    priority: 0.6,
  },
  {
    slug: "kalkulyator",
    title: "Простой калькулятор",
    description: "Обычный калькулятор для быстрых вычислений",
    priority: 0.5,
  },
  {
    slug: "chek-listy",
    title: "Чек-листы для ремонта",
    description: "Готовые чек-листы для контроля этапов ремонта",
    priority: 0.7,
  },
];

export function getToolBySlug(slug: string): ToolPage | undefined {
  return ALL_TOOLS.find((t) => t.slug === slug);
}
