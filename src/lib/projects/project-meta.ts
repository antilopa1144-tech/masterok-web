import type { ProjectEstimateMeta } from "@/lib/storage/types";

const KEY_PREFIX = "masterok:project-meta:";

const DEFAULT_META: ProjectEstimateMeta = {
  reservePercent: 0,
  deliveryRub: 0,
};

export function loadProjectMeta(projectId: string): ProjectEstimateMeta {
  if (typeof window === "undefined") return { ...DEFAULT_META };
  try {
    const raw = localStorage.getItem(`${KEY_PREFIX}${projectId}`);
    if (!raw) return { ...DEFAULT_META };
    const parsed = JSON.parse(raw) as Partial<ProjectEstimateMeta>;
    return {
      reservePercent: Math.max(0, Math.min(30, Number(parsed.reservePercent) || 0)),
      deliveryRub: Math.max(0, Number(parsed.deliveryRub) || 0),
    };
  } catch {
    return { ...DEFAULT_META };
  }
}

export function saveProjectMeta(projectId: string, meta: ProjectEstimateMeta): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(`${KEY_PREFIX}${projectId}`, JSON.stringify(meta));
}
