import { describe, expect, it } from "vitest";
import { calculateRoomArea, parseRoomDimension } from "./room-area";

describe("инструмент площади комнаты", () => {
  it("считает прямоугольную комнату и площадь стен", () => {
    expect(calculateRoomArea({
      shape: "rect",
      a: 5,
      b: 4,
      wallHeight: 2.7,
    })).toEqual({
      floorArea: 20,
      perimeter: 18,
      wallArea: 48.6,
      notes: undefined,
    });
  });

  it("считает Г-образную комнату как прямоугольник за вычетом выреза", () => {
    const result = calculateRoomArea({
      shape: "lshape",
      a: 6,
      b: 5,
      c: 2,
      d: 1.5,
    });

    expect(result.floorArea).toBe(27);
    expect(result.perimeter).toBe(22);
    expect(result.notes).toContain("приближённый");
  });

  it("считает трапецию и равнобедренный треугольник", () => {
    const trapezoid = calculateRoomArea({ shape: "trapezoid", a: 6, b: 4, c: 3 });
    const triangle = calculateRoomArea({ shape: "triangle", a: 6, b: 4 });

    expect(trapezoid.floorArea).toBe(15);
    expect(trapezoid.perimeter).toBeCloseTo(16.325, 3);
    expect(triangle.floorArea).toBe(12);
    expect(triangle.perimeter).toBeCloseTo(16, 3);
  });

  it("считает полный круг и сектор", () => {
    const circle = calculateRoomArea({ shape: "circle", a: 2, b: 0 });
    const quarter = calculateRoomArea({ shape: "circle", a: 2, b: 90 });

    expect(circle.floorArea).toBeCloseTo(4 * Math.PI, 8);
    expect(circle.perimeter).toBeCloseTo(4 * Math.PI, 8);
    expect(quarter.floorArea).toBeCloseTo(Math.PI, 8);
    expect(quarter.perimeter).toBeCloseTo(4 + Math.PI, 8);
  });

  it("нормализует пустые, отрицательные и дробные значения", () => {
    expect(parseRoomDimension("2,75")).toBe(2.75);
    expect(parseRoomDimension("")).toBe(0);
    expect(parseRoomDimension("-3")).toBe(0);

    const result = calculateRoomArea({
      shape: "lshape",
      a: 2,
      b: 2,
      c: 5,
      d: 5,
      wallHeight: -1,
    });

    expect(result.floorArea).toBe(0);
    expect(result.wallArea).toBeUndefined();
  });
});
