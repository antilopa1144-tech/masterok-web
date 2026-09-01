import { describe, expect, it } from "vitest";
import { buildRectangleWalls } from "./wallpaper-layout";
import {
  buildWallpaperCalculatorHref,
  buildWallpaperCalculatorHrefFromRoom,
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
    expect(url.searchParams.get("inputMode")).toBe("2");
    expect(url.searchParams.get("projectRolls")).toBe("12");
    expect(url.searchParams.get("rollWidth")).toBe("530");
    expect(url.searchParams.get("rollsHint")).toBe("13");
  });

  it("переносит периметр и высоту из расчёта комнаты", () => {
    const url = new URL(
      buildWallpaperCalculatorHrefFromRoom({ perimeter: 18, height: 2.7 }),
      "https://getmasterok.ru",
    );

    expect(Object.fromEntries(url.searchParams)).toEqual({
      from: "ploshchad-komnaty",
      inputMode: "0",
      perimeter: "18",
      height: "2.7",
    });
  });

  it("не передаёт размеры вне диапазона калькулятора обоев", () => {
    expect(buildWallpaperCalculatorHrefFromRoom({ perimeter: 80, height: 1.8 }))
      .toBe("/kalkulyatory/otdelka/oboi/");
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

  it("сохраняет визуальную конфигурацию комнаты в ссылке", () => {
    const visual = {
      presentationMode: "room" as const,
      finish: "linen-blue" as const,
      compareMode: true,
      comparisonFinish: "terracotta-arches" as const,
      textureScale: 150,
      activeWallIndex: 2,
      showWindow: true,
      showDoor: false,
      windowWidthM: 1.8,
      windowHeightM: 1.3,
      windowPositionPercent: 42,
      doorWidthM: 0.9,
      doorHeightM: 2.1,
      doorPositionPercent: 80,
    };
    const href = buildWallpaperLayoutShareHref({ geometryMode: "rectangle", roomWidth: 4, roomLength: 5, input, visual });
    const parsed = parseWallpaperLayoutSearchParams(new URL(href, "https://getmasterok.ru").searchParams);

    expect(parsed.visual).toEqual(visual);
  });

  it("отбрасывает неизвестный декор и визуальные значения вне диапазона", () => {
    const parsed = parseWallpaperLayoutSearchParams(new URLSearchParams(
      "finish=unknown&textureScale=500&windowW=8&window=maybe&door=0",
    ));

    expect(parsed.visual).toEqual({ showDoor: false });
  });
});
