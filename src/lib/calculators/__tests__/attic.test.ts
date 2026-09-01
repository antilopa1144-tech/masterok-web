import { describe, expect, it } from "vitest";
import { atticDef } from "../formulas/attic";
import { checkInvariants, findMaterial, withBasicAccuracy } from "./_helpers";

const calc = withBasicAccuracy(atticDef.calculate.bind(atticDef));

describe("Мансарда — web product contract", () => {
  it("default считает только утеплитель по проектной толщине и площади упаковки", () => {
    const result = calc({});

    checkInvariants(result);
    expect(result.formulaVersion).toBe("attic-web-product-v1");
    expect(result.materials).toHaveLength(1);
    expect(result.totals.roofArea).toBe(60);
    expect(result.totals.insulationLayerCount).toBe(2);
    expect(result.totals.installedInsulationThicknessMm).toBe(200);
    expect(result.totals.insulationCleanLayerAreaM2).toBe(120);
    expect(result.totals.insulationReservedLayerAreaM2).toBe(120);
    expect(result.totals.insulationPurchasePackages).toBe(40);
    expect(result.totals.insulationPurchasedLayerAreaM2).toBe(120);
    expect(result.totals.insulationLeftoverLayerAreaM2).toBe(0);

    const insulation = result.materials[0];
    expect(insulation.name).toContain("Утеплитель выбранной марки");
    expect(insulation.quantity).toBe(120);
    expect(insulation.withReserve).toBe(120);
    expect(insulation.purchaseQty).toBe(120);
    expect(insulation.packageInfo).toEqual({ count: 40, size: 3, packageUnit: "упаковок" });
  });

  it("применяет число слоёв и явный запас ровно один раз", () => {
    const result = calc({
      roofArea: 55,
      insulationThickness: 150,
      insulationProductThicknessMm: 50,
      insulationPackCoverageM2: 6,
      insulationReservePercent: 10,
    });

    expect(result.totals.insulationLayerCount).toBe(3);
    expect(result.totals.insulationCleanLayerAreaM2).toBe(165);
    expect(result.totals.insulationReservedLayerAreaM2).toBe(181.5);
    expect(result.totals.insulationPurchasePackages).toBe(31);
    expect(result.totals.insulationPurchasedLayerAreaM2).toBe(186);
    expect(result.totals.insulationLeftoverLayerAreaM2).toBe(4.5);
  });

  it("показывает фактическую набранную толщину без подмены теплотехнического проекта", () => {
    const result = calc({
      roofArea: 40,
      insulationThickness: 180,
      insulationProductThicknessMm: 100,
      insulationPackCoverageM2: 4,
    });

    expect(result.totals.insulationLayerCount).toBe(2);
    expect(result.totals.installedInsulationThicknessMm).toBe(200);
    expect(result.warnings.join(" ")).toContain("20 мм");
  });

  it("добавляет мембраны только после явного включения и по фактическим рулонам", () => {
    const result = calc({
      roofArea: 60,
      windMembraneEnabled: 1,
      windMembraneRollCoverageM2: 75,
      windMembraneReservePercent: 15,
      vapourBarrierEnabled: 1,
      vapourBarrierRollCoverageM2: 70,
      vapourBarrierReservePercent: 10,
    });

    const wind = findMaterial(result, "Гидроветрозащитная мембрана")!;
    expect(wind.quantity).toBe(60);
    expect(wind.withReserve).toBe(69);
    expect(wind.purchaseQty).toBe(75);
    expect(wind.packageInfo).toEqual({ count: 1, size: 75, packageUnit: "рулонов" });

    const vapour = findMaterial(result, "Пароизоляция по проекту")!;
    expect(vapour.quantity).toBe(60);
    expect(vapour.withReserve).toBe(66);
    expect(vapour.purchaseQty).toBe(70);
  });

  it("ленту считает только по проектной длине стыков", () => {
    const result = calc({
      jointTapeEnabled: 1,
      projectJointLengthM: 43,
      jointTapeReservePercent: 10,
      jointTapeRollLengthM: 25,
    });

    const tape = findMaterial(result, "Лента для стыков по проекту")!;
    expect(tape.quantity).toBe(43);
    expect(tape.withReserve).toBe(47.3);
    expect(tape.purchaseQty).toBe(50);
    expect(tape.packageInfo).toEqual({ count: 2, size: 25, packageUnit: "рулонов" });
  });

  it("деревянную отделку считает по площади одной товарной упаковки", () => {
    const result = calc({
      roofArea: 60,
      atticFinishType: 1,
      finishLayers: 1,
      finishReservePercent: 10,
      woodFinishPackCoverageM2: 2.88,
    });

    const finish = findMaterial(result, "Деревянная отделка")!;
    expect(finish.quantity).toBe(60);
    expect(finish.withReserve).toBe(66);
    expect(finish.purchaseQty).toBe(66.24);
    expect(finish.packageInfo).toEqual({ count: 23, size: 2.88, packageUnit: "упаковок" });
  });

  it("листовую отделку считает по фактическим размерам и числу слоёв", () => {
    const result = calc({
      roofArea: 60,
      atticFinishType: 2,
      finishLayers: 2,
      finishReservePercent: 10,
      finishSheetLengthM: 2.5,
      finishSheetWidthM: 1.2,
    });

    const finish = findMaterial(result, "Листовая отделка")!;
    expect(finish.quantity).toBe(40);
    expect(finish.withReserve).toBe(44);
    expect(finish.purchaseQty).toBe(44);
  });

  it("добавляет только введённые позиции каркаса и крепежа", () => {
    const result = calc({
      projectItemsEnabled: 1,
      projectBattenLengthM: 92,
      battenBarLengthM: 3,
      projectFastenerCount: 275,
      fastenersPerPack: 200,
    });

    const battens = findMaterial(result, "Рейки или профиль по проекту")!;
    expect(battens.quantity).toBe(92);
    expect(battens.purchaseQty).toBe(93);
    expect(battens.packageInfo).toEqual({ count: 31, size: 3, packageUnit: "шт" });

    const fasteners = findMaterial(result, "Крепёж по проекту")!;
    expect(fasteners.quantity).toBe(275);
    expect(fasteners.purchaseQty).toBe(400);
    expect(fasteners.packageInfo).toEqual({ count: 2, size: 200, packageUnit: "упаковок" });
  });

  it("не добавляет старую универсальную ведомость", () => {
    const result = calc({});
    const names = result.materials.map((material) => material.name).join(" | ");

    expect(names).not.toContain("Ветрозащитная мембрана");
    expect(names).not.toContain("Пароизоляция");
    expect(names).not.toContain("Скотч");
    expect(names).not.toContain("Обрешётка");
    expect(names).not.toContain("Антисептик");
    expect(names).not.toContain("Шпаклёвка");
  });

  it("MIN/REC/MAX и режим точности не добавляют скрытый множитель", () => {
    const basic = atticDef.calculate({
      roofArea: 55,
      insulationThickness: 150,
      insulationProductThicknessMm: 50,
      insulationPackCoverageM2: 6,
      insulationReservePercent: 10,
      accuracyMode: "basic" as unknown as number,
    });
    const professional = atticDef.calculate({
      roofArea: 55,
      insulationThickness: 150,
      insulationProductThicknessMm: 50,
      insulationPackCoverageM2: 6,
      insulationReservePercent: 10,
      accuracyMode: "professional" as unknown as number,
    });

    expect(basic.scenarios?.MIN).toEqual(basic.scenarios?.REC);
    expect(basic.scenarios?.REC).toEqual(basic.scenarios?.MAX);
    expect(professional.scenarios).toEqual(basic.scenarios);
    expect(professional.totals.insulationReservedLayerAreaM2).toBe(181.5);
  });

  it("скрывает поля выключенных товарных блоков", () => {
    const field = (key: string) => atticDef.fields.find((item) => item.key === key);

    expect(field("windMembraneRollCoverageM2")?.hideIf).toEqual({ key: "windMembraneEnabled", op: "eq", value: 0 });
    expect(field("vapourBarrierRollCoverageM2")?.hideIf).toEqual({ key: "vapourBarrierEnabled", op: "eq", value: 0 });
    expect(field("woodFinishPackCoverageM2")?.hideIf).toEqual({ key: "atticFinishType", op: "ne", value: 1 });
    expect(field("finishSheetLengthM")?.hideIf).toEqual({ key: "atticFinishType", op: "ne", value: 2 });
    expect(field("projectBattenLengthM")?.hideIf).toEqual({ key: "projectItemsEnabled", op: "eq", value: 0 });
  });

  it("удаляет поля, которые выдавали внутренние константы за товарные характеристики", () => {
    const keys = atticDef.fields.map((field) => field.key);

    expect(keys).not.toContain("insulationType");
    expect(keys).not.toContain("finishType");
    expect(keys).not.toContain("withVapourBarrier");
  });

  it("предупреждает о границах теплотехники, кровельного пирога и раскладки", () => {
    const warnings = calc({ atticFinishType: 2 }).warnings.join(" ");

    expect(warnings).toContain("теплотехнический расчёт");
    expect(warnings).toContain("кровельного пирога");
    expect(warnings).toContain("раскладк");
    expect(warnings).toContain("MIN/REC/MAX");
  });

  it("SEO-контент ведёт на первичные источники и не обещает универсальную толщину", () => {
    const seo = atticDef.seoContent?.descriptionHtml ?? "";

    expect(atticDef.h1).toContain("проектной толщине");
    expect(atticDef.metaDescription.startsWith("Бесплатный калькулятор")).toBe(true);
    expect(atticDef.metaDescription.toLowerCase()).toContain("рассчитайте");
    expect(seo).toContain("https://protect.gost.ru/sp/details/5081dae9-9ee9-455f-80e8-d093d495361c");
    expect(seo).toContain("https://protect.gost.ru/sp/details/844352c5-dda6-4006-acd8-b6875d1ed6a8");
    expect(seo).toContain("https://www.knauf.ru/upload/iblock/c98/lnrplqjdz57umpmclo8h517o49ckylz9/Knauf-Insulation_Professionalnyy-segment_Instruktsiya-po-primeneniyu-v-konstruktsii-skatnoy-krovli.pdf");
    expect(seo).toContain("https://nav.tn.ru/knowledge-base/materialy/gidro-vetrozashchita-i-paroizolyatsiya/paroizolyatsionnye-materialy-dlya-skatnoy-krovli-i-sten/montazh-paroizolyatsionnykh-membran-tekhnonikol/");
  });
});
