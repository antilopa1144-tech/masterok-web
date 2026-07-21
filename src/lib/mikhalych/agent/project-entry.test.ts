import { describe, expect, it } from "vitest";
import { calculatorResultToProjectEntry } from "./project-entry";

describe("calculatorResultToProjectEntry", () => {
  it("не теряет спецификацию материала и использует количество к покупке", () => {
    const entry = calculatorResultToProjectEntry(
      {
        id: "drywall",
        title: "Гипсокартон",
        slug: "gipsokarton",
        categorySlug: "steny",
      } as never,
      {
        materials: [{
          name: "Чёрные саморезы для ГКЛ по металлу 3,5×25 мм",
          subtitle: "Для одного слоя ГКЛ",
          quantity: 180,
          withReserve: 190,
          purchaseQty: 200,
          unit: "шт",
        }],
        totals: {},
        warnings: [],
      },
    );

    expect(entry.materials[0]).toMatchObject({
      name: "Чёрные саморезы для ГКЛ по металлу 3,5×25 мм",
      subtitle: "Для одного слоя ГКЛ",
      quantity: 200,
      unit: "шт",
    });
  });
});
