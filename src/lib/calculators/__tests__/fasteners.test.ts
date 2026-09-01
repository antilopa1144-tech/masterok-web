import { describe, expect, it } from "vitest";
import { CATEGORY_INTRO } from "../category-intro";
import { fastenersDef } from "../formulas/fasteners";

const calc = fastenersDef.calculate.bind(fastenersDef);

const projectInputs = {
  inputMode: 0,
  fastenerPurpose: 0,
  projectFastenerCount: 240,
  fastenerReservePercent: 0,
  fastenersPerPack: 1,
};

const findMaterial = (
  result: ReturnType<typeof calc>,
  namePart: string,
) => result.materials.find((material) => material.name.includes(namePart));

describe("Крепёж — подтверждённые точки, шаг и упаковки", () => {
  it("по умолчанию принимает готовое количество одной однородной позиции", () => {
    const result = calc(projectInputs);

    expect(result.formulaVersion).toBe("fasteners-web-project-v1");
    expect(result.canonicalSpecId).toBe("fasteners");
    expect(result.materials).toHaveLength(1);
    expect(result.materials[0]).toMatchObject({
      name: "Крепёж выбранной системы",
      quantity: 240,
      unit: "шт",
      withReserve: 240,
      purchaseQty: 240,
      packageInfo: { count: 240, size: 1, packageUnit: "штук" },
    });
    expect(result.totals).toMatchObject({
      baseFastenerCount: 240,
      requiredFastenerCount: 240,
      fastenerPacks: 240,
      purchaseFastenerCount: 240,
      purchasedSurplusFastenerCount: 0,
    });
  });

  it("считает по площади только с введённой проектной нормой", () => {
    const result = calc({
      inputMode: 1,
      fastenerPurpose: 1,
      fasteningAreaM2: 20,
      projectFastenersPerM2: 12,
      fastenerReservePercent: 0,
      fastenersPerPack: 1,
    });

    expect(result.totals).toMatchObject({
      fasteningAreaM2: 20,
      projectFastenersPerM2: 12,
      baseFastenerCount: 240,
    });
    expect(result.materials[0].name).toBe("Саморезы по проектной схеме");
  });

  it("считает повторяющиеся линии с обеими крайними точками", () => {
    const result = calc({
      inputMode: 2,
      fastenerPurpose: 2,
      fasteningLineCount: 10,
      fasteningLineLengthM: 2.5,
      fastenerStepMm: 250,
      includeBothLineEnds: 1,
      fastenerReservePercent: 0,
      fastenersPerPack: 1,
    });

    expect(result.totals).toMatchObject({
      fasteningLineCount: 10,
      pointsPerLine: 11,
      baseFastenerCount: 110,
    });
  });

  it("может считать интервалы без автоматической второй крайней точки", () => {
    const result = calc({
      inputMode: 2,
      fastenerPurpose: 2,
      fasteningLineCount: 10,
      fasteningLineLengthM: 2.5,
      fastenerStepMm: 250,
      includeBothLineEnds: 0,
      fastenerReservePercent: 0,
      fastenersPerPack: 1,
    });

    expect(result.totals.pointsPerLine).toBe(10);
    expect(result.totals.baseFastenerCount).toBe(100);
  });

  it("применяет явный запас один раз и округляет по фактической упаковке", () => {
    const result = calc({
      ...projectInputs,
      fastenerReservePercent: 5,
      fastenersPerPack: 200,
    });

    expect(result.totals.baseFastenerCount).toBe(240);
    expect(result.totals.requiredFastenerCount).toBe(252);
    expect(result.totals.fastenerPacks).toBe(2);
    expect(result.totals.purchaseFastenerCount).toBe(400);
    expect(result.totals.purchasedSurplusFastenerCount).toBe(160);
  });

  it("округляет дробную потребность площади вверх до целой точки", () => {
    const result = calc({
      inputMode: 1,
      fastenerPurpose: 0,
      fasteningAreaM2: 18.5,
      projectFastenersPerM2: 6.5,
      fastenerReservePercent: 0,
      fastenersPerPack: 50,
    });

    expect(result.totals.rawFastenerCount).toBe(120.25);
    expect(result.totals.baseFastenerCount).toBe(121);
    expect(result.totals.fastenerPacks).toBe(3);
    expect(result.totals.purchaseFastenerCount).toBe(150);
  });

  it("назначение меняет только подпись, но не скрытую норму", () => {
    const generic = calc(projectInputs);
    const clips = calc({ ...projectInputs, fastenerPurpose: 3 });

    expect(generic.totals.baseFastenerCount).toBe(240);
    expect(clips.totals.baseFastenerCount).toBe(240);
    expect(clips.materials[0].name).toBe("Кляймеры или клипсы по проекту");
  });

  it("добавляет вторую однородную позицию только по готовому количеству", () => {
    const result = calc({
      ...projectInputs,
      secondFastenerEnabled: 1,
      projectSecondFastenerCount: 48,
      secondFastenerReservePercent: 5,
      secondFastenersPerPack: 50,
    });

    expect(result.materials).toHaveLength(2);
    expect(findMaterial(result, "Дополнительный крепёж")).toMatchObject({
      quantity: 48,
      unit: "шт",
      withReserve: 51,
      purchaseQty: 100,
      packageInfo: { count: 2, size: 50, packageUnit: "упаковок" },
    });
  });

  it("не создаёт саморезы, дюбели, кляймеры и биты автоматически", () => {
    const result = calc(projectInputs);
    const names = result.materials.map((material) => material.name).join(" ");

    expect(result.materials).toHaveLength(1);
    expect(names).not.toMatch(/3,5×25|4,8×35|Дюбель-гвозд|Бита|EPDM/);
  });

  it("не переводит штуки в килограммы по условной массе", () => {
    const result = calc({ ...projectInputs, fastenersPerPack: 1000 });

    expect(result.materials.every((material) => material.unit === "шт")).toBe(
      true,
    );
    expect(result.materials[0].purchaseQty).toBe(1000);
  });

  it("не добавляет скрытые сценарные и accuracy-множители", () => {
    const result = calc({
      ...projectInputs,
      accuracyMode: "professional" as unknown as number,
    });

    expect(result.scenarios?.MIN).toEqual(result.scenarios?.REC);
    expect(result.scenarios?.REC).toEqual(result.scenarios?.MAX);
    expect(result.accuracyExplanation?.combinedMultiplier).toBe(1);
    expect(result.scenarios?.REC.key_factors.hidden_multiplier).toBe(1);
  });

  it("скрывает поля до выбора соответствующего режима", () => {
    const field = (key: string) =>
      fastenersDef.fields.find((item) => item.key === key);

    expect(field("projectFastenerCount")?.hideIf).toEqual({
      key: "inputMode",
      op: "ne",
      value: 0,
    });
    expect(field("fasteningAreaM2")?.hideIf).toEqual({
      key: "inputMode",
      op: "ne",
      value: 1,
    });
    expect(field("fasteningLineCount")?.hideIf).toEqual({
      key: "inputMode",
      op: "ne",
      value: 2,
    });
    expect(field("projectSecondFastenerCount")?.hideIf).toEqual({
      key: "secondFastenerEnabled",
      op: "eq",
      value: 0,
    });
  });

  it("удаляет старые поля условного материала и автоматических добавок", () => {
    const keys = fastenersDef.fields.map((field) => field.key);

    expect(keys).not.toContain("materialType");
    expect(keys).not.toContain("sheetCount");
    expect(keys).not.toContain("withFrameScrews");
    expect(keys).not.toContain("withDubels");
    expect(keys).toContain("projectFastenerCount");
    expect(keys).toContain("projectFastenersPerM2");
    expect(keys).toContain("fastenerStepMm");
  });

  it("не обещает универсальные размеры, килограммы и готовый подбор", () => {
    expect(fastenersDef.h1).toBe(
      "Калькулятор крепежа — точки, шаг и упаковки",
    );
    expect(fastenersDef.description).not.toMatch(/3[,.]5|4[,.]8|килограмм/i);
    expect(fastenersDef.metaDescription).not.toMatch(/3[,.]5|4[,.]8|килограмм/i);
  });

  it("ссылается на профильный ГОСТ и документацию разных систем", () => {
    const html = fastenersDef.seoContent?.descriptionHtml ?? "";

    expect(html).toContain(
      "https://protect.gost.ru/gost/details/c9666595-feb4-4a1d-be7e-66b0c162a28e",
    );
    expect(html).toContain(
      "https://www.knauf.ru/catalog/krepyezhnye-izdeliya/knauf-shurup-dlya-soedineniya-gkl/",
    );
    expect(html).toContain(
      "https://www.egger.com/get_download/30918a3f-cceb-482c-8884-6a530f4c0eff/TL_EGGER_TLBP104_OSB_t_g_basic_installation_guideline_en.pdf",
    );
    expect(html).toContain(
      "https://www.grandline.ru/uploads/files/instrukcii/krovelnye-materialy/krovelnyi-profnastil/instrukciya-po-montazhu-krovelnogo-profnastila.pdf",
    );
    expect(CATEGORY_INTRO.interior.standards.join(" ")).toContain(
      "ГОСТ Р 59571",
    );
  });
});
