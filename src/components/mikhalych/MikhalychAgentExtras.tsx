"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  createProject,
  getProjects,
  saveEntryToProject,
} from "@/lib/storage/projects";
import type { AgentProjectEntryPayload } from "@/lib/mikhalych/agent/types";

interface Props {
  projectEntries?: AgentProjectEntryPayload[];
  calculatorLinks?: Array<{ slug: string; title: string; url: string }>;
  toolsUsed?: string[];
  statusHint?: string | null;
  /** Рендер внутри всегда-тёмного виджета калькулятора (MikhalychWidget):
   *  карточку «В смету» делаем тёмной независимо от темы сайта, иначе светлый
   *  фон bg-accent-50 даёт белое пятно на тёмном виджете в светлой теме. */
  onDark?: boolean;
}

export default function MikhalychAgentExtras({
  projectEntries = [],
  calculatorLinks = [],
  toolsUsed = [],
  statusHint,
  onDark = false,
}: Props) {
  const [projects, setProjects] = useState<Array<{ id: string; name: string }>>([]);
  const [projectId, setProjectId] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");

  useEffect(() => {
    void getProjects().then((list) => {
      setProjects(list.map((p) => ({ id: p.id, name: p.name })));
      if (list[0] && !projectId) setProjectId(list[0].id);
    });
  }, [projectId]);

  const saveToProject = useCallback(async () => {
    if (!projectId || projectEntries.length === 0) return;
    setSaving(true);
    try {
      for (const entry of projectEntries) {
        await saveEntryToProject(projectId, entry);
      }
      setSaved(true);
    } finally {
      setSaving(false);
    }
  }, [projectId, projectEntries]);

  const createAndSave = useCallback(async () => {
    const name = newProjectName.trim();
    if (!name || projectEntries.length === 0) return;
    setSaving(true);
    try {
      const p = await createProject(name);
      setProjectId(p.id);
      setProjects((prev) => [{ id: p.id, name: p.name }, ...prev]);
      for (const entry of projectEntries) {
        await saveEntryToProject(p.id, entry);
      }
      setSaved(true);
      setNewProjectName("");
    } finally {
      setSaving(false);
    }
  }, [newProjectName, projectEntries]);

  if (
    !statusHint &&
    projectEntries.length === 0 &&
    calculatorLinks.length === 0 &&
    toolsUsed.length === 0
  ) {
    return null;
  }

  return (
    <div className="px-4 pb-2 space-y-2">
      {statusHint && (
        <p className="text-xs text-slate-500 dark:text-slate-400 italic">{statusHint}</p>
      )}

      {toolsUsed.length > 0 && (
        <p className="text-[11px] text-slate-400 dark:text-slate-500">
          Инструменты: {toolsUsed.join(", ")}
        </p>
      )}

      {calculatorLinks.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {calculatorLinks.map((l) => (
            <Link
              key={l.slug}
              href={l.url.replace(/^https?:\/\/[^/]+/, "")}
              className="text-xs text-accent-600 hover:underline dark:text-accent-400"
            >
              {l.title}
            </Link>
          ))}
        </div>
      )}

      {projectEntries.length > 0 && !saved && (
        <div className={`rounded-xl border p-3 space-y-2 ${
          onDark
            ? "border-white/10 bg-slate-900/50"
            : "border-accent-200 bg-accent-50/80 dark:border-accent-800/60 dark:bg-slate-800/60"
        }`}>
          <p className={`text-xs font-semibold ${onDark ? "text-slate-100" : "text-slate-800 dark:text-slate-100"}`}>
            Добавить {projectEntries.length === 1 ? "расчёт" : `${projectEntries.length} расчёта`} в смету проекта
          </p>
          {projects.length > 0 ? (
            <div className="flex flex-wrap gap-2 items-center">
              <select
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                className={`text-xs rounded-lg border px-2 py-1.5 ${
                  onDark
                    ? "border-white/10 bg-slate-800 text-slate-100"
                    : "border-slate-200 bg-white text-slate-800 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
                }`}
              >
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => void saveToProject()}
                disabled={saving || !projectId}
                className="text-xs font-bold text-white bg-accent-600 hover:bg-accent-700 px-3 py-1.5 rounded-lg disabled:opacity-50"
              >
                {saving ? "Сохраняю…" : "В смету"}
              </button>
              <Link
                href={projectId ? `/proekty/${projectId}/` : "/proekty/"}
                className="text-xs text-accent-700 dark:text-accent-300 hover:underline"
              >
                Открыть проект
              </Link>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2 items-center">
              <input
                type="text"
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                placeholder="Название проекта"
                className={`text-xs flex-1 min-w-[140px] rounded-lg border px-2 py-1.5 placeholder:text-slate-400 ${
                  onDark
                    ? "border-white/10 bg-slate-800 text-slate-100 placeholder:text-slate-500"
                    : "border-slate-200 bg-white text-slate-800 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500"
                }`}
              />
              <button
                type="button"
                onClick={() => void createAndSave()}
                disabled={saving || !newProjectName.trim()}
                className="text-xs font-bold text-white bg-accent-600 px-3 py-1.5 rounded-lg disabled:opacity-50"
              >
                Создать и сохранить
              </button>
            </div>
          )}
        </div>
      )}

      {saved && (
        <p className="text-xs text-green-700 dark:text-green-400">
          Сохранено в проект.{" "}
          <Link href={projectId ? `/proekty/${projectId}/` : "/proekty/"} className="underline">
            Открыть смету
          </Link>
        </p>
      )}
    </div>
  );
}
