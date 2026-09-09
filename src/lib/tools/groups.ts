import { TOOL_CARDS } from "./config";

/** Presentation-only grouping; routes and the shared tool registry remain unchanged. */
export const TOOL_GROUPS = [
  { id: "layouts", title: "Раскладки", description: "Посмотрите расположение элементов, швы и подрезки до покупки материалов.", slugs: ["rasstanovka-svetilnikov", "raskladka-reek", "raskladka-terrasnoy-doski", "raskladka-trotuarnoy-plitki", "raskladka-plitki", "raskladka-kirpicha", "raskladka-laminata", "raskladka-oboev"] },
  { id: "cutting", title: "Раскрой", description: "Разместите детали на листах и хлыстах, оцените пропил и остатки.", slugs: ["lineynyy-raskroy", "raskladka-listov"] },
  { id: "planning", title: "Планирование", description: "Соберите этапы ремонта, предварительную смету и список работ.", slugs: ["moy-remont", "kalendar-remonta", "stoimost-remonta", "chek-listy", "tajmer-skhvatyvaniya"] },
  { id: "reference", title: "Справочники", description: "Сверьте расходы и единицы, сравните материалы и уточните размеры.", slugs: ["normy-raskhoda", "sravnenie-materialov", "skolko-ostalos", "konverter", "ploshchad-komnaty", "kalkulyator"] },
] as const;

export const GROUPED_TOOL_CARDS = TOOL_GROUPS.map(group => ({
  ...group,
  tools: group.slugs.flatMap(slug => TOOL_CARDS.filter(tool => tool.slug === slug)),
}));
