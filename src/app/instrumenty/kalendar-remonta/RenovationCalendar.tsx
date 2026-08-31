"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useToolAnalytics } from "@/components/tools/useToolAnalytics";
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
  resolveCalendarState,
  saveCalendarState,
  type RenovationCalendarState,
} from "@/lib/renovation-calendar/storage";
import {
  getStageInlineTasks,
  renovationTaskKey,
} from "@/lib/renovation-calendar/stage-tasks";
import RenovationHubStrip from "@/components/renovation/RenovationHubStrip";
import { trackToolModeChange, trackToolRelatedClick } from "@/lib/analytics";
import { calendarHref } from "@/lib/renovation-hub/context";

const CALENDAR_TOOL_SLUG = "kalendar-remonta";

const LINK_STYLE: Record<RenovationStageLink["type"], string> = {
  checklist: "bg-violet-50 text-violet-800 dark:bg-violet-950/40 dark:text-violet-200",
  timer: "bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-200",
  calc: "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200",
  master: "bg-blue-50 text-blue-800 dark:bg-blue-950/40 dark:text-blue-200",
  layout: "bg-orange-50 text-orange-800 dark:bg-orange-950/40 dark:text-orange-200",
};

export default function RenovationCalendar() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialScenario = parseScenarioId(searchParams.get("scenario"));

  const [state, setState] = useState<RenovationCalendarState>({
    ...DEFAULT_CALENDAR_STATE,
    scenarioId: initialScenario,
  });
  const [hydrated, setHydrated] = useState(false);
  const [expandedStageId, setExpandedStageId] = useState<string | null>(
    RENOVATION_SCENARIOS[initialScenario].stages[0]?.id ?? null,
  );
  const resultRef = useRef<HTMLElement>(null);
  const { markStarted } = useToolAnalytics(
    CALENDAR_TOOL_SLUG,
    resultRef,
    hydrated,
  );

  useEffect(() => {
    const saved = loadCalendarState();
    const scenarioParam = searchParams.get("scenario");
    const next = resolveCalendarState(
      saved,
      scenarioParam === null ? null : parseScenarioId(scenarioParam),
    );
    setState(next);
    const resolvedScenario = RENOVATION_SCENARIOS[next.scenarioId];
    setExpandedStageId(
      resolvedScenario.stages.find((stage) => !next.completedStageIds.includes(stage.id))?.id
        ?? resolvedScenario.stages[0]?.id
        ?? null,
    );
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
  const nextStage = scenario.stages.find((stage) => !completedSet.has(stage.id)) ?? null;

  const toggleStage = (stageId: string) => {
    markStarted("progress");
    const wasCompleted = completedSet.has(stageId);
    const next = wasCompleted
      ? state.completedStageIds.filter((id) => id !== stageId)
      : [...state.completedStageIds, stageId];
    persist({ ...state, completedStageIds: next });
    trackToolModeChange(
      CALENDAR_TOOL_SLUG,
      `stage:${state.scenarioId}:${stageId}:${wasCompleted ? "reopened" : "completed"}`,
    );
    if (wasCompleted) {
      setExpandedStageId(stageId);
      return;
    }

    const stageIndex = scenario.stages.findIndex((stage) => stage.id === stageId);
    const followingStage = scenario.stages
      .slice(stageIndex + 1)
      .find((stage) => !next.includes(stage.id));
    setExpandedStageId(followingStage?.id ?? stageId);
  };

  const changeScenario = (id: RenovationScenarioId) => {
    if (id === state.scenarioId) return;
    markStarted("category");
    persist({
      scenarioId: id,
      startDate: state.startDate,
      completedStageIds: [],
      completedTaskKeys: [],
    });
    setExpandedStageId(RENOVATION_SCENARIOS[id].stages[0]?.id ?? null);
    trackToolModeChange(CALENDAR_TOOL_SLUG, `scenario:${id}`);
    router.replace(calendarHref(id), { scroll: false });
  };

  const toggleTask = (stageId: string, index: number) => {
    markStarted("progress");
    const key = renovationTaskKey(state.scenarioId, stageId, index);
    const wasCompleted = completedTasksSet.has(key);
    const next = wasCompleted
      ? state.completedTaskKeys.filter((k) => k !== key)
      : [...state.completedTaskKeys, key];
    persist({ ...state, completedTaskKeys: next });
    trackToolModeChange(
      CALENDAR_TOOL_SLUG,
      `task:${state.scenarioId}:${stageId}:${index}:${wasCompleted ? "reopened" : "completed"}`,
    );
  };

  const changeStartDate = (value: string) => {
    markStarted("value_input");
    persist({ ...state, startDate: value || null });
    trackToolModeChange(CALENDAR_TOOL_SLUG, value ? "start-date:set" : "start-date:cleared");
  };

  if (!hydrated) {
    return <div className="card p-8 animate-pulse text-sm text-slate-400">Загрузка плана…</div>;
  }

  return (
    <div className="max-w-4xl space-y-4">
      <div className="-mx-4 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0" role="tablist" aria-label="Сценарий ремонта">
        <div className="flex min-w-max gap-2">
          {getScenarioList().map((s) => (
            <button
              key={s.id}
              type="button"
              role="tab"
              aria-selected={state.scenarioId === s.id}
              onClick={() => changeScenario(s.id)}
              className={`min-h-11 rounded-xl px-4 text-sm font-semibold transition-all ${
                state.scenarioId === s.id
                  ? "bg-accent-600 text-white shadow-sm"
                  : "border border-slate-200 bg-white text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              }`}
            >
              <span className="mr-1.5" aria-hidden>{s.icon}</span>
              {s.title}
            </button>
          ))}
        </div>
      </div>

      <section ref={resultRef} className="card overflow-hidden">
        <div className="border-b border-sky-200 bg-gradient-to-br from-sky-50 via-white to-accent-50 p-4 dark:border-sky-800/50 dark:from-sky-950/30 dark:via-slate-900 dark:to-accent-950/20 sm:p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-sky-700 dark:text-sky-300">Паспорт плана</p>
              <h2 className="mt-1 text-xl font-bold text-slate-950 dark:text-white">{scenario.icon} {scenario.title}</h2>
              <p className="mt-1 text-xs leading-relaxed text-slate-500 dark:text-slate-400">{scenario.description}</p>
            </div>
            <div className="shrink-0 text-right">
              <p className="text-3xl font-bold text-slate-950 dark:text-white">{progress}%</p>
              <p className="text-[10px] text-slate-500">{state.completedStageIds.length} из {scenario.stages.length}</p>
            </div>
          </div>
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/80 dark:bg-slate-800">
            <div className="h-full bg-accent-500 transition-all duration-300" style={{ width: `${progress}%` }} />
          </div>
        </div>
        <div className="grid gap-4 p-4 sm:grid-cols-[minmax(0,1fr)_220px] sm:p-5">
          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Дата начала работ</span>
            <input type="date" value={state.startDate ?? ""} onChange={(event) => changeStartDate(event.target.value)} className="input-field mt-2 min-h-12 w-full" />
          </label>
          <div className="rounded-xl border border-slate-200 p-3 dark:border-slate-700">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{nextStage ? "Следующий этап" : "План завершён"}</p>
            <p className="mt-1 text-sm font-bold text-slate-900 dark:text-slate-100">{nextStage?.title ?? "Все этапы отмечены"}</p>
            <p className="mt-1 text-[10px] text-slate-500">Ориентир всего: {scenario.durationLabel}</p>
          </div>
        </div>
      </section>

      <ol className="space-y-3">
        {scenario.stages.map((stage, index) => {
          const done = completedSet.has(stage.id);
          const expanded = expandedStageId === stage.id;
          const inlineTasks = getStageInlineTasks(state.scenarioId, stage.id);
          const dateHint = formatStageDateRange(state.startDate, stage.dayFrom, stage.dayTo);
          return (
            <li
              key={stage.id}
              className={`card overflow-hidden transition-opacity ${done ? "opacity-70" : ""}`}
            >
              <div className="flex items-start gap-2 p-3 sm:gap-3 sm:p-5">
                <button
                  type="button"
                  onClick={() => toggleStage(stage.id)}
                  aria-pressed={done}
                  aria-label={done ? `Вернуть этап «${stage.title}» в работу` : `Отметить этап «${stage.title}» выполненным`}
                  className={`flex size-11 shrink-0 items-center justify-center rounded-xl border text-sm font-bold transition-colors sm:size-9 ${
                    done
                      ? "border-green-500 bg-green-500 text-white"
                      : "border-slate-300 dark:border-slate-600 text-transparent hover:border-accent-400"
                  }`}
                >
                  ✓
                </button>
                <div className="min-w-0 flex-1">
                  <button type="button" aria-expanded={expanded} onClick={() => setExpandedStageId(expanded ? null : stage.id)} className="flex min-h-11 w-full items-center justify-between gap-3 text-left sm:cursor-default">
                    <span className="min-w-0">
                      <span className="block text-[10px] font-bold uppercase tracking-wide text-slate-400">Этап {index + 1}{dateHint ? ` · ${dateHint}` : ""}</span>
                      <span className={`mt-0.5 block text-base font-bold ${done ? "line-through text-slate-500" : "text-slate-900 dark:text-slate-100"}`}>{stage.title}</span>
                    </span>
                    <span className={`text-lg text-slate-400 transition-transform sm:hidden ${expanded ? "rotate-180" : ""}`} aria-hidden="true">⌄</span>
                  </button>
                  <div className={`${expanded ? "block" : "hidden"} pt-2 sm:block`}>
                    <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-400">{stage.summary}</p>
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
                                  className="mt-0.5 size-5 shrink-0 rounded border-slate-300 text-accent-600 focus:ring-accent-500/30"
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
                    <div className="mt-3 flex flex-wrap gap-2">
                      {stage.links.map((link) => (
                        <Link
                          key={`${stage.id}-${link.href}-${link.label}`}
                          href={link.href}
                          onClick={() => trackToolRelatedClick(CALENDAR_TOOL_SLUG, `${link.type}:${link.href}`)}
                          className={`inline-flex items-center rounded-lg px-2.5 py-1 text-xs font-semibold no-underline hover:opacity-90 ${LINK_STYLE[link.type]}`}
                        >
                          {link.label}
                        </Link>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </li>
          );
        })}
      </ol>

      <RenovationHubStrip
        scenarioId={state.scenarioId}
        showTileLayout={state.scenarioId !== "room"}
        showCalendar={false}
        packId={state.scenarioId === "apartment" ? null : state.scenarioId}
        analyticsSource={CALENDAR_TOOL_SLUG}
      />

      <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 p-4 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
        Сроки ориентировочные: зависят от смеси, температуры и толщины слоя. Таймеры и чек-листы открываются
        в соседних инструментах — прогресс этапов хранится только в этом браузере.
      </div>

      <div className="flex flex-wrap gap-3">
        <Link href="/instrumenty/chek-listy/" onClick={() => trackToolRelatedClick(CALENDAR_TOOL_SLUG, "chek-listy")} className="btn-secondary text-sm no-underline">
          Все чек-листы
        </Link>
        <Link href="/instrumenty/tajmer-skhvatyvaniya/" onClick={() => trackToolRelatedClick(CALENDAR_TOOL_SLUG, "tajmer-skhvatyvaniya")} className="btn-secondary text-sm no-underline">
          Таймер схватывания
        </Link>
        <Link href="/proekty/" onClick={() => trackToolRelatedClick(CALENDAR_TOOL_SLUG, "proekty")} className="btn-primary text-sm no-underline">
          Мой ремонт — смета
        </Link>
      </div>
    </div>
  );
}
