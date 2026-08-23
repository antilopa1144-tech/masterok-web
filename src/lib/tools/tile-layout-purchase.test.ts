import { describe, expect, it } from "vitest";
import {
  calculateTilePackaging,
  DEFAULT_TILE_PACK_AREA_M2,
  DEFAULT_TILE_TILES_PER_BOX,
  estimateTilesPerBoxFromArea,
  isValidTilePackArea,
  isValidTilesPerBox,
} from "./tile-layout-purchase";

describe("tile-layout purchase packaging", () => {
  it("округляет потребность до коробок по подтверждённому числу плиток", () => {
    const result = calculateTilePackaging(50, 600, 300, {
      tilesPerBox: 10,
      packAreaM2: 1.8,
      source: "label",
    });

    expect(result.requiredTiles).toBe(50);
    expect(result.tilesPerBox).toBe(10);
    expect(result.boxesToBuy).toBe(5);
    expect(result.purchasedTiles).toBe(50);
    expect(result.leftoverTiles).toBe(0);
    expect(result.boxAreaM2).toBe(1.8);
    expect(result.packagingSource).toBe("label");
    expect(result.purchasedAreaM2).toBe(9);
  });

  it("оставляет фасовку с этикетки неизменной при смене формата плитки", () => {
    const first = calculateTilePackaging(50, 600, 300, {
      tilesPerBox: 10,
      source: "label",
    });
    const changedFormat = calculateTilePackaging(50, 300, 300, {
      tilesPerBox: 10,
      source: "label",
    });

    expect(first.tilesPerBox).toBe(10);
    expect(changedFormat.tilesPerBox).toBe(10);
    expect(changedFormat.boxAreaM2).toBe(0.9);
  });

  it("не создаёт коробку при нулевой потребности", () => {
    const result = calculateTilePackaging(0, 600, 300, {
      tilesPerBox: DEFAULT_TILE_TILES_PER_BOX,
      packAreaM2: DEFAULT_TILE_PACK_AREA_M2,
      source: "estimated",
    });

    expect(result.boxesToBuy).toBe(0);
    expect(result.purchasedTiles).toBe(0);
    expect(result.leftoverTiles).toBe(0);
  });

  it("явно маркирует оценку по площади коробки", () => {
    const estimatedTiles = estimateTilesPerBoxFromArea(600, 300, 1.44);
    const result = calculateTilePackaging(1, 600, 300, {
      tilesPerBox: estimatedTiles,
      packAreaM2: 1.44,
      source: "estimated",
    });

    expect(estimatedTiles).toBe(8);
    expect(result.boxesToBuy).toBe(1);
    expect(result.purchasedTiles).toBe(8);
    expect(result.leftoverTiles).toBe(7);
    expect(result.packagingSource).toBe("estimated");
  });

  it("не подменяет невалидное число штук правдоподобной упаковкой", () => {
    for (const tilesPerBox of [0, 1.5, Number.NaN]) {
      expect(() => calculateTilePackaging(10, 300, 300, {
        tilesPerBox,
        source: "label",
      })).toThrow(RangeError);
    }
  });

  it("валидирует пользовательские значения без скрытой подмены", () => {
    expect(isValidTilePackArea(1.44)).toBe(true);
    expect(isValidTilePackArea(0.09)).toBe(false);
    expect(isValidTilePackArea(20.01)).toBe(false);
    expect(isValidTilePackArea(Number.NaN)).toBe(false);
    expect(isValidTilesPerBox(10)).toBe(true);
    expect(isValidTilesPerBox(0)).toBe(false);
    expect(isValidTilesPerBox(1.5)).toBe(false);
    expect(isValidTilesPerBox(501)).toBe(false);
  });
});
