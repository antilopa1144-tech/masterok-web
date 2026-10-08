"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { ArrowUpRight, FolderOpen, Search, X } from "lucide-react";
import { CONSTRUCTOR_EDITOR_URL, CONSTRUCTOR_URL } from "@/lib/constructor/entry";
import { filterWorkspaceSummaries } from "@/lib/constructor/project-list";
import type { WorkspaceSummary } from "@/lib/constructor/storage";
import { pluralizeRu } from "@/lib/format/pluralize";
import { trackEvent } from "@/lib/analytics";
import styles from "./ConstructorSavedProjects.module.css";

type ProjectsState = { status: "loading" } | { status: "ready"; projects: WorkspaceSummary[] } | { status: "error"; message: string };

export default function ConstructorSavedProjects({ activeProjectId, placement = "landing_saved_project" }: { activeProjectId?: string; placement?: "home_saved_project" | "landing_saved_project" }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const searchInput = useRef<HTMLInputElement>(null);
  const titleId = useId();
  const hintId = useId();
  const searchId = useId();
  const [ready, setReady] = useState(false);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<ProjectsState>({ status: "loading" });

  useEffect(() => { setReady(true); }, []);
  useEffect(() => {
    if (!open) return;
    const element = dialog.current!;
    const opener = trigger.current;
    const overflow = document.body.style.overflow;
    element.showModal();
    document.body.style.overflow = "hidden";
    return () => {
      element.close();
      document.body.style.overflow = overflow;
      if (opener?.isConnected) opener.focus();
    };
  }, [open]);
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setState({ status: "loading" });
    // Read the full list only when requested, keeping the landing page lightweight.
    import("@/lib/constructor/storage").then(({ listWorkspaces }) => listWorkspaces()).then((projects) => {
      if (!cancelled) setState({ status: "ready", projects });
    }).catch((error: unknown) => {
      if (!cancelled) setState({ status: "error", message: error instanceof Error ? error.message : "Не удалось прочитать проекты. Попробуйте ещё раз." });
    });
    return () => { cancelled = true; };
  }, [open, attempt]);

  const projects = state.status === "ready" ? filterWorkspaceSummaries(state.projects, query) : [];
  const clearSearch = () => { setQuery(""); searchInput.current?.focus(); };

  return <div className={styles.scope}>
    <button ref={trigger} type="button" className={styles.trigger} disabled={!ready} aria-haspopup="dialog" onClick={() => { setQuery(""); setOpen(true); }}><FolderOpen size={18} aria-hidden="true" />Мои проекты</button>
    <dialog ref={dialog} className={styles.dialog} aria-labelledby={titleId} aria-describedby={hintId} onCancel={() => setOpen(false)} onClose={() => setOpen(false)} onClick={(event) => { if (event.target === event.currentTarget) setOpen(false); }} onKeyDown={(event) => {
      if (event.key !== "Tab") return;
      const controls = Array.from(event.currentTarget.querySelectorAll<HTMLElement>("button:not(:disabled), a[href], input:not(:disabled)"));
      const first = controls[0]; const last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    }}>
      <div className={styles.header}><h2 id={titleId}>Сохранённые проекты</h2><button type="button" className={styles.close} aria-label="Закрыть список проектов" onClick={() => setOpen(false)}><X size={22} /></button></div>
      <div className={styles.body}>
        <p id={hintId} className={styles.hint}>Проекты конструктора в этом браузере. На другом устройстве откройте скачанный файл проекта.</p>
        {state.status === "loading" && <p className={styles.empty} role="status">Загружаем проекты…</p>}
        {state.status === "error" && <div className={styles.empty}><p role="alert">{state.message}</p><button type="button" className={styles.textButton} onClick={() => setAttempt((value) => value + 1)}>Попробовать ещё раз</button></div>}
        {state.status === "ready" && (state.projects.length === 0
          ? <div className={styles.empty}><FolderOpen size={30} aria-hidden="true" /><h3>Здесь пока нет проектов</h3><p>Начните с примера или закройте окно и откройте файл проекта.</p><Link href={`${CONSTRUCTOR_URL}#scenarios`} onClick={() => setOpen(false)}>Выбрать пример <ArrowUpRight size={16} /></Link></div>
          : <>
            <label className={styles.searchLabel} htmlFor={searchId}>Найти проект по названию</label>
            <div className={styles.search}><Search size={18} aria-hidden="true" /><input ref={searchInput} id={searchId} type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Например, ванная" autoComplete="off" maxLength={120} />{query && <button type="button" className={styles.clear} aria-label="Очистить поиск проектов" onClick={clearSearch}><X size={18} /></button>}</div>
            <p className={styles.count} role="status">{query.trim() ? `Найдено: ${projects.length} из ${state.projects.length}` : `Всего: ${state.projects.length} · Сначала последние изменения`}</p>
            {projects.length === 0
              ? <div className={styles.empty}><h3>Ничего не найдено</h3><p>Попробуйте часть названия или очистите поиск.</p><button type="button" className={styles.textButton} onClick={clearSearch}>Показать все проекты</button></div>
              : <ul className={styles.list}>{projects.map((project) => <li key={project.id}><Link href={`${CONSTRUCTOR_EDITOR_URL}?project=${encodeURIComponent(project.id)}`} prefetch={false} onClick={() => { trackEvent("constructor_entry", { placement, scenario: "continue" }); setOpen(false); }}>
                <FolderOpen className={styles.projectIcon} size={21} aria-hidden="true" /><span className={styles.projectText}><strong>{project.name}</strong><span className={styles.meta}>{project.rooms} {pluralizeRu(project.rooms, ["помещение", "помещения", "помещений"])} · <time dateTime={project.updatedAt}>{new Date(project.updatedAt).toLocaleString("ru-RU", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}</time></span>{project.id === activeProjectId && <span className={styles.current}>Последний открытый</span>}</span><ArrowUpRight size={18} aria-hidden="true" />
              </Link></li>)}</ul>}
          </>)}
      </div>
    </dialog>
  </div>;
}
