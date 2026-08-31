"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  trackProjectCreate,
  trackProjectOpen,
  trackProjectRelatedClick,
} from "@/lib/analytics";
import { getCalculatorMetaBySlug } from "@/lib/calculators/meta.generated";
import { createProject, deleteProject, getProjects } from "@/lib/storage/projects";
import { buildProjectEstimates, type ProjectEstimate } from "@/lib/projects/estimate";
import type { ProjectWithEntries } from "@/lib/storage/types";

function formatCost(value: number) {
  return value.toLocaleString("ru-RU", { maximumFractionDigits: 0 });
}

function calculationsLabel(count: number) {
  const mod100 = count % 100;
  const mod10 = count % 10;
  if (mod100 >= 11 && mod100 <= 14) return `${count} расчётов`;
  if (mod10 === 1) return `${count} расчёт`;
  if (mod10 >= 2 && mod10 <= 4) return `${count} расчёта`;
  return `${count} расчётов`;
}

function projectsLabel(count: number) {
  const mod100 = count % 100;
  const mod10 = count % 10;
  if (mod100 >= 11 && mod100 <= 14) return `${count} проектов`;
  if (mod10 === 1) return `${count} проект`;
  if (mod10 >= 2 && mod10 <= 4) return `${count} проекта`;
  return `${count} проектов`;
}

function CreateProjectForm({
  value,
  onChange,
  onCreate,
  creating,
}: {
  value: string;
  onChange: (value: string) => void;
  onCreate: () => void;
  creating: boolean;
}) {
  return (
    <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
      <input
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => event.key === "Enter" && onCreate()}
        placeholder="Например: Ванная или квартира"
        aria-label="Название нового проекта"
        maxLength={80}
        className="input-field min-h-11 w-full text-sm"
      />
      <button
        type="button"
        onClick={onCreate}
        disabled={!value.trim() || creating}
        className="btn-primary min-h-11 justify-center px-5 disabled:opacity-40"
      >
        {creating ? "Создаём…" : "Создать проект"}
      </button>
    </div>
  );
}

function ProjectCard({ project, estimate, onDelete }: {
  project: ProjectWithEntries;
  estimate?: ProjectEstimate;
  onDelete: (id: string) => void;
}) {
  const total = (estimate?.pricedItems ?? 0) + (estimate?.missingPriceItems ?? 0);
  const pct = total > 0 ? Math.round(((estimate?.pricedItems ?? 0) / total) * 100) : 0;
  const hasCost = (estimate?.totalCost ?? 0) > 0;

  return (
    <div className="card-hover flex flex-col gap-4 p-5 no-underline">
      {/* Шапка */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-accent-50 text-accent-600 dark:bg-accent-900/20 dark:text-accent-400">
            <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
            </svg>
          </div>
          <div className="min-w-0">
            <h3 className="font-bold text-slate-900 dark:text-slate-100 truncate">{project.name}</h3>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              {calculationsLabel(project.entries.length)}
            </p>
          </div>
        </div>
        {hasCost && (
          <div className="shrink-0 text-right">
            <p className="text-[10px] text-slate-400 dark:text-slate-500">Смета</p>
            <p className="text-base font-black tabular-nums text-accent-700 dark:text-accent-300">
              {formatCost(estimate!.totalCost)} ₽
            </p>
          </div>
        )}
      </div>

      {/* Расчёты */}
      {project.entries.length > 0 ? (
        <div className="space-y-1.5">
          {project.entries.slice(0, 4).map((entry) => {
            const line = estimate?.lines.find((l) => l.entryId === entry.id);
            return (
              <div key={entry.id} className="flex items-center justify-between gap-2">
                <Link
                  href={`/kalkulyatory/${entry.categorySlug}/${entry.slug}/`}
                  onClick={() => {
                    if (getCalculatorMetaBySlug(entry.slug)) {
                      trackProjectRelatedClick(`calculator:${entry.slug}`);
                    }
                  }}
                  className="min-w-0 truncate text-sm text-slate-600 hover:text-accent-700 dark:text-slate-400 dark:hover:text-accent-400 no-underline"
                >
                  {entry.calcTitle}
                </Link>
                <span className="shrink-0 text-xs tabular-nums text-slate-500 dark:text-slate-400">
                  {line && line.estimatedCost > 0 ? `${formatCost(line.estimatedCost)} ₽` : "—"}
                </span>
              </div>
            );
          })}
          {project.entries.length > 4 && (
            <p className="text-xs text-slate-400 dark:text-slate-500">
              ещё {project.entries.length - 4} расчётов...
            </p>
          )}
        </div>
      ) : (
        <p className="text-sm text-slate-400 dark:text-slate-500">
          Нажмите &quot;В проект&quot; после любого расчёта, чтобы добавить его сюда.
        </p>
      )}

      {/* Прогресс цен */}
      {total > 0 && (
        <div className="space-y-1">
          <div className="flex justify-between text-[10px] text-slate-400 dark:text-slate-500">
            <span>Цены заполнены: {estimate?.pricedItems ?? 0} из {total}</span>
            <span>{pct}%</span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-slate-100 dark:bg-slate-800">
            <div
              className={`h-1.5 rounded-full transition-all ${pct === 100 ? "bg-green-500" : "bg-accent-500"}`}
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      )}

      {/* Действия */}
      <div className="flex items-center justify-between gap-3 border-t border-slate-100 dark:border-slate-800 pt-3">
        <Link
          href={`/proekty/${project.id}`}
          onClick={() => trackProjectOpen(project.entries.length)}
          className="inline-flex items-center gap-1.5 rounded-xl bg-accent-50 px-3 py-1.5 text-xs font-semibold text-accent-700 hover:bg-accent-100 dark:bg-accent-900/20 dark:text-accent-400 dark:hover:bg-accent-900/30 no-underline transition-colors"
        >
          Открыть смету
          <svg className="h-3.5 w-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 8h10M9 4l4 4-4 4"/>
          </svg>
        </Link>
        <button
          onClick={() => onDelete(project.id)}
          className="text-[11px] text-red-400 hover:text-red-600 transition-colors"
        >
          Удалить
        </button>
      </div>
    </div>
  );
}

export default function ProjectsPageClient() {
  const [projects, setProjects] = useState<ProjectWithEntries[]>([]);
  const [estimates, setEstimates] = useState<Record<string, ProjectEstimate>>({});
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const refresh = useCallback(async () => {
    const items = await getProjects();
    setProjects(items);
    setEstimates(await buildProjectEstimates(items));
    setLoaded(true);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const handleCreate = async () => {
    const name = newName.trim();
    if (!name || creating) return;
    setCreating(true);
    try {
      const source = projects.length === 0 ? "empty" : "list";
      await createProject(name);
      trackProjectCreate(source);
      setNewName("");
      await refresh();
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: string) => {
    const project = projects.find((item) => item.id === id);
    if (!confirm(`Удалить проект «${project?.name ?? "Без названия"}» и все его расчёты?`)) return;
    await deleteProject(id);
    await refresh();
  };

  if (!loaded) {
    return (
      <div className="space-y-3">
        {[1, 2].map((i) => (
          <div key={i} className="card p-5 animate-pulse space-y-3">
            <div className="h-4 w-1/3 rounded bg-slate-200 dark:bg-slate-700" />
            <div className="h-3 w-1/2 rounded bg-slate-100 dark:bg-slate-800" />
            <div className="h-3 w-2/3 rounded bg-slate-100 dark:bg-slate-800" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {projects.length === 0 ? (
        <section className="overflow-hidden rounded-3xl border border-accent-200/70 bg-gradient-to-br from-orange-50 via-white to-emerald-50 shadow-sm dark:border-accent-900/50 dark:from-orange-950/20 dark:via-slate-900 dark:to-emerald-950/20">
          <div className="p-5 sm:p-8">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white text-accent-600 shadow-sm dark:bg-slate-800 dark:text-accent-400">
                <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
                </svg>
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-accent-700 dark:text-accent-300">Первый шаг</p>
                <h2 className="mt-1 text-xl font-black text-slate-950 dark:text-white">Создайте объект ремонта</h2>
                <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                  Назовите комнату или объект. Затем добавляйте результаты кнопкой «В проект» — закупка соберётся автоматически.
                </p>
              </div>
            </div>
            <div className="mt-5">
              <CreateProjectForm
                value={newName}
                onChange={setNewName}
                onCreate={() => void handleCreate()}
                creating={creating}
              />
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
              <Link
                href="/instrumenty/moy-remont/"
                onClick={() => trackProjectRelatedClick("moy-remont")}
                className="font-semibold text-accent-700 no-underline hover:text-accent-800 dark:text-accent-300"
              >
                Сначала рассчитать комнату →
              </Link>
              <Link
                href="/kalkulyatory/"
                onClick={() => trackProjectRelatedClick("kalkulyatory")}
                className="font-medium text-slate-500 no-underline hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
              >
                Выбрать калькулятор
              </Link>
            </div>
          </div>
        </section>
      ) : (
        <>
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {projectsLabel(projects.length)}
              {" · "}{calculationsLabel(projects.reduce((sum, project) => sum + project.entries.length, 0))}
            </p>
            <details className="group relative">
              <summary className="flex min-h-11 cursor-pointer list-none items-center rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 hover:border-accent-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
                + Новый проект
              </summary>
              <div className="absolute right-0 top-full z-20 mt-2 w-[min(22rem,calc(100vw-2rem))] rounded-2xl border border-slate-200 bg-white p-3 shadow-xl dark:border-slate-700 dark:bg-slate-900">
                <CreateProjectForm
                  value={newName}
                  onChange={setNewName}
                  onCreate={() => void handleCreate()}
                  creating={creating}
                />
              </div>
            </details>
          </div>
          <div className="grid gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(18rem,1fr)]">
            <div className="grid min-w-0 gap-4 sm:grid-cols-2">
              {projects.map((proj) => (
                <ProjectCard
                  key={proj.id}
                  project={proj}
                  estimate={estimates[proj.id]}
                  onDelete={(id) => void handleDelete(id)}
                />
              ))}
            </div>

            <aside className="self-start rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-accent-700 dark:text-accent-300">Следующий шаг</p>
              <h2 className="mt-1 text-lg font-black text-slate-950 dark:text-white">Продолжить ремонт</h2>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-500 dark:text-slate-400">
                Добавьте новый расчёт — сохранённые материалы попадут в выбранную смету.
              </p>
              <div className="mt-4 grid gap-2">
                <Link
                  href="/instrumenty/moy-remont/"
                  onClick={() => trackProjectRelatedClick("moy-remont")}
                  className="btn-primary min-h-11 justify-center text-sm no-underline"
                >
                  Рассчитать комнату →
                </Link>
                <Link
                  href="/kalkulyatory/"
                  onClick={() => trackProjectRelatedClick("kalkulyatory")}
                  className="btn-secondary min-h-11 justify-center text-sm no-underline"
                >
                  Выбрать калькулятор
                </Link>
                <Link
                  href="/instrumenty/kalendar-remonta/"
                  onClick={() => trackProjectRelatedClick("kalendar-remonta")}
                  className="mt-1 text-center text-xs font-semibold text-slate-500 no-underline hover:text-accent-700 dark:text-slate-400 dark:hover:text-accent-300"
                >
                  Открыть календарь этапов
                </Link>
              </div>
            </aside>
          </div>
        </>
      )}
    </div>
  );
}
