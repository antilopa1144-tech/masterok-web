import { describe, expect, it } from "vitest";
import {
  DEFAULT_ROOM_DIMENSIONS,
  floorAreaM2,
  parseRoomMeasure,
  validateRoomMeasures,
  wallAreaM2,
} from "./geometry";

describe("room-master geometry", () => {
  it("computes floor area", () => {
    expect(floorAreaM2(DEFAULT_ROOM_DIMENSIONS)).toBeCloseTo(4.25, 2);
  });

  it("computes wall area minus door", () => {
    const wall = wallAreaM2(DEFAULT_ROOM_DIMENSIONS);
    expect(wall).toBeGreaterThan(15);
    expect(wall).toBeLessThan(22);
  });

  it("принимает дробные размеры с точкой и запятой", () => {
    expect(parseRoomMeasure("2.75")).toBe(2.75);
    expect(parseRoomMeasure("2,75")).toBe(2.75);
  });

  it("не превращает пустое значение в нулевой размер", () => {
    expect(parseRoomMeasure("")).toBeNaN();
    expect(validateRoomMeasures({
      length: Number.NaN,
      width: 1.7,
      height: 2.5,
      doorWidth: 0.7,
    }).length).toBe("Укажите длину.");
  });

  it("объясняет допустимый диапазон каждого размера", () => {
    expect(validateRoomMeasures({
      length: 0.5,
      width: 13,
      height: 4,
      doorWidth: -1,
    })).toEqual({
      length: "Длина: от 1 до 12 м.",
      width: "Ширина: от 1 до 12 м.",
      height: "Высота: от 2 до 3,5 м.",
      doorWidth: "Ширина двери: от 0,6 до 1,2 м.",
    });
  });
});
