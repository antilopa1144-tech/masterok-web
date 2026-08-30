import { describe, expect, it } from "vitest";
import { formatStageDateRange, resolveCalendarState, type RenovationCalendarState } from "./storage";

const savedRoom: RenovationCalendarState = {
  scenarioId: "room",
  startDate: "2026-06-01",
  completedStageIds: ["prep"],
  completedTaskKeys: ["room:prep:0"],
};

describe("formatStageDateRange", () => {
  it("formats a single day", () => {
    const s = formatStageDateRange("2026-06-01", 5, 5);
    expect(s).toBeTruthy();
    expect(s).not.toContain("—");
  });

  it("formats a range", () => {
    const s = formatStageDateRange("2026-06-01", 0, 14);
    expect(s).toContain("—");
  });

  it("returns null without start date", () => {
    expect(formatStageDateRange(null, 0, 7)).toBeNull();
  });
});

describe("resolveCalendarState", () => {
  it("restores the saved scenario and progress for a bare URL", () => {
    expect(resolveCalendarState(savedRoom, null)).toEqual(savedRoom);
  });

  it("keeps progress when the requested scenario matches", () => {
    expect(resolveCalendarState(savedRoom, "room")).toEqual(savedRoom);
  });

  it("keeps the start date but clears foreign progress for another scenario", () => {
    expect(resolveCalendarState(savedRoom, "bathroom")).toEqual({
      scenarioId: "bathroom",
      startDate: "2026-06-01",
      completedStageIds: [],
      completedTaskKeys: [],
    });
  });
});
