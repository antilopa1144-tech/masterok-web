import { describe, expect, it } from "vitest";
import { createScenarioWorkspace } from "./scenarios";
import { calculateProject } from "./core";
import { searchPurchases } from "./purchase-search";

describe("purchase list search", () => {
  const { project } = createScenarioWorkspace("bathroom");
  project.rooms[0].name = "Зелёная ванная";
  const lines = calculateProject(project).purchases;
  it("matches formats written with different separators and case", () => {
    for (const query of ["ПЛИТКА 600x300", "600×300", "600 х 300", "  600   300  "]) {
      const found = searchPurchases(lines, project.rooms, query);
      expect(found.length).toBeGreaterThan(0);
      expect(found.every(line => line.kind === "wall-tile")).toBe(true);
    }
  });
  it("finds room names with е/ё but preserves the full aggregated purchase row", () => {
    const grouped = { ...lines[0], roomIds: [project.rooms[0].id, "other-room"] };
    expect(searchPurchases([grouped], project.rooms, "зеленая")[0]).toBe(grouped);
  });
  it("returns the original list for an empty query and no matches for an unknown material", () => {
    expect(searchPurchases(lines, project.rooms, "   ")).toBe(lines);
    expect(searchPurchases(lines, project.rooms, "несуществующий товар")).toEqual([]);
  });
});
