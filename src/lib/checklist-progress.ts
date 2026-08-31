import type { Checklist } from "@/lib/checklists";
import type { ChecklistProgressMilestone } from "@/lib/analytics/events";

const STORAGE_PREFIX = "masterok:checklist-progress:v1:";
export const CHECKLIST_PROGRESS_MILESTONES = [25, 50, 75, 100] as const;

export function checklistItemKey(stepIndex: number, itemIndex: number): string {
  return `${stepIndex}:${itemIndex}`;
}

export function getChecklistItemKeys(checklist: Checklist): string[] {
  return checklist.steps.flatMap((step, stepIndex) =>
    step.items.map((_, itemIndex) => checklistItemKey(stepIndex, itemIndex)),
  );
}

export function sanitizeChecklistProgress(value: unknown, validKeys: ReadonlySet<string>): Set<string> {
  if (!Array.isArray(value)) return new Set();
  return new Set(value.filter((key): key is string => typeof key === "string" && validKeys.has(key)));
}

export function getChecklistMilestonesToReport(
  completedItems: number,
  totalItems: number,
  reported: ReadonlySet<ChecklistProgressMilestone>,
): ChecklistProgressMilestone[] {
  if (totalItems <= 0) return [];
  return CHECKLIST_PROGRESS_MILESTONES.filter(
    (milestone) => completedItems * 100 >= totalItems * milestone && !reported.has(milestone),
  );
}

export function loadChecklistProgress(slug: string, validKeys: ReadonlySet<string>): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = window.localStorage.getItem(`${STORAGE_PREFIX}${slug}`);
    return raw ? sanitizeChecklistProgress(JSON.parse(raw), validKeys) : new Set();
  } catch {
    return new Set();
  }
}

export function saveChecklistProgress(slug: string, checkedKeys: ReadonlySet<string>): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(`${STORAGE_PREFIX}${slug}`, JSON.stringify([...checkedKeys]));
  } catch {
    // Приватный режим или переполненное хранилище не должны ломать сам чек-лист.
  }
}
