import { describe, expect, it } from "vitest";
import { bathroomDef } from "@/lib/calculators/formulas/bathroom";
import { DEFAULT_ROOM_DIMENSIONS } from "./geometry";
import { ROOM_PACKS } from "./packs";

describe("пакет ванной в мастере комнаты", () => {
  it("передаёт выбранные форматы в действующие поля калькулятора", () => {
    const dimensions = {
      ...DEFAULT_ROOM_DIMENSIONS,
      floorTileSize: 2,
      wallTileSize: 2,
    };
    const values = ROOM_PACKS.bathroom.primarySteps[0].buildInputs(dimensions);
    const result = bathroomDef.calculate(values);
    const names = result.materials.map((material) => material.name).join(" ");

    expect(values).toMatchObject({
      floorTileWidthMm: 600,
      floorTileHeightMm: 600,
      wallTileWidthMm: 300,
      wallTileHeightMm: 600,
    });
    expect(values).not.toHaveProperty("floorTileSize");
    expect(values).not.toHaveProperty("wallTileSize");
    expect(names).toContain("600×600");
    expect(names).toContain("300×600");
  });

  it("использует те же текущие ключи в ссылке полного калькулятора", () => {
    const href = ROOM_PACKS.bathroom.fullCalculatorHref({
      ...DEFAULT_ROOM_DIMENSIONS,
      floorTileSize: 2,
      wallTileSize: 2,
    });
    const url = new URL(href, "https://getmasterok.ru");

    expect(url.searchParams.get("floorTileWidthMm")).toBe("600");
    expect(url.searchParams.get("floorTileHeightMm")).toBe("600");
    expect(url.searchParams.get("wallTileWidthMm")).toBe("300");
    expect(url.searchParams.get("wallTileHeightMm")).toBe("600");
    expect(url.searchParams.has("floorTileSize")).toBe(false);
    expect(url.searchParams.has("wallTileSize")).toBe(false);
  });
});
