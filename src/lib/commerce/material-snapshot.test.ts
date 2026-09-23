import { describe, expect, it } from "vitest";
import { procurementPilotForCalculator, toStoredMaterial } from "./material-snapshot";
import { plasterDef } from "@/lib/calculators/formulas/plaster";
import { puttyDef } from "@/lib/calculators/formulas/putty";
import { primerDef } from "@/lib/calculators/formulas/primer";
import { paintDef } from "@/lib/calculators/formulas/paint";
import { tileDef } from "@/lib/calculators/formulas/tile";
import { tileAdhesiveDef } from "@/lib/calculators/formulas/tile-adhesive";
import { tileGroutDef } from "@/lib/calculators/formulas/tile-grout";
import { laminateDef } from "@/lib/calculators/formulas/laminate";
import { selfLevelingDef } from "@/lib/calculators/formulas/self-leveling";
import { waterproofingDef } from "@/lib/calculators/formulas/waterproofing";
import type { CalculatorDefinition } from "@/lib/calculators/types";

function defaults(definition: CalculatorDefinition): Record<string, number> {
  return Object.fromEntries(definition.fields.map((field) => [field.key, field.defaultValue]));
}

describe("material snapshot", () => {
  it("maps the ten real calculator ids used by the offers pilot", () => {
    expect(["mixes_plaster", "mixes_putty", "mixes_primer", "paint", "tile", "mixes_tile_glue", "floors_tile_grout", "laminate", "floors_self_leveling", "bathroom_waterproof"].map(procurementPilotForCalculator))
      .toEqual(["plaster", "putty", "primer", "paint", "tile", "tile-adhesive", "tile-grout", "laminate", "self-leveling", "waterproofing"]);
  });

  it("keeps package-count results and supplied metadata without inventing base units", () => {
    expect(toStoredMaterial({ name: "Смесь", quantity: 2, purchaseQty: 2, unit: "меш.", packageInfo: { count: 2, size: 25, packageUnit: "мешок" } }))
      .toMatchObject({ quantity: 2, unit: "меш.", baseQuantity: 2, purchaseQty: 2, packageSize: 25, packageCount: 2, packageUnit: "мешок" });
  });

  it("preserves explicitly available exact and reserve quantities only", () => {
    expect(toStoredMaterial({ name: "Грунтовка", quantity: 5, withReserve: 6, unit: "л", exactQuantity: 5, reservedQuantity: 6, baseUnit: "л", procurementKey: "sku:1" }))
      .toMatchObject({ quantity: 6, exactQuantity: 5, reservedQuantity: 6, baseUnit: "л", procurementKey: "sku:1" });
  });

  it("uses piece quantity as a need only when a distinct package is supplied", () => {
    expect(toStoredMaterial({ name: "Плитка", quantity: 30, withReserve: 33, unit: "шт", packageInfo: { count: 3, size: 12, packageUnit: "упаковок" } }))
      .toMatchObject({ exactQuantity: 30, reservedQuantity: 33, baseUnit: "шт", remainder: 3 });
    expect(toStoredMaterial({ name: "Дюбель", quantity: 30, withReserve: 33, unit: "шт" })).not.toHaveProperty("exactQuantity");
  });

  it("creates editable need metadata from all ten pilot calculators at their defaults", () => {
    const definitions = [plasterDef, puttyDef, primerDef, paintDef, tileDef, tileAdhesiveDef, tileGroutDef, laminateDef, selfLevelingDef, waterproofingDef];
    for (const definition of definitions) {
      const snapshots = definition.calculate(defaults(definition)).materials.map(toStoredMaterial);
      const measurable = snapshots.filter((material) => ["кг", "л", "м²", "м"].includes(material.unit));
      expect(measurable.length, definition.id).toBeGreaterThan(0);
      for (const material of measurable) {
        expect(material.exactQuantity, `${definition.id}: ${material.name}`).toBeTypeOf("number");
        if (material.reservedQuantity !== undefined) expect(material.reservedQuantity, `${definition.id}: ${material.name}`).toBeGreaterThanOrEqual(material.exactQuantity!);
        expect(material.baseUnit, `${definition.id}: ${material.name}`).toBe(material.unit);
      }
    }
  });

  it("does not treat package-rounded tile adhesive as its own reserve", () => {
    const material = tileDef.calculate(defaults(tileDef)).materials.find((item) => item.category === "Клей");
    expect(material).toMatchObject({ withReserve: 75, purchaseQty: 75, packageInfo: { count: 3, size: 25 } });
    expect(material?.quantity).toBeCloseTo(54.534, 3);
    const snapshot = toStoredMaterial(material!);
    expect(snapshot.exactQuantity).toBeCloseTo(54.534, 3);
    expect(snapshot.reservedQuantity).toBeCloseTo(54.534, 3);
    expect(snapshot.remainder).toBeCloseTo(20.466, 3);
  });
  it("does not label ambiguous package-rounded companion quantity as reserve", () => {
    const snapshot = toStoredMaterial({name:"Грунтовка",quantity:2,withReserve:5,purchaseQty:5,unit:"л"});
    expect(snapshot).toMatchObject({quantity:5,exactQuantity:2});
    expect(snapshot.reservedQuantity).toBeUndefined();
    expect(snapshot.remainder).toBeUndefined();
  });

});
