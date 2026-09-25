import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { calculateLinearCutLayout } from "../src/lib/tools/linear-cut-layout";

const article = readFileSync("content/blog-drafts/raskroy-profilnoy-truby/article.md", "utf8");
const toolPage = readFileSync("src/app/instrumenty/lineynyy-raskroy/page.tsx", "utf8");
const parts = [
  { id: "long", label: "Стойка", lengthMm: 1900, quantity: 4 },
  { id: "short", label: "Поперечина", lengthMm: 900, quantity: 4 },
];

describe("проверяемый пример статьи о профильной трубе", () => {
  it("совпадает с картой движка для двух шестиметровых хлыстов", () => {
    const result = calculateLinearCutLayout({
      stockLengthMm: 6000,
      sawKerfMm: 3,
      reusableOffcutMm: 300,
      parts,
    });

    expect(result.stockCount).toBe(2);
    expect(result.partCount).toBe(8);
    expect(result.exactLengthM).toBe(11.2);
    expect(result.purchasedLengthM).toBe(12);
    expect(result.stock.map((stock) => stock.placements.map((piece) => piece.lengthMm)))
      .toEqual([[1900, 1900, 1900], [1900, 900, 900, 900, 900]]);
    expect(result.stock.map((stock) => stock.offcutMm)).toEqual([291, 485]);
    expect(result.reusableOffcuts).toBe(1);
    expect(result.wastePercent).toBe(6.7);
    expect(article).toContain("11 200 + 776 + 18 + 6 = 12 000 мм");
    expect(article).toContain("остаток 485 мм");
  });

  it("отделяет сравнение с трёхметровыми хлыстами от основного примера", () => {
    const threeMetre = calculateLinearCutLayout({
      stockLengthMm: 3000,
      sawKerfMm: 3,
      reusableOffcutMm: 300,
      parts,
    });

    expect(threeMetre.stockCount).toBe(4);
    expect(threeMetre.purchasedLengthM).toBe(12);
    expect(threeMetre.stock.map((stock) => stock.offcutMm)).toEqual([194, 194, 194, 194]);
    expect(threeMetre.reusableOffcuts).toBe(0);
    expect(article).toContain("4 штуки по 3 м");
  });

  it("показывает пограничный случай, где пропил меняет число хлыстов", () => {
    const input = {
      stockLengthMm: 3000,
      reusableOffcutMm: 300,
      parts: [{ id: "sample", label: "Деталь", lengthMm: 1499, quantity: 2 }],
    };

    expect(calculateLinearCutLayout({ ...input, sawKerfMm: 0 }).stockCount).toBe(1);
    expect(calculateLinearCutLayout({ ...input, sawKerfMm: 3 }).stockCount).toBe(2);
    expect(article).toContain("3 001 мм");
  });

  it("связывает статью и инструмент в обе стороны", () => {
    expect(article).toContain("/instrumenty/lineynyy-raskroy/");
    expect(toolPage).toContain('href="/blog/raskroy-profilnoy-truby/"');
  });
});
