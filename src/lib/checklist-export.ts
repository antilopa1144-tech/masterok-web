import type { Checklist } from "@/lib/checklists";
import { checklistItemKey } from "@/lib/checklist-progress";
import { SITE_URL } from "@/lib/site";

/** Незавершённые действия из всех этапов, независимо от раскрытого этапа и фильтра. */
export function buildChecklistRemainingText(checklist: Checklist, checkedKeys: ReadonlySet<string>): string {
  const stages = checklist.steps.flatMap((step, stepIndex) => {
    const items = step.items.filter((_, itemIndex) => !checkedKeys.has(checklistItemKey(stepIndex, itemIndex)));
    return items.length ? [`${step.title}\n${items.map(item => `☐ ${item}`).join("\n")}`] : [];
  });
  if (!stages.length) return "";
  return [
    checklist.title,
    "Осталось проверить (не список материалов и не результат осмотра):",
    ...stages,
    `${SITE_URL}/instrumenty/chek-listy/${checklist.slug}/`,
  ].join("\n\n");
}
