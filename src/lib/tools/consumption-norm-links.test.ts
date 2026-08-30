import { describe, expect, it } from "vitest";
import {
  buildConsumptionNormHref,
  getConsumptionNormCategory,
} from "./consumption-norm-links";
import { CONSUMPTION_NORMS } from "./norms-data";

describe("связка справочника норм с калькуляторами", () => {
  it("открывает точный раздел справочника для каждого связанного калькулятора", () => {
    for (const category of CONSUMPTION_NORMS) {
      if (!category.calculator) continue;

      expect(getConsumptionNormCategory(category.calculator.slug)).toBe(category.id);
      expect(buildConsumptionNormHref(category.calculator.slug)).toBe(
        `/instrumenty/normy-raskhoda/#norm-${category.id}`,
      );
    }
  });

  it("не подменяет наливной пол стяжкой, а газобетон кирпичом", () => {
    expect(buildConsumptionNormHref("nalivnoy-pol")).toContain("#norm-nalivnoy-pol");
    expect(buildConsumptionNormHref("gazobeton")).toContain("#norm-kladochnyy-kley");
    expect(buildConsumptionNormHref("styazhka")).toBeNull();
    expect(buildConsumptionNormHref("kirpich")).toBeNull();
  });

  it("не создаёт ссылку для калькулятора без проверенной категории", () => {
    expect(buildConsumptionNormHref("beton")).toBeNull();
  });
});
