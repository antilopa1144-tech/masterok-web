import { describe, expect, it } from "vitest";
import {
  calculateTileLayout,
  computeLayoutSvgBoundsMm,
  countCellsInGrid,
} from "./tile-layout";

describe("tile-layout", () => {
  describe("прямая укладка", () => {
    it("ванная 1700×2500, плитка 300×600 — 30 ячеек, подрезка справа 188 мм", () => {
      const r = calculateTileLayout(1700, 2500, 300, 600, 2, "straight");
      expect(r.totalTiles).toBe(30);
      expect(countCellsInGrid(r.tileGrid)).toBe(r.totalTiles);
      expect(r.cutRight).toBe(188);
      expect(r.cutBottom).toBe(90);
      expect(r.cols).toBe(6);
      expect(r.rows).toBe(5);
    });

    it("счётчики совпадают с типами в сетке", () => {
      const r = calculateTileLayout(1700, 2500, 300, 600, 2, "straight");
      let whole = 0;
      let cut = 0;
      for (const row of r.tileGrid) {
        for (const cell of row) {
          if (cell.type === "whole") whole++;
          else cut++;
        }
      }
      expect(whole + cut).toBe(r.totalTiles);
      expect(whole).toBe(r.wholeTiles);
      expect(cut).toBe(r.cutTiles);
    });
  });

  describe("со смещением 1/2", () => {
    it("grid = totalTiles, cols = макс. длина ряда", () => {
      const r = calculateTileLayout(1700, 2500, 300, 600, 2, "offset-half");
      expect(countCellsInGrid(r.tileGrid)).toBe(r.totalTiles);
      const maxCols = Math.max(...r.tileGrid.map((row) => row.length));
      expect(r.cols).toBe(maxCols);
    });

    it("ширина каждого ряда ≈ поверхности", () => {
      const grout = 2;
      const r = calculateTileLayout(1700, 2500, 300, 600, grout, "offset-half");
      for (const row of r.tileGrid) {
        const rowW = row.reduce(
          (s, c, i) => s + c.widthMm + (i < row.length - 1 ? grout : 0),
          0,
        );
        expect(Math.abs(rowW - 1700)).toBeLessThanOrEqual(2);
      }
    });
  });

  describe("со смещением 1/3", () => {
    it("первая подрезка во 2-м ряду отличается от 1/2", () => {
      const half = calculateTileLayout(1700, 2500, 300, 600, 2, "offset-half");
      const third = calculateTileLayout(1700, 2500, 300, 600, 2, "offset-third");
      const halfLead = half.tileGrid[1]?.[0]?.widthMm ?? 0;
      const thirdLead = third.tileGrid[1]?.[0]?.widthMm ?? 0;
      expect(halfLead).toBe(150);
      expect(thirdLead).toBe(100);
    });

    it("3-й ряд смещён на 2/3", () => {
      const r = calculateTileLayout(1700, 2500, 300, 600, 2, "offset-third");
      expect(r.tileGrid[2]?.[0]?.widthMm).toBe(200);
    });
  });

  describe("диагональ", () => {
    it("схема = прямая, запас к закупке отдельно", () => {
      const straight = calculateTileLayout(3000, 4000, 600, 600, 2, "straight");
      const diagonal = calculateTileLayout(3000, 4000, 600, 600, 2, "diagonal");
      expect(countCellsInGrid(diagonal.tileGrid)).toBe(diagonal.totalTiles);
      expect(diagonal.totalTiles).toBe(straight.totalTiles);
      expect(diagonal.purchaseReserveTiles).toBe(Math.ceil(straight.totalTiles * 0.15));
      expect(diagonal.notes.length).toBeGreaterThan(0);
    });
  });

  describe("SVG bounds", () => {
    it("ширина bounds ≥ любого ряда", () => {
      const r = calculateTileLayout(1700, 2500, 300, 600, 2, "offset-half");
      const bounds = computeLayoutSvgBoundsMm(r.tileGrid, 2);
      for (const row of r.tileGrid) {
        const rowW = row.reduce((s, c, i) => s + c.widthMm + (i < row.length - 1 ? 2 : 0), 0);
        expect(bounds.widthMm).toBeGreaterThanOrEqual(rowW - 0.01);
      }
    });
  });
});
