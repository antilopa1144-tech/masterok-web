import { describe, expect, it } from "vitest";
import { filterWorkspaceSummaries } from "../../src/lib/constructor/project-list";
import type { WorkspaceSummary } from "../../src/lib/constructor/storage";

const projects: WorkspaceSummary[] = [
  { id: "new", name: "Ванная — тёплый камень", updatedAt: "2026-10-07T10:00:00Z", rooms: 1 },
  { id: "floor", name: "Кухня и пол", updatedAt: "2026-10-06T10:00:00Z", rooms: 2 },
  { id: "old", name: "Ванная — тёплый камень", updatedAt: "2026-10-05T10:00:00Z", rooms: 3 },
];

describe("Finding a saved constructor project", () => {
  it("matches fragments regardless of case, word order, whitespace and ё", () => {
    expect(filterWorkspaceSummaries(projects, "  ТЕПЛЫЙ   ванн  ").map(({ id }) => id)).toEqual(["new", "old"]);
  });
  it("keeps every namesake and its exact identity in the original order", () => {
    const snapshot = structuredClone(projects);
    expect(filterWorkspaceSummaries(projects, "ванная")).toEqual([projects[0], projects[2]]);
    expect(projects).toEqual(snapshot);
  });
  it("returns all projects for an empty or whitespace-only query", () => {
    expect(filterWorkspaceSummaries(projects, "")).toEqual(projects);
    expect(filterWorkspaceSummaries(projects, " \n\t ")).toEqual(projects);
  });
  it("requires all query words and handles a missing result", () => {
    expect(filterWorkspaceSummaries(projects, "ванная кухня")).toEqual([]);
    expect(filterWorkspaceSummaries(projects, "несуществующий")).toEqual([]);
    expect(filterWorkspaceSummaries([], "ванная")).toEqual([]);
  });
  it("matches user text literally without interpreting regular expressions", () => {
    const item = { ...projects[0], name: "Ванная [вариант 2]" };
    expect(filterWorkspaceSummaries([item], "[вариант")).toEqual([item]);
    expect(filterWorkspaceSummaries([item], ".*")).toEqual([]);
  });
});
