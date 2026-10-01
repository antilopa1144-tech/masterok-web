import { describe, expect, it } from "vitest";
import { calculateProject } from "../../engine/constructor/calculate";
import { cloneValue, commitWorkspace, createWorkspace, importWorkspaceFile, MAX_PROJECT_FILE_BYTES, MAX_VARIANTS, parseWorkspace, redoWorkspace, serializeWorkspace, undoWorkspace, type WorkspaceHistory } from "../../src/lib/constructor/workspace";
import { openingPlanPosition, planSvg } from "../../src/lib/constructor/presentation";

describe("Constructor project recovery", () => {
  it("round-trips rooms, prices and independent variants without replacing the original", () => {
    const workspace = createWorkspace(); const room = workspace.project.rooms[0];
    room.name = "Гостиная"; room.floor.packPriceRub = 2345.67;
    room.openings.push({ id: "door", type: "door", wall: 2, offsetMm: 100, widthMm: 900, heightMm: 2100, sillMm: 0 });
    workspace.variants.push({ id: "variant", name: "Исходный", rooms: cloneValue(workspace.project.rooms), savedAt: new Date().toISOString() });
    room.floor.direction = "width";
    const copy = importWorkspaceFile(serializeWorkspace(workspace));
    expect(copy.project.id).not.toBe(workspace.project.id);
    expect(copy.project.rooms).toEqual(workspace.project.rooms);
    expect(copy.variants).toEqual(workspace.variants);
    expect(copy.variants[0].rooms[0].floor.direction).toBe("length");
    expect(calculateProject(copy.project)).toEqual(calculateProject(workspace.project));
  });

  it("rejects malformed files and unsupported versions before reading nested data", () => {
    expect(() => importWorkspaceFile("not json")).toThrow("JSON");
    expect(() => parseWorkspace(null)).toThrow("версия от 1 до 5");
    const workspace = createWorkspace();
    expect(() => parseWorkspace({ ...workspace, version: 6 })).toThrow("версия от 1 до 5");
    expect(() => parseWorkspace({ ...workspace, project: { ...workspace.project, rooms: [{ floor: null }] } })).toThrow("повреждены");
    workspace.project.rooms[0].floor.boardsPerPack = 2.5;
    expect(() => importWorkspaceFile(JSON.stringify(workspace))).toThrow("целым");
  });

  it("validates saved variants as strictly as the current room", () => {
    const workspace = createWorkspace();
    workspace.variants.push({ id: "v1", name: "Вариант", rooms: cloneValue(workspace.project.rooms), savedAt: new Date().toISOString() });
    workspace.variants[0].rooms[0].openings.push({ id: "bad-door", type: "door", wall: 0, offsetMm: 2950, widthMm: 900, heightMm: 2100, sillMm: 0 });
    expect(() => parseWorkspace(workspace)).toThrow("границы стены");
    workspace.variants[0].rooms[0].openings = [];
    workspace.variants.push(cloneValue(workspace.variants[0]));
    expect(() => parseWorkspace(workspace)).toThrow("повреждён");
    workspace.variants = Array.from({ length: MAX_VARIANTS + 1 }, (_, i) => ({ ...workspace.variants[0], id: `v-${i}` }));
    expect(() => parseWorkspace(workspace)).toThrow("12 вариантов");
  });

  it("limits UTF-8 file size and never exports an unrestorable backup", () => {
    expect(() => importWorkspaceFile("я".repeat(MAX_PROJECT_FILE_BYTES / 2 + 1))).toThrow("4 МБ");
    const oversized = { ...createWorkspace(), extra: "я".repeat(MAX_PROJECT_FILE_BYTES / 2) };
    expect(() => serializeWorkspace(oversized)).toThrow("4 МБ");
  });

  it("undoes deletion, restores the linked data and clears redo after a new edit", () => {
    const workspace = createWorkspace();
    let history: WorkspaceHistory = { present: workspace, past: [], future: [] };
    const next = cloneValue(workspace); next.project.rooms = [];
    history = commitWorkspace(history, next);
    expect(history.present.project.rooms).toHaveLength(0);
    history = undoWorkspace(history);
    expect(history.present).toEqual(workspace);
    expect(redoWorkspace(history).present.project.rooms).toHaveLength(0);
    const edit = cloneValue(history.present); edit.project.rooms[0].floor.decor = "grey";
    expect(commitWorkspace(history, edit).future).toHaveLength(0);
    expect(workspace.project.rooms[0].floor.decor).toBe("natural");
  });

  it("bounds history and skips no-op commits", () => {
    let history: WorkspaceHistory = { present: createWorkspace(), past: [], future: [] };
    expect(commitWorkspace(history, cloneValue(history.present))).toBe(history);
    for (let i = 0; i < 70; i++) {
      const next = cloneValue(history.present); next.project.name = `Проект ${i}`;
      history = commitWorkspace(history, next);
    }
    expect(history.past).toHaveLength(50);
    expect(history.present.project.name).toBe("Проект 69");
  });
});

describe("Constructor plan", () => {
  it("uses clockwise opening offsets on all walls", () => {
    const room = createWorkspace().project.rooms[0];
    expect(openingPlanPosition(room, 0, 100, 900)).toEqual({ x1: 100, y1: 0, x2: 1000, y2: 0 });
    expect(openingPlanPosition(room, 1, 100, 900)).toEqual({ x1: 3000, y1: 100, x2: 3000, y2: 1000 });
    expect(openingPlanPosition(room, 2, 100, 900)).toEqual({ x1: 2900, y1: 4000, x2: 2000, y2: 4000 });
    expect(openingPlanPosition(room, 3, 100, 900)).toEqual({ x1: 0, y1: 3900, x2: 0, y2: 3000 });
  });

  it("escapes imported room names inside the SVG", () => {
    const project = createWorkspace().project; const room = project.rooms[0];
    room.name = '\"><image onload="alert(1)" />';
    const svg = planSvg(room, calculateProject(project).rooms[0]);
    expect(svg).not.toContain('<image onload=');
    expect(svg).toContain("&lt;image");
    expect(svg).toMatch(/^<svg width="[\d.]+" height="[\d.]+"/);
  });
});
