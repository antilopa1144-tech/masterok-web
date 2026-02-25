import { describe, it, expect } from "vitest";
import { facadePanelsDef } from "../formulas/facade-panels";
import { findMaterial, checkInvariants } from "./_helpers";

const calc = facadePanelsDef.calculate.bind(facadePanelsDef);

describe("Фасадные панели", () => {
  describe("Фиброцемент 1200×3000, 120 м², алюминиевая подсистема, без утеплителя", () => {
    it("панели: area*1.10/3.6 м², purchaseQty = ceil()", () => {
      const r = calc({ area: 120, panelType: 0, substructureType: 0, insulationIncluded: 0 });
      checkInvariants(r);
      const panelArea = 1200 * 3000 / 1e6; // 3.6
      const areaR = 120 * 1.10;
      const expectedPanels = Math.ceil(areaR / panelArea);
      const panels = findMaterial(r, "Фиброцементная панель");
      expect(panels).toBeDefined();
      expect(panels!.purchaseQty).toBe(expectedPanels);
      expect(r.totals.panelCount).toBe(expectedPanels);
    });

    it("кронштейны: ceil((area/0.36)*1.1)", () => {
      const r = calc({ area: 120, panelType: 0, substructureType: 0, insulationIncluded: 0 });
      const expectedBrackets = Math.ceil((120 / 0.36) * 1.1);
      const brackets = findMaterial(r, "Кронштейн алюминиевый");
      expect(brackets).toBeDefined();
      expect(brackets!.purchaseQty).toBe(expectedBrackets);
      expect(r.totals.bracketsCount).toBe(expectedBrackets);
    });

    it("направляющие: ceil((area/0.6)*1.1/3)", () => {
      const r = calc({ area: 120, panelType: 0, substructureType: 0, insulationIncluded: 0 });
      const guideLength = (120 / 0.6) * 1.1;
      const expectedGuides = Math.ceil(guideLength / 3);
      const guides = findMaterial(r, "Профиль направляющий алюминиевый");
      expect(guides).toBeDefined();
      expect(guides!.purchaseQty).toBe(expectedGuides);
    });

    it("без утеплителя → нет минваты и дюбелей утеплителя", () => {
      const r = calc({ area: 120, panelType: 0, substructureType: 0, insulationIncluded: 0 });
      expect(findMaterial(r, "Минвата фасадная")).toBeUndefined();
      expect(findMaterial(r, "Дюбель-грибок для утеплителя")).toBeUndefined();
      expect(findMaterial(r, "Ветрозащитная мембрана")).toBeUndefined();
    });
  });

  describe("Металлокассеты 600×1200", () => {
    it("panelArea = 0.72 м², запас 10%", () => {
      const r = calc({ area: 120, panelType: 1, substructureType: 0, insulationIncluded: 0 });
      checkInvariants(r);
      const panelArea = 600 * 1200 / 1e6; // 0.72
      const areaR = 120 * 1.10;
      const expectedPanels = Math.ceil(areaR / panelArea);
      const panels = findMaterial(r, "Металлокассета");
      expect(panels).toBeDefined();
      expect(panels!.purchaseQty).toBe(expectedPanels);
    });

    it("без утеплителя → предупреждение о конденсате", () => {
      const r = calc({ area: 120, panelType: 1, substructureType: 0, insulationIncluded: 0 });
      expect(r.warnings.some(w => w.includes("конденсат"))).toBe(true);
    });
  });

  describe("HPL компакт 1200×2440", () => {
    it("panelArea = 2.928 м², запас 8%", () => {
      const r = calc({ area: 120, panelType: 2, substructureType: 0, insulationIncluded: 0 });
      checkInvariants(r);
      const panelArea = 1200 * 2440 / 1e6; // 2.928
      const areaR = 120 * 1.08;
      const expectedPanels = Math.ceil(areaR / panelArea);
      const panels = findMaterial(r, "HPL компакт");
      expect(panels).toBeDefined();
      expect(panels!.purchaseQty).toBe(expectedPanels);
    });
  });

  describe("Подсистемы", () => {
    it("оцинкованная сталь → кронштейн оцинкованный", () => {
      const r = calc({ area: 120, panelType: 0, substructureType: 1, insulationIncluded: 0 });
      expect(findMaterial(r, "Кронштейн оцинкованный")).toBeDefined();
      expect(findMaterial(r, "несущий оцинкованный")).toBeDefined();
    });

    it("деревянная обрешётка → предупреждение об антисептической обработке", () => {
      const r = calc({ area: 120, panelType: 0, substructureType: 2, insulationIncluded: 0 });
      expect(r.warnings.some(w => w.includes("антисептической"))).toBe(true);
      expect(findMaterial(r, "Кронштейн деревянный")).toBeDefined();
      expect(findMaterial(r, "Брусок обрешётки")).toBeDefined();
    });
  });

  describe("С утеплителем", () => {
    it("минвата 50 мм → плиты + дюбели + ветрозащита", () => {
      const r = calc({ area: 120, panelType: 0, substructureType: 0, insulationIncluded: 1 });
      const insPlates = findMaterial(r, "Минвата фасадная 50 мм");
      expect(insPlates).toBeDefined();
      expect(insPlates!.purchaseQty).toBe(Math.ceil(120 * 1.05 / 0.72));

      const dubels = findMaterial(r, "Дюбель-грибок для утеплителя");
      expect(dubels).toBeDefined();
      expect(dubels!.purchaseQty).toBe(Math.ceil(120 * 6 * 1.05));

      const membrane = findMaterial(r, "Ветрозащитная мембрана");
      expect(membrane).toBeDefined();
      expect(membrane!.purchaseQty).toBe(Math.ceil(120 * 1.15 / 50));
    });

    it("минвата 100 мм", () => {
      const r = calc({ area: 120, panelType: 0, substructureType: 0, insulationIncluded: 2 });
      const insPlates = findMaterial(r, "Минвата фасадная 100 мм");
      expect(insPlates).toBeDefined();
    });
  });

  describe("Крепёж и доп. материалы", () => {
    it("саморезы/заклёпки: panelCount*8*1.05", () => {
      const r = calc({ area: 120, panelType: 0, substructureType: 0, insulationIncluded: 0 });
      const panelCount = r.totals.panelCount;
      const expectedScrews = Math.ceil(panelCount * 8 * 1.05);
      const screws = findMaterial(r, "Крепёж для фасадных панелей");
      expect(screws).toBeDefined();
      expect(screws!.purchaseQty).toBe(expectedScrews);
    });

    it("дюбели для кронштейнов: bracketsCount*2*1.05", () => {
      const r = calc({ area: 120, panelType: 0, substructureType: 0, insulationIncluded: 0 });
      const bracketsCount = r.totals.bracketsCount;
      const expectedDubels = Math.ceil(bracketsCount * 2 * 1.05);
      const dubels = findMaterial(r, "Дюбель анкерный");
      expect(dubels).toBeDefined();
      expect(dubels!.purchaseQty).toBe(expectedDubels);
    });

    it("грунтовка и герметик присутствуют", () => {
      const r = calc({ area: 120, panelType: 0, substructureType: 0, insulationIncluded: 0 });
      expect(findMaterial(r, "Грунтовка для основания")).toBeDefined();
      expect(findMaterial(r, "Герметик для стыков")).toBeDefined();
    });
  });
});
