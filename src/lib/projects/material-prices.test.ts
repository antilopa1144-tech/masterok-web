import { describe, expect, it } from "vitest";
import { resolveMaterialUnitPrice } from "./material-prices";

describe("resolveMaterialUnitPrice", () => {
  it("предпочитает цену из калькулятора", () => {
    expect(
      resolveMaterialUnitPrice("ГКЛ", { ГКЛ: 450 }, { ГКЛ: 400 }),
    ).toBe(450);
  });

  it("берёт общую цену, если в калькуляторе нет", () => {
    expect(resolveMaterialUnitPrice("Профиль", {}, { Профиль: 120 })).toBe(120);
  });

  it("возвращает 0 без цены", () => {
    expect(resolveMaterialUnitPrice("Клей", {}, {})).toBe(0);
    expect(resolveMaterialUnitPrice("Клей", { Клей: 0 }, { Клей: 0 })).toBe(0);
  });
});
