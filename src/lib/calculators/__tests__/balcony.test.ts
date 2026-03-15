import { describe, it, expect } from "vitest";
import { balconyDef } from "../formulas/balcony";
import { findMaterial, checkInvariants } from "./_helpers";

const calc = balconyDef.calculate.bind(balconyDef);

describe("Калькулятор отделки балкона", () => {
  describe("Стандарт: 3×1.2 м, высота 2.5 м, вагонка, ПСБ (insulationType=1)", () => {
    // floorArea = 3 * 1.2 = 3.6
    // wallArea = (2*1.2 + 2*3) * 2.5 = 8.4 * 2.5 = 21
    // ceilingArea = 3 * 1.2 = 3.6
    // totalFinishArea = 21 + 3.6 = 24.6
    const result = calc({
      length: 3.0,
      width: 1.2,
      height: 2.5,
      finishType: 0,
      insulationType: 1,
    });

    it("totals.floorArea = 3.6", () => {
      expect(result.totals.floorArea).toBeCloseTo(3.6, 2);
    });

    it("totals.wallArea = 21", () => {
      expect(result.totals.wallArea).toBeCloseTo(21, 2);
    });

    it("totals.totalFinishArea = 24.6", () => {
      expect(result.totals.totalFinishArea).toBeCloseTo(24.6, 2);
    });

    it("ПСБ (пенопласт) присутствует (insulationType=1)", () => {
      // Engine: INSULATION_LABELS[1] = "ПСБ (пенопласт)"
      const ps = findMaterial(result, "ПСБ");
      expect(ps).toBeDefined();
    });

    it("вагонка присутствует (finishType=0)", () => {
      // Engine: FINISH_LABELS[0] = "Вагонка"
      const panel = findMaterial(result, "Вагонка");
      expect(panel).toBeDefined();
    });

    it("обрешётка (брусок 20×40) присутствует", () => {
      // Engine: "Обрешётка (брусок 20×40)"
      expect(findMaterial(result, "Обрешётка")).toBeDefined();
    });

    it("кляймеры присутствуют", () => {
      // Engine: "Кляймеры"
      expect(findMaterial(result, "Кляймеры")).toBeDefined();
    });

    it("инварианты", () => {
      checkInvariants(result);
    });
  });

  describe("Панели ПВХ + пенофол (finishType=1, insulationType=2)", () => {
    const result = calc({
      length: 3.0,
      width: 1.2,
      height: 2.5,
      finishType: 1,
      insulationType: 2,
    });

    it("ПВХ-панели присутствуют", () => {
      // Engine: FINISH_LABELS[1] = "ПВХ-панели"
      expect(findMaterial(result, "ПВХ-панели")).toBeDefined();
    });

    it("пенофол присутствует (insulationType=2)", () => {
      // Engine: INSULATION_LABELS[2] = "Пенофол"
      expect(findMaterial(result, "Пенофол")).toBeDefined();
    });

    it("нет ПСБ (insulationType = 2 — только пенофол)", () => {
      expect(findMaterial(result, "ПСБ")).toBeUndefined();
    });

    it("инварианты", () => {
      checkInvariants(result);
    });
  });

  describe("ПСБ + пенофол (insulationType = 3)", () => {
    const result = calc({
      length: 3.0,
      width: 1.2,
      height: 2.5,
      finishType: 0,
      insulationType: 3,
    });

    it("ПСБ + пенофол присутствует (insulationType=3)", () => {
      // Engine: INSULATION_LABELS[3] = "ПСБ + пенофол"
      expect(findMaterial(result, "ПСБ + пенофол")).toBeDefined();
    });
  });

  describe("Без утепления (insulationType = 0)", () => {
    const result = calc({
      length: 3.0,
      width: 1.2,
      height: 2.5,
      finishType: 0,
      insulationType: 0,
    });

    it("нет утеплителя", () => {
      expect(result.totals.insPlates).toBe(0);
    });

    it("предупреждение о температурном перепаде", () => {
      // Engine: "Без утепления — на балконе будет значительный перепад температур"
      expect(result.warnings.some((w) => w.includes("Без утепления"))).toBe(true);
    });

    it("инварианты", () => {
      checkInvariants(result);
    });
  });

  describe("Имитация бруса (finishType = 2)", () => {
    const result = calc({
      length: 3.0,
      width: 1.2,
      height: 2.5,
      finishType: 2,
      insulationType: 1,
    });

    it("имитация бруса присутствует", () => {
      // Engine: FINISH_LABELS[2] = "Имитация бруса"
      expect(findMaterial(result, "Имитация бруса")).toBeDefined();
    });
  });

  describe("МДФ панели (finishType = 3)", () => {
    const result = calc({
      length: 3.0,
      width: 1.2,
      height: 2.5,
      finishType: 3,
      insulationType: 1,
    });

    it("МДФ-панели присутствуют", () => {
      // Engine: FINISH_LABELS[3] = "МДФ-панели"
      expect(findMaterial(result, "МДФ-панели")).toBeDefined();
    });

    it("инварианты", () => {
      checkInvariants(result);
    });
  });
});
