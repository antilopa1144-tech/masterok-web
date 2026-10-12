import { describe, expect, it } from "vitest";
import { calculateProject, createDefaultProject } from "./core";
import { createInteriorRoom } from "./interiors";
import { compareVariantRooms, comparisonRooms } from "./variant-rooms";

describe("Rooms restored by a constructor variant", () => {
  it("describes furniture, geometry, openings and materials across the whole project", () => {
    const bath = createInteriorRoom("bathroom", []), living = createInteriorRoom("living", []);
    bath.interior!.items = [{ id: "washer", kind: "washer", position: { xMm: 1200.25, yMm: 1600.5, rotationDeg: 0 } }];
    const current = [bath, living], saved = structuredClone(current), before = structuredClone(current);
    saved[0].interior!.items[0].position = { xMm: 1800, yMm: 1999.75, rotationDeg: 90 };
    saved[1].name = "Другой зал"; saved[1].widthMm += 100;
    saved[1].openings.push({ id: "window", type: "window", wall: 0, offsetMm: 100, widthMm: 1000, heightMm: 1200, sillMm: 900 });
    saved[1].floor.direction = "width";
    expect(compareVariantRooms(current, saved)).toEqual([
      { roomId: bath.id, name: bath.name, kind: "changed", details: ["Обстановка"] },
      { roomId: living.id, name: "Другой зал", kind: "changed", details: ["Название", "Размеры", "Двери и окна", "Параметры пола"] },
    ]);
    expect(current).toEqual(before);
    const project = createDefaultProject();
    expect(calculateProject({ ...project, rooms: [saved[0]] })).toEqual(calculateProject({ ...project, rooms: [bath] }));
  });

  it("reports additions and removals even when the rooms have the same name", () => {
    const current = createInteriorRoom("living", []), saved = createInteriorRoom("living", []);
    expect(compareVariantRooms([current], [saved])).toEqual([
      { roomId: saved.id, name: saved.name, kind: "added", details: [] },
      { roomId: current.id, name: current.name, kind: "removed", details: [] },
    ]);
    expect(comparisonRooms([current], [[saved]])).toEqual([{ id: current.id, name: current.name }, { id: saved.id, name: saved.name }]);
  });

  it("ignores imported property order and opening list order, while retaining furniture order", () => {
    const room = createInteriorRoom("bathroom", []);
    room.openings = [
      { id: "one", type: "window", wall: 0, offsetMm: 100, widthMm: 600, heightMm: 800, sillMm: 900 },
      { id: "two", type: "door", wall: 2, offsetMm: 100, widthMm: 800, heightMm: 2100, sillMm: 0 },
    ];
    const saved = structuredClone(room);
    saved.floor = Object.fromEntries(Object.entries(saved.floor).reverse()) as typeof saved.floor;
    saved.openings.reverse();
    expect(compareVariantRooms([room], [saved])).toEqual([]);
    saved.interior!.items.reverse();
    expect(compareVariantRooms([room], [saved])[0].details).toEqual(["Обстановка"]);
  });

  it("keeps current room names and includes rooms missing from the current project", () => {
    const room = createInteriorRoom("living", []), bath = createInteriorRoom("bathroom", []);
    const saved = { ...room, name: "Старое название" };
    expect(comparisonRooms([room], [[saved, bath], [bath]])).toEqual([{ id: room.id, name: room.name }, { id: bath.id, name: bath.name }]);
    expect(comparisonRooms([], [])).toEqual([]);
  });
});
