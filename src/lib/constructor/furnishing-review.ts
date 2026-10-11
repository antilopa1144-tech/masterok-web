import type { ConstructorRoom } from "./core";
import { furnishingIssues, furnishingName, interiorFor, layoutFurnishings, type FurnishingIssue, type FurnishingLayout } from "./interiors";

export interface FurnishingReviewItem {
  id: string;
  name: string;
  omitted: boolean;
  issues: FurnishingIssue[];
}

/** One entry per actual instance. Reviewing never changes positions or material quantities. */
export function reviewFurnishings(room: ConstructorRoom, layout: FurnishingLayout = layoutFurnishings(room)): FurnishingReviewItem[] {
  const issues = furnishingIssues(room, layout);
  const omitted = new Set(layout.omitted);
  return interiorFor(room).items.flatMap((item) => {
    const ownIssues = issues.filter((issue) => issue.id === item.id);
    return omitted.has(item.id) || ownIssues.length
      ? [{ id: item.id, name: furnishingName(room, item.id), omitted: omitted.has(item.id), issues: ownIssues }]
      : [];
  });
}
