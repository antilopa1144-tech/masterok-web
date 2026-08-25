import { describe, expect, it } from "vitest";
import { getMaterialComparisonRecommendation, type ComparableMaterial } from "./material-comparison";

const easy: ComparableMaterial = {
  name: "Простой материал",
  durabilityYears: [10, 20],
  installDifficulty: 1,
};

const durable: ComparableMaterial = {
  name: "Долговечный материал",
  durabilityYears: [30, 50],
  installDifficulty: 3,
};

describe("рекомендация сравнения материалов", () => {
  it("не придумывает победителя без выбранного приоритета", () => {
    expect(getMaterialComparisonRecommendation({
      first: easy,
      second: durable,
      priority: null,
      firstPrice: 500,
      secondPrice: 1_000,
    }).kind).toBe("none");
  });

  it("требует обе цены для честного сравнения бюджета", () => {
    expect(getMaterialComparisonRecommendation({
      first: easy,
      second: durable,
      priority: "budget",
      firstPrice: 500,
      secondPrice: 0,
    }).kind).toBe("needs-prices");
  });

  it("выбирает более дешёвый вариант и объясняет разницу", () => {
    const result = getMaterialComparisonRecommendation({
      first: easy,
      second: durable,
      priority: "budget",
      firstPrice: 650,
      secondPrice: 1_150,
    });

    expect(result).toEqual({
      kind: "winner",
      winnerName: easy.name,
      reason: "Дешевле на 500 ₽ за единицу площади.",
    });
  });

  it("выбирает материал с большим средним сроком службы", () => {
    const result = getMaterialComparisonRecommendation({
      first: easy,
      second: durable,
      priority: "durability",
      firstPrice: 0,
      secondPrice: 0,
    });

    expect(result.kind).toBe("winner");
    expect(result.kind === "winner" && result.winnerName).toBe(durable.name);
  });

  it("выбирает более простой самостоятельный монтаж", () => {
    const result = getMaterialComparisonRecommendation({
      first: easy,
      second: durable,
      priority: "diy",
      firstPrice: 0,
      secondPrice: 0,
    });

    expect(result.kind).toBe("winner");
    expect(result.kind === "winner" && result.winnerName).toBe(easy.name);
  });

  it("возвращает ничью при одинаковом критерии", () => {
    const result = getMaterialComparisonRecommendation({
      first: easy,
      second: { ...easy, name: "Другой материал" },
      priority: "diy",
      firstPrice: 0,
      secondPrice: 0,
    });

    expect(result.kind).toBe("tie");
  });
});
