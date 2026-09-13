import { describe, expect, it } from "vitest";
import type { PackStepResult } from "./run-pack";
import { mergePackResults } from "./run-pack";

describe("room master merged result", () => {
  it("does not show zero-purchase positions in the room summary", () => {
    const steps: PackStepResult[] = [
      {
        slug: "example",
        title: "Этап",
        result: {
          materials: [
            { name: "Нужный материал", quantity: 2, unit: "шт", purchaseQty: 2 },
            { name: "Не требуется", quantity: 0, unit: "шт", purchaseQty: 0 },
          ],
          totals: {},
          warnings: ["Проверить основание"],
          practicalNotes: ["Сверить фасовку"],
        },
      },
    ];

    const result = mergePackResults("Комната", steps);

    expect(result.materials.map((material) => material.name)).toEqual(["[Этап] Нужный материал"]);
    expect(result.warnings).toEqual(["Проверить основание"]);
    expect(result.practicalNotes).toEqual(["Сверить фасовку"]);
  });
});
