import { describe, expect, it } from "vitest";
import { ALL_CALCULATORS } from "@/lib/calculators";
import type { MaterialResult } from "@/lib/calculators/types";
import { withBasicAccuracy } from "@/lib/calculators/__tests__/_helpers";
import {
  getMaterialPriceBasis,
  getMaterialPriceKey,
  getMaterialPriceTotal,
  getRelevantPriceCount,
} from "./materialPriceBasis";

describe("material price basis", () => {
  it("uses package count for packaged materials", () => {
    const rebar: MaterialResult = {
      name: "Арматура основная Ø12 А500С",
      quantity: 1717.8,
      unit: "м.п.",
      purchaseQty: 1719.9,
      packageInfo: { count: 147, size: 11.7, packageUnit: "прутков" },
    };

    const basis = getMaterialPriceBasis(rebar);

    expect(basis.kind).toBe("package");
    expect(basis.quantity).toBe(147);
    expect(basis.unitLabel).toBe("пруток");
    expect(basis.unitDescription).toBe("пруток 11,7 м.п.");
    expect(getMaterialPriceTotal([rebar], { [basis.key]: 450 })).toBe(147 * 450);
  });

  it("keeps raw unit pricing for bulk materials such as concrete", () => {
    const concrete: MaterialResult = {
      name: "Бетон М300",
      quantity: 3.2,
      unit: "м³",
      purchaseQty: 3.5,
    };

    const basis = getMaterialPriceBasis(concrete);

    expect(basis.kind).toBe("raw");
    expect(basis.quantity).toBe(3.5);
    expect(basis.unitLabel).toBe("м³");
    expect(getMaterialPriceTotal([concrete], { [basis.key]: 7200 })).toBe(3.5 * 7200);
  });

  it("does not reuse legacy name prices for packaged materials", () => {
    const material: MaterialResult = {
      name: "Клей плиточный",
      quantity: 72,
      unit: "кг",
      purchaseQty: 75,
      packageInfo: { count: 3, size: 25, packageUnit: "мешков" },
    };

    expect(getMaterialPriceTotal([material], { "Клей плиточный": 40 })).toBe(0);
    expect(getRelevantPriceCount([material], { [getMaterialPriceKey(material)]: 580 })).toBe(1);
  });

  it("builds a finite price basis for every calculator material", () => {
    for (const calc of ALL_CALCULATORS) {
      const inputs = Object.fromEntries(calc.fields.map((field) => [field.key, field.defaultValue]));
      const result = withBasicAccuracy(calc.calculate.bind(calc))(inputs);

      for (const material of result.materials) {
        const basis = getMaterialPriceBasis(material);

        expect(Number.isFinite(basis.quantity), `${calc.slug}: ${material.name}`).toBe(true);
        expect(basis.quantity, `${calc.slug}: ${material.name}`).toBeGreaterThan(0);
        expect(basis.unitLabel, `${calc.slug}: ${material.name}`).toBeTruthy();
        expect(basis.unitDescription, `${calc.slug}: ${material.name}`).toBeTruthy();
        expect(basis.key, `${calc.slug}: ${material.name}`).toBeTruthy();
      }
    }
  });
});
