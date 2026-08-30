import { describe, expect, it } from "vitest";
import {
  buildElectricFloorHrefFromScreedResult,
  buildScreedHrefFromElectricFloorResult,
  ELECTRIC_FLOOR_CALCULATOR_PATH,
} from "./floor-system-cluster-links";

describe("floor system cluster links", () => {
  it("передаёт из стяжки только общую площадь помещения", () => {
    const href = buildElectricFloorHrefFromScreedResult({ area: 20.125, thickness: 60 });
    const url = new URL(href!, "https://getmasterok.ru");

    expect(Object.fromEntries(url.searchParams)).toEqual({
      from: "styazhka",
      roomAreaM2: "20.125",
    });
    expect(url.searchParams.has("layoutAreaM2")).toBe(false);
    expect(url.searchParams.has("excludedAreaM2")).toBe(false);
  });

  it("возвращает в стяжку площадь комнаты, а не площадь нагрева", () => {
    const href = buildScreedHrefFromElectricFloorResult({
      roomArea: 18,
      heatingArea: 12,
      excludedAreaM2: 6,
    });
    const url = new URL(href!, "https://getmasterok.ru");

    expect(Object.fromEntries(url.searchParams)).toEqual({
      from: "teplyy-pol",
      inputMode: "1",
      area: "18",
    });
    expect(url.searchParams.has("thickness")).toBe(false);
  });

  it("не передаёт в электрический пол площадь выше его диапазона", () => {
    expect(buildElectricFloorHrefFromScreedResult({ area: 600 }))
      .toBe(ELECTRIC_FLOOR_CALCULATOR_PATH);
  });

  it("не показывает кластерную ссылку без результата", () => {
    expect(buildElectricFloorHrefFromScreedResult(undefined)).toBeNull();
    expect(buildScreedHrefFromElectricFloorResult(undefined)).toBeNull();
  });
});
