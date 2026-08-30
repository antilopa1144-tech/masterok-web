import { describe, expect, it } from "vitest";
import { drywallCeilingDef } from "../formulas/drywall-ceiling";
import { checkInvariants, findMaterial, withBasicAccuracy } from "./_helpers";

const calc = withBasicAccuracy(drywallCeilingDef.calculate.bind(drywallCeilingDef));

describe("Потолок КНАУФ П 113", () => {
  it("публикует canonical v3 и честную границу конкретной системы", () => {
    expect(drywallCeilingDef.formulaVersion).toBe("drywall-ceiling-canonical-v3");
    expect(drywallCeilingDef.title).toContain("П 113");
    expect(drywallCeilingDef.description).toContain("официальной ведомости");
    expect(drywallCeilingDef.seoContent?.descriptionHtml).toContain("10&times;10 м");
    expect(drywallCeilingDef.faq?.[0].answer).toContain("не выдаются за универсальные");
  });

  describe("П 113.1 для помещения 5×4 м", () => {
    const result = calc({ inputMode: 0, length: 5, width: 4, layers: 1 });

    it("считает площадь и фактический периметр", () => {
      expect(result.totals.area).toBe(20);
      expect(result.totals.perimeter).toBe(18);
      expect(result.totals.systemVariant).toBe(1);
    });

    it("разделяет чистую потребность плит, явный запас и покупку", () => {
      const sheets = findMaterial(result, "Гипсовые плиты")!;
      expect(sheets.quantity).toBeCloseTo(20 / 3, 6);
      expect(sheets.withReserve).toBeCloseTo((20 / 3) * 1.1, 6);
      expect(sheets.purchaseQty).toBe(8);
      expect(result.scenarios?.MIN.exact_need).toBeCloseTo(20 / 3, 6);
      expect(result.scenarios?.REC.purchase_quantity).toBe(8);
    });

    it("считает ПП и ПН отдельно", () => {
      const pp = findMaterial(result, "ПП 60×27")!;
      const pn = findMaterial(result, "ПН 28×27")!;

      expect(result.totals.profileBaseM).toBe(58);
      expect(result.totals.totalProfileM).toBeCloseTo(60.9, 6);
      expect(pp.purchaseQty).toBe(21);
      expect(pn.quantity).toBe(6);
      expect(pn.purchaseQty).toBe(7);
    });

    it("добавляет полный каркас П 113, а не только крабы и подвесы", () => {
      expect(findMaterial(result, "Одноуровневый соединитель")?.quantity).toBe(34);
      expect(findMaterial(result, "Одноуровневый соединитель")?.purchaseQty).toBe(36);
      expect(findMaterial(result, "Удлинитель")?.quantity).toBe(4);
      expect(findMaterial(result, "Удлинитель")?.purchaseQty).toBe(5);
      expect(findMaterial(result, "Подвес")?.quantity).toBe(14);
      expect(findMaterial(result, "Подвес")?.purchaseQty).toBe(15);
    });

    it("разделяет LN и TN 25 по реальным фасовкам", () => {
      const ln = findMaterial(result, "Шуруп LN")!;
      const tn25 = findMaterial(result, "Шуруп TN 25")!;

      expect(ln.quantity).toBe(28);
      expect(ln.withReserve).toBeCloseTo(29.4, 6);
      expect(ln.purchaseQty).toBe(100);
      expect(tn25.quantity).toBe(460);
      expect(tn25.withReserve).toBe(483);
      expect(tn25.purchaseQty).toBe(1000);
      expect(findMaterial(result, "TN 35")).toBeUndefined();
    });

    it("не объединяет анкеры подвесов и крепёж ПН в одну условную позицию", () => {
      const anchors = findMaterial(result, "Анкерный элемент")!;
      const perimeterDowels = findMaterial(result, "Крепёж профиля ПН")!;

      expect(anchors.quantity).toBe(14);
      expect(anchors.purchaseQty).toBe(15);
      expect(perimeterDowels.quantity).toBe(36);
      expect(perimeterDowels.purchaseQty).toBe(38);
      expect(result.totals.dowelCount).toBe(53);
    });

    it("считает три разные ленты и составы отдельными упаковками", () => {
      expect(findMaterial(result, "Уплотнительная лента")?.purchaseQty).toBe(30);
      expect(findMaterial(result, "Бумажная армирующая")?.purchaseQty).toBe(50);
      expect(findMaterial(result, "Разделительная лента")?.purchaseQty).toBe(50);
      expect(findMaterial(result, "шпаклёвка")?.quantity).toBe(8);
      expect(findMaterial(result, "шпаклёвка")?.purchaseQty).toBe(25);
      expect(findMaterial(result, "Грунтовка")?.quantity).toBe(2);
      expect(findMaterial(result, "Грунтовка")?.purchaseQty).toBe(5);
      checkInvariants(result);
    });

    it("всегда сообщает границы официального расхода", () => {
      expect(result.warnings.some((warning) => warning.includes("только к комплектной системе"))).toBe(true);
      expect(result.warnings.some((warning) => warning.includes("100 м²"))).toBe(true);
      expect(result.warnings.some((warning) => warning.includes("Светильники"))).toBe(true);
    });
  });

  it("в режиме площади принимает реальный периметр и не создаёт условный квадрат", () => {
    const result = calc({ inputMode: 1, area: 20, perimeterM: 30 });
    const pn = findMaterial(result, "ПН 28×27")!;

    expect(result.totals.perimeter).toBe(30);
    expect(pn.quantity).toBe(10);
    expect(pn.purchaseQty).toBe(11);
    expect(result.warnings.some((warning) => warning.includes("не вычисляется из условного квадрата"))).toBe(true);
  });

  it("учитывает размеры плит, длину профиля и каждую фасовку", () => {
    const result = calc({
      inputMode: 1,
      area: 24,
      perimeterM: 30,
      layers: 1,
      sheetWidthMm: 1200,
      sheetLengthMm: 3000,
      sheetReservePercent: 0,
      profileLengthM: 4,
      profileReservePercent: 0,
      fastenerReservePercent: 0,
      tnScrewPackCount: 500,
      lnScrewPackCount: 50,
      jointTapeRollM: 50,
      sealingTapeRollM: 40,
      separatingTapeRollM: 25,
      puttyBagKg: 10,
      primerCanL: 3,
      finishReservePercent: 0,
    });

    expect(findMaterial(result, "Гипсовые плиты")?.purchaseQty).toBe(7);
    expect(findMaterial(result, "ПП 60×27")?.purchaseQty).toBe(18);
    expect(findMaterial(result, "ПН 28×27")?.purchaseQty).toBe(8);
    expect(findMaterial(result, "Шуруп TN 25")?.purchaseQty).toBe(1000);
    expect(findMaterial(result, "Шуруп LN")?.purchaseQty).toBe(50);
    expect(findMaterial(result, "Бумажная армирующая")?.purchaseQty).toBe(50);
    expect(findMaterial(result, "Уплотнительная")?.purchaseQty).toBe(40);
    expect(findMaterial(result, "Разделительная")?.purchaseQty).toBe(50);
    expect(findMaterial(result, "шпаклёвка")?.purchaseQty).toBe(10);
    expect(findMaterial(result, "Грунтовка")?.purchaseQty).toBe(3);
  });

  it("П 113.2 применяет отдельные нормы двухслойной обшивки", () => {
    const result = calc({ inputMode: 0, length: 5, width: 4, layers: 2 });

    expect(findMaterial(result, "Гипсовые плиты")?.quantity).toBeCloseTo(40 / 3, 6);
    expect(findMaterial(result, "TN 25")?.quantity).toBe(180);
    expect(findMaterial(result, "TN 35")?.quantity).toBe(460);
    expect(findMaterial(result, "шпаклёвка")?.quantity).toBe(12);
    expect(result.totals.profileBaseM).toBe(58);
    expect(result.warnings.some((warning) => warning.includes("0.4 кН"))).toBe(true);
  });

  it("MAX не добавляет скрытые пять процентов", () => {
    const result = calc({ inputMode: 1, area: 20, perimeterM: 18, sheetReservePercent: 7 });
    expect(result.scenarios?.MAX.exact_need).toBe(result.scenarios?.REC.exact_need);
    expect(result.scenarios?.MAX.purchase_quantity).toBe(result.scenarios?.REC.purchase_quantity);
    expect(result.scenarios?.MAX.assumptions).toContain("no_hidden_max_reserve");
  });

  it("режим точности не меняет официальную ведомость и явные запасы", () => {
    const normal = calc({ inputMode: 1, area: 20, perimeterM: 18, accuracyMode: 0 });
    const conservative = calc({ inputMode: 1, area: 20, perimeterM: 18, accuracyMode: 2 });

    expect(conservative.scenarios?.REC.exact_need).toBe(normal.scenarios?.REC.exact_need);
    expect(conservative.totals.profileBaseM).toBe(normal.totals.profileBaseM);
  });

  it("округляет пограничное количество плит только в конце", () => {
    const result = calc({
      inputMode: 1,
      area: 15,
      perimeterM: 16,
      sheetReservePercent: 0,
    });
    expect(result.scenarios?.REC.exact_need).toBe(5);
    expect(result.scenarios?.REC.purchase_quantity).toBe(5);
    expect(result.scenarios?.REC.leftover).toBe(0);
  });

  it("форма объясняет обязательный периметр и отдельные фасовки", () => {
    const perimeter = drywallCeilingDef.fields.find((field) => field.key === "perimeterM");
    const tnPack = drywallCeilingDef.fields.find((field) => field.key === "tnScrewPackCount");
    const lnPack = drywallCeilingDef.fields.find((field) => field.key === "lnScrewPackCount");

    expect(perimeter?.hint).toContain("примыкания");
    expect(tnPack?.label).toContain("TN");
    expect(lnPack?.label).toContain("LN");
  });

  it("SEO-пример совпадает с результатом формы", () => {
    const html = drywallCeilingDef.seoContent?.descriptionHtml;
    expect(html).toContain("8 плит");
    expect(html).toContain("21 профиль ПП");
    expect(html).toContain("36 соединителей");
    expect(html).toContain("15 подвесов");
  });
});
