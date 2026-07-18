import { describe, expect, it } from "vitest";
import { buildRectangleWalls } from "./wallpaper-layout";
import {
  buildWallpaperCalculatorHref,
  buildWallpaperCalculatorTransferValues,
  buildWallpaperLayoutHref,
  buildWallpaperLayoutShareHref,
  parseWallpaperLayoutSearchParams,
} from "./wallpaper-layout-to-calc";

const input = {
  walls: buildRectangleWalls(4, 5),
  wallHeightM: 2.7,
  rollWidthM: 0.53,
  rollLengthM: 10.05,
  matchType: "offset" as const,
  rapportCm: 64,
  offsetCm: 32,
  trimAllowanceCm: 10,
  reserveRolls: 1,
};

describe("wallpaper-layout-to-calc", () => {
  it("переносит единицы калькулятора без потери", () => {
    expect(buildWallpaperCalculatorTransferValues(input)).toEqual({
      perimeter: 18,
      height: 2.7,
      rollLength: 10.05,
      rollWidth: 530,
      rapport: 64,
      reserveRolls: 1,
    });
  });

  it("добавляет подсказку по рулонам в ссылку калькулятора", () => {
    const href = buildWallpaperCalculatorHref(input, 13);
    const url = new URL(href, "https://getmasterok.ru");

    expect(url.pathname).toBe("/kalkulyatory/otdelka/oboi/");
    expect(url.searchParams.get("from")).toBe("raskladka-oboev");
    expect(url.searchParams.get("rollWidth")).toBe("530");
    expect(url.searchParams.get("rollsHint")).toBe("13");
  });

  it("понимает миллиметры ширины рулона из калькулятора", () => {
    const params = new URLSearchParams("perimeter=16&height=2.8&rollWidth=1060&rapport=32");
    expect(parseWallpaperLayoutSearchParams(params)).toMatchObject({
      perimeter: 16,
      height: 2.8,
      rollWidthM: 1.06,
      rapport: 32,
    });
  });

  it("не подменяет отсутствующий резерв нулём", () => {
    const parsed = parseWallpaperLayoutSearchParams(new URLSearchParams("height=2.7"));
    expect(parsed.reserveRolls).toBeUndefined();
    expect(parsed.rapport).toBeUndefined();
  });

  it("строит обратную ссылку из калькулятора", () => {
    const href = buildWallpaperLayoutHref({ height: 2.7, rollWidth: 530, rapport: 0 });
    expect(href).toContain("/instrumenty/raskladka-oboev/?");
    expect(href).toContain("rollWidth=530");
  });

  it("сохраняет полную пользовательскую раскладку в ссылке", () => {
    const href = buildWallpaperLayoutShareHref({ geometryMode: "walls", input });
    const parsed = parseWallpaperLayoutSearchParams(new URL(href, "https://getmasterok.ru").searchParams);

    expect(parsed.geometryMode).toBe("walls");
    expect(parsed.walls).toHaveLength(4);
    expect(parsed.matchType).toBe("offset");
    expect(parsed.offset).toBe(32);
    expect(parsed.trimAllowance).toBe(10);
  });
});
