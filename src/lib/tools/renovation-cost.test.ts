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
      qty: 20,
      estimatedQty: 19.3,
      price: 0,
      cost: 0,
    });
    expect(result.durationDays).toBe(39);
    expect(result.hasAnyPrice).toBe(false);
  });

  it("округляет двери и фасованные материалы до целой закупочной позиции", () => {
    const result = calculateRenovationCost({
      area: 55,
      typeId: "standard",
      withWork: true,
      prices: { "Двери межкомнатные": 10_000 },
    });
    const doors = result.materialLines.find((line) => line.name === "Двери межкомнатные");
    const adhesive = result.materialLines.find((line) => line.name === "Плиточный клей");

    expect(doors).toMatchObject({ estimatedQty: 2.2, qty: 3, cost: 30_000 });
    expect(adhesive).toMatchObject({ estimatedQty: 2.8, qty: 3 });
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

    expect(result.materialLines[0]).toMatchObject({ qty: 2, estimatedQty: 1.8 });
    expect(result.materialTotal).toBe(2_000);
    expect(result.workLines[0].qty).toBe(25);
    expect(result.workTotal).toBe(12_500);
    expect(result.total).toBe(14_500);
    expect(result.perM2).toBe(1_450);
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
