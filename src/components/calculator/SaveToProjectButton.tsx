"use client";

import Link from "next/link";
import { useState, useEffect, useRef, useCallback } from "react";
import { createProject, getProjects, saveEntryToProject } from "@/lib/storage/projects";
import type { ProjectWithEntries } from "@/lib/storage/types";
import { calendarHref } from "@/lib/renovation-hub/context";
import type { RenovationScenarioId } from "@/lib/renovation-calendar/scenarios";
import { trackCalculatorRelatedClick, trackProjectSave } from "@/lib/analytics";

interface Props {
  calcId: string;
  calcTitle: string;
  slug: string;
  categorySlug: string;
  materials: { name: string; subtitle?: string; quantity: number; unit: string; category?: string }[];
  /** Ссылка на календарь после сохранения. */
  calendarScenarioId?: RenovationScenarioId | null;
}

export default function SaveToProjectButton({
  calcId,
  calcTitle,
  slug,
  categorySlug,
  materials,
  calendarScenarioId,
}: Props) {
  const [projects, setProjects] = useState<ProjectWithEntries[]>([]);
  const [open, setOpen] = useState(false);
  const [saved, setSaved] = useState<string | null>(null);
  const [newProjectName, setNewProjectName] = useState("");
  const [creating, setCreating] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const loadProjects = useCallback(async () => {
    const items = await getProjects();
    setProjects(items);
  }, []);

  useEffect(() => {
    if (open) void loadProjects();
  }, [open, loadProjects]);

  useEffect(() => {
    if (open && projects.length === 0) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open, projects.length]);

  useEffect(() => {
    if (!open) return;
    const clickHandler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const keyHandler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", clickHandler);
    document.addEventListener("keydown", keyHandler);
    return () => {
      document.removeEventListener("mousedown", clickHandler);
      document.removeEventListener("keydown", keyHandler);
    };
  }, [open]);

  const handleSave = async (projectId: string, createdProject = false) => {
    await saveEntryToProject(projectId, {
      calcId, calcTitle, slug, categorySlug,
      materials: materials.map((m) => ({
        name: m.name,
        ...(m.subtitle ? { subtitle: m.subtitle } : {}),
        quantity: m.quantity,
        unit: m.unit,
        ...(m.category ? { category: m.category } : {}),
      })),
      ts: Date.now(),
    });
    trackProjectSave(calcId, createdProject);
    setSaved(projectId);
  };

  const handleCreateAndSave = async () => {
    const name = newProjectName.trim();
    if (!name) return;
    setCreating(true);
    const project = await createProject(name);
    await handleSave(project.id, true);
    setNewProjectName("");
    setCreating(false);
    void loadProjects();
  };

  return (
    <div className="relative w-full sm:w-auto" ref={ref}>
      <button
        onClick={() => {
          setSaved(null);
          setOpen(!open);
        }}
        aria-expanded={open}
        aria-haspopup="dialog"
        className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-transparent bg-accent-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:-translate-y-px hover:bg-accent-700 focus:outline-none focus:ring-2 focus:ring-accent-500/40 sm:w-auto"
        title="Сохранить расчёт в проект"
      >
        <svg className="w-4 h-4 shrink-0" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" d="M2 2.5A1.5 1.5 0 013.5 1h6.586a1.5 1.5 0 011.06.44l2.415 2.414A1.5 1.5 0 0114 4.914V12.5A1.5 1.5 0 0112.5 14h-9A1.5 1.5 0 012 12.5v-10z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 1v3.5A.5.5 0 005.5 5h5a.5.5 0 00.5-.5V1M8 8v4M6 10h4" />
        </svg>
        В проект
      </button>

      {open && (
        <div role="dialog" aria-label="Сохранить расчёт в проект" className="absolute bottom-full right-0 z-50 mb-2 w-72 max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-900">
          <div className="border-b border-slate-100 px-4 py-3 dark:border-slate-800">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-900 dark:text-slate-100">Мой ремонт</p>
                <p className="mt-0.5 text-[11px] text-slate-400 dark:text-slate-500 truncate">{calcTitle}</p>
              </div>
              <Link
                href="/proekty/"
                className="shrink-0 text-[10px] font-medium text-accent-600 hover:text-accent-700 dark:text-accent-400 no-underline"
                onClick={() => setOpen(false)}
              >
                Все →
              </Link>
            </div>
          </div>

          {saved ? (
            <div className="p-4">
              <div className="flex items-start gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-green-100 text-green-700 dark:bg-green-950/50 dark:text-green-300" aria-hidden>
                  <svg className="h-5 w-5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M3 8l3.5 3.5L13 5"/></svg>
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-slate-900 dark:text-slate-100">Расчёт добавлен</p>
                  <p className="mt-0.5 truncate text-xs text-slate-500 dark:text-slate-400">
                    {projects.find((project) => project.id === saved)?.name ?? "Новый проект"}
                  </p>
                </div>
              </div>
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                <Link
                  href={`/proekty/${saved}`}
                  className="btn-primary min-h-11 justify-center px-3 text-xs no-underline"
                  onClick={() => setOpen(false)}
                >
                  Открыть смету →
                </Link>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="btn-secondary min-h-11 justify-center px-3 text-xs"
                >
                  Остаться здесь
                </button>
              </div>
            </div>
          ) : projects.length > 0 && (
            <div className="max-h-40 overflow-y-auto">
              {projects.map((p) => (
                <button
                  key={p.id}
                  onClick={() => void handleSave(p.id)}
                  className="w-full text-left px-4 py-2.5 text-sm text-slate-700 dark:text-slate-200 hover:bg-accent-50 dark:hover:bg-accent-900/20 transition-colors flex items-center justify-between gap-2"
                >
                  <span className="truncate">{p.name}</span>
                  <span className="shrink-0 text-[10px] text-slate-400">{p.entries.length} расч.</span>
                </button>
              ))}
            </div>
          )}

          {!saved && calendarScenarioId && (
            <div className="border-t border-slate-100 px-3 py-2 dark:border-slate-800">
              <Link
                href={calendarHref(calendarScenarioId)}
                className="text-[11px] font-medium text-sky-700 hover:text-sky-900 dark:text-sky-300 no-underline"
                onClick={() => {
                  trackCalculatorRelatedClick(slug, "kalendar-remonta");
                  setOpen(false);
                }}
              >
                📅 Календарь этапов →
              </Link>
            </div>
          )}
          {!saved && <div className="border-t border-slate-100 p-3 dark:border-slate-800">
            <p className="mb-2 text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              {projects.length === 0 ? "Создать первый проект" : "Новый проект"}
            </p>
            <div className="flex gap-2">
              <input
                ref={inputRef}
                type="text"
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && void handleCreateAndSave()}
                placeholder="Название проекта..."
                className="flex-1 min-w-0 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-accent-500/30 focus:border-accent-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              />
              <button
                onClick={() => void handleCreateAndSave()}
                disabled={!newProjectName.trim() || creating}
                className="shrink-0 rounded-lg bg-accent-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-accent-700 disabled:opacity-40 transition-colors"
              >
                {creating ? "…" : "Создать"}
              </button>
            </div>
          </div>}
        </div>
      )}
    </div>
  );
}
