import { describe, expect, it } from "vitest";
import { calculateProject, createDefaultProject, validateProject, type Opening } from "./core";
import { applyOpeningDraft, createOpeningDraft, openingDraftIssues, openingOnWall, openingWithWidth } from "./opening-draft";
import { cloneValue, commitWorkspace, createWorkspace, redoWorkspace, undoWorkspace } from "./workspace";
import { createScenarioWorkspace } from "./scenarios";

describe("Preparing doors and windows before committing them", () => {
  it("keeps the chosen wall and existing suggestions, without changing the project or draft", () => {
    const project = createDefaultProject(), room = project.rooms[0], before = cloneValue(project);
    const draft = createOpeningDraft(room, "door", 2, "own-door");
    expect(draft).toMatchObject({ wall: 2, widthMm: 900, heightMm: 2100, offsetMm: 1050, sillMm: 0 });
    const next = applyOpeningDraft(project, room.id, draft, false);
    expect(project).toEqual(before); expect(next.rooms[0].openings).toEqual([draft]);
    next.rooms[0].openings[0].widthMm = 800;
    expect(draft.widthMm).toBe(900); expect(room.openings).toEqual([]);
  });

  it("supports small and fractional rooms, including a door spanning the complete wall", () => {
    const project = createDefaultProject(), room = project.rooms[0];
    Object.assign(room, { widthMm: 300.5, lengthMm: 600.25, heightMm: 500.5 });
    for (const type of ["door", "window"] as const) {
      const draft = createOpeningDraft(room, type, 1, type);
      expect(openingDraftIssues(project, room.id, draft, false)).toEqual([]);
    }
    const wholeWall: Opening = { id: "whole", type: "door", wall: 0, widthMm: room.widthMm, heightMm: room.heightMm, offsetMm: 0, sillMm: 0 };
    expect(validateProject(applyOpeningDraft(project, room.id, wholeWall, false))).toEqual([]);
  });

  it("suggests a free gap on the selected wall and preserves exact sizes when switching walls", () => {
    const project = createDefaultProject(), room = project.rooms[0];
    room.openings = [{ id: "existing", type: "door", wall: 1, offsetMm: 1550, widthMm: 900, heightMm: 2100, sillMm: 0 }];
    const first = createOpeningDraft(room, "window", 1, "window");
    expect(first).toMatchObject({ wall: 1, offsetMm: 0, widthMm: 1400, heightMm: 1400, sillMm: 810 });
    const moved = openingOnWall(room, { ...first, widthMm: 1200.5, heightMm: 1300.25, sillMm: 750.5 }, 3);
    expect(moved).toMatchObject({ wall: 3, widthMm: 1200.5, heightMm: 1300.25, sillMm: 750.5 });
    expect(openingDraftIssues(project, room.id, moved, false)).toEqual([]);
  });

  it("rejects overlaps, wall overflow and ceiling overflow before any project change", () => {
    const project = createDefaultProject(), room = project.rooms[0];
    room.openings = [createOpeningDraft(room, "door", 0, "existing")];
    const before = cloneValue(project);
    const overlap = { ...room.openings[0], id: "overlap" };
    expect(openingDraftIssues(project, room.id, overlap, false).join()).toContain("пересекаются");
    expect(() => applyOpeningDraft(project, room.id, overlap, false)).toThrow("пересекаются");
    expect(() => applyOpeningDraft(project, room.id, { ...overlap, offsetMm: 3000 }, false)).toThrow("границы стены");
    expect(() => applyOpeningDraft(project, room.id, { ...overlap, wall: 1, heightMm: 2701 }, false)).toThrow("высоту комнаты");
    expect(project).toEqual(before);
  });

  it("accepts maximum room bounds and applies the existing two-dimensional intersection rule", () => {
    const project = createDefaultProject(), room = project.rooms[0];
    Object.assign(room, { widthMm: 30000, lengthMm: 30000, heightMm: 6000 });
    const door = createOpeningDraft(room, "door", 0, "door"); room.openings = [door];
    const window: Opening = { ...door, id: "upper-window", type: "window", heightMm: 2000, sillMm: 2500 };
    expect(openingDraftIssues(project, room.id, window, false)).toEqual([]);
    expect(openingDraftIssues(project, room.id, { ...window, sillMm: 2000 }, false).join()).toContain("пересекаются");
    expect(() => applyOpeningDraft(project, room.id, { ...window, widthMm: 0 }, false)).toThrow("корректным числом");
    expect(() => applyOpeningDraft(project, room.id, { ...window, offsetMm: Number.NaN }, false)).toThrow("корректным числом");
  });

  it("keeps a full selected wall instead of quietly inserting on a different wall", () => {
    const project = createDefaultProject(), room = project.rooms[0];
    room.openings = [{ id: "full", type: "door", wall: 0, offsetMm: 0, widthMm: room.widthMm, heightMm: room.heightMm, sillMm: 0 }];
    const draft = createOpeningDraft(room, "door", 0, "new");
    expect(draft.wall).toBe(0); expect(openingDraftIssues(project, room.id, draft, false).join()).toContain("пересекаются");
    expect(openingDraftIssues(project, room.id, openingOnWall(room, draft, 1), false)).toEqual([]);
  });

  it("reduces the draft offset only when an increased exact width no longer fits", () => {
    const project = createDefaultProject(), room = project.rooms[0];
    const opening = { ...createOpeningDraft(room, "door", 0, "door"), offsetMm: 350.25 };
    expect(openingWithWidth(room, opening, 1000.5)).toMatchObject({ widthMm: 1000.5, offsetMm: 350.25 });
    expect(openingWithWidth(room, opening, 2800.5)).toMatchObject({ widthMm: 2800.5, offsetMm: 199.5 });
    expect(openingWithWidth(room, opening, 3000)).toMatchObject({ widthMm: 3000, offsetMm: 0 });
    expect(opening.offsetMm).toBe(350.25);
    expect(openingDraftIssues(project, room.id, openingWithWidth(room, opening, 3000), false)).toEqual([]);
  });

  it("replaces a complete opening in one undoable change without duplicating it", () => {
    const workspace = createWorkspace(), room = workspace.project.rooms[0];
    room.openings = [createOpeningDraft(room, "door", 0, "door")];
    const modified = { ...room.openings[0], wall: 1 as const, widthMm: 850.5, offsetMm: 350.25 };
    const next = { ...workspace, project: applyOpeningDraft(workspace.project, room.id, modified, true) };
    const history = commitWorkspace({ present: workspace, past: [], future: [] }, next);
    expect(history.present.project.rooms[0].openings).toEqual([modified]);
    expect(undoWorkspace(history).present.project.rooms[0].openings).toEqual(room.openings);
    expect(redoWorkspace(undoWorkspace(history)).present.project.rooms[0].openings).toEqual([modified]);
    expect(() => applyOpeningDraft(workspace.project, room.id, { ...modified, id: "missing" }, true)).toThrow("Проём не найден");
  });

  it("uses the existing calculation for wall area and plinth while leaving floor packaging unchanged", () => {
    const project = createScenarioWorkspace("bathroom").project, room = project.rooms[0];
    const baseline = calculateProject(project);
    const door = createOpeningDraft(room, "door", 1, "door");
    const next = applyOpeningDraft(project, room.id, door, false), after = calculateProject(next);
    expect(after.rooms[0].walls[1].netAreaM2).toBeCloseTo(baseline.rooms[0].walls[1].netAreaM2 - door.widthMm * door.heightMm / 1_000_000, 10);
    expect(after.rooms[0].plinthNeededMm).toBe(baseline.rooms[0].plinthNeededMm - door.widthMm);
    expect(after.rooms[0].floorTiles).toEqual(baseline.rooms[0].floorTiles);
    expect(next.rooms[0].floor).toEqual(room.floor); expect(next.rooms[0].wallTiles).toEqual(room.wallTiles);
  });
});
