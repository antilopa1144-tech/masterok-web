import { describe, expect, it } from "vitest";
import { calculateProject, createTileSupply } from "./core";
import { createScenarioWorkspace } from "./scenarios";
import { purchaseTargets } from "./purchase-targets";
import { purchaseSourcePrice } from "./purchase-source-price";

describe("source prices in purchase details", () => {
  it("shows each wall setting, including zero, rather than the grouped maximum", () => {
    const { project } = createScenarioWorkspace("bathroom");
    const room = project.rooms[0];
    room.continuousWallTiles = false;
    [1440, 0, 1200, 1440].forEach((price, wall) => { room.wallTiles[wall]!.packPriceRub = price; });
    room.floor.tile!.packPriceRub = 1250;
    const result = calculateProject(project);
    const wallLine = result.purchases.find(line => line.kind === "wall-tile")!;
    const floorLine = result.purchases.find(line => line.kind === "floor-tile")!;
    expect(wallLine.unitPriceRub).toBe(1440);
    expect(purchaseTargets(wallLine, project.rooms).map(target => purchaseSourcePrice(wallLine, target, project.rooms))).toEqual([1440, 0, 1200, 1440]);
    expect(purchaseSourcePrice(floorLine, purchaseTargets(floorLine, project.rooms)[0], project.rooms)).toBe(1250);
    expect(purchaseSourcePrice(wallLine, { roomId: "absent", surface: "walls", wall: 0, label: "" }, project.rooms)).toBeUndefined();
  });
  it.each(["adhesive", "grout"] as const)("reads shared %s package price from the correct room", kind => {
    const { project } = createScenarioWorkspace("bathroom");
    project.rooms[0].tileSupplies = { [kind]: { ...createTileSupply(kind), consumptionKgM2: 1, packagePriceRub: 345.67 } };
    const line = calculateProject(project).purchases.find(item => item.kind === (kind === "adhesive" ? "tile-adhesive" : "tile-grout"))!;
    expect(purchaseSourcePrice(line, purchaseTargets(line, project.rooms)[0], project.rooms)).toBe(345.67);
  });
  it("reads laminate prices and leaves unsupported rows unspecified", () => {
    const { project } = createScenarioWorkspace("room");
    project.rooms[0].floor.packPriceRub = 2100;
    const line = calculateProject(project).purchases.find(item => item.kind === "laminate")!;
    const target = purchaseTargets(line, project.rooms)[0];
    expect(purchaseSourcePrice(line, target, project.rooms)).toBe(2100);
    expect(purchaseSourcePrice({ ...line, kind: undefined }, target, project.rooms)).toBeUndefined();
  });
});
