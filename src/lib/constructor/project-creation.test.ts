import { describe, expect, it, vi } from "vitest";
import { calculateProject, validateProject } from "./core";
import { createScenarioWorkspace } from "./scenarios";
import { createProjectFromRoom } from "./project-creation";
import { cloneValue, parseWorkspace } from "./workspace";
import { ConstructorJourney } from "./journey";
import { trackEvent } from "@/lib/analytics";

describe("A project with one prepared first room", () => {
  it("uses exact own dimensions, contains no extra example and does not mutate its draft", () => {
    const template = createScenarioWorkspace("bathroom");
    const before = cloneValue(template);
    const room = cloneValue(template.project.rooms[0]);
    Object.assign(room, { name: "Моя ванная", widthMm: 2450.5, lengthMm: 3100, heightMm: 2650 });
    const next = createProjectFromRoom(template, room);
    expect(template).toEqual(before);
    expect(next.project.rooms).toHaveLength(1);
    expect(next.project).toMatchObject({ name: room.name, rooms: [room] });
    expect(validateProject(next.project)).toEqual([]);
    expect(parseWorkspace(next)).toEqual(next);
    expect(calculateProject(next.project).rooms[0].areaM2).toBeCloseTo(7.59655, 10);
    next.project.rooms[0].widthMm = 3000;
    expect(room.widthMm).toBe(2450.5);
  });
  it("keeps the existing bathroom finishes and packaging settings", () => {
    const template = createScenarioWorkspace("bathroom");
    const room = template.project.rooms[0];
    const next = createProjectFromRoom(template, room);
    expect(next.project.rooms[0].floor).toEqual(room.floor);
    expect(next.project.rooms[0].wallTiles).toEqual(room.wallTiles);
    expect(next.project.rooms[0].continuousWallTiles).toBe(true);
  });
  it("rejects an invalid or overly complex room before opening or saving the project", () => {
    const template = createScenarioWorkspace("bathroom");
    const before = cloneValue(template);
    const invalid = cloneValue(template.project.rooms[0]); invalid.widthMm = 299;
    expect(() => createProjectFromRoom(template, invalid)).toThrow("Не удалось создать проект");
    expect(template).toEqual(before);
  });
  it("counts confirmed own dimensions as an edited result without sharing them", () => {
    const template = createScenarioWorkspace("bathroom");
    const room = cloneValue(template.project.rooms[0]); room.widthMm = 2450.5;
    const next = createProjectFromRoom(template, room);
    const send = vi.fn<typeof trackEvent>(); const journey = new ConstructorJourney(send);
    journey.open(template.project, "new", "bathroom");
    journey.observe(next.project); journey.observe(next.project); journey.resultView();
    expect(send.mock.calls).toEqual([
      ["constructor_open", { mode: "new", scenario: "bathroom" }],
      ["constructor_start", { action: "dimensions" }],
      ["constructor_dimensions_change", {}],
      ["constructor_result_view", { edited: true }],
    ]);
    expect(JSON.stringify(send.mock.calls)).not.toContain("2450.5");
  });
});
