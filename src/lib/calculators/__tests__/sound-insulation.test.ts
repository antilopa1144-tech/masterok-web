import { describe, it, expect } from "vitest";
import { soundInsulationDef } from "../formulas/sound-insulation";
import { findMaterial, checkInvariants, withBasicAccuracy } from "./_helpers";

const calc = withBasicAccuracy(soundInsulationDef.calculate.bind(soundInsulationDef));

describe("Звукоизоляция", () => {
  describe("Базовая система ГКЛ + Минераловатные (system=0)", () => {
    it("30 м²", () => {
      const r = calc({ area: 30, surfaceType: 0, system: 0 });
      checkInvariants(r);
      // Engine: "Минераловатные плиты", "ГКЛ листы", "Профиль ПП 3м", "Виброподвесы", "Вибролента"
      expect(findMaterial(r, "Акустическая минеральная")).toBeDefined();
      expect(findMaterial(r, "ГКЛ")).toBeDefined();
      expect(findMaterial(r, "Потолочный профиль ПП")).toBeDefined();
      expect(findMaterial(r, "Виброподвес")).toBeDefined();
      expect(findMaterial(r, "Вибролента")).toBeDefined();
    });

    it("отделяет точную потребность плит от сценарного запаса", () => {
      const r = calc({ area: 30, surfaceType: 0, system: 0 });
      expect(r.totals.primaryQty).toBe(50);
      expect(r.scenarios?.REC.exact_need).toBe(53);
    });

    it("округляет акустические плиты до полных упаковок", () => {
      const r = calc({
        area: 30,
        surfaceType: 0,
        system: 0,
        acousticPlatesPerPack: 6,
      });
      const insulation = findMaterial(r, "Акустическая минеральная")!;

      expect(r.scenarios?.REC.exact_need).toBe(53);
      expect(r.scenarios?.REC.buy_plan.package_size).toBe(6);
      expect(r.scenarios?.REC.buy_plan.packages_count).toBe(9);
      expect(r.scenarios?.REC.purchase_quantity).toBe(54);
      expect(insulation.packageInfo).toEqual({
        count: 9,
        size: 6,
        packageUnit: "упаковок",
      });
      expect(insulation.purchaseQty).toBe(54);
    });

    it("ГКЛ 2 слоя: area*1.1*2/3 листов", () => {
      const r = calc({ area: 30, surfaceType: 0, system: 0 });
      // sheets=ceil(33*2/3)=ceil(22)=22
      expect(findMaterial(r, "ГКЛ")!.quantity).toBe(22);
    });

    it("саморезы первого и второго слоя округляются отдельными упаковками", () => {
      const r = calc({ area: 30, surfaceType: 0, system: 0 });
      const screws = findMaterial(r, "саморезы для гипсокартона по металлу 3,5×25 и 3,5×35")!;
      expect(screws.purchaseQty).toBe(4);
      expect(screws.subtitle).toContain("2 уп. 3,5×25 мм");
      expect(screws.subtitle).toContain("2 уп. 3,5×35 мм");
      expect(screws.subtitle).toContain("275 шт");
    });
  });

  describe("ЗИПС панели (system=1)", () => {
    it("30 м²", () => {
      const r = calc({ area: 30, surfaceType: 0, system: 1 });
      checkInvariants(r);
      const panels = findMaterial(r, "Звукоизоляционные сэндвич-панели (ЗИПС)")!;
      expect(panels.quantity).toBeCloseTo(44.166667, 5);
      expect(panels.purchaseQty).toBe(45);
    });

    it("не предлагает покупать штатный крепёж ЗИПС отдельно", () => {
      const r = calc({ area: 30, surfaceType: 0, system: 1 });
      const panels = findMaterial(r, "Звукоизоляционные сэндвич-панели (ЗИПС)")!;
      const fastener = findMaterial(r, "Комплект крепежа, поставляемый")!;
      expect(fastener.subtitle).toContain("Отдельно не прибавляется");
      expect(fastener.unit).toBe("комплектов");
      expect(fastener.purchaseQty).toBe(panels.purchaseQty);
    });

    it("оставляет ЗИПС поштучным товаром", () => {
      const r = calc({ area: 30, surfaceType: 0, system: 1, acousticPlatesPerPack: 6 });
      const panels = findMaterial(r, "Звукоизоляционные сэндвич-панели (ЗИПС)")!;

      expect(r.scenarios?.REC.buy_plan.package_size).toBe(1);
      expect(panels.packageInfo).toBeUndefined();
    });

    it("направляет к инструкции конкретной системы", () => {
      const r = calc({ area: 30, surfaceType: 0, system: 1 });
      expect(r.warnings.some(w => w.includes("инструкции выбранной модели"))).toBe(true);
    });
  });

  describe("Плавающий пол (system=2)", () => {
    it("30 м²", () => {
      const r = calc({ area: 30, surfaceType: 0, system: 2 });
      checkInvariants(r);
      // Engine: "Звукоизоляционные маты", "Демпферная лента", "Стяжка 50 кг"
      expect(findMaterial(r, "Рулонный звукоизоляционный материал")).toBeDefined();
      expect(findMaterial(r, "Кромочная демпферная")).toBeDefined();
      expect(findMaterial(r, "Сухая смесь для стяжки")).toBeDefined();
    });
  });

  describe("Акустический потолок (system=3)", () => {
    it("30 м²", () => {
      const r = calc({ area: 30, surfaceType: 0, system: 3 });
      checkInvariants(r);
      // Engine: "Минераловатные плиты", "ГКЛ листы", "Виброподвесы"
      expect(findMaterial(r, "Акустическая минеральная")).toBeDefined();
      expect(findMaterial(r, "ГКЛ")).toBeDefined();
      expect(findMaterial(r, "Виброподвес")).toBeDefined();
      expect(findMaterial(r, "саморезы для гипсокартона по металлу 3,5×25 и 3,5×35")).toBeDefined();
    });
  });

  describe("Общие материалы", () => {
    it("герметик во всех системах", () => {
      for (const system of [0, 1, 2, 3]) {
        const r = calc({ area: 30, surfaceType: 0, system });
        // Engine: "Герметик"
        expect(findMaterial(r, "акустический герметик")).toBeDefined();
      }
    });

    it("уплотнительная лента во всех системах", () => {
      const r = calc({ area: 30, surfaceType: 0, system: 0 });
      // Engine: "Уплотнительная лента 30м"
      expect(findMaterial(r, "Уплотнительная виброизоляционная лента")).toBeDefined();
    });

    it("использует введённый периметр вместо оценки по квадрату", () => {
      const r = calc({ area: 30, system: 0, perimeter: 100 });
      expect(r.totals.perim).toBe(100);
      expect(r.totals.perimeterEstimated).toBe(0);
      expect(r.totals.sealTape).toBe(8);
    });

    it("явно отмечает оценочный периметр", () => {
      const r = calc({ area: 25, system: 0, perimeter: 0 });
      expect(r.totals.perim).toBe(20);
      expect(r.totals.perimeterEstimated).toBe(1);
      expect(r.practicalNotes?.some(note => note.includes("Периметр не задан"))).toBe(true);
    });
  });

  it("считает смесь по заданной толщине плавающей стяжки", () => {
    const r = calc({ area: 30, system: 2, screedThicknessMm: 70 });
    expect(r.totals.screedThicknessMm).toBe(70);
    expect(findMaterial(r, "Сухая смесь для стяжки")!.quantity).toBe(76);
  });

  describe("Предупреждения", () => {
    it("большая площадь → профессиональный монтаж", () => {
      const r = calc({ area: 250, surfaceType: 0, system: 0 });
      // Engine: "Большая площадь — рекомендуется профессиональный монтаж"
      expect(r.warnings.some(w => w.includes("профессиональный монтаж"))).toBe(true);
    });
  });

  it("определяет поверхность по выбранной конструкции", () => {
    const r = soundInsulationDef.calculate({
      area: 30,
      systemType: 3,
      acousticPlatesPerPack: 6,
    });

    expect(r.totals.surfaceType).toBe(2);
    expect(r.totals.system).toBe(3);
    expect(findMaterial(r, "Виброподвес для акустического потолка")).toBeDefined();
  });

  it("не показывает отдельный выбор поверхности с несовместимыми комбинациями", () => {
    expect(soundInsulationDef.fields.some(field => field.key === "surface")).toBe(false);
    expect(soundInsulationDef.fields.some(field => field.key === "systemType")).toBe(true);
  });
});
