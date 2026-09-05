import { describe, expect, it } from "vitest";
import { getToolConfig } from "./config";
import { calculateRoomArea } from "./room-area";

const room = getToolConfig("ploshchad-komnaty")!;
const answerFor = (question: string) => room.faq.find((item) => item.question === question)?.answer;

describe("площадь комнаты: ответы на поисковые вопросы", () => {
  it("сохраняет владельца интента и существующий title", () => {
    expect(room.seoTitle).toBe("Калькулятор площади комнаты в м² онлайн");
    expect(new Set(room.faq.map((item) => item.question)).size).toBe(room.faq.length);
  });

  it("подкрепляет примеры пола, периметра и стен действующим расчётом", () => {
    const result = calculateRoomArea({ shape: "rect", a: 5, b: 6, wallHeight: 2.7 });
    expect(result.floorArea).toBe(30);
    expect(result.perimeter).toBe(22);
    expect(result.wallArea).toBeCloseTo(59.4);
    expect(answerFor("Как посчитать площадь прямоугольной комнаты в м²?")).toContain("5 × 6 м — это 30 м²");
    expect(answerFor("Как рассчитать периметр комнаты по длине и ширине?")).toContain("22 м");
    expect(answerFor("Нужно ли учитывать высоту при расчёте площади комнаты?")).toContain("59,4 м² без вычета окон и дверей");
    expect(calculateRoomArea({ shape: "rect", a: 3.5, b: 4 }).floorArea).toBe(14);
    expect(answerFor("Как посчитать площадь прямоугольной комнаты в м²?")).toContain("3,5 × 4 = 14 м²");
  });

  it("не обещает восстановить контур по одной площади", () => {
    const first = calculateRoomArea({ shape: "rect", a: 4, b: 5 });
    const second = calculateRoomArea({ shape: "rect", a: 2, b: 10 });
    expect(first.floorArea).toBe(second.floorArea);
    expect([first.perimeter, second.perimeter]).toEqual([18, 24]);
    expect(answerFor("Можно ли узнать длину стен и периметр только по площади комнаты?")).toContain("Нет, одной площади недостаточно");
  });

  it("объясняет границы сложной формы и не смешивает площадь с объёмом", () => {
    const shapeAnswer = answerFor("Как посчитать площадь комнаты неправильной формы?");
    expect(shapeAnswer).toContain("Периметры частей складывать нельзя");
    expect(shapeAnswer).toContain("равнобедренной фигуры");
    expect(answerFor("Нужно ли учитывать высоту при расчёте площади комнаты?")).toContain("объём в м³, а не площадь в м²");
  });
});
