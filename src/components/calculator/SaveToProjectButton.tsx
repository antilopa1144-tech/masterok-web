"use client";

import { useState, useEffect, useRef } from "react";

interface Project {
  id: string;
  name: string;
  created: number;
  entries: unknown[];
}

interface SaveEntry {
  calcId: string;
  calcTitle: string;
  slug: string;
  categorySlug: string;
  materials: { name: string; quantity: number; unit: string }[];
  ts: number;
}

const PROJECTS_KEY = "masterok-projects";

function loadProjects(): Project[] {
  try { return JSON.parse(localStorage.getItem(PROJECTS_KEY) ?? "[]"); } catch { return []; }
}

function saveEntryToProject(projectId: string, entry: SaveEntry) {
  try {
    const projects = loadProjects();
    const project = projects.find((p) => p.id === projectId);
    if (!project) return;
    const entries = project.entries as SaveEntry[];
    project.entries = [...entries.filter((e: SaveEntry) => e.calcId !== entry.calcId), entry];
    localStorage.setItem(PROJECTS_KEY, JSON.stringify(projects));
  } catch {}
}

interface Props {
  calcId: string;
  calcTitle: string;
  slug: string;
  categorySlug: string;
  materials: { name: string; quantity: number; unit: string }[];
}

export default function SaveToProjectButton({ calcId, calcTitle, slug, categorySlug, materials }: Props) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [open, setOpen] = useState(false);
  const [saved, setSaved] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setProjects(loadProjects());
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const handleSave = (projectId: string) => {
    saveEntryToProject(projectId, {
      calcId, calcTitle, slug, categorySlug,
      materials: materials.map((m) => ({ name: m.name, quantity: m.quantity, unit: m.unit })),
      ts: Date.now(),
    });
    setSaved(projectId);
    setTimeout(() => { setSaved(null); setOpen(false); }, 1000);
  };

  if (projects.length === 0) return null;

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
        title="Сохранить в проект"
      >
        📁 В проект
      </button>
      {open && (
        <div className="absolute bottom-full left-0 mb-2 w-48 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg z-50 overflow-hidden">
          <p className="text-[10px] text-slate-400 px-3 pt-2 pb-1 uppercase tracking-wider">Выберите проект</p>
          {projects.map((p) => (
            <button
              key={p.id}
              onClick={() => handleSave(p.id)}
              className="w-full text-left px-3 py-2 text-xs text-slate-700 dark:text-slate-200 hover:bg-accent-50 dark:hover:bg-accent-900/20 transition-colors flex items-center justify-between"
            >
              <span className="truncate">{p.name}</span>
              {saved === p.id && <span className="text-green-500 shrink-0">✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
