import { describe, expect, it } from "vitest";
import { ALL_CHECKLISTS } from "./checklists";
import { buildChecklistRemainingText } from "./checklist-export";
import { getChecklistItemKeys } from "./checklist-progress";

describe("remaining checklist export", () => {
  const checklist = ALL_CHECKLISTS.find(item => item.slug === "priemka-plitki")!;
  it("omits completed items and stages but retains unchecked items from collapsed stages", () => {
    const text = buildChecklistRemainingText(checklist, new Set(["0:0", "0:1", "0:2", "0:3", "1:0"]));
    expect(text).not.toContain(checklist.steps[0].title);
    expect(text).not.toContain(checklist.steps[1].items[0]);
    expect(text).toContain(checklist.steps[1].items[1]);
    expect(text).toContain(checklist.steps[2].items[3]);
    expect(text.match(/☐ /g)).toHaveLength(7);
    expect(text).toContain("не результат осмотра");
    expect(text).toContain("https://getmasterok.ru/instrumenty/chek-listy/priemka-plitki/");
  });
  it("does not produce a misleading pending list when every check is done", () => {
    expect(buildChecklistRemainingText(checklist, new Set(getChecklistItemKeys(checklist)))).toBe("");
  });
});
