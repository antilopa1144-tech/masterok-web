import { describe, it, expect } from "vitest";
import { sidingDef } from "../formulas/siding";
import { findMaterial, checkInvariants } from "./_helpers";

const calc = sidingDef.calculate.bind(sidingDef);

describe("Сайдинг", () => {
  describe("Виниловый, 150 м² фасад, 20 м² проёмов, периметр 48 м, высота 6 м", () => {
    it("netArea = 130, panelArea = 0.20*3.66 = 0.732, panels = ceil(130/0.732*1.10)", () => {
      const r = calc({ facadeArea: 150, openingsArea: 20, perimeter: 48, height: 6, sidingType: 0, cornersCount: 4 });
      checkInvariants(r);
      const netArea = 150 - 20;
      const panelArea = 0.20 * 3.66;
      const expectedPanels = Math.ceil((netArea / panelArea) * 1.10);
      const panels = findMaterial(r, "Виниловый сайдинг");
      expect(panels).toBeDefined();
      expect(panels!.purchaseQty).toBe(expectedPanels);
      expect(r.totals.netArea).toBe(netArea);
      expect(r.totals.panelsNeeded).toBe(expectedPanels);
    });

    it("стартовая планка: ceil((48 + sqrt(20)*4) / 3.66)", () => {
      const r = calc({ facadeArea: 150, openingsArea: 20, perimeter: 48, height: 6, sidingType: 0, cornersCount: 4 });
      const starterLength = 48 + Math.sqrt(20) * 4;
      const expectedPcs = Math.ceil(starterLength / 3.66);
      const starter = findMaterial(r, "Стартовая планка");
      expect(starter).toBeDefined();
      expect(starter!.purchaseQty).toBe(expectedPcs);
    });

    it("J-профиль: ceil((sqrt(20)*4*2 + 48) * 1.10 / 3.66)", () => {
      const r = calc({ facadeArea: 150, openingsArea: 20, perimeter: 48, height: 6, sidingType: 0, cornersCount: 4 });
      const jProfileLength = Math.sqrt(20) * 4 * 2 + 48;
      const expectedPcs = Math.ceil(jProfileLength * 1.10 / 3.66);
      const jProfile = findMaterial(r, "J-профиль");
      expect(jProfile).toBeDefined();
      expect(jProfile!.purchaseQty).toBe(expectedPcs);
    });

    it("угловой профиль: ceil(6*4*1.05/3.0)", () => {
      const r = calc({ facadeArea: 150, openingsArea: 20, perimeter: 48, height: 6, sidingType: 0, cornersCount: 4 });
      const expectedCornerPcs = Math.ceil((6 * 4 * 1.05) / 3.0);
      const corner = findMaterial(r, "Угловой профиль");
      expect(corner).toBeDefined();
      expect(corner!.purchaseQty).toBe(expectedCornerPcs);
    });

    it("финишная планка: ceil(48*1.05/3.66)", () => {
      const r = calc({ facadeArea: 150, openingsArea: 20, perimeter: 48, height: 6, sidingType: 0, cornersCount: 4 });
      const expectedFinishPcs = Math.ceil(48 * 1.05 / 3.66);
      const finish = findMaterial(r, "Финишная планка");
      expect(finish).toBeDefined();
      expect(finish!.purchaseQty).toBe(expectedFinishPcs);
    });
  });

  describe("Металлический сайдинг", () => {
    it("usefulWidth=0.30, length=3.00, panelArea=0.9", () => {
      const r = calc({ facadeArea: 150, openingsArea: 20, perimeter: 48, height: 6, sidingType: 1, cornersCount: 4 });
      checkInvariants(r);
      const netArea = 130;
      const panelArea = 0.30 * 3.00;
      const expectedPanels = Math.ceil((netArea / panelArea) * 1.10);
      const panels = findMaterial(r, "Металлический сайдинг");
      expect(panels).toBeDefined();
      expect(panels!.purchaseQty).toBe(expectedPanels);
    });
  });

  describe("Фиброцементный сайдинг", () => {
    it("usefulWidth=0.175, length=3.60, panelArea=0.63", () => {
      const r = calc({ facadeArea: 150, openingsArea: 20, perimeter: 48, height: 6, sidingType: 2, cornersCount: 4 });
      checkInvariants(r);
      const netArea = 130;
      const panelArea = 0.175 * 3.60;
      const expectedPanels = Math.ceil((netArea / panelArea) * 1.10);
      const panels = findMaterial(r, "Фиброцементный сайдинг");
      expect(panels).toBeDefined();
      expect(panels!.purchaseQty).toBe(expectedPanels);
    });

    it("предупреждение об окраске торцов", () => {
      const r = calc({ facadeArea: 150, openingsArea: 20, perimeter: 48, height: 6, sidingType: 2, cornersCount: 4 });
      expect(r.warnings.some(w => w.includes("окраски торцов"))).toBe(true);
    });
  });

  describe("Крепёж и обрешётка", () => {
    it("саморезы: ceil(netArea*12*1.05), purchaseQty кратно 200", () => {
      const r = calc({ facadeArea: 150, openingsArea: 20, perimeter: 48, height: 6, sidingType: 0, cornersCount: 4 });
      const netArea = 130;
      const screws = Math.ceil(netArea * 12 * 1.05);
      const screwMat = findMaterial(r, "Саморезы для сайдинга");
      expect(screwMat).toBeDefined();
      expect(screwMat!.purchaseQty).toBe(Math.ceil(screws / 200) * 200);
    });

    it("обрешётка: ceil(netArea/0.5*1.05) м.п.", () => {
      const r = calc({ facadeArea: 150, openingsArea: 20, perimeter: 48, height: 6, sidingType: 0, cornersCount: 4 });
      const netArea = 130;
      const expectedBattens = Math.ceil((netArea / 0.5) * 1.05);
      const battens = findMaterial(r, "Обрешётка");
      expect(battens).toBeDefined();
      expect(battens!.purchaseQty).toBe(expectedBattens);
    });
  });

  describe("Мембрана и герметик", () => {
    it("мембрана Изоспан А: ceil(netArea*1.15/75)", () => {
      const r = calc({ facadeArea: 150, openingsArea: 20, perimeter: 48, height: 6, sidingType: 0, cornersCount: 4 });
      const netArea = 130;
      const expectedRolls = Math.ceil(netArea * 1.15 / 75);
      const membrane = findMaterial(r, "Изоспан А");
      expect(membrane).toBeDefined();
      expect(membrane!.purchaseQty).toBe(expectedRolls);
    });

    it("герметик: ceil(sqrt(netArea)*4/15)", () => {
      const r = calc({ facadeArea: 150, openingsArea: 20, perimeter: 48, height: 6, sidingType: 0, cornersCount: 4 });
      const netArea = 130;
      const expectedTubes = Math.ceil(Math.sqrt(netArea) * 4 / 15);
      const sealant = findMaterial(r, "Герметик силиконовый");
      expect(sealant).toBeDefined();
      expect(sealant!.purchaseQty).toBe(expectedTubes);
    });
  });

  describe("Проёмы", () => {
    it("проёмы = 0 → стартовая планка без добавки от проёмов", () => {
      const r = calc({ facadeArea: 100, openingsArea: 0, perimeter: 40, height: 5, sidingType: 0, cornersCount: 4 });
      checkInvariants(r);
      const expectedPcs = Math.ceil(40 / 3.66);
      const starter = findMaterial(r, "Стартовая планка");
      expect(starter!.purchaseQty).toBe(expectedPcs);
    });
  });
});
