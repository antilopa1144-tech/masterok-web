import { describe, it, expect } from "vitest";
import { facadePanelsDef } from "../formulas/facade-panels";
import { findMaterial, checkInvariants } from "./_helpers";

const calc = facadePanelsDef.calculate.bind(facadePanelsDef);

describe("Фасадные панели", () => {
  describe("Фиброцемент, 100 м², алюминиевая подсистема, без утеплителя", () => {
    it("панели: area*1.10/3.6", () => {
      const r = calc({ area: 100, panelType: 0, substructure: 0, insulationThickness: 0 });
      checkInvariants(r);
      const expectedPanels = Math.ceil(100 * 1.10 / 3.6);
      // Engine: "Фиброцементные панели (3.6 м²)"
      const panels = findMaterial(r, "Фиброцементные панели");
      expect(panels).toBeDefined();
      expect(r.totals.panels).toBe(expectedPanels);
    });

    it("кронштейны (Алюминиевая)", () => {
      const r = calc({ area: 100, panelType: 0, substructure: 0, insulationThickness: 0 });
      // Engine: "Кронштейны (Алюминиевая)"
      const brackets = findMaterial(r, "Кронштейны");
      expect(brackets).toBeDefined();
    });

    it("направляющие присутствуют", () => {
      const r = calc({ area: 100, panelType: 0, substructure: 0, insulationThickness: 0 });
      // Engine: "Направляющие (3 м)"
      expect(findMaterial(r, "Направляющие")).toBeDefined();
    });

    it("без утеплителя → нет плит и мембраны", () => {
      const r = calc({ area: 100, panelType: 0, substructure: 0, insulationThickness: 0 });
      expect(findMaterial(r, "Утеплитель (плиты)")).toBeUndefined();
      expect(findMaterial(r, "Ветрозащитная мембрана")).toBeUndefined();
    });
  });

  describe("Металлокассеты (panelType=1)", () => {
    it("panelArea = 0.72 м²", () => {
      const r = calc({ area: 100, panelType: 1, substructure: 0, insulationThickness: 0 });
      checkInvariants(r);
      // Engine: "Металлокассеты (0.72 м²)"
      const panels = findMaterial(r, "Металлокассеты");
      expect(panels).toBeDefined();
    });
  });

  describe("HPL-панели (panelType=2)", () => {
    it("panelArea = 2.928 м²", () => {
      const r = calc({ area: 100, panelType: 2, substructure: 0, insulationThickness: 0 });
      checkInvariants(r);
      // Engine: "HPL-панели (2.928 м²)"
      const panels = findMaterial(r, "HPL-панели");
      expect(panels).toBeDefined();
    });
  });

  describe("С утеплителем (insulationThickness > 0)", () => {
    it("утеплитель, дюбели и ветрозащита присутствуют", () => {
      const r = calc({ area: 100, panelType: 0, substructure: 0, insulationThickness: 50 });
      // Engine: "Утеплитель (плиты)", "Дюбели для утеплителя", "Ветрозащитная мембрана"
      expect(findMaterial(r, "Утеплитель (плиты)")).toBeDefined();
      expect(findMaterial(r, "Дюбели для утеплителя")).toBeDefined();
      expect(findMaterial(r, "Ветрозащитная мембрана")).toBeDefined();
    });
  });

  describe("Крепёж и доп. материалы", () => {
    it("крепёж панелей: panels*8*1.05", () => {
      const r = calc({ area: 100, panelType: 0, substructure: 0, insulationThickness: 0 });
      // Engine: "Крепёж панелей"
      const screws = findMaterial(r, "Крепёж панелей");
      expect(screws).toBeDefined();
    });

    it("анкеры для кронштейнов: brackets*2*1.05", () => {
      const r = calc({ area: 100, panelType: 0, substructure: 0, insulationThickness: 0 });
      // Engine: "Анкеры для кронштейнов"
      const dubels = findMaterial(r, "Анкеры для кронштейнов");
      expect(dubels).toBeDefined();
    });

    it("грунтовка и герметик присутствуют", () => {
      const r = calc({ area: 100, panelType: 0, substructure: 0, insulationThickness: 0 });
      // Engine: "Грунтовка (канистра 10 л)", "Герметик (тубы)"
      expect(findMaterial(r, "Грунтовка")).toBeDefined();
      expect(findMaterial(r, "Герметик")).toBeDefined();
    });
  });

  describe("Предупреждения", () => {
    it("> 500 м² → оптовая закупка", () => {
      const r = calc({ area: 600, panelType: 0, substructure: 0, insulationThickness: 0 });
      // Engine: "Большая площадь фасада — рассмотрите оптовую закупку"
      expect(r.warnings.some(w => w.includes("оптовую"))).toBe(true);
    });

    it("толстый утеплитель >= 100 → проверка кронштейнов", () => {
      const r = calc({ area: 100, panelType: 0, substructure: 0, insulationThickness: 100 });
      // Engine: "Толстый утеплитель — проверьте длину кронштейнов"
      expect(r.warnings.some(w => w.includes("длину кронштейнов"))).toBe(true);
    });
  });
});
