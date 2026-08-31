import { describe, it, expect } from "vitest";
import { facadeInsulationDef } from "../formulas/facade-insulation";
import { findMaterial, checkInvariants, withBasicAccuracy } from "./_helpers";

const calc = withBasicAccuracy(facadeInsulationDef.calculate.bind(facadeInsulationDef));

describe("Утепление фасада", () => {
  describe("Минвата 100 мм, 100 м², короед", () => {
    it("плиты: area*1.05/0.72", () => {
      const r = calc({ area: 100, thickness: 100, insulationType: 0, finishType: 0 });
      checkInvariants(r);
      const expectedPlates = Math.ceil(100 * 1.05 / 0.72);
      // Engine: "Минеральная вата (плиты 0.72 м²)"
      const plates = findMaterial(r, "Минеральная вата");
      expect(plates).toBeDefined();
      expect(r.totals.plates).toBe(expectedPlates);
    });

    it("клей для утеплителя: 4 кг/м² → ceil(400/25) = 16 мешков", () => {
      const r = calc({ area: 100, thickness: 100, insulationType: 0, finishType: 0 });
      // Engine: "Клей для утеплителя 25кг"
      const glue = findMaterial(r, "Клей для утеплителя");
      expect(glue).toBeDefined();
      expect(glue!.quantity).toBe(Math.ceil(100 * 4 / 25));
    });

    it("тарельчатые дюбели: 6 шт/м² × 100 × 1.05 = 630", () => {
      const r = calc({ area: 100, thickness: 100, insulationType: 0, finishType: 0 });
      // Engine: "Тарельчатые дюбели"
      const dubels = findMaterial(r, "Тарельчатые дюбели");
      expect(dubels).toBeDefined();
      expect(dubels!.quantity).toBe(Math.ceil(100 * 6 * 1.05));
    });

    it("армирующая сетка: area*1.15/50 рулонов", () => {
      const r = calc({ area: 100, thickness: 100, insulationType: 0, finishType: 0 });
      // Engine: "Армирующая сетка (50 м²)"
      const mesh = findMaterial(r, "Армирующая сетка");
      expect(mesh).toBeDefined();
      expect(mesh!.quantity).toBe(Math.ceil(100 * 1.15 / 50));
    });

    it("армирующая шпаклёвка: 4 кг/м² → ceil(400/25) = 16 мешков", () => {
      const r = calc({ area: 100, thickness: 100, insulationType: 0, finishType: 0 });
      // Engine: "Армирующая шпаклёвка 25кг"
      const arm = findMaterial(r, "Армирующая шпаклёвка");
      expect(arm).toBeDefined();
      expect(arm!.quantity).toBe(Math.ceil(100 * 4 / 25));
    });

    it("декоративная штукатурка «короед»: 3.5 кг/м² → ceil(350/25) = 14 мешков", () => {
      const r = calc({ area: 100, thickness: 100, insulationType: 0, finishType: 0 });
      // Engine: "Декоративная штукатурка «короед» 25кг"
      const plaster = findMaterial(r, "короед");
      expect(plaster).toBeDefined();
      expect(plaster!.quantity).toBe(Math.ceil(100 * 3.5 / 25));
    });

    it("стартовый профиль присутствует", () => {
      const r = calc({ area: 100, thickness: 100, insulationType: 0, finishType: 0 });
      // Engine: "Стартовый профиль (2 м)"
      expect(findMaterial(r, "Стартовый профиль")).toBeDefined();
      expect(r.practicalNotes?.some(note => note.includes("4 × √S"))).toBe(true);
    });

    it("округляет плиты до полных упаковок", () => {
      const r = calc({
        area: 100,
        thickness: 100,
        insulationType: 0,
        finishType: 0,
        platesPerPack: 4,
      });
      const insulation = findMaterial(r, "Минеральная вата")!;

      expect(r.scenarios?.REC.exact_need).toBeCloseTo(154.76, 5);
      expect(r.scenarios?.REC.buy_plan.package_size).toBe(4);
      expect(r.scenarios?.REC.buy_plan.packages_count).toBe(39);
      expect(r.scenarios?.REC.purchase_quantity).toBe(156);
      expect(insulation.packageInfo).toEqual({
        count: 39,
        size: 4,
        packageUnit: "упаковок",
      });
      expect(insulation.purchaseQty).toBe(156);
    });
  });

  describe("ЭППС (insulationType=1)", () => {
    it("плиты ЭППС, клей 5 кг/м², дюбели 4 шт/м²", () => {
      const r = calc({ area: 100, thickness: 100, insulationType: 1, finishType: 0 });
      checkInvariants(r);
      // Engine: "ЭППС (плиты 0.72 м²)"
      const plates = findMaterial(r, "ЭППС");
      expect(plates).toBeDefined();

      const glue = findMaterial(r, "Клей для утеплителя");
      expect(glue!.quantity).toBe(Math.ceil(100 * 5 / 25));

      const dubels = findMaterial(r, "Тарельчатые дюбели");
      expect(dubels!.quantity).toBe(Math.ceil(100 * 4 * 1.05));
    });

    it("ЭППС → предупреждение о проектной зоне и документации СФТК", () => {
      const r = calc({ area: 100, thickness: 100, insulationType: 1, finishType: 0 });
      expect(r.warnings.some(w => w.includes("предусмотренной проектом зоне"))).toBe(true);
      expect(r.practicalNotes?.some(note => note.includes("4 тарельчатых дюбеля"))).toBe(true);
      expect(r.practicalNotes?.some(note => note.includes("ножовк"))).toBe(false);
    });
  });

  describe("Финишные слои", () => {
    it("шуба: 4.5 кг/м² → ceil(450/25) = 18 мешков", () => {
      const r = calc({ area: 100, thickness: 100, insulationType: 0, finishType: 1 });
      // Engine: "Декоративная штукатурка «шуба» 25кг"
      const plaster = findMaterial(r, "шуба");
      expect(plaster).toBeDefined();
      expect(plaster!.quantity).toBe(Math.ceil(100 * 4.5 / 25));
    });

    it("тонкослойная: 2.5 кг/м² → ceil(250/25) = 10 мешков", () => {
      const r = calc({ area: 100, thickness: 100, insulationType: 0, finishType: 2 });
      // Engine: "Тонкослойная штукатурка 25кг"
      const plaster = findMaterial(r, "Тонкослойная");
      expect(plaster).toBeDefined();
      expect(plaster!.quantity).toBe(Math.ceil(100 * 2.5 / 25));
    });
  });

  describe("Толщина утеплителя >= 150 → предупреждение", () => {
    it("150 мм → проверка одно- или двухслойной схемы по проекту", () => {
      const r = calc({ area: 100, thickness: 150, insulationType: 0, finishType: 0 });
      expect(r.warnings.some(w => w.includes("двухслойн"))).toBe(true);
      expect(r.warnings.some(w => w.includes("Калькулятор считает один слой"))).toBe(true);
    });
  });

  describe("Грунтовка и профиль", () => {
    it("грунтовка канистра 10 л", () => {
      const r = calc({ area: 100, thickness: 100, insulationType: 0, finishType: 0 });
      // Engine: "Грунтовка (канистра 10 л)"
      const primer = findMaterial(r, "Грунтовка");
      expect(primer).toBeDefined();
    });
  });

  describe("Пользовательские границы расчёта", () => {
    it("не связывает варианты толщины с регионом или рекомендацией", () => {
      const thickness = facadeInsulationDef.fields.find(field => field.key === "thickness")!;
      const labels = thickness.options?.map(option => option.label).join(" ") ?? "";

      expect(labels).not.toContain("Московская");
      expect(labels).not.toContain("Сибирь");
      expect(labels).not.toContain("крайний север");
      expect(labels).not.toContain("рекомендуется");
      expect(thickness.hint).toContain("не рассчитывает сопротивление теплопередаче");
    });

    it("помечает ограничения ЭППС и тонкослойной отделки", () => {
      const insulation = facadeInsulationDef.fields.find(field => field.key === "insulationType")!;
      const finish = facadeInsulationDef.fields.find(field => field.key === "finishType")!;

      expect(insulation.options?.find(option => option.value === 1)?.label).toContain("проектом");
      expect(finish.options?.find(option => option.value === 2)?.label).toContain("без фасадной краски");
      expect(finish.hint).toContain("краска в ведомость не входит");
    });

    it("SEO-текст использует актуальную редакцию СП и не содержит старых ценовых обещаний", () => {
      const content = `${facadeInsulationDef.seoContent?.descriptionHtml ?? ""} ${JSON.stringify(facadeInsulationDef.seoContent?.faq ?? [])}`;

      expect(content).toContain("СП 50.13330.2024");
      expect(content).not.toContain("СП 50.13330.2012");
      expect(content).not.toContain("230 000");
      expect(content).not.toContain("ножовк");
    });
  });
});
