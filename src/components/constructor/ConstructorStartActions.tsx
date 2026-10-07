"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowUpRight, FolderOpen } from "lucide-react";
import { CONSTRUCTOR_EDITOR_URL, CONSTRUCTOR_SCENARIOS, CONSTRUCTOR_URL, scenarioHref, type ConstructorScenario } from "@/lib/constructor/entry";
import ConstructorImportAction from "./ConstructorImportAction";
import ConstructorSavedProjects from "./ConstructorSavedProjects";
import styles from "./constructor-entry.module.css";

export default function ConstructorStartActions({ scenario }: { scenario?: ConstructorScenario }) {
  const [savedProject, setSavedProject] = useState<{ id: string; name: string } | null>(null);
  useEffect(() => {
    let cancelled = false;
    // Keep the initial landing-page bundle independent of the calculation engine.
    import("@/lib/constructor/storage").then(({ loadWorkspace }) => loadWorkspace()).then((workspace) => {
      if (!cancelled && workspace) setSavedProject({ id: workspace.project.id, name: workspace.project.name });
    }).catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const savedHref = savedProject ? `${CONSTRUCTOR_EDITOR_URL}?project=${encodeURIComponent(savedProject.id)}` : undefined;
  const resume = !scenario && savedHref;
  const action = CONSTRUCTOR_SCENARIOS.find((item) => item.id === (scenario ?? "room"))!;

  return <div className={styles.startActions}>
    <Link href={resume || scenarioHref(action.id)} prefetch={false} className={styles.primaryAction}>
      {resume ? <FolderOpen size={19} /> : <ArrowUpRight size={20} />}
      {resume ? "Продолжить проект" : action.action}
    </Link>
    {scenario
      ? <Link href={savedHref ?? `${CONSTRUCTOR_URL}#scenarios`} prefetch={false} className={styles.secondaryAction}>{savedHref ? "Продолжить свой проект" : "Другие примеры"}</Link>
      : <a href="#scenarios" className={styles.secondaryAction}>Выбрать пример</a>}
    <p className={styles.startNote}>
      {scenario && <span>Откроется отдельный проект. Ваши сохранённые проекты останутся.<br /></span>}
      {savedProject ? `Сохранён в этом браузере: ${savedProject.name}` : "Бесплатно, без установки и регистрации"}
    </p>
    <ConstructorImportAction><ConstructorSavedProjects activeProjectId={savedProject?.id} /></ConstructorImportAction>
  </div>;
}
