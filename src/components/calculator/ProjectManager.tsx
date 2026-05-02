"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  createProject as createStoredProject,
  deleteProject as deleteStoredProject,
  getProjects,
  saveEntryToProject as saveStoredEntryToProject,
} from "@/lib/storage/projects";
import type { ProjectWithEntries, StoredProjectEntry } from "@/lib/storage/types";
import { buildProjectEstimates, type ProjectEstimate } from "@/lib/projects/estimate";

export async function saveToProject(projectId: string, entry: Omit<StoredProjectEntry, "id" | "projectId">) {
  await saveStoredEntryToProject(projectId, entry);
}

function formatCost(value: number) {
  return value.toLocaleString("ru-RU", { maximumFractionDigits: 0 });
}

function ProjectEstimateBar({ estimate }: { estimate: ProjectEstimate }) {
  const total = estimate.pricedItems + estimate.missingPriceItems;
  const pct = total > 0 ? Math.round((estimate.pricedItems / total) * 100) : 0;

  return (
    <div className="mt-3 space-y-2">
      {/* Итоговая строка */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">Итого материалы</span>
          {estimate.missingPriceItems > 0 && (
            <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
              {estimate.missingPriceItems} без цены
            </span>
          )}
        </div>
        <span className="text-sm font-black tabular-nums text-accent-700 dark:text-accent-300">
          {estimate.totalCost > 0 ? `${formatCost(estimate.totalCost)} ₽` : "— ₽"}
        </span>
      </div>

      {/* Прогресс заполненности цен */}
      {total > 0 && (
        <div className="space-y-1">
          <div className="flex justify-between text-[10px] text-slate-400">
            <span>Указано цен: {estimate.pricedItems} из {total}</span>
            <span>{pct}%</span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-slate-100 dark:bg-slate-800">
            <div
              className="h-1.5 rounded-full bg-accent-500 transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      )}

      {/* Строки по каждому расчёту */}
      {estimate.lines.length > 0 && (
        <div className="mt-2 space-y-1">
          {estimate.lines.map((line) => (
            <div key={line.entryId} className="flex items-center justify-between gap-2 text-[11px]">
              <Link
                href={`/kalkulyatory/${line.slug.includes("/") ? line.slug : `${line.slug}`}`}
                className="min-w-0 truncate text-slate-600 hover:text-accent-700 dark:text-slate-400 dark:hover:text-accent-400 no-underline"
              >
                {line.calcTitle}
              </Link>
              <span className="shrink-0 tabular-nums text-slate-700 dark:text-slate-300">
                {line.estimatedCost > 0 ? `${formatCost(line.estimatedCost)} ₽` : "—"}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function ProjectManager() {
  const [projects, setProjects] = useState<ProjectWithEntries[]>([]);
  const [estimates, setEstimates] = useState<Record<string, ProjectEstimate>>({});
  const [newName, setNewName] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const refreshProjects = useCallback(async () => {
    const items = await getProjects();
    setProjects(items);
    setEstimates(await buildProjectEstimates(items));
  }, []);

  useEffect(() => {
    void refreshProjects();
  }, [refreshProjects]);

  const createProject = useCallback(async () => {
    const name = newName.trim();
    if (!name) return;
    const project = await createStoredProject(name);
    setProjects((prev) => [project, ...prev]);
    setEstimates((prev) => ({
      ...prev,
      [project.id]: {
        projectId: project.id,
        totalCost: 0,
        pricedItems: 0,
        missingPriceItems: 0,
        calculationsCount: 0,
        lines: [],
      },
    }));
    setNewName("");
    setExpandedId(project.id);
  }, [newName]);

  const deleteProject = useCallback(async (id: string) => {
    await deleteStoredProject(id);
    setProjects((prev) => prev.filter((p) => p.id !== id));
    setEstimates((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }, []);

  if (projects.length === 0 && !newName) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/70 p-5 text-center dark:border-slate-700 dark:bg-slate-900/40">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-white shadow-sm dark:bg-slate-800">
          <svg className="h-6 w-6 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
          </svg>
        </div>
        <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">Мои проекты</p>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
          Сохраняйте расчёты по проектам и смотрите общую смету.
        </p>
        <div className="mt-3 flex gap-2 max-w-xs mx-auto">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Название проекта..."
            className="input-field text-xs flex-1 py-2"
            onKeyDown={(e) => e.key === "Enter" && void createProject()}
          />
          <button onClick={() => void createProject()} className="btn-primary text-xs px-4 py-2">
            Создать
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Мои проекты</h3>
        <Link href="/proekty/" className="text-xs font-medium text-accent-700 hover:text-accent-800 no-underline dark:text-accent-400">
          Все →
        </Link>
      </div>

      {/* Список проектов */}
      <div className="space-y-2">
        {projects.map((proj) => {
          const est = estimates[proj.id];
          const isExpanded = expandedId === proj.id;
          return (
            <div
              key={proj.id}
              className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900"
            >
              <button
                onClick={() => setExpandedId(isExpanded ? null : proj.id)}
                className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-accent-50 text-accent-600 dark:bg-accent-900/20 dark:text-accent-400">
                    <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
                    </svg>
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">{proj.name}</p>
                    <p className="text-[11px] text-slate-400 dark:text-slate-500">{proj.entries.length} расчётов</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {est?.totalCost ? (
                    <span className="text-xs font-bold tabular-nums text-accent-700 dark:text-accent-300">
                      {formatCost(est.totalCost)} ₽
                    </span>
                  ) : null}
                  <svg
                    className={`h-4 w-4 text-slate-400 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                    viewBox="0 0 20 20" fill="currentColor"
                  >
                    <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
                  </svg>
                </div>
              </button>

              {isExpanded && (
                <div className="border-t border-slate-100 px-4 pb-4 pt-3 dark:border-slate-800">
                  {proj.entries.length === 0 ? (
                    <p className="text-xs text-slate-400 dark:text-slate-500 py-1">
                      Нажмите &quot;В проект&quot; после расчёта, чтобы сохранить сюда.
                    </p>
                  ) : est ? (
                    <ProjectEstimateBar estimate={est} />
                  ) : null}

                  <div className="mt-3 flex items-center justify-between gap-3">
                    <Link
                      href={`/proekty/${proj.id}`}
                      className="text-xs font-medium text-accent-700 hover:text-accent-800 no-underline dark:text-accent-400"
                    >
                      Открыть смету →
                    </Link>
                    <button
                      onClick={() => void deleteProject(proj.id)}
                      className="text-[11px] text-red-400 hover:text-red-600 transition-colors"
                    >
                      Удалить
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Создать новый */}
      <div className="flex gap-2">
        <input
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="Новый проект..."
          className="input-field text-xs flex-1 py-1.5"
          onKeyDown={(e) => e.key === "Enter" && void createProject()}
        />
        <button
          onClick={() => void createProject()}
          disabled={!newName.trim()}
          className="shrink-0 rounded-lg bg-accent-500 px-3 py-1.5 text-xs font-bold text-white hover:bg-accent-600 disabled:opacity-40 transition-colors"
        >
          +
        </button>
      </div>
    </div>
  );
}
