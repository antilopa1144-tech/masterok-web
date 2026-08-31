import { describe, expect, it } from "vitest";
import { facadePanelsDef } from "../formulas/facade-panels";
import { checkInvariants, findMaterial } from "./_helpers";

describe("Фасадные панели", () => {
  it("передаёт геометрию и проёмы в canonical-движок", () => {
    const result = facadePanelsDef.calculate({ inputMode: 0, houseLength: 10, houseWidth: 8, wallHeight: 3, openingsArea: 12, panelUsefulArea: 1, reservePercent: 10, needProfile: 0, externalCorners: 0 });
    checkInvariants(result);
    expect(result.totals.wallArea).toBe(96);
    expect(result.totals.panelsCount).toBe(106);
    expect(result.formulaVersion).toBe("facade-panels-canonical-v3");
  });

  it("показывает полезную площадь и один явный запас", () => {
    const result = facadePanelsDef.calculate({ inputMode: 1, area: 10, panelType: 6, panelUsefulArea: 0.75, reservePercent: 10, needProfile: 0, externalCorners: 0 });
    const panels = findMaterial(result, "HPL-панели");
    expect(panels?.purchaseQty).toBe(15);
    expect(panels?.subtitle).toContain("10 м² / 0,75 м² × (1 + 10%)");
    expect(panels?.subtitle).toContain("к покупке ceil = 15 шт.");
    expect(panels?.subtitle).toContain("Тип меняет только название");
    expect(result.scenarios?.REC.purchase_quantity).toBe(15);
  });

  it("в режиме размеров раскрывает формулы геометрических позиций", () => {
    const result = facadePanelsDef.calculate({ inputMode: 0, houseLength: 10, houseWidth: 8, wallHeight: 3, openingsArea: 12, panelUsefulArea: 1, reservePercent: 0, needProfile: 1, profileStep: 0.5, profilePieceLength: 3, fastenersPerPanel: 4, needInsulation: 1, insulationPackArea: 6, externalCorners: 4, cornerPieceLength: 3, starterPieceLength: 3 });
    const profile = findMaterial(result, "Профиль/рейка");
    const corners = findMaterial(result, "Наружные угловые элементы");
    const starters = findMaterial(result, "Стартовые элементы");

    expect(profile?.purchaseQty).toBe(216);
    expect(profile?.subtitle).toContain("72 вертикальных рядов");
    expect(profile?.subtitle).toContain("Проёмы и усиления не моделируются");
    expect(findMaterial(result, "Крепёж панелей")?.purchaseQty).toBe(384);
    expect(findMaterial(result, "Фасадный утеплитель")?.packageInfo?.count).toBe(16);
    expect(corners?.subtitle).toContain("4 угла × 3 м / 3 м");
    expect(starters?.subtitle).toContain("36 м полного периметра / 3 м");
    expect(findMaterial(result, "Грунтовка")).toBeUndefined();
    expect(findMaterial(result, "Герметик")).toBeUndefined();
    expect(findMaterial(result, "Кронштейны")).toBeUndefined();
  });

  it("не подставляет скрытый дом 10×10×3 в режиме готовой площади", () => {
    const result = facadePanelsDef.calculate({ inputMode: 1, area: 20, panelUsefulArea: 1, reservePercent: 0, needProfile: 1, profileStep: 0.5, profilePieceLength: 3, fastenersPerPanel: 4, needInsulation: 1, insulationPackArea: 6, externalCorners: 4, wallHeight: 3, starterPieceLength: 3 });

    expect(findMaterial(result, "Профиль/рейка")).toBeUndefined();
    expect(findMaterial(result, "Наружные угловые элементы")).toBeUndefined();
    expect(findMaterial(result, "Стартовые элементы")).toBeUndefined();
    expect(findMaterial(result, "Крепёж панелей")?.purchaseQty).toBe(80);
    expect(findMaterial(result, "Фасадный утеплитель")?.packageInfo?.count).toBe(4);
    expect(result.totals.wallLength).toBeUndefined();
    expect(result.totals.profileLength).toBeUndefined();
    expect(result.totals.cornersCount).toBeUndefined();
    expect(result.warnings).toEqual(expect.arrayContaining([
      expect.stringContaining("периметр и высота не заданы"),
      expect.stringContaining("MIN/REC/MAX меняют только число панелей"),
    ]));
  });

  it("показывает геометрические поля только в режиме размеров", () => {
    for (const key of ["needProfile", "profileStep", "profilePieceLength", "externalCorners", "cornerPieceLength", "starterPieceLength"]) {
      expect(facadePanelsDef.fields.find((field) => field.key === key)?.group).toBe("bySize");
    }
    expect(facadePanelsDef.fields.find((field) => field.key === "area")?.hint).toContain("не рассчитываются");
  });

  it("ссылается на действующие первичные источники без универсальной нормы", () => {
    const html = facadePanelsDef.seoContent?.descriptionHtml ?? "";

    expect(html).toContain("https://protect.gost.ru/gost/details/4fff71ba-dddf-4047-9f0e-440ad9ee581b");
    expect(html).toContain("https://protect.gost.ru/sp/details/bac9e1fe-45f1-401b-8e32-949f4ee27821");
    expect(html).toContain("https://protect.gost.ru/sp/details/5081dae9-9ee9-455f-80e8-d093d495361c");
    expect(html).toContain("не задают универсальный шаг, крепёж или полезную площадь");
  });
});
