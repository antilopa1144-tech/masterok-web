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
      <div className="card p-6 text-center space-y-3">
        <div className="text-3xl">📁</div>
        <p className="text-sm font-medium text-slate-700 dark:text-slate-200">Мои проекты</p>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Создайте проект для группировки расчётов. Например: «Ремонт кухни», «Дом 10×12».
        </p>
        <div className="flex gap-2 max-w-xs mx-auto">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Название проекта"
            className="input-field text-sm flex-1"
            onKeyDown={(e) => e.key === "Enter" && void createProject()}
          />
          <button onClick={() => void createProject()} className="btn-primary text-sm px-4">
            Создать
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="card p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">📁 Мои проекты</h3>
        <span className="text-xs text-slate-400">{projects.length}</span>
      </div>

      {/* Create new */}
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
          className="text-xs px-3 py-1.5 rounded-lg bg-accent-500 text-white font-medium disabled:opacity-40 transition-opacity"
        >
          +
        </button>
      </div>

      {/* Project list */}
      <div className="space-y-2">
        {projects.map((proj) => (
          <div key={proj.id} className="bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
            <button
              onClick={() => setExpandedId(expandedId === proj.id ? null : proj.id)}
              className="w-full flex items-center justify-between p-3 text-left hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <div>
                <span className="text-sm font-medium text-slate-900 dark:text-slate-100">{proj.name}</span>
                <span className="text-xs text-slate-400 ml-2">
                  {proj.entries.length} расч.
                </span>
                {estimates[proj.id]?.totalCost ? (
                  <span className="block mt-1 text-xs font-bold text-accent-700 dark:text-accent-400">
                    ≈ {estimates[proj.id].totalCost.toLocaleString("ru-RU")} ₽
                  </span>
                ) : null}
              </div>
              <span className={`text-slate-400 text-xs transition-transform ${expandedId === proj.id ? "rotate-180" : ""}`}>▼</span>
            </button>

            {expandedId === proj.id && (
              <div className="px-3 pb-3 space-y-1.5 border-t border-slate-200 dark:border-slate-700 pt-2">
                {estimates[proj.id] && (
                  <div className="rounded-xl border border-accent-100 bg-accent-50/70 p-3 text-xs dark:border-accent-900/50 dark:bg-accent-950/20">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-bold text-slate-800 dark:text-slate-100">Смета проекта</p>
                        <p className="mt-0.5 text-slate-500 dark:text-slate-400">
                          {estimates[proj.id].pricedItems} цен указано
                          {estimates[proj.id].missingPriceItems > 0
                            ? `, ${estimates[proj.id].missingPriceItems} без цены`
                            : ""}
                        </p>
                      </div>
                      <span className="shrink-0 text-base font-black tabular-nums text-accent-700 dark:text-accent-300">
                        {estimates[proj.id].totalCost > 0
                          ? `${estimates[proj.id].totalCost.toLocaleString("ru-RU")} ₽`
                          : "— ₽"}
                      </span>
                    </div>
                  </div>
                )}
                {proj.entries.length === 0 ? (
                  <p className="text-xs text-slate-400 py-2">
                    Откройте калькулятор и сохраните результат в этот проект
                  </p>
                ) : (
                  proj.entries.map((entry) => (
                    <Link
                      key={entry.calcId}
                      href={`/kalkulyatory/${entry.categorySlug}/${entry.slug}/`}
                      className="flex items-center justify-between p-2 rounded-lg hover:bg-white dark:hover:bg-slate-800 no-underline transition-colors"
                    >
                      <span className="text-xs font-medium text-slate-700 dark:text-slate-200">{entry.calcTitle}</span>
                      <span className="text-[10px] text-slate-400">
                        {entry.materials.slice(0, 2).map((m) => `${Math.round(m.quantity)} ${m.unit}`).join(", ")}
                      </span>
                    </Link>
                  ))
                )}
                <button
                  onClick={() => void deleteProject(proj.id)}
                  className="text-[10px] text-red-400 hover:text-red-600 transition-colors mt-1"
                >
                  Удалить проект
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
