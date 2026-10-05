export const CONSTRUCTOR_URL = "/konstruktor/";
export const CONSTRUCTOR_EDITOR_URL = "/konstruktor/redaktor/";

export const CONSTRUCTOR_SCENARIOS = [
  { id: "room", title: "Комната", description: "Задайте размеры, добавьте проёмы и выберите отделку.", action: "Создать комнату" },
  { id: "bathroom", title: "Ванная с плиткой", description: "Плитка на полу и стенах, сантехника и развёртки.", action: "Создать ванную" },
  { id: "laminate", title: "Раскладка ламината", description: "Сравните направление досок, стыки и подрезки.", action: "Разложить ламинат" },
  { id: "tile", title: "Плитка на полу", description: "Выберите формат, шов и начало раскладки на полу.", action: "Разложить плитку" },
] as const;

export type ConstructorScenario = typeof CONSTRUCTOR_SCENARIOS[number]["id"];

export function scenarioHref(scenario: ConstructorScenario): string {
  return `${CONSTRUCTOR_EDITOR_URL}?start=${scenario}`;
}

export function parseConstructorEntry(search: string): { scenario?: ConstructorScenario; projectId?: string } {
  const params = new URLSearchParams(search);
  const scenario = CONSTRUCTOR_SCENARIOS.find((item) => item.id === params.get("start"))?.id;
  const projectId = params.get("project") || undefined;
  return { scenario, projectId: projectId && projectId.length <= 150 ? projectId : undefined };
}
