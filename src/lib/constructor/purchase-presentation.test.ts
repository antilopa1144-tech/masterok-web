import { describe, expect, it } from "vitest";
import { calculateProject } from "./core";
import { createWorkspace } from "./workspace";
import { summarizeFinish } from "./comparison";
import { purchaseCostText, purchaseFacts } from "./purchase-presentation";

describe("purchase presentation", () => {
  it("does not present an unpriced project as a free purchase", () => {
    const workspace = createWorkspace();
    const result = calculateProject(workspace.project);
    expect(purchaseCostText(summarizeFinish(workspace.project, result).cost).value).toBe("Цены не заданы");
  });

  it("labels a partially priced statement as an incomplete sum", () => {
    const workspace = createWorkspace();
    workspace.project.rooms[0].floor.packPriceRub = 1800;
    const floor = workspace.project.rooms[0].floor;
    if (floor.kind !== "tile") floor.includeUnderlay = true;
    const result = calculateProject(workspace.project);
    const cost = summarizeFinish(workspace.project, result).cost;
    expect(cost.hasPrices).toBe(true);
    expect(cost.missingLines).toBeGreaterThan(0);
    expect(purchaseCostText(cost).label).toBe("Сумма позиций с заданной ценой");
    expect(purchaseCostText(cost).value).not.toBe("Цены не заданы");
  });

  it("keeps fractional reserve separate from integer purchase and package surplus", () => {
    const facts = purchaseFacts({ id: "laminate", name: "Ламинат", detail: "", unit: "упак.", quantity: 2, unitPriceRub: 0, totalPriceRub: 0, roomIds: [], basis: "", baseBoards: 10, reserveBoards: 0.5, roundedBoards: 11, purchasedBoards: 16, packSurplusBoards: 5, purchasedAreaM2: 3.2 });
    expect(facts).toEqual([
      { label: "По раскладке", value: "10 шт." }, { label: "Резерв", value: "0,5 шт." },
      { label: "Нужно с резервом", value: "11 шт." }, { label: "В упаковках", value: "16 шт. · 3,2 м²" },
      { label: "Сверх потребности", value: "5 шт." },
    ]);
  });

  it("uses kilograms for mixes and does not fabricate missing facts", () => {
    const line = { id: "adhesive", name: "Клей", detail: "", unit: "меш.", quantity: 2, unitPriceRub: 0, totalPriceRub: 0, roomIds: [], basis: "" };
    expect(purchaseFacts(line)).toEqual([]);
    expect(purchaseFacts({ ...line, exactNeedKg: 26.5, reserveKg: 2.65, neededKg: 29.15, purchasedKg: 50, packSurplusKg: 20.85 })).toContainEqual({ label: "По расходу товара", value: "26,5 кг" });
  });
});
