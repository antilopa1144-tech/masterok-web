import { describe, expect, it } from "vitest";
import { foamBlocksDef } from "../formulas/foam-blocks";
import { checkInvariants, findMaterial, withBasicAccuracy } from "./_helpers";

const calc = withBasicAccuracy(foamBlocksDef.calculate.bind(foamBlocksDef));

const defaults = {
  inputMode: 0,
  wallLength: 10,
  wallHeight: 2.7,
  area: 27,
  openingsArea: 5,
  blockSize: 0,
  reservePct: 5,
  blocksPerPallet: 0,
};

describe("Калькулятор пеноблоков и бетонных стеновых камней", () => {
  it("считает чистую геометрию и только явно выбранный запас", () => {
    const result = calc(defaults);
    const blocks = findMaterial(result, "Пенобетонный блок 600×300×200");

    expect(result.totals.wallArea).toBe(27);
    expect(result.totals.netArea).toBe(22);
    expect(result.totals.cleanBlockNeed).toBeCloseTo(122.222, 3);
    expect(result.totals.reservedBlockNeed).toBeCloseTo(128.333, 3);
    expect(result.totals.blocksToBuy).toBe(129);
    expect(blocks?.quantity).toBeCloseTo(122.222, 3);
    expect(blocks?.purchaseQty).toBe(129);
    checkInvariants(result);
  });

  it("не добавляет второй скрытый REC-множитель поверх выбранного запаса", () => {
    const result = calc(defaults);

    expect(result.scenarios?.MIN).toEqual(result.scenarios?.REC);
    expect(result.scenarios?.REC).toEqual(result.scenarios?.MAX);
    expect(result.scenarios?.REC.purchase_quantity).toBe(129);
    expect(result.accuracyExplanation?.combinedMultiplier).toBe(1);
  });

  it("при нулевом запасе округляет только до целого блока", () => {
    const result = calc({ ...defaults, reservePct: 0 });

    expect(result.totals.reservedBlockNeed).toBeCloseTo(122.222, 3);
    expect(result.totals.blocksToBuy).toBe(123);
  });

  it("по введённой кратности округляет закупку до целых поддонов", () => {
    const result = calc({ ...defaults, blocksPerPallet: 48 });
    const blocks = findMaterial(result, "Пенобетонный блок");

    expect(result.totals.palletsToBuy).toBe(3);
    expect(result.totals.blocksToBuy).toBe(144);
    expect(result.totals.leftoverBlocks).toBeCloseTo(15.667, 3);
    expect(blocks?.packageInfo).toEqual({ count: 3, size: 48, packageUnit: "поддонов" });
    expect(blocks?.purchaseQty).toBe(144);
    expect(result.scenarios?.REC.purchase_quantity).toBe(3);
    expect(result.scenarios?.REC.exact_need).toBeCloseTo(128.333 / 48, 3);
  });

  it("не выдумывает раствор, армирование, перемычки и грунтовку", () => {
    const result = calc(defaults);
    const names = result.materials.map((material) => material.name).join(" ");

    expect(result.materials).toHaveLength(1);
    expect(names).not.toMatch(/Клей|ЦПС|Арматур|Кладочная сетка|У-блок|Перемыч|Грунтов/);
    expect(result.warnings.some((warning) => warning.includes("Кладочный состав") && warning.includes("не рассчитан"))).toBe(true);
    expect(result.warnings.some((warning) => warning.includes("Армирование") && warning.includes("не рассчитаны"))).toBe(true);
  });

  it("не назначает несущую стену, утепление или армирование по одному размеру", () => {
    const field = foamBlocksDef.fields.find((candidate) => candidate.key === "blockSize");
    const labels = field?.options?.map((option) => option.label).join(" ") ?? "";
    const content = [
      foamBlocksDef.description,
      foamBlocksDef.formulaDescription,
      foamBlocksDef.seoContent?.descriptionHtml,
      ...(foamBlocksDef.faq ?? []).map((item) => item.answer),
    ].join(" ");

    expect(labels).not.toContain("несущ");
    expect(content).not.toMatch(/D600[^.]{0,80}несущ|D800[^.]{0,80}несущ/i);
    expect(content).not.toMatch(/армировани[^.]{0,80}обязательно[^.]{0,80}3[–-]4/i);
    expect(content).not.toContain("требуется утепление от 100 мм");
  });

  it("считает керамзитобетонный камень по его лицевой грани", () => {
    const result = calc({
      ...defaults,
      inputMode: 1,
      area: 30,
      openingsArea: 3,
      blockSize: 2,
      reservePct: 10,
    });
    const blocks = findMaterial(result, "Керамзитобетонный стеновой камень");

    expect(result.totals.netArea).toBe(27);
    expect(result.totals.blockFaceArea).toBeCloseTo(0.0741, 4);
    expect(blocks?.purchaseQty).toBe(401);
    checkInvariants(result);
  });

  it("не даёт площади проёмов сделать отрицательную площадь кладки", () => {
    const result = calc({ ...defaults, wallLength: 2, wallHeight: 2, openingsArea: 10 });

    expect(result.totals.netArea).toBe(0);
    expect(result.totals.blocksToBuy).toBe(0);
    expect(result.warnings.some((warning) => warning.includes("не меньше площади стены"))).toBe(true);
  });

  it("показывает границы расчёта в результате", () => {
    const result = calc(defaults);
    const text = [...result.warnings, ...(result.practicalNotes ?? [])].join(" ");

    expect(text).toContain("лицевой грани");
    expect(text).toContain("не является нормативом");
    expect(text).toContain("проект");
    expect(result.materialListBanner).toContain("только блоки");
  });

  it("ссылается на действующие профильные документы без подмены их смысла", () => {
    const content = `${foamBlocksDef.formulaDescription ?? ""} ${foamBlocksDef.seoContent?.descriptionHtml ?? ""}`;

    expect(content).toContain("ГОСТ 21520-89");
    expect(content).toContain("ГОСТ 6133-2026");
    expect(content).toContain("СП 15.13330.2020");
    expect(content).not.toContain("ГОСТ 6133-99");
    expect(content).toContain("https://protect.gost.ru/gost/details/5438d707-5f1a-4384-8542-9a31abdd1751");
    expect(content).toContain("https://protect.gost.ru/gost/details/8035fb27-188b-444f-87d5-a88423420dfe");
    expect(content).toContain("https://protect.gost.ru/sp/details/88d859d2-0687-4825-9d5a-004160dce187");
  });

  it("сохраняет основной поисковый интент без обещания лишних материалов", () => {
    expect(foamBlocksDef.h1).toContain("Калькулятор пеноблоков");
    expect(foamBlocksDef.metaDescription).toMatch(/^Бесплатный калькулятор/);
    expect(foamBlocksDef.metaDescription).toContain("рассчитайте");
    expect(foamBlocksDef.description).not.toMatch(/кле[йя]|арматур/i);
    expect(foamBlocksDef.metaDescription).not.toMatch(/кле[йя]|сетк|арматур/i);
  });
});
