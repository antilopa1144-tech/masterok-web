import { describe, expect, it } from "vitest";
import { calculateDeckLayout, type DeckLayoutInput } from "./deck-layout";

const base: DeckLayoutInput = { deckLengthMm: 5000, deckWidthMm: 3000, boardLengthMm: 3000, boardWidthMm: 150, gapMm: 5, orientation: "along-length", stagger: "half", sawKerfMm: 3, reservePercent: 10 };

describe("deck-layout", () => {
  it("покрывает каждый ряд ровно по длине настила", () => {
    const result = calculateDeckLayout(base);
    for (let row = 1; row <= result.rows; row += 1) {
      const length = result.placements.filter((piece) => piece.row === row).reduce((sum, piece) => sum + piece.lengthMm, 0);
      expect(length).toBeCloseTo(result.runLengthMm, 5);
    }
  });

  it("учитывает пропил и не выводит детали за границы доски", () => {
    const result = calculateDeckLayout(base);
    for (const board of result.stock) {
      for (const piece of board.pieces) expect(piece.xMm + piece.lengthMm).toBeLessThanOrEqual(base.boardLengthMm + 0.01);
    }
    expect(result.stock.every((board) => board.offcutMm >= 0)).toBe(true);
  });

  it("разделяет раскрой и закрытый запас", () => {
    const result = calculateDeckLayout(base);
    expect(result.purchaseBoards).toBe(result.baseBoards + result.reserveBoards);
    expect(result.reserveBoards).toBeGreaterThan(0);
  });

  it("меняет рабочие оси при повороте доски", () => {
    const result = calculateDeckLayout({ ...base, orientation: "along-width" });
    expect(result.runLengthMm).toBe(base.deckWidthMm);
    expect(result.crossWidthMm).toBe(base.deckLengthMm);
  });
});
