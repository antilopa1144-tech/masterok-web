import { describe, it, expect } from "vitest";
import { facadeInsulationDef } from "../formulas/facade-insulation";
import { findMaterial, checkInvariants } from "./_helpers";

const calc = facadeInsulationDef.calculate.bind(facadeInsulationDef);

describe("Утепление фасада", () => {
  describe("Минвата 100 мм, 100 м², короед", () => {
    it("плиты: area*1.05/0.72, purchaseQty = ceil()", () => {
      const r = calc({ area: 100, thickness: 100, insulationType: 0, finishType: 0 });
      checkInvariants(r);
      const areaR = 100 * 1.05;
      const expectedPlates = Math.ceil(areaR / 0.72);
      const plates = findMaterial(r, "Минвата фасадная 100 мм");
      expect(plates).toBeDefined();
      expect(plates!.quantity).toBeCloseTo(areaR / 0.72, 5);
      expect(plates!.purchaseQty).toBe(expectedPlates);
    });

    it("клей для утеплителя: 4 кг/м² → ceil(400/25) = 16 мешков", () => {
      const r = calc({ area: 100, thickness: 100, insulationType: 0, finishType: 0 });
      const totalGlueKg = 100 * 4;
      const expectedBags = Math.ceil(totalGlueKg / 25);
      const glue = findMaterial(r, "Клей для утеплителя");
      expect(glue).toBeDefined();
      expect(glue!.purchaseQty).toBe(expectedBags);
    });

    it("дюбели-грибки: 6 шт/м² × 100 × 1.05 = 630", () => {
      const r = calc({ area: 100, thickness: 100, insulationType: 0, finishType: 0 });
      const expected = Math.ceil(100 * 6 * 1.05);
      const dubels = findMaterial(r, "Дюбель-грибок");
      expect(dubels).toBeDefined();
      expect(dubels!.purchaseQty).toBe(expected);
    });

    it("армосетка: area*1.15/50 рулонов", () => {
      const r = calc({ area: 100, thickness: 100, insulationType: 0, finishType: 0 });
      const meshArea = 100 * 1.15;
      const expectedRolls = Math.ceil(meshArea / 50);
      const mesh = findMaterial(r, "Сетка фасадная");
      expect(mesh).toBeDefined();
      expect(mesh!.purchaseQty).toBe(expectedRolls);
    });

    it("штукатурка «короед»: 3.5 кг/м² → ceil(350/25) = 14 мешков", () => {
      const r = calc({ area: 100, thickness: 100, insulationType: 0, finishType: 0 });
      const expectedBags = Math.ceil(100 * 3.5 / 25);
      const plaster = findMaterial(r, "короед");
      expect(plaster).toBeDefined();
      expect(plaster!.purchaseQty).toBe(expectedBags);
    });
  });

  describe("ЭППС", () => {
    it("плиты ЭППС, клей 5 кг/м², дюбели 4 шт/м²", () => {
      const r = calc({ area: 100, thickness: 100, insulationType: 1, finishType: 0 });
      checkInvariants(r);
      const plates = findMaterial(r, "ЭППС 100 мм");
      expect(plates).toBeDefined();
      expect(plates!.purchaseQty).toBe(Math.ceil(100 * 1.05 / 0.72));

      const glue = findMaterial(r, "Клей для утеплителя");
      expect(glue!.purchaseQty).toBe(Math.ceil(100 * 5 / 25));

      const dubels = findMaterial(r, "Дюбель-грибок");
      expect(dubels!.purchaseQty).toBe(Math.ceil(100 * 4 * 1.05));
    });

    it("предупреждение о пожарных нормах СП 2.13130", () => {
      const r = calc({ area: 100, thickness: 100, insulationType: 1, finishType: 0 });
      expect(r.warnings.some(w => w.includes("СП 2.13130"))).toBe(true);
    });
  });

  describe("Финишные слои", () => {
    it("шуба: 4.5 кг/м² → ceil(450/25) = 18 мешков", () => {
      const r = calc({ area: 100, thickness: 100, insulationType: 0, finishType: 1 });
      const plaster = findMaterial(r, "шуба");
      expect(plaster).toBeDefined();
      expect(plaster!.purchaseQty).toBe(Math.ceil(100 * 4.5 / 25));
    });

    it("под покраску: 2.5 кг/м² → ceil(250/25) = 10 мешков", () => {
      const r = calc({ area: 100, thickness: 100, insulationType: 0, finishType: 2 });
      const plaster = findMaterial(r, "под покраску");
      expect(plaster).toBeDefined();
      expect(plaster!.purchaseQty).toBe(Math.ceil(100 * 2.5 / 25));
    });
  });

  describe("Толщина утеплителя", () => {
    it("50 мм → предупреждение о нормативном сопротивлении", () => {
      const r = calc({ area: 100, thickness: 50, insulationType: 0, finishType: 0 });
      expect(r.warnings.some(w => w.includes("50 мм"))).toBe(true);
    });

    it("150 мм → без предупреждения о толщине", () => {
      const r = calc({ area: 100, thickness: 150, insulationType: 0, finishType: 0 });
      expect(r.warnings.some(w => w.includes("Толщина"))).toBe(false);
    });

    it("толщина передаётся в totals", () => {
      const r = calc({ area: 100, thickness: 150, insulationType: 0, finishType: 0 });
      expect(r.totals.thickness).toBe(150);
    });
  });

  describe("Большая площадь > 500 м²", () => {
    it("предупреждение о захватках и лесах", () => {
      const r = calc({ area: 600, thickness: 100, insulationType: 0, finishType: 0 });
      expect(r.warnings.some(w => w.includes("захватки"))).toBe(true);
    });
  });

  describe("Комплектующие", () => {
    it("грунтовка адгезионная: 1л/4м² * 1.1 → канистры 10 л", () => {
      const r = calc({ area: 100, thickness: 100, insulationType: 0, finishType: 0 });
      const primerLiters = 100 / 4 * 1.1;
      const expectedCans = Math.ceil(primerLiters / 10);
      const primer = findMaterial(r, "Грунтовка адгезионная");
      expect(primer).toBeDefined();
      expect(primer!.purchaseQty).toBe(expectedCans);
    });

    it("профиль цокольный: perimeter*1.05 / 2 м", () => {
      const r = calc({ area: 100, thickness: 100, insulationType: 0, finishType: 0 });
      const perimeter = Math.sqrt(100) * 4;
      const profileLength = perimeter * 1.05;
      const expectedPcs = Math.ceil(profileLength / 2);
      const profile = findMaterial(r, "Профиль цокольный");
      expect(profile).toBeDefined();
      expect(profile!.purchaseQty).toBe(expectedPcs);
    });

    it("штукатурно-клеевой состав для армировки: 4 кг/м²", () => {
      const r = calc({ area: 100, thickness: 100, insulationType: 0, finishType: 0 });
      const expectedBags = Math.ceil(100 * 4 / 25);
      const arm = findMaterial(r, "армировки");
      expect(arm).toBeDefined();
      expect(arm!.purchaseQty).toBe(expectedBags);
    });
  });
});
