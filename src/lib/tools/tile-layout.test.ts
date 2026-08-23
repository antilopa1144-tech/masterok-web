import { describe, expect, it } from "vitest";
import {
  calculateTileLayout,
  clampLayoutInput,
  clampLayoutInputs,
  compareTileLayoutOpeningAxisStarts,
  compareTileLayoutStartModes,
  computeLayoutSvgBoundsMm,
  countCellsInGrid,
  normalizeTileOpening,
} from "./tile-layout";

describe("tile-layout", () => {
  describe("нормализация ввода", () => {
    it("не допускает отрицательные и выходящие за диапазон размеры", () => {
      expect(clampLayoutInput(-100, "surface")).toBe(100);
      expect(clampLayoutInput(25000, "surface")).toBe(20000);
      expect(clampLayoutInput(-20, "tile")).toBe(10);
      expect(clampLayoutInput(20, "grout")).toBe(10);
    });

    it("передаёт в расчёт те же нормализованные значения", () => {
      const normalized = clampLayoutInputs(-100, 25000, -20, 3000, -1);
      const fromInvalidInput = calculateTileLayout(-100, 25000, -20, 3000, -1, "straight");
      const fromNormalizedInput = calculateTileLayout(
        normalized.surfaceW,
        normalized.surfaceH,
        normalized.tileW,
        normalized.tileH,
        normalized.groutMm,
        "straight",
      );

      expect(fromInvalidInput).toEqual(fromNormalizedInput);
    });
  });

  describe("прямая укладка", () => {
    it("выбирает центр плитки по оси проёма вместо узких краёв от шва", () => {
      const variants = compareTileLayoutOpeningAxisStarts({
        surfaceW: 2500,
        surfaceH: 2600,
        tileW: 600,
        tileH: 300,
        groutMm: 2,
        layoutMode: "straight",
        opening: { widthMm: 900, heightMm: 2100, offsetLeftMm: 800 },
        reservePercent: 10,
      });
      const recommended = variants.find((variant) => variant.recommended)!;
      const groutLine = variants.find((variant) => variant.alignment === "grout-line")!;
      const openingCenterMm = 1250;

      expect(recommended.alignment).toBe("tile-center");
      expect(recommended.offsetXmm).toBe(346);
      expect(recommended.narrowEdgeCount).toBe(0);
      expect(recommended.result.purchaseTiles).toBe(48);
      expect(recommended.result.tileGrid[0]!.some(
        (cell) => cell.xMm + cell.widthMm / 2 === openingCenterMm,
      )).toBe(true);

      expect(groutLine.offsetXmm).toBe(45);
      expect(groutLine.narrowEdgeCount).toBe(2);
      expect(groutLine.result.purchaseTiles).toBe(64);
    });

    it("ванная 1700×2500, плитка 300×600 — 30 ячеек, точная подрезка справа 190 мм", () => {
      const r = calculateTileLayout(1700, 2500, 300, 600, 2, "straight");
      expect(r.totalTiles).toBe(30);
      expect(countCellsInGrid(r.tileGrid)).toBe(r.totalTiles);
      expect(r.cutLeft).toBe(0);
      expect(r.cutRight).toBe(190);
      expect(r.cutTop).toBe(0);
      expect(r.cutBottom).toBe(92);
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

    it("добавляет выбранный запас к расходу на схему и округляет его вверх", () => {
      const r = calculateTileLayout(2500, 2600, 600, 300, 2, "straight", {
        widthMm: 900,
        heightMm: 2100,
        offsetLeftMm: 1300,
      }, 10);

      expect(r.basePurchaseTiles).toBe(45);
      expect(r.reservePercent).toBe(10);
      expect(r.purchaseReserveTiles).toBe(5);
      expect(r.purchaseTiles).toBe(50);
      expect(r.notes.some((note) => note.includes("Запас 10%"))).toBe(true);
    });

    it("сохраняет прежний результат при нулевом запасе и ограничивает запас 30%", () => {
      const withoutReserve = calculateTileLayout(2400, 600, 300, 600, 2, "straight");
      const clampedReserve = calculateTileLayout(
        2400,
        600,
        300,
        600,
        2,
        "straight",
        undefined,
        100,
      );

      expect(withoutReserve.reservePercent).toBe(0);
      expect(withoutReserve.purchaseReserveTiles).toBe(0);
      expect(withoutReserve.purchaseTiles).toBe(withoutReserve.basePurchaseTiles);
      expect(clampedReserve.reservePercent).toBe(30);
      expect(clampedReserve.purchaseReserveTiles).toBe(
        Math.ceil(clampedReserve.basePurchaseTiles * 0.3),
      );
    });
  });

  describe("стартовая линия и симметричные подрезки", () => {
    it("центрирует крайние подрезки и убирает узкую полосу", () => {
      const centered = calculateTileLayout(
        1700,
        2500,
        300,
        600,
        2,
        "straight",
        undefined,
        0,
        { mode: "center" },
      );

      expect(centered.startMode).toBe("center");
      expect(centered.cutLeft).toBeCloseTo(centered.cutRight, 5);
      expect(centered.cutTop).toBeCloseTo(centered.cutBottom, 5);
      expect(centered.cutLeft).toBe(94);
      expect(centered.cutTop).toBe(346);
      expect(centered.tileGrid[0]?.[0]).toMatchObject({ xMm: 0, yMm: 0, widthMm: 94, heightMm: 346 });
    });

    it("применяет пользовательский сдвиг по X и Y", () => {
      const custom = calculateTileLayout(
        1700,
        2500,
        300,
        600,
        2,
        "straight",
        undefined,
        0,
        { mode: "custom", offsetXmm: 120, offsetYmm: 200 },
      );

      expect(custom.startMode).toBe("custom");
      expect(custom.cutLeft).toBe(120);
      expect(custom.cutRight).toBe(68);
      expect(custom.cutTop).toBe(200);
      expect(custom.cutBottom).toBe(492);
    });

    it("сравнивает варианты и рекомендует раскладку без узких краёв", () => {
      const variants = compareTileLayoutStartModes({
        surfaceW: 2500,
        surfaceH: 2600,
        tileW: 600,
        tileH: 300,
        groutMm: 2,
        layoutMode: "straight",
        reservePercent: 10,
      });

      expect(variants.map((variant) => variant.mode)).toEqual(["edge", "center"]);
      expect(variants.filter((variant) => variant.recommended)).toHaveLength(1);
      expect(variants.find((variant) => variant.recommended)?.mode).toBe("center");
      expect(variants.find((variant) => variant.mode === "center")!.narrowEdgeCount).toBeLessThan(
        variants.find((variant) => variant.mode === "edge")!.narrowEdgeCount,
      );
    });

    it("оставляет диагональ автоматически центрированной", () => {
      const diagonal = calculateTileLayout(
        2000,
        2000,
        300,
        300,
        2,
        "diagonal",
        undefined,
        15,
        { mode: "custom", offsetXmm: 70, offsetYmm: 90 },
      );

      expect(diagonal.startMode).toBe("center");
      expect(diagonal.notes.some((note) => note.includes("автоматически центрирована"))).toBe(true);
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

    it("не превращает целую по высоте плитку в добор из-за шва", () => {
      const r = calculateTileLayout(1200, 600, 600, 600, 2, "offset-half");
      expect(r.rows).toBe(1);
      expect(r.cutBottom).toBe(0);
      expect(r.tileGrid[0]?.[0]?.heightMm).toBe(600);
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

  describe("диагональ (под 45°)", () => {
    it("строит геометрию ромбов, отход выше прямой раскладки", () => {
      const straight = calculateTileLayout(3000, 4000, 600, 600, 2, "straight");
      const diagonal = calculateTileLayout(3000, 4000, 600, 600, 2, "diagonal");
      // Настоящая диагональ: есть геометрия ромбов, плиток больше (краевые доборы).
      expect(diagonal.diagonal).toBeDefined();
      expect(diagonal.diagonal!.cells.length).toBe(diagonal.totalTiles);
      expect(diagonal.totalTiles).toBeGreaterThan(straight.totalTiles);
      // Диагональ всегда отходнее прямой (треугольные доборы по периметру).
      expect(diagonal.wastePercent).toBeGreaterThan(straight.wastePercent);
      expect(diagonal.wastePercent).toBeGreaterThan(8);
      expect(diagonal.wastePercent).toBeLessThan(20);
      expect(diagonal.purchaseReserveTiles).toBeGreaterThan(0);
      expect(diagonal.purchaseTiles).toBe(
        diagonal.basePurchaseTiles + diagonal.purchaseReserveTiles,
      );
      expect(diagonal.notes.length).toBeGreaterThan(0);
    });

    it("не считает каждый краевой добор отдельной целой плиткой к покупке", () => {
      const r = calculateTileLayout(3000, 4000, 600, 600, 2, "diagonal");

      // 24 целые плитки + 26 краевых половинок = 37 плиток на схему,
      // затем 6 плиток запаса (+15%). UI раньше ошибочно показывал 50 + 6.
      expect(r.wholeTiles).toBe(24);
      expect(r.cutTiles).toBe(26);
      expect(r.basePurchaseTiles).toBe(37);
      expect(r.purchaseReserveTiles).toBe(6);
      expect(r.purchaseTiles).toBe(43);
      expect(r.purchaseTiles).toBeLessThan(r.totalTiles + r.purchaseReserveTiles);
    });

    it("есть и целые ромбы, и краевые доборы", () => {
      const d = calculateTileLayout(1700, 2500, 300, 300, 2, "diagonal");
      expect(d.wholeTiles).toBeGreaterThan(0);
      expect(d.cutTiles).toBeGreaterThan(0);
      expect(d.diagonal!.cells.some((c) => c.type === "whole")).toBe(true);
      expect(d.diagonal!.cells.some((c) => c.type === "edge")).toBe(true);
    });

    it("не опускает запас ниже 15%, но принимает больший запас пользователя", () => {
      const minimum = calculateTileLayout(
        3000,
        4000,
        600,
        600,
        2,
        "diagonal",
        undefined,
        10,
      );
      const increased = calculateTileLayout(
        3000,
        4000,
        600,
        600,
        2,
        "diagonal",
        undefined,
        20,
      );

      expect(minimum.reservePercent).toBe(15);
      expect(minimum.purchaseReserveTiles).toBe(6);
      expect(increased.reservePercent).toBe(20);
      expect(increased.purchaseReserveTiles).toBe(8);
      expect(increased.purchaseTiles).toBe(45);
    });
  });

  describe("точность подрезки (регресс-тесты)", () => {
    it("фартук 2400×600 плиткой 300×600 — 7 целых + 1 подрез, НЕ всё в подрезку", () => {
      // Баг: floor(600/602)=0 давал whole=0 на поверхности, равной высоте плитки.
      const r = calculateTileLayout(2400, 600, 300, 600, 2, "straight");
      expect(r.wholeTiles).toBe(7);
      expect(r.cutTiles).toBe(1);
      expect(r.cutBottom).toBe(0); // по высоте подрезки нет — плитка точно в размер
      expect(r.purchaseTiles).toBe(r.basePurchaseTiles);
      expect(r.purchaseTiles).toBeLessThanOrEqual(r.totalTiles);
    });

    it("крупные подрезы (>½ плитки) не схлопывают отход в ноль", () => {
      // Пол 3000×4000 плиткой 600×600: подрезы 590 и 386 мм — из одной плитки
      // два таких куска не нарезать, отход должен остаться заметным.
      const r = calculateTileLayout(3000, 4000, 600, 600, 2, "straight");
      expect(r.wastePercent).toBeGreaterThan(3);
    });

    it("поверхность меньше плитки — есть предупреждение", () => {
      const r = calculateTileLayout(150, 150, 300, 300, 2, "straight");
      expect(r.wholeTiles).toBe(0);
      expect(r.notes.some((n) => n.includes("меньше одной плитки"))).toBe(true);
    });
  });

  describe("дверной проём от пола", () => {
    it("убирает из расчёта плитку, полностью закрытую проёмом", () => {
      const r = calculateTileLayout(1200, 1200, 600, 600, 0, "straight", {
        widthMm: 600,
        heightMm: 600,
        offsetLeftMm: 0,
      });

      expect(r.opening).toEqual({
        widthMm: 600,
        heightMm: 600,
        offsetLeftMm: 0,
        offsetTopMm: 600,
      });
      expect(r.coveredAreaMm2).toBe(1_080_000);
      expect(r.openingAreaMm2).toBe(360_000);
      expect(r.wholeTiles).toBe(3);
      expect(r.cutTiles).toBe(0);
      expect(r.totalTiles).toBe(3);
      expect(r.basePurchaseTiles).toBe(3);
      expect(countCellsInGrid(r.tileGrid)).toBe(r.totalTiles);
    });

    it("считает пересечённую косяком плитку отдельной подрезкой без фиктивного повторного использования", () => {
      const r = calculateTileLayout(1200, 1200, 600, 600, 0, "straight", {
        widthMm: 300,
        heightMm: 600,
        offsetLeftMm: 0,
      });

      expect(r.wholeTiles).toBe(3);
      expect(r.cutTiles).toBe(1);
      expect(r.totalTiles).toBe(4);
      expect(r.basePurchaseTiles).toBe(4);
      expect(r.exactNeedAreaMm2).toBe(1_260_000);
      expect(r.wastePercent).toBeCloseTo(12.5, 5);
      expect(r.tileGrid.flat().some((cell) => cell.cutByOpening)).toBe(true);
    });

    it("нормализует проём внутри поверхности и не даёт отрицательную площадь", () => {
      expect(normalizeTileOpening({ widthMm: 2000, heightMm: 2000, offsetLeftMm: 900 }, 1200, 1000)).toEqual({
        widthMm: 1200,
        heightMm: 1000,
        offsetLeftMm: 0,
        offsetTopMm: 0,
      });

      const r = calculateTileLayout(1200, 1000, 600, 500, 0, "straight", {
        widthMm: 2000,
        heightMm: 2000,
        offsetLeftMm: 900,
      });
      expect(r.coveredAreaMm2).toBe(0);
      expect(r.totalTiles).toBe(0);
      expect(r.purchaseTiles).toBe(0);
      expect(r.purchaseReserveTiles).toBe(0);
    });

    it("учитывает проём в смещённой и диагональной схемах", () => {
      for (const mode of ["offset-half", "offset-third", "diagonal"] as const) {
        const withoutOpening = calculateTileLayout(2400, 2400, 600, 600, 2, mode);
        const withOpening = calculateTileLayout(2400, 2400, 600, 600, 2, mode, {
          widthMm: 800,
          heightMm: 1800,
          offsetLeftMm: 800,
        });

        expect(withOpening.openingAreaMm2).toBe(1_440_000);
        expect(withOpening.coveredAreaMm2).toBe(4_320_000);
        expect(withOpening.exactNeedAreaMm2).toBeLessThan(withoutOpening.exactNeedAreaMm2);
        if (mode === "diagonal") {
          expect(withOpening.totalTiles).toBe(
            withOpening.diagonal!.cells.filter((cell) => !cell.excludedByOpening).length,
          );
        } else {
          expect(withOpening.totalTiles).toBe(countCellsInGrid(withOpening.tileGrid));
        }
        expect(withOpening.notes.some((note) => note.includes("Проём"))).toBe(true);
      }
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
