import { describe, it, expect } from "vitest";
import { wallPanelsDef } from "../formulas/wall-panels";
import { findMaterial, checkInvariants, withBasicAccuracy } from "./_helpers";

const calc = withBasicAccuracy(wallPanelsDef.calculate.bind(wallPanelsDef));

describe("Калькулятор панелей для стен", () => {
  it("синхронизирует web-дефолты с canonical и открывает высоту для обрешётки", () => {
    const areaField = wallPanelsDef.fields.find((field) => field.key === "area");
    const heightField = wallPanelsDef.fields.find((field) => field.key === "height");

    expect(areaField?.defaultValue).toBe(20);
    expect(heightField?.defaultValue).toBe(2.7);
    expect(heightField?.hideIf).toEqual({ key: "mountMethod", op: "eq", value: 0 });
  });

  it("называет пятый пресет каменным шпоном, а не упаковкой декоративного камня", () => {
    const panelTypeField = wallPanelsDef.fields.find((field) => field.key === "panelType");

    expect(panelTypeField?.options?.find((option) => option.value === 4)?.label)
      .toBe("Каменный шпон, лист 0,5 м²");
  });

  it("показывает границы геометрии и разные подсказки способов монтажа", () => {
    const glueResult = calc({ area: 20, panelType: 0, mountMethod: 0, height: 2.7 });
    const frameResult = calc({ area: 20, panelType: 1, mountMethod: 1, height: 3.2 });

    expect(glueResult.practicalNotes[0]).toContain("эквивалентного квадрата");
    expect(glueResult.practicalNotes.some((note) => note.includes("1 флакон на 4 м²"))).toBe(true);
    expect(glueResult.practicalNotes.some((note) => note.includes("Обрешётку проверяйте"))).toBe(false);
    expect(frameResult.practicalNotes.some((note) => note.includes("введённой высоте 3,2 м"))).toBe(true);
    expect(frameResult.practicalNotes.some((note) => note.includes("Обрешётку проверяйте"))).toBe(true);
  });

  it("изменяет ведомость обрешётки при изменении введённой высоты", () => {
    const lowWall = calc({ area: 20, panelType: 1, mountMethod: 1, height: 2 });
    const highWall = calc({ area: 20, panelType: 1, mountMethod: 1, height: 4 });

    expect(highWall.totals.battenRows).toBeGreaterThan(lowWall.totals.battenRows as number);
    expect(highWall.totals.battenPcs).not.toBe(lowWall.totals.battenPcs);
  });

  it("не обещает точный контур или неподдерживаемую норму кляймеров", () => {
    const seoHtml = wallPanelsDef.seoContent?.descriptionHtml ?? "";

    expect(seoHtml).toContain("5 шт/м²");
    expect(seoHtml).toContain("эквивалентного квадрата");
    expect(seoHtml).not.toContain("2–3 шт на каждую панель");
  });

  it("позиционируется под подтверждённый спрос ПВХ-панелей", () => {
    expect(wallPanelsDef.metaTitle).toContain("Калькулятор ПВХ-панелей");
    expect(wallPanelsDef.metaDescription).toContain("количество с запасом");
    expect(wallPanelsDef.h1).toContain("ПВХ");
  });

  it("пример на 10 м² совпадает с canonical-результатом", () => {
    const result = calc({ area: 10, panelType: 0, mountMethod: 0, height: 2.7 });
    const panels = findMaterial(result, "Пластиковые панели (ПВХ");
    const example = wallPanelsDef.seoContent?.faq?.find((item) =>
      item.question.includes("10 м²"),
    );

    expect(panels?.quantity).toBe(15.9);
    expect(panels?.purchaseQty).toBe(16);
    expect(example?.answer).toContain("15 панелей");
    expect(example?.answer).toContain("16 панелей");
  });

  describe("ПВХ панели (panelType=0), 20 м², на клей (mountMethod=0)", () => {
    const result = calc({
      area: 20,
      panelType: 0,
      mountMethod: 0,
      height: 2.7,
    });

    it("ПВХ-панели присутствуют", () => {
      // Engine: "ПВХ-панели (0.75 м²)"
      const panels = findMaterial(result, "Пластиковые панели (ПВХ");
      expect(panels).toBeDefined();
    });

    it("монтажный клей (флаконы) присутствует", () => {
      const glue = findMaterial(result, "Монтажный клей без растворителей для пластиковых панелей");
      expect(glue).toBeDefined();
      expect(glue?.subtitle).toContain("совместимость");
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
      const panels = findMaterial(result, "Древесноволокнистые панели (МДФ");
      expect(panels).toBeDefined();
    });

    it("обрешётка (бруски 3 м) присутствует", () => {
      // Engine: "Обрешётка (бруски 3 м)"
      expect(findMaterial(result, "Обрешётка")).toBeDefined();
    });

    it("дюбели для обрешётки присутствуют", () => {
      const dowels = findMaterial(result, "Дюбель-гвозди 6×40/60 мм");
      expect(dowels).toBeDefined();
      expect(dowels?.subtitle).toContain("газобетона");
    });

    it("кляймеры присутствуют", () => {
      const fasteners = findMaterial(result, "Кляймеры для древесноволокнистых панелей");
      expect(fasteners).toBeDefined();
      expect(fasteners?.subtitle).toContain("пазу");
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
