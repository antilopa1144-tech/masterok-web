import { describe, expect, it } from "vitest";
import { wallpaperDef } from "../formulas/wallpaper";

const calc = wallpaperDef.calculate.bind(wallpaperDef);

const perimeterInputs = {
  inputMode: 0,
  perimeter: 14,
  area: 40,
  height: 2.7,
  rollLength: 10.05,
  rollWidth: 530,
  cutLengthMode: 0,
  rapport: 0,
  patternShift: 0,
  trimAllowanceCm: 10,
  manualStripLengthM: 2.8,
  projectRolls: 1,
  reservePercent: 0,
  reserveRolls: 0,
};

describe("Обои — полотна, раскрой и целые рулоны", () => {
  it("по умолчанию считает полный периметр без скрытых материалов", () => {
    const result = calc(perimeterInputs);

    expect(result.formulaVersion).toBe("wallpaper-web-roll-layout-v1");
    expect(result.canonicalSpecId).toBe("wallpaper");
    expect(result.materials).toHaveLength(1);
    expect(result.materials[0]).toMatchObject({
      quantity: 9,
      unit: "рулонов",
      withReserve: 9,
      purchaseQty: 9,
    });
    expect(result.totals).toMatchObject({
      stripsNeeded: 27,
      stripLength: 2.8,
      stripsPerRoll: 3,
      baseExactRolls: 9,
      purchaseRolls: 9,
    });
  });

  it("не добавляет скрытый рулон в MAX или режиме точности", () => {
    const result = calc({
      ...perimeterInputs,
      accuracyMode: "professional" as unknown as number,
    });

    expect(result.scenarios?.MIN).toEqual(result.scenarios?.REC);
    expect(result.scenarios?.REC).toEqual(result.scenarios?.MAX);
    expect(result.scenarios?.REC.purchase_quantity).toBe(9);
    expect(result.accuracyExplanation?.combinedMultiplier).toBe(1);
  });

  it("применяет процент и закрытые рулоны ровно один раз", () => {
    const result = calc({
      ...perimeterInputs,
      reservePercent: 15,
      reserveRolls: 1,
    });

    expect(result.totals.baseExactRolls).toBe(9);
    expect(result.totals.requiredRolls).toBe(11.35);
    expect(result.totals.purchaseRolls).toBe(12);
    expect(result.scenarios?.REC.exact_need).toBe(11.35);
    expect(result.scenarios?.REC.leftover).toBe(0.65);
  });

  it("округляет длину полотна вверх до прямого раппорта", () => {
    const result = calc({ ...perimeterInputs, rapport: 64 });

    expect(result.totals.stripLength).toBe(3.2);
    expect(result.totals.stripsPerRoll).toBe(3);
    expect(result.totals.purchaseRolls).toBe(9);
  });

  it("учитывает только явно введённый дополнительный припуск совмещения", () => {
    const result = calc({
      ...perimeterInputs,
      rapport: 64,
      patternShift: 48,
    });

    expect(result.totals.stripLength).toBe(3.84);
    expect(result.totals.stripsPerRoll).toBe(2);
    expect(result.totals.purchaseRolls).toBe(14);
    expect(result.warnings.join(" ")).toContain("смещённой подгонки");
  });

  it("принимает готовую длину полотна из карты раскроя", () => {
    const result = calc({
      ...perimeterInputs,
      cutLengthMode: 1,
      manualStripLengthM: 3.4,
      rapport: 64,
      patternShift: 32,
    });

    expect(result.totals.stripLength).toBe(3.4);
    expect(result.totals.stripsPerRoll).toBe(2);
    expect(result.totals.purchaseRolls).toBe(14);
  });

  it("помечает расчёт по площади как предварительный", () => {
    const result = calc({
      ...perimeterInputs,
      inputMode: 1,
      area: 40,
    });

    expect(result.totals.stripsNeeded).toBe(28);
    expect(result.totals.purchaseRolls).toBe(10);
    expect(result.warnings.join(" ")).toContain("площадь стен до вычета проёмов");
  });

  it("использует готовое число рулонов из точной раскладки", () => {
    const result = calc({
      ...perimeterInputs,
      inputMode: 2,
      projectRolls: 12,
      reserveRolls: 1,
    });

    expect(result.totals.baseExactRolls).toBe(12);
    expect(result.totals.requiredRolls).toBe(13);
    expect(result.totals.purchaseRolls).toBe(13);
    expect(result.materials[0].purchaseQty).toBe(13);
  });

  it("понимает ширину рулона и в миллиметрах, и в метрах", () => {
    const millimeters = calc({ ...perimeterInputs, rollWidth: 1060 });
    const meters = calc({ ...perimeterInputs, rollWidth: 1.06 });

    expect(millimeters.totals.rollWidthM).toBe(1.06);
    expect(millimeters.totals.stripsNeeded).toBe(14);
    expect(millimeters.totals.purchaseRolls).toBe(5);
    expect(meters.totals.purchaseRolls).toBe(5);
  });

  it("не выдаёт рулоны, если из выбранной длины рулона не выходит полотно", () => {
    const result = calc({
      ...perimeterInputs,
      cutLengthMode: 1,
      manualStripLengthM: 12,
      rollLength: 10.05,
      reserveRolls: 1,
    });

    expect(result.totals.stripsPerRoll).toBe(0);
    expect(result.totals.requiredRolls).toBe(0);
    expect(result.totals.purchaseRolls).toBe(0);
    expect(result.scenarios?.REC.purchase_quantity).toBeGreaterThanOrEqual(
      result.scenarios?.REC.exact_need ?? 0,
    );
    expect(result.warnings.join(" ")).toContain("не помещается");
  });

  it("не добавляет клей, грунтовку и инструменты автоматически", () => {
    const result = calc(perimeterInputs);
    const names = result.materials.map((material) => material.name).join(" ");

    expect(result.materials).toHaveLength(1);
    expect(names).not.toMatch(/Клей|Грунтов|Валик|Шпатель|Нож|Лезв|Ведро|Губк/i);
  });

  it("удаляет оптимистичный вычет проёмов и фиктивные товарные профили", () => {
    const keys = wallpaperDef.fields.map((field) => field.key);

    expect(keys).not.toContain("openingsArea");
    expect(keys).not.toContain("openingDeductionMode");
    expect(keys).not.toContain("pasteCoverageM2");
    expect(keys).not.toContain("pastePackKg");
    expect(keys).not.toContain("primerRate");
    expect(keys).not.toContain("primerLayers");
    expect(keys).not.toContain("primerCanL");
    expect(keys).not.toContain("manufacturer");
    expect(keys).not.toContain("wallpaperType");
    expect(keys).toContain("projectRolls");
    expect(keys).toContain("manualStripLengthM");
  });

  it("скрывает взаимоисключающие параметры трёх режимов", () => {
    const field = (key: string) =>
      wallpaperDef.fields.find((item) => item.key === key);

    expect(field("perimeter")?.group).toBe("bySize");
    expect(field("area")?.group).toBe("byArea");
    expect(field("projectRolls")?.hideIf).toEqual({
      key: "inputMode",
      op: "ne",
      value: 2,
    });
    expect(field("manualStripLengthM")?.hideIf).toEqual([
      { key: "inputMode", op: "eq", value: 2 },
      { key: "cutLengthMode", op: "ne", value: 1 },
    ]);
    expect(field("rapport")?.hideIf).toEqual([
      { key: "inputMode", op: "eq", value: 2 },
      { key: "cutLengthMode", op: "ne", value: 0 },
    ]);
  });

  it("не обещает точность по одной площади и автоматический комплект", () => {
    expect(wallpaperDef.h1).toBe(
      "Калькулятор обоев — расчёт полотен и рулонов",
    );
    expect(wallpaperDef.description).toContain("полотен");
    expect(wallpaperDef.description).not.toMatch(/клея|грунтовки|расходник/i);
    expect(wallpaperDef.metaDescription.toLowerCase()).toContain("рассчитайте");
    expect(wallpaperDef.metaDescription.toLowerCase()).not.toContain("точн");
  });

  it("ссылается на действующий и будущий ГОСТ и маркировку производителей", () => {
    const html = wallpaperDef.seoContent?.descriptionHtml ?? "";

    expect(html).toContain(
      "https://protect.gost.ru/gost/details/0d517194-e3f9-4143-9550-34afcb44a0a4",
    );
    expect(html).toContain(
      "https://protect.gost.ru/gost/details/3fe0ec03-d9be-45bd-8718-0ca4118df9be",
    );
    expect(html).toContain(
      "https://marburg.com/en/wallpaper-consultation/",
    );
    expect(html).toContain(
      "https://marburg.com/en/city-glow-subpage-2/",
    );
    expect(html).toContain(
      "https://www.as-creation.com/fileadmin/02_Tapeten_Highlights/Kollektionsbroschuren/Pint_Walls_DE-EN.pdf",
    );
    expect(html).toContain("/instrumenty/raskladka-oboev/");
  });
});
