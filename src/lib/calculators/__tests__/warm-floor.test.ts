import { describe, it, expect } from "vitest";
import { warmFloorDef } from "../formulas/warm-floor";
import { findMaterial, checkInvariants, withBasicAccuracy } from "./_helpers";

const calc = withBasicAccuracy(warmFloorDef.calculate.bind(warmFloorDef));

describe("Калькулятор тёплого пола", () => {
  describe("Нагревательный мат (heatingType=0), 10 м² комната, 2 м² мебель, 150 Вт/м²", () => {
    const result = calc({
      roomArea: 10,
      furnitureArea: 2,
      heatingType: 0,
      powerDensity: 150,
    });

    it("рабочая площадь = 8 м²", () => {
      expect(result.totals.heatingArea).toBeCloseTo(8, 2);
    });

    it("мощность = 1200 Вт", () => {
      expect(result.totals.totalPowerW).toBeCloseTo(1200, 1);
    });

    it("матов = ceil(8/2) = 4 шт", () => {
      // Engine: "Нагревательный мат"
      const mat = findMaterial(result, "Нагревательный мат");
      expect(mat).toBeDefined();
      expect(mat!.quantity).toBe(4);
    });

    it("терморегулятор присутствует", () => {
      // Engine: "Терморегулятор"
      expect(findMaterial(result, "Терморегулятор")).toBeDefined();
    });

    it("теплоизоляционная подложка отмечена как условный материал", () => {
      const substrate = findMaterial(result, "Теплоизоляционная подложка");
      expect(substrate).toBeDefined();
      expect(substrate?.subtitle).toContain("если");
    });

    it("плиточный клей присутствует", () => {
      expect(findMaterial(result, "плиточный клей")).toBeDefined();
    });

    it("инварианты", () => {
      checkInvariants(result);
    });
  });

  describe("Кабель в стяжке (heatingType=1)", () => {
    const result = calc({
      roomArea: 10,
      furnitureArea: 2,
      heatingType: 1,
      powerDensity: 150,
    });

    it("нагревательный кабель присутствует", () => {
      expect(findMaterial(result, "нагревательный кабель")).toBeDefined();
    });

    it("длина кабеля в totals > 0", () => {
      expect(result.totals.cableLength).toBeGreaterThan(0);
    });

    it("смесь для стяжки с указанием толщины расчёта присутствует", () => {
      const screed = findMaterial(result, "Сухая смесь для стяжки");
      expect(screed).toBeDefined();
      expect(screed?.subtitle).toContain("40 мм");
    });

    it("теплоизоляционные плиты для пола присутствуют", () => {
      expect(findMaterial(result, "Теплоизоляционные плиты для пола")).toBeDefined();
    });

    it("монтажная лента присутствует", () => {
      expect(findMaterial(result, "монтажная лента")).toBeDefined();
    });

    it("выбранная мощность меняет длину и шаг кабеля", () => {
      const lowPower = calc({ roomArea: 10, furnitureArea: 2, heatingType: 1, powerDensity: 100 });
      const highPower = calc({ roomArea: 10, furnitureArea: 2, heatingType: 1, powerDensity: 200 });
      expect(lowPower.totals.cableLength).toBe(47);
      expect(highPower.totals.cableLength).toBe(94);
      expect(lowPower.totals.cableStepMm).toBeGreaterThan(highPower.totals.cableStepMm);
      expect(findMaterial(highPower, "18 Вт/м")).toBeDefined();
    });
  });

  describe("Водяной тёплый пол (heatingType=2)", () => {
    const result = calc({
      roomArea: 10,
      furnitureArea: 2,
      heatingType: 2,
      powerDensity: 150,
    });

    it("указана труба 16×2 мм и необходимость цельного контура", () => {
      const pipe = findMaterial(result, "16×2 мм");
      expect(pipe).toBeDefined();
      expect(pipe?.subtitle).toContain("без соединений");
    });

    it("коллектор присутствует", () => {
      const collector = findMaterial(result, "Коллекторная группа");
      expect(collector).toBeDefined();
      expect(collector?.name).toContain(`${result.totals.circuits}`);
    });

    it("армирующая сетка присутствует", () => {
      expect(findMaterial(result, "армирующая сетка")).toBeDefined();
    });

    it("нет ошибочной теплоизоляции на всей длине трубы", () => {
      expect(findMaterial(result, "Теплоизоляция трубы")).toBeUndefined();
      expect(findMaterial(result, "Евроконусы")).toBeDefined();
    });

    it("электрическое предупреждение не показывается для водяного пола", () => {
      const large = calc({ roomArea: 30, furnitureArea: 2, heatingType: 2, powerDensity: 200 });
      expect(large.warnings.some((w) => w.includes("электр") || w.includes("автомат"))).toBe(false);
    });
  });

  describe("Предупреждения", () => {
    it("мощность > 3.5 кВт → отдельная линия и проверка схемы", () => {
      const result = calc({
        roomArea: 30,
        furnitureArea: 2,
        heatingType: 0,
        powerDensity: 150,
      });
      expect(result.warnings.some((w) => w.includes("отдельная линия"))).toBe(true);
    });

    it("< 50% площади → неэффективное покрытие", () => {
      const result = calc({
        roomArea: 10,
        furnitureArea: 7,
        heatingType: 0,
        powerDensity: 150,
      });
      // Engine: "Обогреваемая площадь менее 50% — неэффективное покрытие"
      expect(result.warnings.some((w) => w.includes("50%"))).toBe(true);
    });
  });
});
