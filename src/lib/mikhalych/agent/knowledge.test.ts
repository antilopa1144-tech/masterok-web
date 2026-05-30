import { describe, expect, it } from "vitest";
import { searchKnowledgeBase } from "./knowledge";

describe("searchKnowledgeBase", () => {
  it("находит тему гидроизоляции", () => {
    const hits = searchKnowledgeBase("гидроизоляция ванная", 3);
    expect(hits.length).toBeGreaterThan(0);
    expect(hits[0].id).toBe("bathroom-waterproof");
  });
});
