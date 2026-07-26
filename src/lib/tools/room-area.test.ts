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
    expect(result.notes).toContain("в углу");
    expect(result.error).toBeUndefined();
  });

  it("точно считает Т-образную комнату как перекладину со стойкой", () => {
    const result = calculateRoomArea({
      shape: "tshape",
      a: 6,
      b: 2,
      c: 2,
      d: 4,
      wallHeight: 2.5,
    });

    expect(result.floorArea).toBe(20);
    expect(result.perimeter).toBe(24);
    expect(result.wallArea).toBe(60);
    expect(result.notes).toContain("перекладине");
  });

  it("считает трапецию и равнобедренный треугольник", () => {
    const trapezoid = calculateRoomArea({ shape: "trapezoid", a: 6, b: 4, c: 3 });
    const triangle = calculateRoomArea({ shape: "triangle", a: 6, b: 4 });

    expect(trapezoid.floorArea).toBe(15);
    expect(trapezoid.perimeter).toBeCloseTo(16.325, 3);
    expect(trapezoid.notes).toContain("равнобедренной трапеции");
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
  });

  it("не считает физически невозможный вырез Г-образной комнаты", () => {
    const result = calculateRoomArea({
      shape: "lshape",
      a: 2,
      b: 2,
      c: 5,
      d: 1,
      wallHeight: 2.7,
    });

    expect(result.floorArea).toBe(0);
    expect(result.wallArea).toBeUndefined();
    expect(result.error).toContain("выреза");
  });

  it("не считает стойку Т-образной комнаты шире перекладины", () => {
    const result = calculateRoomArea({
      shape: "tshape",
      a: 3,
      b: 2,
      c: 4,
      d: 2,
    });

    expect(result.floorArea).toBe(0);
    expect(result.wallArea).toBeUndefined();
    expect(result.error).toContain("стойки");
  });
});
