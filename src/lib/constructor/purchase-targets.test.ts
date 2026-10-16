import { describe, expect, it } from "vitest";
import { createScenarioWorkspace } from "./scenarios";
import { calculateProject, createTileSupply, type PurchaseLine } from "./core";
import { missingSupplyTargets, purchaseTargets } from "./purchase-targets";

const base: PurchaseLine = { id: "item", name: "Материал", detail: "", unit: "упак.", quantity: 1, unitPriceRub: 0, totalPriceRub: 0, roomIds: [], basis: "" };

describe("purchase source navigation", () => {
  it("finds enabled zero-rate mixtures by room identity, with one destination per room", () => {
    const { project } = createScenarioWorkspace("bathroom");
    const room = { ...project.rooms[0], tileSupplies: { adhesive: createTileSupply("adhesive"), grout: createTileSupply("grout") } };
    const wallOnly = { ...room, id: "walls", name: "Стены ванной", floor: createScenarioWorkspace("room").project.rooms[0].floor,
      tileSupplies: { grout: createTileSupply("grout") } };
    const rooms = [room, wallOnly];
    const calculations = calculateProject({ ...project, rooms }).rooms.reverse();
    const targets = missingSupplyTargets(rooms, calculations);
    expect(targets.map(item => [item.target.roomId, item.target.surface, item.missing])).toEqual([
      [room.id, "floor", ["adhesive", "grout"]], ["walls", "walls", ["grout"]],
    ]);
    expect(targets[1].target.wall).toBe(wallOnly.wallTiles.findIndex(Boolean));
    expect(targets[1].roomName).toBe("Стены ванной");
  });
  it("does not warn for disabled, configured, uncalculated or untiled mixtures", () => {
    const { project } = createScenarioWorkspace("bathroom");
    const room = { ...project.rooms[0], tileSupplies: { adhesive: { ...createTileSupply("adhesive"), consumptionKgM2: 1 } } };
    expect(missingSupplyTargets([room], calculateProject({ ...project, rooms: [room] }).rooms)).toEqual([]);
    room.tileSupplies.adhesive.consumptionKgM2 = 0;
    expect(missingSupplyTargets([room], [])).toEqual([]);
    const plain = { ...createScenarioWorkspace("room").project.rooms[0], tileSupplies: room.tileSupplies };
    expect(missingSupplyTargets([plain], calculateProject({ ...project, rooms: [plain] }).rooms)).toEqual([]);
  });
  it("keeps all rooms and surfaces of a combined tile item, removing duplicate references", () => {
    const room = createScenarioWorkspace("bathroom").project.rooms[0];
    const second = { ...room, id: "second", name: "Вторая ванная" };
    const targets = purchaseTargets({ ...base, kind: "wall-tile", roomIds: [room.id, second.id], floorRoomIds: [room.id, room.id], surfaces: [{ roomId: room.id, wall: 2 }, { roomId: second.id, wall: 0 }, { roomId: "missing", wall: 1 }] }, [room, second]);
    expect(targets.map(({ roomId, surface, wall }) => ({ roomId, surface, wall }))).toEqual([
      { roomId: room.id, surface: "floor", wall: undefined }, { roomId: room.id, surface: "walls", wall: 2 }, { roomId: second.id, surface: "walls", wall: 0 },
    ]);
    expect(targets[2].label).toBe("Вторая ванная · Стена 1");
  });
  it("opens shared mixture settings once per room, including wall-only tile", () => {
    const room = createScenarioWorkspace("bathroom").project.rooms[0];
    const wallOnly = { ...room, id: "walls", floor: createScenarioWorkspace("room").project.rooms[0].floor };
    const targets = purchaseTargets({ ...base, kind: "tile-adhesive", roomIds: [room.id, room.id, wallOnly.id] }, [room, wallOnly]);
    expect(targets).toHaveLength(2);
    expect(targets[0].surface).toBe("floor");
    expect(targets[1].wall).toBe(wallOnly.wallTiles.findIndex(Boolean));
  });
  it("opens each laminate room and skips unsupported or missing sources", () => {
    const room = createScenarioWorkspace("room").project.rooms[0];
    expect(purchaseTargets({ ...base, kind: "laminate", roomIds: [room.id, "missing"] }, [room])).toEqual([{ roomId: room.id, surface: "floor", wall: undefined, label: `${room.name} · Пол` }]);
    expect(purchaseTargets({ ...base, roomIds: [room.id] }, [room])).toEqual([]);
    expect(purchaseTargets({ ...base, kind: "floor-tile", roomIds: [room.id] }, [room])).toEqual([]);
  });
});
