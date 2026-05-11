"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { createProject, getProjects, saveEntryToProject } from "@/lib/storage/projects";
import type { ProjectWithEntries } from "@/lib/storage/types";

interface Props {
  calcId: string;
  calcTitle: string;
  slug: string;
  categorySlug: string;
  materials: { name: string; quantity: number; unit: string }[];
}

export default function SaveToProjectButton({ calcId, calcTitle, slug, categorySlug, materials }: Props) {
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
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const handleSave = async (projectId: string) => {
    await saveEntryToProject(projectId, {
      calcId, calcTitle, slug, categorySlug,
      materials: materials.map((m) => ({ name: m.name, quantity: m.quantity, unit: m.unit })),
      ts: Date.now(),
    });
    setSaved(projectId);
    setTimeout(() => { setSaved(null); setOpen(false); }, 1200);
  };

  const handleCreateAndSave = async () => {
    const name = newProjectName.trim();
    if (!name) return;
    setCreating(true);
    const project = await createProject(name);
    await handleSave(project.id);
    setNewProjectName("");
    setCreating(false);
    void loadProjects();
  };

  return (
    <div className="relative w-full sm:w-auto" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-transparent bg-accent-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:-translate-y-px hover:bg-accent-700 focus:outline-none focus:ring-2 focus:ring-accent-500/40 sm:w-auto"
        title="Сохранить расчёт в проект"
      >
        <svg className="w-4 h-4 shrink-0" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" d="M2 2.5A1.5 1.5 0 013.5 1h6.586a1.5 1.5 0 011.06.44l2.415 2.414A1.5 1.5 0 0114 4.914V12.5A1.5 1.5 0 0112.5 14h-9A1.5 1.5 0 012 12.5v-10z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 1v3.5A.5.5 0 005.5 5h5a.5.5 0 00.5-.5V1M8 8v4M6 10h4" />
        </svg>
        Сохранить расчёт
      </button>

      {open && (
        <div className="absolute bottom-full right-0 mb-2 w-64 rounded-2xl border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-900 z-50 overflow-hidden">
          <div className="border-b border-slate-100 px-4 py-3 dark:border-slate-800">
            <p className="text-xs font-bold text-slate-900 dark:text-slate-100">Сохранить в проект</p>
            <p className="mt-0.5 text-[11px] text-slate-400 dark:text-slate-500 truncate">{calcTitle}</p>
          </div>

          {projects.length > 0 && (
            <div className="max-h-40 overflow-y-auto">
              {projects.map((p) => (
                <button
                  key={p.id}
                  onClick={() => void handleSave(p.id)}
                  disabled={!!saved}
                  className="w-full text-left px-4 py-2.5 text-sm text-slate-700 dark:text-slate-200 hover:bg-accent-50 dark:hover:bg-accent-900/20 transition-colors flex items-center justify-between gap-2"
                >
                  <span className="truncate">{p.name}</span>
                  {saved === p.id ? (
                    <span className="shrink-0 flex items-center gap-1 text-[11px] font-semibold text-green-600 dark:text-green-400">
                      <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M3 8l3.5 3.5L13 5"/></svg>
                      Сохранено
                    </span>
                  ) : (
                    <span className="shrink-0 text-[10px] text-slate-400">{p.entries.length} расч.</span>
                  )}
                </button>
              ))}
            </div>
          )}

          <div className="border-t border-slate-100 p-3 dark:border-slate-800">
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
          </div>
        </div>
      )}
    </div>
  );
}
