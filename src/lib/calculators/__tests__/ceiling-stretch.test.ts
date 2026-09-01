import { describe, expect, it } from "vitest";
import { CATEGORY_INTRO } from "../category-intro";
import { ceilingStretchDef } from "../formulas/ceiling-stretch";

const calc = ceilingStretchDef.calculate.bind(ceilingStretchDef);

const findMaterial = (namePart: string, inputs: Record<string, number>) =>
  calc(inputs).materials.find((material) => material.name.includes(namePart));

describe("Натяжной потолок — проектная геометрия", () => {
  it("по умолчанию показывает только предварительную площадь полотна", () => {
    const result = calc({ inputMode: 0, length: 5, width: 4, ceilingType: 0 });

    expect(result.formulaVersion).toBe("ceiling-stretch-web-project-v1");
    expect(result.canonicalSpecId).toBe("ceiling-stretch");
    expect(result.materials).toHaveLength(1);
    expect(result.materials[0]).toMatchObject({
      name: "Предварительная площадь полотна для сметы",
      quantity: 20,
      unit: "м²",
      withReserve: 20,
      purchaseQty: 20,
    });
    expect(result.totals).toMatchObject({
      area: 20,
      canvasOrderAreaM2: 20,
      canvasOrderConfirmed: 0,
    });
  });

  it("принимает готовую площадь без выдуманного квадратного периметра", () => {
    const result = calc({ inputMode: 1, area: 18.5, ceilingType: 0 });

    expect(result.totals.area).toBe(18.5);
    expect(result.totals).not.toHaveProperty("perim");
    expect(result.totals).not.toHaveProperty("basePerim");
  });

  it("использует готовую площадь полотна только после явного ввода карты раскроя", () => {
    const result = calc({
      inputMode: 0,
      length: 5,
      width: 4,
      ceilingType: 1,
      projectCanvasEnabled: 1,
      projectCanvasOrderAreaM2: 22.4,
    });

    expect(result.materials[0]).toMatchObject({
      name: "Полотно по карте раскроя изготовителя",
      quantity: 20,
      withReserve: 22.4,
      purchaseQty: 22.4,
    });
    expect(result.totals.canvasOrderConfirmed).toBe(1);
    expect(result.totals.canvasOrderAreaM2).toBe(22.4);
  });

  it("не меняет площадь и закупку только из-за названия ПВХ или ткани", () => {
    const common = { inputMode: 0, length: 5, width: 4 };
    const pvc = calc({ ...common, ceilingType: 1 });
    const fabric = calc({ ...common, ceilingType: 2 });

    expect(pvc.totals.canvasOrderAreaM2).toBe(fabric.totals.canvasOrderAreaM2);
    expect(pvc.materials[0].purchaseQty).toBe(fabric.materials[0].purchaseQty);
  });

  it("добавляет основной профиль только по измеренной проектной длине", () => {
    const inputs = {
      inputMode: 0,
      length: 5,
      width: 4,
      ceilingType: 1,
      profileEnabled: 1,
      projectProfileLengthM: 18.4,
      profileReservePercent: 5,
      profilePieceLengthM: 2.5,
    };

    const profile = findMaterial("Основной профиль", inputs);
    expect(profile).toMatchObject({
      quantity: 18.4,
      unit: "м",
      withReserve: 19.32,
      purchaseQty: 20,
      packageInfo: { count: 8, size: 2.5, packageUnit: "профилей" },
    });
  });

  it("добавляет декоративную вставку только по проектной длине и рулону", () => {
    const inputs = {
      inputMode: 1,
      area: 20,
      ceilingType: 1,
      insertEnabled: 1,
      projectInsertLengthM: 17.8,
      insertReservePercent: 10,
      insertRollLengthM: 12,
    };

    const insert = findMaterial("Декоративная вставка", inputs);
    expect(insert).toMatchObject({
      quantity: 17.8,
      unit: "м",
      withReserve: 19.58,
      purchaseQty: 24,
      packageInfo: { count: 2, size: 12, packageUnit: "рулонов" },
    });
  });

  it("принимает узлы светильников готовым проектным количеством", () => {
    const inputs = {
      inputMode: 1,
      area: 20,
      ceilingType: 1,
      lightingNodesEnabled: 1,
      projectLightingNodeCount: 7,
      lightingNodesPerPack: 4,
    };

    const nodes = findMaterial("Монтажные комплекты светильников", inputs);
    expect(nodes).toMatchObject({
      quantity: 7,
      unit: "шт",
      withReserve: 7,
      purchaseQty: 8,
      packageInfo: { count: 2, size: 4, packageUnit: "упаковок" },
    });
  });

  it("принимает обходы труб готовым проектным количеством", () => {
    const inputs = {
      inputMode: 1,
      area: 20,
      ceilingType: 1,
      pipeBypassesEnabled: 1,
      projectPipeBypassCount: 3,
      pipeBypassesPerPack: 2,
    };

    const bypasses = findMaterial("Обходы труб", inputs);
    expect(bypasses).toMatchObject({
      quantity: 3,
      unit: "шт",
      withReserve: 3,
      purchaseQty: 4,
      packageInfo: { count: 2, size: 2, packageUnit: "упаковок" },
    });
  });

  it("не назначает профиль, вставку, ленту, углы и свет автоматически", () => {
    const result = calc({ inputMode: 0, length: 5, width: 4, ceilingType: 0 });
    const names = result.materials.map((material) => material.name).join(" ");

    expect(result.materials).toHaveLength(1);
    expect(names).not.toMatch(/профиль|вставк|лент|угл|светильник|кольц/i);
  });

  it("не добавляет скрытые сценарные и accuracy-множители", () => {
    const result = calc({
      inputMode: 0,
      length: 5,
      width: 4,
      ceilingType: 1,
      accuracyMode: "professional" as unknown as number,
    });

    expect(result.scenarios?.MIN).toEqual(result.scenarios?.REC);
    expect(result.scenarios?.REC).toEqual(result.scenarios?.MAX);
    expect(result.accuracyExplanation?.combinedMultiplier).toBe(1);
    expect(result.scenarios?.REC.key_factors.hidden_multiplier).toBe(1);
  });

  it("скрывает проектные поля, пока пользователь не включил блок", () => {
    const field = (key: string) => ceilingStretchDef.fields.find((item) => item.key === key);

    expect(field("projectCanvasOrderAreaM2")?.hideIf).toEqual({
      key: "projectCanvasEnabled",
      op: "eq",
      value: 0,
    });
    expect(field("projectProfileLengthM")?.hideIf).toEqual({
      key: "profileEnabled",
      op: "eq",
      value: 0,
    });
    expect(field("projectLightingNodeCount")?.hideIf).toEqual({
      key: "lightingNodesEnabled",
      op: "eq",
      value: 0,
    });
  });

  it("удаляет старые поля, которые пытались восстановить проект по площади", () => {
    const keys = ceilingStretchDef.fields.map((field) => field.key);

    expect(keys).not.toContain("corners");
    expect(keys).not.toContain("fixtures");
    expect(keys).not.toContain("nichesCount");
    expect(keys).not.toContain("boxPerimeterM");
    expect(keys).toContain("ceilingType");
    expect(keys).toContain("projectProfileLengthM");
  });

  it("не обещает стоимость и универсальную комплектацию", () => {
    expect(ceilingStretchDef.h1).toBe(
      "Калькулятор натяжного потолка — площадь и проектные материалы",
    );
    expect(ceilingStretchDef.description).not.toMatch(/стоимост/i);
    expect(ceilingStretchDef.seoContent?.descriptionHtml).not.toContain("250–1200");
    expect(ceilingStretchDef.seoContent?.descriptionHtml).not.toContain("10–13 светильников");
  });

  it("ссылается на профильный ГОСТ и документацию систем", () => {
    const html = ceilingStretchDef.seoContent?.descriptionHtml ?? "";

    expect(html).toContain(
      "https://protect.gost.ru/gost/details/c57927ba-11f0-4efd-bf15-2a34afac1e91",
    );
    expect(html).toContain(
      "https://www.clipso.com/en/clipso-group-en/discover-clipso/answers-to-questions.html",
    );
    expect(html).toContain(
      "https://products.pongs.com/individual-application/stretch-ceiling?lang=en",
    );
    expect(CATEGORY_INTRO.ceiling.standards.join(" ")).toContain("ГОСТ Р 59690");
    expect(CATEGORY_INTRO.ceiling.standards.join(" ")).not.toContain("ГОСТ Р 56387");
  });
});
