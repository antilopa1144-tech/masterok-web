"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { createProject, deleteProject, getProjects } from "@/lib/storage/projects";
import { buildProjectEstimates, type ProjectEstimate } from "@/lib/projects/estimate";
import type { ProjectWithEntries } from "@/lib/storage/types";

function formatCost(value: number) {
  return value.toLocaleString("ru-RU", { maximumFractionDigits: 0 });
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
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {project.entries.length} {project.entries.length === 1 ? "расчёт" : project.entries.length < 5 ? "расчёта" : "расчётов"}
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
    if (!name) return;
    await createProject(name);
    setNewName("");
    void refresh();
  };

  const handleDelete = async (id: string) => {
    await deleteProject(id);
    void refresh();
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
    <div className="space-y-6">
      {projects.length === 0 ? (
        <div className="card p-10 text-center space-y-4">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-accent-50 dark:bg-accent-900/20">
            <svg className="h-8 w-8 text-accent-600 dark:text-accent-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
            </svg>
          </div>
          <div>
            <p className="font-bold text-slate-900 dark:text-slate-100 text-lg">Проектов пока нет</p>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 max-w-xs mx-auto leading-relaxed">
              Создайте проект, откройте любой калькулятор и нажмите &quot;В проект&quot; чтобы сохранить расчёт.
            </p>
          </div>
          <Link href="/kalkulyatory/" className="btn-primary inline-flex text-sm">
            Открыть калькуляторы
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((proj) => (
            <ProjectCard
              key={proj.id}
              project={proj}
              estimate={estimates[proj.id]}
              onDelete={(id) => void handleDelete(id)}
            />
          ))}
        </div>
      )}

      {/* Создать новый проект */}
      <div className="rounded-2xl border border-dashed border-slate-300 p-4 dark:border-slate-700">
        <p className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-300">
          {projects.length === 0 ? "Создать проект" : "Добавить проект"}
        </p>
        <div className="flex gap-2">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && void handleCreate()}
            placeholder="Например: Ремонт ванной, Дом 10×12..."
            className="input-field text-sm flex-1"
          />
          <button
            onClick={() => void handleCreate()}
            disabled={!newName.trim()}
            className="btn-primary px-5 disabled:opacity-40"
          >
            Создать
          </button>
        </div>
      </div>
    </div>
  );
}
