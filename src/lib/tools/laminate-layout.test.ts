import { describe, expect, it } from "vitest";
import { calculateDirectionalLaminateLayout, calculateLaminateLayout } from "./laminate-layout";

describe("laminate-layout", () => {
  describe("палуба 1/3", () => {
    it("спальня 3×4 м, доска 1285×192 — раскладывается, есть целые и подрезка", () => {
      const r = calculateLaminateLayout(3000, 4000, 1285, 192, "deck-third");
      expect(r.wholeBoards).toBeGreaterThan(0);
      expect(r.cutBoards).toBeGreaterThan(0);
      expect(r.totalBoards).toBe(r.wholeBoards + r.cutBoards);
      expect(r.rows).toBeDefined();
      // К закупке всегда не меньше уложенных по схеме (с запасом).
      expect(r.purchaseBoards).toBeGreaterThanOrEqual(Math.ceil(r.wholeBoards));
      expect(r.purchaseBoards).toBe(r.basePurchaseBoards + r.purchaseReserveBoards);
      expect(r.purchaseReserveBoards).toBeGreaterThan(0);
    });

    it("каждый ряд покрывает ширину помещения", () => {
      const r = calculateLaminateLayout(3000, 4000, 1285, 192, "deck-third");
      for (const row of r.rows!) {
        const rowW = row.reduce((s, b) => s + b.widthMm, 0);
        expect(Math.abs(rowW - 3000)).toBeLessThanOrEqual(1);
      }
    });

    it("отход палубы умеренный (< 15%)", () => {
      const r = calculateLaminateLayout(4000, 5000, 1285, 192, "deck-third");
      expect(r.wastePercent).toBeLessThan(15);
    });
  });

  describe("палуба 1/2", () => {
    it("второй ряд смещён на половину доски", () => {
      const r = calculateLaminateLayout(3000, 4000, 1285, 192, "deck-half");
      // У смещённого ряда первая доска — обрезок (cut) длиной ~половина доски.
      const secondRowLead = r.rows![1]?.[0];
      expect(secondRowLead?.type).toBe("cut");
      expect(Math.abs(secondRowLead!.widthMm - 1285 / 2)).toBeLessThan(2);
    });
  });

  describe("ёлочка (herringbone)", () => {
    it("строит доски под ±45°, отход выше палубы", () => {
      const deck = calculateLaminateLayout(4000, 5000, 1200, 100, "deck-third");
      const herr = calculateLaminateLayout(4000, 5000, 1200, 100, "herringbone");
      expect(herr.herringbone).toBeDefined();
      expect(herr.herringbone!.length).toBe(herr.totalBoards);
      // Углы только ±45.
      expect(herr.herringbone!.every((b) => b.angleDeg === 45 || b.angleDeg === -45)).toBe(true);
      // Есть оба направления (рыбья кость).
      expect(herr.herringbone!.some((b) => b.angleDeg === 45)).toBe(true);
      expect(herr.herringbone!.some((b) => b.angleDeg === -45)).toBe(true);
      // Ёлочка отходнее палубы.
      expect(herr.wastePercent).toBeGreaterThan(deck.wastePercent);
      expect(herr.purchaseReserveBoards / herr.basePurchaseBoards).toBeGreaterThan(
        deck.purchaseReserveBoards / deck.basePurchaseBoards,
      );
    });

    it("не занижает закупку из-за разреженной направляющей сетки", () => {
      const r = calculateLaminateLayout(4000, 5000, 1200, 100, "herringbone");
      const exactBoardsByArea = (4000 * 5000) / (1200 * 100);

      expect(r.basePurchaseBoards).toBe(Math.ceil(exactBoardsByArea));
      expect(r.purchaseBoards).toBe(Math.ceil(exactBoardsByArea * 1.12));
      expect(r.purchaseBoards * 1200 * 100).toBeGreaterThanOrEqual(4000 * 5000 * 1.12);
      expect(r.wastePercent).toBe(12);
    });
  });

  describe("безопасность закупки", () => {
    it("закупка не меньше числа целых досок и покрывает расход", () => {
      const r = calculateLaminateLayout(3000, 4000, 1285, 192, "deck-third");
      // Закупка должна покрывать как минимум целые доски (недозакуп недопустим).
      expect(r.purchaseBoards).toBeGreaterThanOrEqual(r.wholeBoards);
    });
  });

  describe("направление досок", () => {
    it("поворачивает палубу на 90 градусов и сохраняет координаты комнаты", () => {
      const r = calculateDirectionalLaminateLayout(3000, 4000, 1285, 192, "deck-third", "along-length");
      const boards = r.rows?.flat() ?? [];

      expect(r.surfaceW).toBe(3000);
      expect(r.surfaceH).toBe(4000);
      expect(boards.length).toBeGreaterThan(0);
      expect(boards.every((board) => board.x >= 0 && board.y >= 0)).toBe(true);
      expect(boards.every((board) => board.x + board.widthMm <= 3000.5)).toBe(true);
      expect(boards.every((board) => board.y + board.heightMm <= 4000.5)).toBe(true);
      expect(boards.some((board) => board.heightMm > board.widthMm)).toBe(true);
    });

    it("направление может менять раскрой, но не добавляет отдельную формулу запаса", () => {
      const across = calculateDirectionalLaminateLayout(2600, 4100, 1285, 192, "deck-third", "along-width");
      const along = calculateDirectionalLaminateLayout(2600, 4100, 1285, 192, "deck-third", "along-length");

      expect(across.purchaseReserveBoards).toBe(Math.ceil(across.basePurchaseBoards * 1.05) - across.basePurchaseBoards);
      expect(along.purchaseReserveBoards).toBe(Math.ceil(along.basePurchaseBoards * 1.05) - along.basePurchaseBoards);
      expect(along.rows?.flat().some((board) => board.heightMm === 1285)).toBe(true);
      expect(along.purchaseBoards).not.toBe(across.purchaseBoards);
      expect(along.cutBoards).not.toBe(across.cutBoards);
    });
  });

  describe("предупреждения и зазор", () => {
    it("всегда напоминает про зазор у стен", () => {
      const r = calculateLaminateLayout(3000, 4000, 1285, 192, "deck-third");
      expect(r.notes.some((n) => n.includes("зазор"))).toBe(true);
    });
    it("палуба напоминает про смещение стыков 30 см", () => {
      const r = calculateLaminateLayout(3000, 4000, 1285, 192, "deck-third");
      expect(r.notes.some((n) => n.includes("30 см"))).toBe(true);
    });
  });
});
