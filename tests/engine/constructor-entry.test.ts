import { describe, expect, it } from "vitest";
import { parseConstructorEntry } from "../../src/lib/constructor/entry";
import { createScenarioWorkspace } from "../../src/lib/constructor/scenarios";
import { createWorkspace, parseWorkspace, serializeWorkspace } from "../../src/lib/constructor/workspace";
import { calculateProject, validateProject } from "../../src/lib/constructor/core";

describe("Constructor scenario entry", () => {
  it("leaves the existing project intact and gives each example a separate identity", () => {
    const existing = createWorkspace();
    existing.project.rooms[0].widthMm = 4321;
    const original = serializeWorkspace(existing);
    const examples = [createScenarioWorkspace("room"), createScenarioWorkspace("bathroom"), createScenarioWorkspace("room")];
    expect(new Set([existing, ...examples].map((item) => item.project.id)).size).toBe(4);
    expect(serializeWorkspace(existing)).toBe(original);
  });
  it.each(["room", "bathroom", "laminate", "tile"] as const)("creates a valid, calculable, exportable %s example", (scenario) => {
    const workspace = createScenarioWorkspace(scenario);
    expect(validateProject(workspace.project)).toEqual([]);
    expect(calculateProject(workspace.project).rooms).toHaveLength(1);
    expect(parseWorkspace(JSON.parse(serializeWorkspace(workspace)))).toEqual(workspace);
  });
  it("starts the bathroom with floor and all four walls tiled, using independent specs", () => {
    const room = createScenarioWorkspace("bathroom").project.rooms[0];
    expect(room.floor.kind).toBe("tile");
    expect(room.interior?.items.some((item) => item.kind === "washer")).toBe(true);
    expect(room.wallTiles.every(Boolean)).toBe(true);
    room.wallTiles[0]!.jointMm = 4;
    expect(room.wallTiles[1]!.jointMm).toBe(2);
  });
  it("starts the laminate example without furniture hiding the floor", () => {
    const room = createScenarioWorkspace("laminate").project.rooms[0];
    expect(room.floor.kind ?? "laminate").toBe("laminate");
    expect(room.interior?.items).toEqual([]);
    expect(room.widthMm * room.lengthMm).toBe(12_000_000);
  });
  it("starts a tile floor without adding wall cladding or furnishings to the purchase", () => {
    const workspace = createScenarioWorkspace("tile");
    const room = workspace.project.rooms[0];
    expect(parseConstructorEntry("?start=tile").scenario).toBe("tile");
    expect(room.floor.kind).toBe("tile");
    expect(room.floor.tile).toBeDefined();
    expect(room.wallTiles).toEqual([null, null, null, null]);
    expect(room.interior?.items).toEqual([]);
    const result = calculateProject(workspace.project);
    expect(result.purchases).toHaveLength(1);
    expect(result.rooms[0].areaM2).toBe(12);
  });
  it("ignores unknown scenarios and validates project identifiers before selecting saved work", () => {
    expect(parseConstructorEntry("?start=bathroom").scenario).toBe("bathroom");
    expect(parseConstructorEntry("?start=unknown&project=saved-id")).toEqual({ scenario: undefined, projectId: "saved-id", newProject: false });
    expect(parseConstructorEntry(`?project=${"a".repeat(151)}`).projectId).toBeUndefined();
    expect(parseConstructorEntry("")).toEqual({ scenario: undefined, projectId: undefined, newProject: false });
  });
});
