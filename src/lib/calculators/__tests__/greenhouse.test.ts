import { describe, expect, it } from "vitest";
import { greenhouseDef } from "../formulas/greenhouse";
import { checkInvariants, findMaterial, withBasicAccuracy } from "./_helpers";

const calc = withBasicAccuracy(greenhouseDef.calculate.bind(greenhouseDef));

const defaults = {
  length: 6,
  width: 3,
  height: 2.1,
  roofType: 0,
  wallHeight: 1.5,
  polycarbonateThickness: 6,
  sheetLength: 6,
  cuttingReservePct: 10,
  archStep: 0.65,
  doorCount: 2,
  ventCount: 2,
  foundationType: 1,
};

describe("Калькулятор теплицы из поликарбоната", () => {
  it("считает полуэллиптическую арку по введённой высоте, а не как скрытый полуцилиндр", () => {
    const low = calc({ ...defaults, height: 1.8 });
    const high = calc({ ...defaults, height: 2.4 });

    expect(low.totals.archLengthM).not.toBeCloseTo(high.totals.archLengthM, 3);
    expect(low.totals.polyArea).not.toBeCloseTo(high.totals.polyArea, 3);
    expect(high.warnings.join(" ")).toContain("полуэллипс");
  });

  it("для типовой арки 6×3×2,1 показывает площадь оболочки и минимум листов по площади", () => {
    const result = calc(defaults);

    expect(result.totals.polyArea).toBeGreaterThan(43);
    expect(result.totals.polyAreaWithReserve).toBeCloseTo(result.totals.polyArea * 1.1, 2);
    expect(result.totals.polySheets).toBe(4);
    expect(result.summaryCards?.[0].label).toBe("Площадь оболочки");
    expect(result.summaryCards?.[1].label).toBe("Минимум по площади");
    checkInvariants(result);
  });

  it("двускатная геометрия использует явную высоту боковой стены", () => {
    const lowWall = calc({ ...defaults, length: 4, roofType: 1, height: 2.4, wallHeight: 1.0 });
    const highWall = calc({ ...defaults, length: 4, roofType: 1, height: 2.4, wallHeight: 1.8 });

    expect(lowWall.totals.wallHeight).toBe(1);
    expect(highWall.totals.wallHeight).toBe(1.8);
    expect(lowWall.totals.polyArea).not.toBeCloseTo(highWall.totals.polyArea, 3);
  });

  it("ограничивает ошибочную высоту стены ниже конька и сообщает об этом", () => {
    const result = calc({ ...defaults, roofType: 1, height: 2, wallHeight: 2.4 });

    expect(result.totals.wallHeight).toBeCloseTo(1.9, 3);
    expect(result.warnings.some((warning) => warning.includes("ниже высоты в коньке"))).toBe(true);
  });

  it("даёт выбрать фактическую длину листа 6 или 12 м", () => {
    const sixMeters = calc({ ...defaults, sheetLength: 6 });
    const twelveMeters = calc({ ...defaults, sheetLength: 12 });

    expect(sixMeters.totals.sheetLength).toBe(6);
    expect(twelveMeters.totals.sheetLength).toBe(12);
    expect(twelveMeters.totals.polySheets).toBeLessThan(sixMeters.totals.polySheets);
  });

  it("применяет только явно выбранный запас раскроя", () => {
    const withoutReserve = calc({ ...defaults, cuttingReservePct: 0 });
    const withReserve = calc({ ...defaults, cuttingReservePct: 15 });

    expect(withoutReserve.totals.polyAreaWithReserve).toBeCloseTo(withoutReserve.totals.polyArea, 3);
    expect(withReserve.totals.polyAreaWithReserve).toBeCloseTo(withReserve.totals.polyArea * 1.15, 2);
    expect(withReserve.totals.cuttingReservePct).toBe(15);
  });

  it("не превращает толщину листа и шаг рам в обещание несущей способности", () => {
    const result = calc({ ...defaults, polycarbonateThickness: 4, archStep: 1 });
    const text = [
      ...result.warnings,
      ...(result.practicalNotes ?? []),
      greenhouseDef.formulaDescription ?? "",
    ].join(" ");

    expect(text).toContain("паспорт");
    expect(text.toLowerCase()).toContain("снегов");
    expect(text).not.toContain("выдерживает 160");
    expect(text).not.toContain("рассчитан на снеговую нагрузку");
  });

  it("не добавляет выдуманные профиль, крепёж, ленты, профили и фундамент", () => {
    const result = calc({ ...defaults, foundationType: 3 });
    const names = result.materials.map((material) => material.name).join(" ");

    expect(findMaterial(result, "Поликарбонат")).toBeDefined();
    expect(names).not.toMatch(/Профиль каркаса|Термошайб|Саморез|H-профиль|U-образный|Уплотнительн|Бетон М200|Винтовая свая|Брус 100/);
    expect(result.warnings.some((warning) => warning.includes("фундамент") && warning.includes("не рассчит"))).toBe(true);
  });

  it("оставляет только явно введённые количества дверей и форточек", () => {
    const result = calc({ ...defaults, doorCount: 1, ventCount: 3 });
    const door = findMaterial(result, "Дверной комплект");
    const vent = findMaterial(result, "Форточка");

    expect(door?.purchaseQty).toBe(1);
    expect(vent?.purchaseQty).toBe(3);
    expect(door?.subtitle).toContain("введено пользователем");
    expect(vent?.subtitle).toContain("введено пользователем");
  });

  it("не добавляет форточки при нулевом вводе", () => {
    const result = calc({ ...defaults, ventCount: 0 });

    expect(findMaterial(result, "Форточка")).toBeUndefined();
  });

  it("MIN, REC и MAX не меняют конструкцию скрытыми коэффициентами", () => {
    const result = calc(defaults);

    expect(result.scenarios?.MIN).toEqual(result.scenarios?.REC);
    expect(result.scenarios?.REC).toEqual(result.scenarios?.MAX);
    expect(result.accuracyExplanation?.combinedMultiplier).toBe(1);
  });

  it("предупреждает, что число листов требует карты раскроя", () => {
    const result = calc(defaults);
    const polycarbonate = findMaterial(result, "Поликарбонат");

    expect(result.warnings.some((warning) => warning.includes("карта раскроя"))).toBe(true);
    expect(polycarbonate?.name).toContain("минимум по площади");
    expect(polycarbonate?.subtitle).toContain("Карта раскроя");
  });

  it("использует профильные действующие источники и не ссылается на ложный ГОСТ", () => {
    const content = `${greenhouseDef.formulaDescription ?? ""} ${greenhouseDef.seoContent?.descriptionHtml ?? ""}`;

    expect(content).toContain("ГОСТ Р 56712-2015");
    expect(content).toContain("СП 20.13330.2016");
    expect(content).toContain("ГОСТ 27751-2014");
    expect(content).not.toContain("ГОСТ 56826-2015");
    expect(content).not.toContain("СП 107.13330.2012");
    expect(content).toContain("https://protect.gost.ru/gost/details/8ba9e398-b5af-461e-9667-6c49ddc6eb8f");
    expect(content).toContain("https://protect.gost.ru/sp/details/bac9e1fe-45f1-401b-8e32-949f4ee27821");
    expect(content).toContain("https://protect.gost.ru/gost/details/e4eba4be-53ab-4df2-ac3e-2bf10c2bea35");
  });

  it("не обещает в сниппете автоматический проект каркаса и фундамента", () => {
    expect(greenhouseDef.description).toContain("площадь покрытия");
    expect(greenhouseDef.metaDescription).toContain("минимум листов");
    expect(greenhouseDef.description).not.toMatch(/каркас|фундамент/);
    expect(greenhouseDef.metaDescription).not.toMatch(/каркас|фундамент/);
  });

  it("показывает границы даже для большого ввода", () => {
    const result = calc({
      ...defaults,
      length: 12,
      width: 6,
      height: 3,
      roofType: 1,
      wallHeight: 2.4,
      polycarbonateThickness: 10,
      sheetLength: 12,
      cuttingReservePct: 15,
      archStep: 0.5,
      ventCount: 6,
      foundationType: 2,
    });

    checkInvariants(result);
    expect(result.totals.polySheets).toBeGreaterThan(0);
    expect(result.warnings.some((warning) => warning.includes("12-метров"))).toBe(true);
  });
});
