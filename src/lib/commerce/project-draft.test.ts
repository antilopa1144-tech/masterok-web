import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ProjectWithEntries } from "@/lib/storage/types";

const mocks = vi.hoisted(() => ({
  getPrices: vi.fn(),
  loadProjectMeta: vi.fn(),
  getProjectLayouts: vi.fn(),
}));

vi.mock("@/lib/userPrices", () => ({ PRICE_SCOPES: { materials: "materials" }, getPrices: mocks.getPrices }));
vi.mock("@/lib/projects/project-meta", () => ({ loadProjectMeta: mocks.loadProjectMeta }));
vi.mock("./project-layouts", () => ({ getProjectLayouts: mocks.getProjectLayouts }));

import { buildProjectDocumentDraft } from "./project-draft";

function project(): ProjectWithEntries {
  return {
    id: "p1", name: "Квартира", created: 1, updatedAt: 1,
    entries: [
      { id: "e1", projectId: "p1", calcId: "one", calcTitle: "Ванная", slug: "tile", categorySlug: "poly", ts: 1, materials: [{ id: "m1", name: "Клей", quantity: 25, unit: "кг", exactQuantity: 19, reservedQuantity: 21, baseUnit: "кг", packageSize: 25, packageCount: 1, packageUnit: "мешок", remainder: 4, procurementKey: "sku:glue" }] },
      { id: "e2", projectId: "p1", calcId: "two", calcTitle: "Кухня", slug: "tile-2", categorySlug: "poly", ts: 1, materials: [{ id: "m2", name: "Клей", quantity: 25, unit: "кг", exactQuantity: 20, reservedQuantity: 22, baseUnit: "кг", packageSize: 25, packageCount: 1, packageUnit: "мешок", remainder: 3, procurementKey: "sku:glue" }] },
    ],
  };
}

describe("buildProjectDocumentDraft", () => {
  beforeEach(() => {
    mocks.getPrices.mockReset();
    mocks.loadProjectMeta.mockReturnValue({ reservePercent: 10, deliveryRub: 500, customerName: "Иван", objectName: "Квартира" });
    mocks.getProjectLayouts.mockReturnValue([{ kind: "tile", title: "Раскладка", summary: "Схема", sourceLabel: "Плитка" }]);
  });

  it("uses only a matching prior price and carries proven purchase metadata", async () => {
    mocks.getPrices.mockImplementation(async (scope: string) => scope === "materials" ? {} : { "Клей": 400 });
    const draft = await buildProjectDocumentDraft(project());
    expect(draft.materials).toEqual([expect.objectContaining({ key: expect.stringContaining("spec:"), quantity: 50, exactQuantity: 39, packaging: expect.stringContaining("Упаковок: 2") })]);
    expect(draft.materials[0]?.unitPrice).toMatchObject({ amount: 400, provenance: expect.stringContaining("Ранее введённая") });
    expect(draft.monetaryReserve).toMatchObject({ amount: { amount: 2000 }, percent: 10 });
    expect(draft.delivery?.amount?.amount).toBe(500);
    expect(draft.parties).toMatchObject({ customer: { name: "Иван" }, object: "Квартира" });
    expect(draft.layouts).toHaveLength(1);
  });

  it("leaves an aggregate price unknown when source calculators disagree", async () => {
    mocks.getPrices.mockImplementation(async (scope: string) => {
      if (scope === "materials") return {};
      return scope.endsWith(":tile") ? { "Клей": 400 } : { "Клей": 450 };
    });
    const draft = await buildProjectDocumentDraft(project());
    expect(draft.materials[0]?.unitPrice).toBeUndefined();
    expect(draft.monetaryReserve).toBeUndefined();
  });
});
