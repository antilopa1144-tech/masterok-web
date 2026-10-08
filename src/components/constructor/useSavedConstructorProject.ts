"use client";

import { useEffect, useState } from "react";
import type { WorkspaceSummary } from "@/lib/constructor/storage";

/** Refresh on return from the editor or another tab, without changing storage. */
export default function useSavedConstructorProject(): WorkspaceSummary | null {
  const [project, setProject] = useState<WorkspaceSummary | null>(null);
  useEffect(() => {
    let active = true;
    let request = 0;
    const refresh = () => {
      if (document.visibilityState === "hidden") return;
      const current = ++request;
      import("@/lib/constructor/storage").then(({ loadWorkspace }) => loadWorkspace()).then((workspace) => {
        if (active && current === request) setProject(workspace ? { id: workspace.project.id, name: workspace.project.name, rooms: workspace.project.rooms.length, updatedAt: workspace.project.updatedAt } : null);
      }).catch(() => { if (active && current === request) setProject(null); });
    };
    refresh();
    window.addEventListener("pageshow", refresh);
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      active = false;
      window.removeEventListener("pageshow", refresh);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, []);
  return project;
}
