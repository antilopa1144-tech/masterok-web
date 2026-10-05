"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowUpRight, FolderOpen } from "lucide-react";
import { CONSTRUCTOR_EDITOR_URL, scenarioHref } from "@/lib/constructor/entry";
import styles from "./constructor-entry.module.css";

export default function ConstructorStartActions() {
  const [savedProject, setSavedProject] = useState<{ id: string; name: string } | null>(null);
  useEffect(() => {
    let cancelled = false;
    // Keep the initial landing-page bundle independent of the calculation engine.
    import("@/lib/constructor/storage").then(({ loadWorkspace }) => loadWorkspace()).then((workspace) => {
      if (!cancelled && workspace) setSavedProject({ id: workspace.project.id, name: workspace.project.name });
    }).catch(() => {});
    return () => { cancelled = true; };
  }, []);

  return <div className={styles.startActions}>
    <Link href={savedProject ? `${CONSTRUCTOR_EDITOR_URL}?project=${encodeURIComponent(savedProject.id)}` : scenarioHref("room")} prefetch={false} className={styles.primaryAction}>
      {savedProject ? <FolderOpen size={19} /> : <ArrowUpRight size={20} />}
      {savedProject ? "Продолжить проект" : "Создать комнату"}
    </Link>
    <a href="#scenarios" className={styles.secondaryAction}>Выбрать пример</a>
    <p className={styles.startNote}>{savedProject ? `Сохранён в этом браузере: ${savedProject.name}` : "Бесплатно, без установки и регистрации"}</p>
  </div>;
}
