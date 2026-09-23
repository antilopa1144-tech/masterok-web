"use client";

import { useCallback, useEffect, useRef, useState } from 'react';

import { createProject, getProjects } from '@/lib/storage/projects';
import type { ProjectWithEntries } from '@/lib/storage/types';
import { saveProjectLayout, type ProjectLayoutDraft } from '@/lib/commerce/project-layouts';

interface Props {
  /** Renders the already visible current SVG to PNG. No external file is accepted. */
  createLayout: () => Promise<ProjectLayoutDraft>;
}

export default function SaveLayoutToProject({ createLayout }: Props) {
  const [projects, setProjects] = useState<ProjectWithEntries[]>([]);
  const [open, setOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'failed'>('idle');
  const [message, setMessage] = useState('');
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const loadProjects = useCallback(async () => setProjects(await getProjects()), []);
  useEffect(() => { if (open) void loadProjects(); }, [open, loadProjects]);
  useEffect(() => {
    if (!open || projects.length) return;
    const timeout = window.setTimeout(() => inputRef.current?.focus(), 50);
    return () => window.clearTimeout(timeout);
  }, [open, projects.length]);
  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent) => { if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false); };
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', close); document.addEventListener('keydown', escape);
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', escape); };
  }, [open]);

  const save = useCallback(async (projectId: string) => {
    setStatus('saving'); setMessage('');
    try {
      const layout = await createLayout();
      saveProjectLayout(window.localStorage, projectId, layout);
      setStatus('saved'); setMessage('Схема сохранена в проект. Добавьте её в комплект документов на странице проекта.');
    } catch (error) {
      setStatus('failed'); setMessage(error instanceof Error ? error.message : 'Не удалось сохранить схему. Повторите попытку.');
    }
  }, [createLayout]);

  const createAndSave = useCallback(async () => {
    const name = newProjectName.trim();
    if (!name) return;
    setStatus('saving'); setMessage('');
    try {
      const project = await createProject(name);
      const layout = await createLayout();
      saveProjectLayout(window.localStorage, project.id, layout);
      setProjects((items) => [project, ...items]); setNewProjectName('');
      setStatus('saved'); setMessage(`Проект «${project.name}» создан, схема сохранена.`);
    } catch (error) {
      setStatus('failed'); setMessage(error instanceof Error ? error.message : 'Не удалось создать проект и сохранить схему.');
    }
  }, [createLayout, newProjectName]);

  return <div ref={ref} className="relative w-full sm:w-auto">
    <button type="button" onClick={() => { setOpen((value) => !value); setStatus('idle'); setMessage(''); }} aria-expanded={open} aria-haspopup="dialog" className="inline-flex min-h-11 w-full items-center justify-center rounded-xl border border-accent-200 bg-accent-50 px-3 text-xs font-semibold text-accent-700 transition-colors hover:bg-accent-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500/50 dark:border-accent-900/60 dark:bg-accent-950/30 dark:text-accent-300 sm:w-auto">
      + Сохранить раскладку в проект
    </button>
    {open && <div role="dialog" aria-label="Сохранить раскладку в проект" className="absolute bottom-full right-0 z-50 mb-2 w-80 max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-900">
      <div className="border-b border-slate-100 px-4 py-3 dark:border-slate-800"><p className="text-sm font-bold text-slate-900 dark:text-slate-100">Сохранить схему</p><p className="mt-0.5 text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">Сохраним текущую раскладку из этого инструмента. Не загружаем внешние изображения.</p></div>
      {status === 'saved' ? <div className="p-4"><p role="status" className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">Готово</p><p className="mt-1 text-xs leading-relaxed text-slate-600 dark:text-slate-300">{message}</p><button type="button" className="mt-4 min-h-11 w-full rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-700 dark:border-slate-700 dark:text-slate-200" onClick={() => setOpen(false)}>Остаться в раскладке</button></div> : <>
        {projects.length > 0 && <div className="max-h-44 overflow-y-auto">{projects.map((project) => <button key={project.id} type="button" disabled={status === 'saving'} onClick={() => void save(project.id)} className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left text-sm text-slate-700 hover:bg-accent-50 disabled:opacity-50 dark:text-slate-200 dark:hover:bg-accent-900/20"><span className="truncate">{project.name}</span><span className="shrink-0 text-[10px] text-slate-400">Сохранить</span></button>)}</div>}
        <div className="border-t border-slate-100 p-3 dark:border-slate-800"><p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">{projects.length ? 'Новый проект' : 'Создать первый проект'}</p><div className="flex gap-2"><input ref={inputRef} value={newProjectName} onChange={(event) => setNewProjectName(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') void createAndSave(); }} placeholder="Название проекта" className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2 text-xs text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200" /><button type="button" disabled={!newProjectName.trim() || status === 'saving'} onClick={() => void createAndSave()} className="rounded-lg bg-accent-600 px-3 text-xs font-bold text-white disabled:opacity-50">{status === 'saving' ? '…' : 'Создать'}</button></div>{status === 'failed' && <p role="alert" className="mt-2 text-xs leading-relaxed text-red-600 dark:text-red-300">{message}</p>}</div>
      </>}
    </div>}
  </div>;
}
