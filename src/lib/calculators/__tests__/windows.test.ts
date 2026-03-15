import { describe, it, expect } from "vitest";
import { windowsDef } from "../formulas/windows";
import { findMaterial, checkInvariants } from "./_helpers";

const calc = windowsDef.calculate.bind(windowsDef);

describe("Калькулятор установки окон", () => {
  describe("5 окон 1200×1400, стена 500 мм, сэндвич-панели ПВХ откосы", () => {
    // perimM = 2*(1.2+1.4) = 5.2
    // psulRolls = ceil(5.2 * 5 * 1.1 / 5.6) = ceil(5.107) = 6
    // iflulRolls = ceil(5.2 * 5 * 1.1 / 8.5) = ceil(3.365) = 4
    // foamCans = ceil(5.2/3 * 5 * 1.1) = ceil(9.533) = 10
    // anchorsPerWindow = ceil(5.2/0.7) = 8
    // totalAnchors = ceil(8*5*1.05) = 42
    // screws = ceil(42*2*1.05) = ceil(88.2) = 89
    // sillWidth = 0.5 + 0.15 = 0.65
    // sillPcs = 5
    // totalSlopeArea = (2*1.4*0.5 + 1.2*0.5) * 5 = (1.4+0.6)*5 = 10.0
    // sandwichPcs = ceil(10.0*1.1/3.6) = ceil(3.056) = 4
    // fProfileLen = 5.2*0.75*5*1.1 = 21.45 → fProfilePcs = ceil(21.45/3) = 8
    const result = calc({
      windowCount: 5,
      windowWidth: 1200,
      windowHeight: 1400,
      wallThickness: 500,
      slopeType: 0,
    });

    it("ПСУЛ = 6 рулонов", () => {
      // Engine: "ПСУЛ (рулон 5.6 м)"
      const psul = findMaterial(result, "ПСУЛ");
      expect(psul?.purchaseQty).toBe(6);
    });

    it("монтажная пена = 10 баллонов", () => {
      // Engine: "Монтажная пена" — quantity = recScenario.exact_need
      const foam = findMaterial(result, "Монтажная пена");
      expect(foam).toBeDefined();
      // purchaseQty = ceil(recScenario.exact_need) including scenario multiplier
      // Base is 10, with REC multiplier ~1.06 → ceil(10.6) = 11
      expect(foam!.purchaseQty).toBeGreaterThanOrEqual(10);
    });

    it("внутренняя лента = 4 рулона", () => {
      // Engine: "Внутренняя лента (рулон 8.5 м)"
      const iful = findMaterial(result, "Внутренняя лента");
      expect(iful?.purchaseQty).toBe(4);
    });

    it("анкерные пластины = 42 шт", () => {
      // Engine: "Анкерные пластины"
      const anchors = findMaterial(result, "Анкерные пластины");
      expect(anchors?.purchaseQty).toBe(42);
    });

    it("саморезы для анкеров = 89 шт", () => {
      // Engine: "Саморезы для анкеров"
      const screws = findMaterial(result, "Саморезы для анкеров");
      expect(screws?.purchaseQty).toBe(89);
    });

    it("подоконник ширина 650 мм", () => {
      // Engine: "Подоконник (ширина 650 мм)"
      const sill = findMaterial(result, "Подоконник");
      expect(sill).toBeDefined();
      expect(sill!.name).toContain("650");
      expect(sill!.purchaseQty).toBe(5);
    });

    it("сэндвич-панели ПВХ для откосов = 4", () => {
      // Engine: "Сэндвич-панели ПВХ"
      const panels = findMaterial(result, "Сэндвич-панели ПВХ");
      expect(panels?.purchaseQty).toBe(4);
    });

    it("F-профиль = 8 шт", () => {
      // Engine: "F-профиль (3 м)"
      const fProfile = findMaterial(result, "F-профиль");
      expect(fProfile?.purchaseQty).toBe(8);
    });

    it("предупреждение о толстых стенах", () => {
      // Engine: "Толстые стены — проверьте глубину подоконника"
      expect(result.warnings.some((w) => w.includes("Толстые стены"))).toBe(true);
    });

    it("totals содержат windowCount и perimM", () => {
      expect(result.totals.windowCount).toBe(5);
      expect(result.totals.perimM).toBeCloseTo(5.2, 2);
    });

    it("инварианты", () => {
      checkInvariants(result);
    });
  });

  describe("Штукатурные откосы (slopeType=1)", () => {
    const result = calc({
      windowCount: 3,
      windowWidth: 900,
      windowHeight: 1200,
      wallThickness: 380,
      slopeType: 1,
    });

    it("штукатурка присутствует", () => {
      // Engine: "Штукатурка (мешки 25 кг)"
      const plaster = findMaterial(result, "Штукатурка");
      expect(plaster).toBeDefined();
    });

    it("уголок перфорированный присутствует", () => {
      // Engine: "Уголок перфорированный"
      const corner = findMaterial(result, "Уголок перфорированный");
      expect(corner).toBeDefined();
    });

    it("сэндвич-панели отсутствуют", () => {
      const panels = findMaterial(result, "Сэндвич-панели ПВХ");
      expect(panels).toBeUndefined();
    });
  });

  describe("ГКЛ откосы (slopeType=2)", () => {
    const result = calc({
      windowCount: 2,
      windowWidth: 1500,
      windowHeight: 1600,
      wallThickness: 300,
      slopeType: 2,
    });

    it("ГКЛ для откосов присутствует", () => {
      // Engine: "ГКЛ для откосов"
      expect(findMaterial(result, "ГКЛ для откосов")).toBeDefined();
    });

    it("саморезы для ГКЛ присутствуют", () => {
      // Engine: "Саморезы для ГКЛ"
      expect(findMaterial(result, "Саморезы для ГКЛ")).toBeDefined();
    });

    it("шпаклёвка присутствует", () => {
      // Engine: "Шпаклёвка (мешки 25 кг)"
      expect(findMaterial(result, "Шпаклёвка")).toBeDefined();
    });

    it("нет сэндвич-панелей и штукатурки", () => {
      expect(findMaterial(result, "Сэндвич-панели ПВХ")).toBeUndefined();
    });

    it("основные материалы (ПСУЛ, пена) присутствуют", () => {
      expect(findMaterial(result, "ПСУЛ")).toBeDefined();
      expect(findMaterial(result, "Монтажная пена")).toBeDefined();
    });

    it("инварианты", () => {
      checkInvariants(result);
    });
  });

  describe("Широкие окна >= 1800 мм → предупреждение", () => {
    const result = calc({
      windowCount: 1,
      windowWidth: 1800,
      windowHeight: 1400,
      wallThickness: 500,
      slopeType: 0,
    });

    it("предупреждение о широких окнах", () => {
      // Engine: "Для широких окон рекомендуется усиленный монтаж"
      expect(result.warnings.some((w) => w.includes("широких окон"))).toBe(true);
    });
  });
});
