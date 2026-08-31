import { describe, expect, it } from "vitest";
import { ALL_CHECKLISTS } from "./checklists";
import {
  checklistItemKey,
  getChecklistMilestonesToReport,
  getChecklistItemKeys,
  sanitizeChecklistProgress,
} from "./checklist-progress";

describe("checklist progress", () => {
  it("keeps only keys that still exist in a checklist", () => {
    const validKeys = new Set(["0:0", "0:1"]);
    expect([...sanitizeChecklistProgress(["0:0", "9:9", 12, "0:1"], validKeys)]).toEqual(["0:0", "0:1"]);
  });

  it("builds stable keys for every item", () => {
    const checklist = ALL_CHECKLISTS[0];
    const keys = getChecklistItemKeys(checklist);
    expect(keys[0]).toBe(checklistItemKey(0, 0));
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("keeps displayed item totals in sync with the real lists", () => {
    for (const checklist of ALL_CHECKLISTS) {
      expect(checklist.totalItems, checklist.slug).toBe(getChecklistItemKeys(checklist).length);
    }
  });

  it("reports only newly crossed progress milestones", () => {
    expect(getChecklistMilestonesToReport(8, 33, new Set())).toEqual([]);
    expect(getChecklistMilestonesToReport(9, 33, new Set())).toEqual([25]);
    expect(getChecklistMilestonesToReport(26, 33, new Set([25, 50]))).toEqual([75]);
    expect(getChecklistMilestonesToReport(33, 33, new Set([25, 50, 75]))).toEqual([100]);
    expect(getChecklistMilestonesToReport(1, 0, new Set())).toEqual([]);
  });
});
