import { describe, expect, it } from "vitest";
import { TOOL_CARDS } from "./config";
import { GROUPED_TOOL_CARDS, TOOL_GROUPS } from "./groups";

describe("tool navigation groups", () => {
  it("assigns every registered card exactly once, without stale slugs", () => {
    const assigned = TOOL_GROUPS.flatMap(group => [...group.slugs]);
    expect(new Set(assigned).size).toBe(assigned.length);
    expect([...assigned].sort()).toEqual(TOOL_CARDS.map(tool => tool.slug).sort());
  });
  it("preserves card routes and data from the registry", () => {
    for (const group of GROUPED_TOOL_CARDS) {
      expect(group.tools.length).toBeGreaterThan(0);
      for (const tool of group.tools) expect(TOOL_CARDS).toContain(tool);
    }
  });
});
