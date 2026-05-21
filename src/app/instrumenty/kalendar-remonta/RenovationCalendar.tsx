"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  getScenarioList,
  RENOVATION_SCENARIOS,
  parseScenarioId,
  type RenovationScenarioId,
  type RenovationStageLink,
} from "@/lib/renovation-calendar/scenarios";
import {
  DEFAULT_CALENDAR_STATE,
  formatStageDateRange,
  loadCalendarState,
  saveCalendarState,
  type RenovationCalendarState,
} from "@/lib/renovation-calendar/storage";
import {
  getStageInlineTasks,
  renovationTaskKey,
} from "@/lib/renovation-calendar/stage-tasks";
import RenovationHubStrip from "@/components/renovation/RenovationHubStrip";

const LINK_STYLE: Record<RenovationStageLink["type"], string> = {
  checklist: "bg-violet-50 text-violet-800 dark:bg-violet-950/40 dark:text-violet-200",
  timer: "bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-200",
  calc: "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200",
  master: "bg-blue-50 text-blue-800 dark:bg-blue-950/40 dark:text-blue-200",
  layout: "bg-orange-50 text-orange-800 dark:bg-orange-950/40 dark:text-orange-200",
};

export default function RenovationCalendar() {
  const searchParams = useSearchParams();
  const initialScenario = parseScenarioId(searchParams.get("scenario"));

  const [state, setState] = useState<RenovationCalendarState>({
    ...DEFAULT_CALENDAR_STATE,
    scenarioId: initialScenario,
  });
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const saved = loadCalendarState();
    const fromUrl = parseScenarioId(searchParams.get("scenario"));
    setState({ ...saved, scenarioId: fromUrl });
    setHydrated(true);
  }, [searchParams]);

  const persist = useCallback((next: RenovationCalendarState) => {
    setState(next);
    saveCalendarState(next);
  }, []);

  const scenario = RENOVATION_SCENARIOS[state.scenarioId];
  const completedSet = useMemo(() => new Set(state.completedStageIds), [state.completedStageIds]);
  const completedTasksSet = useMemo(
    () => new Set(state.completedTaskKeys),
    [state.completedTaskKeys],
  );
  const progress = scenario.stages.length
    ? Math.round((state.completedStageIds.length / scenario.stages.length) * 100)
    : 0;

  const toggleStage = (stageId: string) => {
    const next = completedSet.has(stageId)
      ? state.completedStageIds.filter((id) => id !== stageId)
      : [...state.completedStageIds, stageId];
    persist({ ...state, completedStageIds: next });
  };

  const changeScenario = (id: RenovationScenarioId) => {
    persist({
      scenarioId: id,
      startDate: state.startDate,
      completedStageIds: [],
      completedTaskKeys: [],
    });
  };

  const toggleTask = (stageId: string, index: number) => {
    const key = renovationTaskKey(state.scenarioId, stageId, index);
    const next = completedTasksSet.has(key)
      ? state.completedTaskKeys.filter((k) => k !== key)
      : [...state.completedTaskKeys, key];
    persist({ ...state, completedTaskKeys: next });
  };

  if (!hydrated) {
    return <div className="card p-8 animate-pulse text-sm text-slate-400">Загрузка плана…</div>;
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Сценарий ремонта">
        {getScenarioList().map((s) => (
          <button
            key={s.id}
            type="button"
            role="tab"
            aria-selected={state.scenarioId === s.id}
            onClick={() => changeScenario(s.id)}
            className={`rounded-xl px-4 py-2.5 text-sm font-semibold transition-all ${
              state.scenarioId === s.id
                ? "bg-accent-600 text-white shadow-sm"
                : "bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200"
            }`}
          >
            <span className="mr-1.5" aria-hidden>
              {s.icon}
            </span>
            {s.title}
          </button>
        ))}
      </div>

      <p className="text-sm text-slate-600 dark:text-slate-400">
        {scenario.description} Ориентир: <strong>{scenario.durationLabel}</strong>.
      </p>

      <div className="card p-5 flex flex-col sm:flex-row sm:items-end gap-4">
        <label className="flex-1 block">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Дата начала работ (ориентир)
          </span>
          <input
            type="date"
            value={state.startDate ?? ""}
            onChange={(e) => persist({ ...state, startDate: e.target.value || null })}
            className="input-field mt-2 w-full"
          />
        </label>
        <div className="sm:text-right shrink-0">
          <p className="text-xs text-slate-500">Прогресс</p>
          <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{progress}%</p>
          <p className="text-xs text-slate-400">
            {state.completedStageIds.length} из {scenario.stages.length} этапов
          </p>
        </div>
      </div>

      <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
        <div
          className="h-full bg-accent-500 transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>

      <ol className="space-y-4">
        {scenario.stages.map((stage, index) => {
          const done = completedSet.has(stage.id);
          const inlineTasks = getStageInlineTasks(state.scenarioId, stage.id);
          const dateHint = formatStageDateRange(state.startDate, stage.dayFrom, stage.dayTo);
          return (
            <li
              key={stage.id}
              className={`card p-5 transition-opacity ${done ? "opacity-70" : ""}`}
            >
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => toggleStage(stage.id)}
                  aria-pressed={done}
                  className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md border text-sm font-bold transition-colors ${
                    done
                      ? "border-green-500 bg-green-500 text-white"
                      : "border-slate-300 dark:border-slate-600 text-transparent hover:border-accent-400"
                  }`}
                >
                  ✓
                </button>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                    <span className="text-xs font-bold text-slate-400">Этап {index + 1}</span>
                    <h3
                      className={`text-base font-bold ${done ? "line-through text-slate-500" : "text-slate-900 dark:text-slate-100"}`}
                    >
                      {stage.title}
                    </h3>
                  </div>
                  {dateHint && (
                    <p className="text-xs text-accent-700 dark:text-accent-400 mt-1 font-medium">
                      📅 {dateHint}
                    </p>
                  )}
                  <p className="text-sm text-slate-600 dark:text-slate-400 mt-2 leading-relaxed">
                    {stage.summary}
                  </p>
                  {inlineTasks.length > 0 && (
                    <ul className="mt-3 space-y-1.5 rounded-xl border border-slate-100 bg-slate-50/80 p-3 dark:border-slate-700 dark:bg-slate-900/30">
                      {inlineTasks.map((task, ti) => {
                        const taskKey = renovationTaskKey(state.scenarioId, stage.id, ti);
                        const taskDone = completedTasksSet.has(taskKey);
                        return (
                          <li key={taskKey}>
                            <label className="flex cursor-pointer items-start gap-2 text-sm text-slate-700 dark:text-slate-300">
                              <input
                                type="checkbox"
                                checked={taskDone}
                                onChange={() => toggleTask(stage.id, ti)}
                                className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 text-accent-600 focus:ring-accent-500/30"
                              />
                              <span className={taskDone ? "line-through text-slate-400" : ""}>
                                {task}
                              </span>
                            </label>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                  <div className="flex flex-wrap gap-2 mt-3">
                    {stage.links.map((link) => (
                      <Link
                        key={`${stage.id}-${link.href}-${link.label}`}
                        href={link.href}
                        className={`inline-flex items-center rounded-lg px-2.5 py-1 text-xs font-semibold no-underline hover:opacity-90 ${LINK_STYLE[link.type]}`}
                      >
                        {link.label}
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            </li>
          );
        })}
      </ol>

      <RenovationHubStrip scenarioId={state.scenarioId} showTileLayout packId={state.scenarioId === "apartment" ? null : state.scenarioId} />

      <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 p-4 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
        Сроки ориентировочные: зависят от смеси, температуры и толщины слоя. Таймеры и чек-листы открываются
        в соседних инструментах — прогресс этапов хранится только в этом браузере.
      </div>

      <div className="flex flex-wrap gap-3">
        <Link href="/instrumenty/chek-listy/" className="btn-secondary text-sm no-underline">
          Все чек-листы
        </Link>
        <Link href="/instrumenty/tajmer-skhvatyvaniya/" className="btn-secondary text-sm no-underline">
          Таймер схватывания
        </Link>
        <Link href="/proekty/" className="btn-primary text-sm no-underline">
          Мой ремонт — смета
        </Link>
      </div>
    </div>
  );
}
