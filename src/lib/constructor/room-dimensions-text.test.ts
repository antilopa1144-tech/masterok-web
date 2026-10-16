import { describe, expect, it } from "vitest";
import { createScenarioWorkspace } from "./scenarios";
import { roomDimensionsText } from "./room-dimensions-text";

describe("room dimensions message", () => {
  it("preserves millimetres, wall numbering, offsets and window sill height", () => {
    const room = createScenarioWorkspace("bathroom").project.rooms[0];
    room.name = "Ванная родителей";
    room.widthMm = 2450.5;
    room.openings = [
      { id: "door", type: "door", wall: 2, offsetMm: 350, widthMm: 800, heightMm: 2050, sillMm: 0 },
      { id: "window", type: "window", wall: 0, offsetMm: 625, widthMm: 1200, heightMm: 900, sillMm: 1400 },
    ];
    const text = roomDimensionsText(room).replaceAll("\u00a0", " ");
    expect(text).toContain("Мастерок · Ванная родителей");
    expect(text).toContain("ширина 2 450,5 мм");
    expect(text).toContain("Дверь · стена 3: 800 × 2 050 мм; отступ 350 мм.");
    expect(text).toContain("Окно · стена 1: 1 200 × 900 мм; отступ 625 мм; подоконник от пола 1 400 мм.");
    expect(text).toContain("Отступ проёма — от начала его стены");
    expect(text).toContain("Только выбранная комната");
  });

  it("explicitly identifies a room without openings", () => {
    const room = createScenarioWorkspace("room").project.rooms[0];
    room.openings = [];
    expect(roomDimensionsText(room)).toContain("Проёмы не добавлены.");
    expect(roomDimensionsText(room)).not.toContain("стена 1:");
  });
});
