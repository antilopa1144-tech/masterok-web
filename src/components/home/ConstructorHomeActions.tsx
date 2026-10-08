"use client";

import Link from "next/link";
import { ArrowRight, Check, FolderOpen } from "lucide-react";
import { CONSTRUCTOR_EDITOR_URL, CONSTRUCTOR_URL } from "@/lib/constructor/entry";
import { pluralizeRu } from "@/lib/format/pluralize";
import ConstructorEntryLink from "@/components/constructor/ConstructorEntryLink";
import ConstructorSavedProjects from "@/components/constructor/ConstructorSavedProjects";
import useSavedConstructorProject from "@/components/constructor/useSavedConstructorProject";
import styles from "./ConstructorHero.module.css";

export default function ConstructorHomeActions() {
  const project = useSavedConstructorProject();
  return <>
    <div className={styles.actions}>
      <ConstructorEntryLink placement={project ? "home_resume" : "home_primary"} href={project ? `${CONSTRUCTOR_EDITOR_URL}?project=${encodeURIComponent(project.id)}` : CONSTRUCTOR_EDITOR_URL} prefetch={false} className={styles.primary}>
        {project ? <FolderOpen size={20} aria-hidden="true" /> : null}{project ? "Продолжить проект" : "Открыть конструктор"}<ArrowRight size={20} aria-hidden="true" />
      </ConstructorEntryLink>
      <Link href={CONSTRUCTOR_URL} prefetch={false} className={styles.secondary}>Посмотреть возможности</Link>
    </div>
    {project ? <div className={styles.savedProject} aria-label="Последний проект в этом браузере">
      <p className={styles.savedLabel}>Сохранён в этом браузере</p>
      <strong>{project.name}</strong>
      <p className={styles.savedMeta}>{project.rooms} {pluralizeRu(project.rooms, ["помещение", "помещения", "помещений"])} · <time dateTime={project.updatedAt}>{new Date(project.updatedAt).toLocaleString("ru-RU", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</time></p>
      <ConstructorSavedProjects activeProjectId={project.id} placement="home_saved_project" />
    </div> : <p className={styles.note}><Check size={16} aria-hidden="true" />Бесплатно. Без установки и регистрации.</p>}
  </>;
}
