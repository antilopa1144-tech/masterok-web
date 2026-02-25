import { describe, it, expect } from "vitest";
import { wallPanelsDef } from "../formulas/wall-panels";
import { findMaterial, checkInvariants } from "./_helpers";

const calc = wallPanelsDef.calculate.bind(wallPanelsDef);

describe("Калькулятор панелей для стен", () => {
  describe("ПВХ панели, 15 м², на клей", () => {
    // panelType=0 → ПВХ 250×3000 мм, panelArea = 0.25*3.0 = 0.75
    // areaWithReserve = 15*1.1 = 16.5
    // piecesNeeded = ceil(16.5/0.75) = 22
    // glueBottles = ceil(15/4) = 4
    // perimeter = 2*(15/2.5 + 2.5) = 2*(6+2.5) = 17.0
    // moldingPcs = ceil(17.0*1.05/3.0) = ceil(5.95) = 6
    // sealantTubes = ceil(17.0/10) = 2
    // primerLiters = 15*0.15 = 2.25, primerWithReserve = 2.25*1.15 = 2.5875
    // primerCans = ceil(2.5875/10) = 1
    const result = calc({
      area: 15,
      panelType: 0,
      mountMethod: 0,
    });

    it("панели ПВХ = 22 шт", () => {
      const panels = findMaterial(result, "Панель ПВХ");
      expect(panels?.purchaseQty).toBe(22);
    });

    it("жидкие гвозди = 4 шт", () => {
      const glue = findMaterial(result, "Жидкие гвозди");
      expect(glue?.purchaseQty).toBe(4);
    });

    it("молдинги = 6 шт", () => {
      const molding = findMaterial(result, "молдинг");
      expect(molding?.purchaseQty).toBe(6);
    });

    it("герметик = 2 шт", () => {
      const sealant = findMaterial(result, "Герметик");
      expect(sealant?.purchaseQty).toBe(2);
    });

    it("грунтовка присутствует (монтаж на клей)", () => {
      const primer = findMaterial(result, "Грунтовка");
      expect(primer).toBeDefined();
      expect(primer!.purchaseQty).toBe(1);
    });

    it("нет обрешётки и кляймеров при клеевом монтаже", () => {
      expect(findMaterial(result, "Рейка")).toBeUndefined();
      expect(findMaterial(result, "Кляймер")).toBeUndefined();
    });

    it("totals содержат area и piecesNeeded", () => {
      expect(result.totals.area).toBe(15);
      expect(result.totals.piecesNeeded).toBe(22);
    });

    it("инварианты", () => {
      checkInvariants(result);
    });
  });

  describe("МДФ панели, 20 м², на обрешётку", () => {
    // panelType=1 → МДФ 190×2600, panelArea = 0.19*2.6 = 0.494
    // areaWithReserve = 20*1.1 = 22.0
    // piecesNeeded = ceil(22.0/0.494) = ceil(44.534) = 45
    // mountMethod=1 → обрешётка
    // battensSpacing = 0.4 (for МДФ)
    // wallHeight = 2.5, wallLength = 20/2.5 = 8
    // battenRows = ceil(2.5/0.4)+1 = 7+1 = 8
    // battenMeters = 8*8*1.05 = 67.2
    // battenPcs = ceil(67.2/3) = ceil(22.4) = 23
    // dubelCount = ceil(67.2/0.5) = ceil(134.4) = 135
    // dubelWithReserve = ceil(135*1.1) = ceil(148.5) = 149
    // dubelPurchase = ceil(135/50)*50 = 3*50 = 150
    // klaimers = ceil(20*5) = 100
    // klaimer withReserve = ceil(100*1.1) = 110
    // klaimer purchase = ceil(100/50)*50 = 100
    const result = calc({
      area: 20,
      panelType: 1,
      mountMethod: 1,
    });

    it("панели МДФ = 45 шт", () => {
      const panels = findMaterial(result, "МДФ");
      expect(panels?.purchaseQty).toBe(45);
    });

    it("рейки обрешётки = 23 шт", () => {
      const battens = findMaterial(result, "Рейка");
      expect(battens?.purchaseQty).toBe(23);
    });

    it("дюбели = 150 шт (кратно 50)", () => {
      const dubels = findMaterial(result, "Дюбель");
      expect(dubels?.purchaseQty).toBe(150);
    });

    it("кляймеры присутствуют для МДФ", () => {
      const klaimers = findMaterial(result, "Кляймер");
      expect(klaimers).toBeDefined();
      expect(klaimers!.purchaseQty).toBe(100);
    });

    it("нет грунтовки при монтаже на обрешётку", () => {
      expect(findMaterial(result, "Грунтовка")).toBeUndefined();
    });

    it("нет жидких гвоздей при обрешётке", () => {
      expect(findMaterial(result, "Жидкие гвозди")).toBeUndefined();
    });
  });

  describe("3D панели, 10 м², на клей", () => {
    // panelType=2 → 3D 500×500, panelArea = 0.5*0.5 = 0.25
    // areaWithReserve = 10*1.1 = 11.0
    // piecesNeeded = ceil(11.0/0.25) = 44
    // glueBottles = ceil(10/4) = 3 → name = "Клей для 3D панелей (1 кг)"
    const result = calc({
      area: 10,
      panelType: 2,
      mountMethod: 0,
    });

    it("3D панели = 44 шт", () => {
      const panels = findMaterial(result, "3D панель");
      expect(panels?.purchaseQty).toBe(44);
    });

    it("клей для 3D панелей = 3 шт", () => {
      const glue = findMaterial(result, "Клей для 3D");
      expect(glue?.purchaseQty).toBe(3);
    });
  });

  describe("Вагонка → предупреждения", () => {
    const result = calc({
      area: 12,
      panelType: 3,
      mountMethod: 1,
    });

    it("предупреждение об акклиматизации", () => {
      expect(result.warnings.some((w) => w.includes("акклиматизации"))).toBe(true);
    });

    it("предупреждение об антисептике", () => {
      expect(result.warnings.some((w) => w.includes("антисептиком"))).toBe(true);
    });

    it("кляймеры присутствуют для вагонки", () => {
      expect(findMaterial(result, "Кляймер")).toBeDefined();
    });
  });

  describe("Декоративный камень → предупреждение", () => {
    // panelType=4 → packArea=0.5
    // areaWithReserve = 8*1.1 = 8.8
    // piecesNeeded = ceil(8.8/0.5) = 18
    const result = calc({
      area: 8,
      panelType: 4,
      mountMethod: 0,
    });

    it("камень = 18 упаковок", () => {
      const stone = findMaterial(result, "Декоративный камень");
      expect(stone?.purchaseQty).toBe(18);
    });

    it("предупреждение о гидрофобизаторе", () => {
      expect(result.warnings.some((w) => w.includes("гидрофобизатором"))).toBe(true);
    });

    it("инварианты", () => {
      checkInvariants(result);
    });
  });
});
