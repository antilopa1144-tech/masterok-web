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
    expect(panels?.subtitle).toContain("запас 10% применён один раз");
    expect(result.scenarios?.REC.purchase_quantity).toBe(15);
  });

  it("комплектует только материалы с введёнными паспортными параметрами", () => {
    const result = facadePanelsDef.calculate({ inputMode: 1, area: 20, panelUsefulArea: 1, reservePercent: 0, needProfile: 1, profileStep: 0.5, profilePieceLength: 3, fastenersPerPanel: 4, needInsulation: 1, insulationPackArea: 6, externalCorners: 4, wallHeight: 3, starterPieceLength: 3 });
    expect(findMaterial(result, "Профиль/рейка")).toBeDefined();
    expect(findMaterial(result, "Крепёж панелей")?.purchaseQty).toBe(80);
    expect(findMaterial(result, "Фасадный утеплитель")?.packageInfo?.count).toBe(4);
    expect(findMaterial(result, "Грунтовка")).toBeUndefined();
    expect(findMaterial(result, "Герметик")).toBeUndefined();
    expect(findMaterial(result, "Кронштейны")).toBeUndefined();
  });
});
