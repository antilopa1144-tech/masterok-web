import { describe, expect, it } from "vitest";
import { DEFAULT_ROOM_DIMENSIONS } from "./geometry";
import { roomFloorLayoutHref } from "./tile-layout-link";

describe("переход мастера комнаты в раскладку пола", () => {
  it("передаёт формат пола, тип поверхности и явный запас", () => {
    const url = new URL(
      roomFloorLayoutHref({ ...DEFAULT_ROOM_DIMENSIONS, floorTileSize: 2 }),
      "https://getmasterok.ru",
    );

    expect(url.pathname).toBe("/instrumenty/raskladka-plitki/");
    expect(url.searchParams.get("tileW")).toBe("600");
    expect(url.searchParams.get("tileH")).toBe("600");
    expect(url.searchParams.get("surfaceView")).toBe("floor");
    expect(url.searchParams.get("reservePercent")).toBe("10");
    expect(url.searchParams.get("from")).toBe("moy-remont");
  });
});
