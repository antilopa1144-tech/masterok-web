import { describe, expect, it } from "vitest";
import {
  buildRenovationCostHrefFromRoom,
  buildRoomMasterHrefFromRenovationCost,
  readRenovationCostRoomTransfer,
} from "./room-master-to-renovation-cost";

describe("связка ведомости комнаты со стоимостью ремонта", () => {
  it("переносит только точную площадь пола и контекст одной комнаты", () => {
    const href = buildRenovationCostHrefFromRoom({ areaM2: 20, packId: "room" });
    const url = new URL(href!, "https://getmasterok.ru");

    expect(url.pathname).toBe("/instrumenty/stoimost-remonta/");
    expect(Object.fromEntries(url.searchParams)).toEqual({
      area: "20",
      scope: "room",
      pack: "room",
      from: "moy-remont",
    });
    expect(url.searchParams.has("type")).toBe(false);
    expect(url.searchParams.has("withWork")).toBe(false);
  });

  it("не зажимает слишком маленькую площадь до минимума сметы", () => {
    expect(buildRenovationCostHrefFromRoom({ areaM2: 4.25, packId: "bathroom" })).toBeNull();
    expect(buildRenovationCostHrefFromRoom({ areaM2: 5, packId: "kitchen" })).not.toBeNull();
  });

  it("читает только полный доверенный контракт переноса", () => {
    const valid = new URLSearchParams("area=18.75&scope=room&pack=kitchen&from=moy-remont");
    expect(readRenovationCostRoomTransfer(valid)).toEqual({ areaM2: 18.75, packId: "kitchen" });
    expect(readRenovationCostRoomTransfer(new URLSearchParams("area=18.75&pack=kitchen"))).toBeNull();
    expect(readRenovationCostRoomTransfer(new URLSearchParams("area=18.75&scope=room&pack=garage&from=moy-remont"))).toBeNull();
  });

  it("не восстанавливает геометрию комнаты из общей площади сметы", () => {
    const url = new URL(buildRoomMasterHrefFromRenovationCost(), "https://getmasterok.ru");

    expect(url.pathname).toBe("/instrumenty/moy-remont/");
    expect(Object.fromEntries(url.searchParams)).toEqual({ from: "stoimost-remonta" });
    expect(url.searchParams.has("length")).toBe(false);
    expect(url.searchParams.has("width")).toBe(false);
  });
});
