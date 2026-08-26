import { describe, it, expect } from "vitest";
import { drywallCeilingDef } from "../formulas/drywall-ceiling";
import { findMaterial, checkInvariants, withBasicAccuracy } from "./_helpers";

const calc = withBasicAccuracy(drywallCeilingDef.calculate.bind(drywallCeilingDef));

describe("Подвесной потолок из ГКЛ", () => {
  it("публикует единый canonical v2 и честно позиционирует расчёт", () => {
    expect(drywallCeilingDef.formulaVersion).toBe("drywall-ceiling-canonical-v2");
    expect(drywallCeilingDef.metaTitle).toContain("гипсокартона на потолок");
    expect(drywallCeilingDef.metaDescription).toContain("по размерам или площади");
    expect(drywallCeilingDef.seoContent?.descriptionHtml).toContain("не заменяет проект");
    expect(drywallCeilingDef.faq?.[0].answer).toContain("монтажную сетку");
  });

  describe("Потолок 5×4 м, 1 слой, значения формы по умолчанию", () => {
    const result = calc({ inputMode: 0, length: 5, width: 4, layers: 1 });

    it("разделяет чистую потребность ГКЛ, явный запас и покупку", () => {
      const gkl = findMaterial(result, "ГКЛ")!;
      expect(gkl.quantity).toBeCloseTo(20 / 3, 6);
      expect(gkl.withReserve).toBeCloseTo(20 / 3 * 1.1, 6);
      expect(gkl.purchaseQty).toBe(8);
      expect(result.scenarios?.MIN.exact_need).toBeCloseTo(20 / 3, 6);
      expect(result.scenarios?.REC.exact_need).toBeCloseTo(20 / 3 * 1.1, 6);
      expect(result.scenarios?.REC.purchase_quantity).toBe(8);
    });

    it("считает каркас по опубликованным ориентирам на площадь", () => {
      const pp = findMaterial(result, "ПП 60×27")!;
      const pn = findMaterial(result, "ПН 27×28")!;
      const suspension = findMaterial(result, "Подвес")!;
      const connector = findMaterial(result, "Одноуровневый соединитель")!;

      expect(result.totals.profileBaseM).toBe(58);
      expect(result.totals.totalProfileM).toBeCloseTo(60.9, 6);
      expect(pp.purchaseQty).toBe(21);
      expect(pn.purchaseQty).toBe(7);
      expect(suspension.quantity).toBe(14);
      expect(suspension.purchaseQty).toBe(15);
      expect(connector.quantity).toBe(34);
      expect(connector.purchaseQty).toBe(36);
    });

    it("считает саморезы в штуках и округляет до указанной упаковки", () => {
      const screws = findMaterial(result, "Саморезы для ГКЛ")!;
      expect(screws.quantity).toBe(460);
      expect(screws.withReserve).toBeCloseTo(483, 6);
      expect(screws.purchaseQty).toBe(1000);
      expect(screws.packageInfo).toEqual({ count: 1, size: 1000, packageUnit: "упаковок" });
    });

    it("показывает крепёж основания без двойного анкера на подвес", () => {
      const anchors = findMaterial(result, "Крепёж к основанию")!;
      expect(result.totals.ceilingAnchors).toBe(15);
      expect(result.totals.perimeterDowels).toBe(38);
      expect(anchors.purchaseQty).toBe(53);
      expect(anchors.subtitle).toContain("15 анкеров");
    });

    it("упаковки отделки управляются параметрами формы", () => {
      expect(findMaterial(result, "Армирующая лента")?.purchaseQty).toBe(45);
      expect(findMaterial(result, "Шпаклёвка")?.purchaseQty).toBe(25);
      expect(findMaterial(result, "Грунтовка")?.purchaseQty).toBe(5);
      checkInvariants(result);
    });
  });

  it("не применяет скрытый accuracy-множитель к листам", () => {
    const normal = calc({ inputMode: 1, area: 20, accuracyMode: 0 });
    const conservative = calc({ inputMode: 1, area: 20, accuracyMode: 2 });
    expect(conservative.scenarios?.REC.exact_need).toBe(normal.scenarios?.REC.exact_need);
    expect(conservative.totals.sheets).toBe(normal.totals.sheets);
  });

  it("учитывает пользовательские размеры листа, запасы и фасовки", () => {
    const result = calc({
      inputMode: 1,
      area: 24,
      layers: 1,
      sheetWidthMm: 1200,
      sheetLengthMm: 3000,
      sheetReservePercent: 0,
      profileLengthM: 4,
      profileReservePercent: 0,
      fastenerReservePercent: 0,
      screwPackCount: 500,
      tapeRollM: 50,
      puttyBagKg: 10,
      primerRateLPerM2: 0.2,
      primerCanL: 3,
      finishReservePercent: 0,
    });

    expect(findMaterial(result, "ГКЛ")?.purchaseQty).toBe(7);
    expect(findMaterial(result, "ПП 60×27")?.purchaseQty).toBe(18);
    expect(findMaterial(result, "Саморезы для ГКЛ")?.purchaseQty).toBe(1000);
    expect(findMaterial(result, "Армирующая лента")?.purchaseQty).toBe(50);
    expect(findMaterial(result, "Шпаклёвка")?.purchaseQty).toBe(10);
    expect(findMaterial(result, "Грунтовка")?.purchaseQty).toBe(6);
  });

  it("для двух слоёв удваивает чистую потребность ГКЛ и саморезов", () => {
    const oneLayer = calc({ inputMode: 1, area: 20, layers: 1 });
    const twoLayers = calc({ inputMode: 1, area: 20, layers: 2 });
    expect(findMaterial(twoLayers, "ГКЛ")?.quantity).toBeCloseTo((findMaterial(oneLayer, "ГКЛ")?.quantity ?? 0) * 2, 5);
    expect(findMaterial(twoLayers, "Саморезы")?.quantity).toBe((findMaterial(oneLayer, "Саморезы")?.quantity ?? 0) * 2);
    expect(twoLayers.warnings.some((warning) => warning.includes("разбежка"))).toBe(true);
  });

  it("для площади более 50 м² требует проектной проверки швов", () => {
    const result = calc({ inputMode: 1, area: 60 });
    expect(result.warnings.some((warning) => warning.includes("деформационных швов"))).toBe(true);
  });

  it("SEO-пример совпадает с результатом формы", () => {
    const example = drywallCeilingDef.seoContent?.faq?.find((item) => item.question.includes("20 м²"));
    expect(example?.answer).toContain("8 листов");
    expect(example?.answer).toContain("21 профиль ПП");
    expect(example?.answer).toContain("15 подвесов");
    expect(example?.answer).toContain("36 одноуровневых соединителей");
  });
});
