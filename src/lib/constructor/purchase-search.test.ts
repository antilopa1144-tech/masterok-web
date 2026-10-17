import { describe, expect, it } from "vitest";
import { createScenarioWorkspace } from "./scenarios";
import { calculateProject } from "./core";
import { hasMixedPurchasePrices, searchPurchases } from "./purchase-search";

describe("purchase list search", () => {
  const { project } = createScenarioWorkspace("bathroom");
  project.rooms[0].name = "Зелёная ванная";
  const lines = calculateProject(project).purchases;
  it("matches formats written with different separators and case", () => {
    for (const query of ["ПЛИТКА 600x300", "600×300", "600 х 300", "  600   300  "]) {
      const found = searchPurchases(lines, project.rooms, query);
      expect(found.length).toBeGreaterThan(0);
      expect(found.every(line => line.kind === "wall-tile")).toBe(true);
    }
  });
  it("finds room names with е/ё but preserves the full aggregated purchase row", () => {
    const grouped = { ...lines[0], roomIds: [project.rooms[0].id, "other-room"] };
    expect(searchPurchases([grouped], project.rooms, "зеленая")[0]).toBe(grouped);
  });
  it("returns the original list for an empty query and no matches for an unknown material", () => {
    expect(searchPurchases(lines, project.rooms, "   ")).toBe(lines);
    expect(searchPurchases(lines, project.rooms, "несуществующий товар")).toEqual([]);
  });
  it("combines the unpriced filter with search without changing purchase quantities", () => {
    const priced = { ...lines[0], id: "priced", unitPriceRub: 1250, name: "Плитка с ценой" };
    const unpriced = { ...lines[0], id: "unpriced", unitPriceRub: 0, name: "Плитка без цены", quantity: 7 };
    const source = [priced, unpriced];
    expect(searchPurchases(source, project.rooms, "плитка", "unpriced")).toEqual([unpriced]);
    expect(searchPurchases(source, project.rooms, "", "unpriced")[0]).toBe(unpriced);
    expect(searchPurchases(source, project.rooms, "несуществующее", "unpriced")).toEqual([]);
    expect(searchPurchases(source, project.rooms, "", "all")).toBe(source);
    expect(source[1].quantity).toBe(7);
  });
  it.each([0, 1200])("finds grouped wall prices including a source priced at %s", (otherPrice) => {
    const { project: bathroom } = createScenarioWorkspace("bathroom");
    bathroom.rooms[0].continuousWallTiles = false;
    bathroom.rooms[0].wallTiles.forEach(spec => { if (spec) spec.packPriceRub = otherPrice; });
    bathroom.rooms[0].wallTiles[0]!.packPriceRub = 1440;
    const result = calculateProject(bathroom);
    const snapshot = JSON.stringify(result);
    const wallTile = result.purchases.find(line => line.kind === "wall-tile")!;
    expect(hasMixedPurchasePrices(wallTile)).toBe(true);
    expect(searchPurchases(result.purchases, bathroom.rooms, "плитка", "mixed-price")).toEqual([wallTile]);
    expect(searchPurchases(result.purchases, bathroom.rooms, "", "mixed-price")[0]).toBe(wallTile);
    expect(searchPurchases(result.purchases, bathroom.rooms, "несуществующее", "mixed-price")).toEqual([]);
    expect(searchPurchases(result.purchases, bathroom.rooms, "", "unpriced")).not.toContain(wallTile);
    expect(JSON.stringify(result)).toBe(snapshot);
    bathroom.rooms[0].wallTiles.forEach(spec => { if (spec) spec.packPriceRub = 1440; });
    expect(searchPurchases(calculateProject(bathroom).purchases, bathroom.rooms, "", "mixed-price")).toEqual([]);
  });
  it("does not classify missing prices as mixed prices", () => {
    expect(lines.some(line => line.priceNote)).toBe(true);
    expect(lines.some(hasMixedPurchasePrices)).toBe(false);
  });
});
