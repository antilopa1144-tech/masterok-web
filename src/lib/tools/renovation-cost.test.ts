import { describe, expect, it } from "vitest";
import {
  calculateRenovationCost,
  formatRenovationPriceRange,
  getRenovationType,
} from "./renovation-cost";

describe("инструмент стоимости ремонта", () => {
  it("формирует количества без стоимости, пока цены не введены", () => {
    const result = calculateRenovationCost({
      area: 55,
      typeId: "standard",
      withWork: true,
      prices: {},
    });

    expect(result.materialLines[0]).toMatchObject({
      name: "Штукатурка гипсовая",
      qty: 19.3,
      price: 0,
      cost: 0,
    });
    expect(result.durationDays).toBe(39);
    expect(result.hasAnyPrice).toBe(false);
  });

  it("считает материалы и работы по пользовательским ценам", () => {
    const result = calculateRenovationCost({
      area: 10,
      typeId: "cosmetic",
      withWork: true,
      prices: {
        "Обои виниловые": 1_000,
        "work:Поклейка обоев": 500,
      },
    });

    expect(result.materialLines[0].qty).toBe(1.8);
    expect(result.materialTotal).toBe(1_800);
    expect(result.workLines[0].qty).toBe(25);
    expect(result.workTotal).toBe(12_500);
    expect(result.total).toBe(14_300);
    expect(result.perM2).toBe(1_430);
  });

  it("не добавляет работы, когда они отключены", () => {
    const result = calculateRenovationCost({
      area: 10,
      typeId: "cosmetic",
      withWork: false,
      prices: { "work:Поклейка обоев": 500 },
    });

    expect(result.workLines).toEqual([]);
    expect(result.workTotal).toBe(0);
    expect(result.hasAnyPrice).toBe(false);
  });

  it("нормализует отрицательные площадь и цены", () => {
    const result = calculateRenovationCost({
      area: -20,
      typeId: "unknown",
      withWork: true,
      prices: { "Штукатурка гипсовая": -700 },
    });

    expect(getRenovationType("unknown").id).toBe("standard");
    expect(result.materialLines.every((line) => line.qty === 0 && line.cost === 0)).toBe(true);
    expect(result.total).toBe(0);
    expect(result.durationDays).toBe(0);
  });

  it("формирует диапазон плюс-минус 15 процентов", () => {
    expect(formatRenovationPriceRange(100_000)).toEqual(["85 000", "115 000"]);
  });
});
