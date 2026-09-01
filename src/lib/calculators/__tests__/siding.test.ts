import { describe, expect, it } from "vitest";
import { sidingDef } from "../formulas/siding";
import { checkInvariants, findMaterial, withBasicAccuracy } from "./_helpers";

const calc = withBasicAccuracy(sidingDef.calculate.bind(sidingDef));

const defaults = {
  facadeArea: 150,
  openingsArea: 20,
  sidingType: 0,
  panelLengthM: 3.66,
  panelWorkingWidthMm: 200,
  reservePct: 10,
  panelsPerPack: 0,
};

describe("Калькулятор сайдинга", () => {
  it("считает чистую площадь и панели по фактическим рабочим размерам", () => {
    const result = calc(defaults);
    const siding = findMaterial(result, "Виниловый сайдинг");

    expect(result.totals.netArea).toBe(130);
    expect(result.totals.panelWorkingArea).toBeCloseTo(0.732, 6);
    expect(result.totals.cleanPanelNeed).toBeCloseTo(130 / 0.732, 6);
    expect(result.totals.reservedPanelNeed).toBeCloseTo(130 / 0.732 * 1.1, 6);
    expect(result.totals.panelsToBuy).toBe(196);
    expect(siding?.purchaseQty).toBe(196);
    checkInvariants(result);
  });

  it("изменяет результат по введённым рабочим размерам, а не по названию типа", () => {
    const widePanel = calc({ ...defaults, panelLengthM: 3, panelWorkingWidthMm: 300 });
    const narrowPanel = calc({ ...defaults, panelLengthM: 3.6, panelWorkingWidthMm: 175 });

    expect(widePanel.totals.panelWorkingArea).toBeCloseTo(0.9, 6);
    expect(widePanel.totals.panelsToBuy).toBe(159);
    expect(narrowPanel.totals.panelWorkingArea).toBeCloseTo(0.63, 6);
    expect(narrowPanel.totals.panelsToBuy).toBe(227);
  });

  it("делает запас явным и не добавляет второй скрытый процент", () => {
    const noReserve = calc({ ...defaults, reservePct: 0 });
    const tenPercent = calc({ ...defaults, reservePct: 10 });
    const fifteenPercent = calc({ ...defaults, reservePct: 15 });

    expect(noReserve.totals.cleanPanelNeed).toBeCloseTo(tenPercent.totals.cleanPanelNeed, 6);
    expect(noReserve.totals.panelsToBuy).toBe(178);
    expect(tenPercent.totals.panelsToBuy).toBe(196);
    expect(fifteenPercent.totals.panelsToBuy).toBe(205);
  });

  it("округляет закупку до фактической упаковки, только когда она введена", () => {
    const pieces = calc(defaults);
    const packed = calc({ ...defaults, panelsPerPack: 12 });
    const siding = findMaterial(packed, "Виниловый сайдинг");

    expect(pieces.totals.packsToBuy).toBe(0);
    expect(pieces.totals.panelsToBuy).toBe(196);
    expect(packed.totals.packsToBuy).toBe(17);
    expect(packed.totals.panelsToBuy).toBe(204);
    expect(packed.totals.leftoverPanels).toBeCloseTo(204 - 130 / 0.732 * 1.1, 6);
    expect(siding?.packageInfo).toEqual({ count: 17, size: 12, packageUnit: "упаковок" });
    checkInvariants(packed);
  });

  it("не даёт отрицательный расход, если площадь проёмов не меньше фасада", () => {
    const result = calc({ ...defaults, facadeArea: 20, openingsArea: 40 });

    expect(result.totals.netArea).toBe(0);
    expect(result.totals.panelsToBuy).toBe(0);
    expect(result.warnings.some((warning) => warning.includes("не меньше площади фасада"))).toBe(true);
  });

  it("не назначает профили, крепёж, обрешётку, мембрану и герметик", () => {
    const result = calc(defaults);
    const names = result.materials.map((material) => material.name).join(" ");

    expect(result.materials).toHaveLength(1);
    expect(names).not.toMatch(/Стартов|J-образ|угол|Финиш|Саморез|Обреш|мембран|Герметик/i);
    expect(result.materialListBanner).toContain("только панели сайдинга");
    expect(result.warnings.some((warning) => warning.includes("Доборные профили") && warning.includes("не рассчитаны"))).toBe(true);
  });

  it("не просит периметр, высоту и число углов для фиктивной ведомости", () => {
    const fieldKeys = sidingDef.fields.map((field) => field.key);

    expect(fieldKeys).not.toContain("perimeter");
    expect(fieldKeys).not.toContain("height");
    expect(fieldKeys).not.toContain("cornersCount");
    expect(fieldKeys).not.toContain("exteriorCorners");
    expect(fieldKeys).toContain("panelLengthM");
    expect(fieldKeys).toContain("panelWorkingWidthMm");
    expect(fieldKeys).toContain("panelsPerPack");
  });

  it("MIN, REC, MAX и режим точности не умножают панели", () => {
    const result = calc(defaults);

    expect(result.scenarios?.MIN).toEqual(result.scenarios?.REC);
    expect(result.scenarios?.REC).toEqual(result.scenarios?.MAX);
    expect(result.accuracyExplanation?.combinedMultiplier).toBe(1);
  });

  it("объясняет площадную модель, рабочие размеры и границу раскладки", () => {
    const result = calc(defaults);
    const text = [...result.warnings, ...(result.practicalNotes ?? [])].join(" ");

    expect(text).toContain("рабоч");
    expect(text).toContain("площад");
    expect(text).toContain("расклад");
    expect(text).toContain("конкретн");
  });

  it("ссылается на действующие СП и первичные инструкции систем", () => {
    const content = `${sidingDef.formulaDescription ?? ""} ${sidingDef.seoContent?.descriptionHtml ?? ""}`;

    expect(content).toContain("СП 522.1325800.2023");
    expect(content).toContain("СП 518.1311500.2022");
    expect(content).toContain("https://protect.gost.ru/sp/details/dbc01349-d0b9-4fe7-a2f6-e4534ff53704");
    expect(content).toContain("https://protect.gost.ru/sp/details/8bcea61b-6982-4201-9f1e-7caa08553ad4");
    expect(content).toContain("https://www.docke.ru/info/pdf/instructions/siding/");
    expect(content).toContain("https://www.grandline.ru/uploads/files/Instrukcii_vse/Instrukcii-po-montazu-profilirovannyh-izdelij/instruction_b_house_new.pdf");
  });

  it("не выдаёт универсальные монтажные размеры за правила для всех систем", () => {
    const content = `${sidingDef.formulaDescription ?? ""} ${sidingDef.seoContent?.descriptionHtml ?? ""}`;

    expect(content).not.toContain("400–600 мм");
    expect(content).not.toContain("25–40 мм");
    expect(content).not.toContain("5–6 мм");
    expect(content).not.toContain("2 мм на 3 м");
  });

  it("сохраняет поисковый интент без обещания брендов и комплектующих", () => {
    expect(sidingDef.h1).toContain("Калькулятор сайдинга");
    expect(sidingDef.metaDescription).toMatch(/^Бесплатный калькулятор/);
    expect(sidingDef.metaDescription).toContain("рассчитайте");
    expect(sidingDef.description).not.toMatch(/комплектующ|профил|Docke|Grand Line/i);
    expect(sidingDef.metaDescription).not.toMatch(/комплектующ|профил|Docke|Grand Line/i);
  });
});
