import type { RenovationScenarioId } from "@/lib/renovation-calendar/scenarios";
import type { RoomPackId } from "@/lib/room-master/packs";

/** Калькулятор → сценарий календаря для подсказок «следующий шаг». */
const CALC_TO_SCENARIO: Partial<Record<string, RenovationScenarioId>> = {
  plitka: "bathroom",
  "klej-dlya-plitki": "bathroom",
  zatirka: "bathroom",
  "gidroizolyaciya-vlagozaschita": "bathroom",
  "vannaya-komnata": "bathroom",
  laminat: "room",
  parket: "room",
  linoleum: "room",
  styazhka: "room",
  kraska: "bathroom",
  oboi: "room",
  shtukaturka: "room",
  shpaklevka: "room",
  "teplyy-pol": "bathroom",
};

export function getScenarioForCalculator(slug: string | undefined): RenovationScenarioId | null {
  if (!slug) return null;
  return CALC_TO_SCENARIO[slug] ?? null;
}

export function packIdToScenario(packId: RoomPackId): RenovationScenarioId {
  return packId;
}

export function calendarHref(scenarioId?: RenovationScenarioId | null): string {
  if (!scenarioId) return "/instrumenty/kalendar-remonta/";
  return `/instrumenty/kalendar-remonta/?scenario=${scenarioId}`;
}

export function masterHref(packId?: RoomPackId | null): string {
  if (!packId) return "/instrumenty/moy-remont/";
  return `/instrumenty/moy-remont/?pack=${packId}`;
}
