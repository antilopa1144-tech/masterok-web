import { describe, expect, it } from "vitest";
import { excludePurchaseMaterial, updatePurchaseMaterial } from "./purchase-edits";

describe("purchase material edits", () => {
  it("rounds a changed package size once from the already reserved need", () => {
    const next = updatePurchaseMaterial({
      id: "m1", name: "Клей", quantity: 25, unit: "кг", reservedQuantity: 22, packageSize: 25,
    }, { packageSize: 10 });

    expect(next).toMatchObject({ quantity: 30, packageCount: 3, remainder: 8, packageSize: 10 });
  });

  it("does not fabricate packaging for a legacy material", () => {
    const next = updatePurchaseMaterial({ name: "Клей", quantity: 2, unit: "мешок" }, { quantity: 3 });
    expect(next).toEqual({ name: "Клей", quantity: 3, unit: "мешок" });
  });

  it("keeps an explicitly edited purchase quantity", () => {
    const next = updatePurchaseMaterial({
      name: "Клей", quantity: 25, unit: "кг", reservedQuantity: 22, packageSize: 25, procurementKey: "sku:glue",
    }, { quantity: 50 });
    expect(next).toMatchObject({ quantity: 50, reservedQuantity: 22 });
    expect(next.procurementKey).toBeUndefined();
    expect(next.packageCount).toBeUndefined();
    expect(next.remainder).toBeUndefined();
  });

  it("does not recalculate a manual quantity when an explicit SKU is later selected", () => {
    const manual = updatePurchaseMaterial({ name: "Клей", quantity: 25, unit: "кг", baseUnit: "кг", reservedQuantity: 22, packageSize: 25, packageCount: 1, remainder: 3 }, { quantity: 100 });
    const selected = updatePurchaseMaterial(manual, { procurementKey: "sku:glue" });
    expect(selected).toMatchObject({ quantity: 100, procurementKey: "sku:glue" });
    expect(selected.packageCount).toBeUndefined();
  });

  it("does not add a package because of binary decimal noise", () => {
    const next = updatePurchaseMaterial({ name: "Лента", quantity: 0.3, unit: "м", baseUnit: "м", reservedQuantity: 0.1 + 0.2, packageSize: 0.1 }, { packageSize: 0.1 });
    expect(next).toMatchObject({ packageCount: 3, quantity: 0.30000000000000004 });
  });

  it("does not hide a real fraction at a large quantity", () => {
    const next = updatePurchaseMaterial({ name: "Лента", quantity: 1000000000.01, unit: "м", reservedQuantity: 1000000000.01 }, { packageSize: 1 });
    expect(next.packageCount).toBe(1000000001);
  });

  it("rejects invalid package and piece edits", () => {
    const material = { name: "Дюбели", quantity: 10, unit: "шт", packageSize: 10 };
    expect(updatePurchaseMaterial(material, { quantity: 1.5 })).toEqual(material);
    expect(updatePurchaseMaterial(material, { packageSize: 0 })).toEqual(material);
  });

  it("marks a material as excluded without deleting its calculation evidence", () => {
    expect(excludePurchaseMaterial({ name: "Клей", quantity: 2, unit: "мешок" })).toMatchObject({ excluded: true });
  });
});
