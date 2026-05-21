import type { RenovationScenarioId } from "./scenarios";

const STORAGE_KEY = "masterok:renovation-calendar:v2";

export interface RenovationCalendarState {
  scenarioId: RenovationScenarioId;
  startDate: string | null;
  completedStageIds: string[];
  /** Ключи пунктов: `scenario:stage:index`. */
  completedTaskKeys: string[];
}

export const DEFAULT_CALENDAR_STATE: RenovationCalendarState = {
  scenarioId: "bathroom",
  startDate: null,
  completedStageIds: [],
  completedTaskKeys: [],
};

export function loadCalendarState(): RenovationCalendarState {
  if (typeof window === "undefined") return { ...DEFAULT_CALENDAR_STATE };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_CALENDAR_STATE };
    const parsed = JSON.parse(raw) as Partial<RenovationCalendarState>;
    return {
      scenarioId: parsed.scenarioId ?? DEFAULT_CALENDAR_STATE.scenarioId,
      startDate: parsed.startDate ?? null,
      completedStageIds: Array.isArray(parsed.completedStageIds) ? parsed.completedStageIds : [],
      completedTaskKeys: Array.isArray(parsed.completedTaskKeys) ? parsed.completedTaskKeys : [],
    };
  } catch {
    return { ...DEFAULT_CALENDAR_STATE };
  }
}

export function saveCalendarState(state: RenovationCalendarState): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* quota */
  }
}

export function formatStageDateRange(
  startDateIso: string | null,
  dayFrom: number,
  dayTo: number,
): string | null {
  if (!startDateIso) return null;
  const start = new Date(startDateIso + "T12:00:00");
  if (Number.isNaN(start.getTime())) return null;
  const from = new Date(start);
  from.setDate(from.getDate() + dayFrom);
  const to = new Date(start);
  to.setDate(to.getDate() + dayTo);
  const fmt = new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "short" });
  if (dayFrom === dayTo) return fmt.format(from);
  return `${fmt.format(from)} — ${fmt.format(to)}`;
}
