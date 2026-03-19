import { describe, it, expect } from "vitest";
import { wallPanelsDef } from "../formulas/wall-panels";
import { findMaterial, checkInvariants, withBasicAccuracy } from "./_helpers";

const calc = withBasicAccuracy(wallPanelsDef.calculate.bind(wallPanelsDef));

describe("Калькулятор панелей для стен", () => {
  describe("ПВХ панели (panelType=0), 20 м², на клей (mountMethod=0)", () => {
    const result = calc({
      area: 20,
      panelType: 0,
      mountMethod: 0,
      height: 2.7,
    });

    it("ПВХ-панели присутствуют", () => {
      // Engine: "ПВХ-панели (0.75 м²)"
      const panels = findMaterial(result, "ПВХ-панели");
      expect(panels).toBeDefined();
    });

    it("монтажный клей (флаконы) присутствует", () => {
      // Engine: "Монтажный клей (флаконы)"
      const glue = findMaterial(result, "Монтажный клей");
      expect(glue).toBeDefined();
    });

    it("грунтовка присутствует (монтаж на клей)", () => {
      // Engine: "Грунтовка (канистра 10 л)"
      expect(findMaterial(result, "Грунтовка")).toBeDefined();
    });

    it("молдинги присутствуют", () => {
      // Engine: "Молдинги (3 м)"
      expect(findMaterial(result, "Молдинги")).toBeDefined();
    });

    it("герметик (тубы) присутствует", () => {
      // Engine: "Герметик (тубы)"
      expect(findMaterial(result, "Герметик")).toBeDefined();
    });

    it("нет обрешётки и кляймеров при клеевом монтаже", () => {
      expect(findMaterial(result, "Обрешётка")).toBeUndefined();
      expect(findMaterial(result, "Кляймеры")).toBeUndefined();
    });

    it("инварианты", () => {
      checkInvariants(result);
    });
  });

  describe("МДФ-панели (panelType=1), 20 м², на обрешётку (mountMethod=1)", () => {
    const result = calc({
      area: 20,
      panelType: 1,
      mountMethod: 1,
      height: 2.7,
    });

    it("МДФ-панели присутствуют", () => {
      // Engine: "МДФ-панели (0.494 м²)"
      const panels = findMaterial(result, "МДФ-панели");
      expect(panels).toBeDefined();
    });

    it("обрешётка (бруски 3 м) присутствует", () => {
      // Engine: "Обрешётка (бруски 3 м)"
      expect(findMaterial(result, "Обрешётка")).toBeDefined();
    });

    it("дюбели для обрешётки присутствуют", () => {
      // Engine: "Дюбели для обрешётки"
      expect(findMaterial(result, "Дюбели для обрешётки")).toBeDefined();
    });

    it("кляймеры присутствуют", () => {
      // Engine: "Кляймеры"
      expect(findMaterial(result, "Кляймеры")).toBeDefined();
    });

    it("нет грунтовки при монтаже на обрешётку", () => {
      expect(findMaterial(result, "Грунтовка")).toBeUndefined();
    });

    it("нет клея при обрешётке", () => {
      expect(findMaterial(result, "Монтажный клей")).toBeUndefined();
    });
  });

  describe("3D-панели (panelType=2), 20 м², на клей", () => {
    const result = calc({
      area: 20,
      panelType: 2,
      mountMethod: 0,
      height: 2.7,
    });

    it("3D-панели присутствуют", () => {
      // Engine: "3D-панели (0.25 м²)"
      expect(findMaterial(result, "3D-панели")).toBeDefined();
    });

    it("предупреждение о ровности основания", () => {
      // Engine: "3D-панели на клей — убедитесь в ровности основания"
      expect(result.warnings.some((w) => w.includes("ровности основания"))).toBe(true);
    });
  });

  describe("Каменный шпон (panelType=4)", () => {
    const result = calc({
      area: 20,
      panelType: 4,
      mountMethod: 0,
      height: 2.7,
    });

    it("каменный шпон присутствует", () => {
      // Engine: "Каменный шпон (0.5 м²)"
      expect(findMaterial(result, "Каменный шпон")).toBeDefined();
    });

    it("инварианты", () => {
      checkInvariants(result);
    });
  });

  describe("Большая площадь > 100 м²", () => {
    it("предупреждение об оптовой закупке", () => {
      const r = calc({ area: 150, panelType: 0, mountMethod: 0, height: 2.7 });
      // Engine: "Большая площадь — рассмотрите оптовую закупку панелей"
      expect(r.warnings.some(w => w.includes("оптовую закупку"))).toBe(true);
    });
  });
});
