import { describe, it, expect } from "vitest";
import { brickDef } from "../formulas/brick";
import { findMaterial, checkInvariants, withBasicAccuracy } from "./_helpers";

const calc = withBasicAccuracy(brickDef.calculate.bind(brickDef));

describe("Калькулятор кирпича", () => {
  describe("По размерам: 6×2.7 м, одинарный, 1 кирпич, нормальные условия", () => {
    // area = 6*2.7 = 16.2, bricksPerM2 = BRICKS_PER_SQM[0][1] = 102
    // bricksNeeded = ceil(16.2 * 102 * 1.05) = ceil(16.2 * 107.1) = ceil(1735.02) = 1736
    const result = calc({
      inputMode: 0,
      wallWidth: 6,
      wallHeight: 2.7,
      brickType: 0,
      wallThickness: 1,
      workingConditions: 1,
    });

    it("содержит кирпич в материалах", () => {
      const brick = findMaterial(result, "Кирпич");
      expect(brick).toBeDefined();
    });

    it("отделяет чистую потребность, выбранный запас и целую покупку", () => {
      const brick = findMaterial(result, "Кирпич");
      // Чисто: 16.2 × 102 = 1652.4; выбранный запас 5% = 1735.02.
      expect(brick?.quantity).toBeCloseTo(1652.4, 5);
      expect(brick?.withReserve).toBeCloseTo(1735.02, 5);
      expect(brick?.purchaseQty).toBe(1736);
    });

    it("площадь в totals = 16.2 м²", () => {
      expect(result.totals.area).toBeCloseTo(16.2, 1);
    });

    it("содержит цемент", () => {
      expect(findMaterial(result, "Цемент")).toBeDefined();
    });

    it("содержит песок", () => {
      expect(findMaterial(result, "Песок")).toBeDefined();
    });

    it("инварианты", () => {
      checkInvariants(result);
    });
  });

  describe("По площади, полуторный кирпич 0.5 кирпича", () => {
    // bricksPerM2 = BRICKS_PER_SQM[1][0] = 39
    // area = 20, bricksNeeded = ceil(20 * 39 * 1.05) = ceil(819) = 819
    const result = calc({
      inputMode: 1,
      area: 20,
      brickType: 1,
      wallThickness: 0,
      workingConditions: 1,
    });

    it("кирпича 819 шт с выбранным запасом 5%", () => {
      const brick = findMaterial(result, "Кирпич");
      expect(brick?.quantity).toBe(780);
      expect(brick?.withReserve).toBe(819);
      expect(brick?.purchaseQty).toBe(819);
    });

    it("wallThickness=0 → предупреждение о проектной проверке 120 мм", () => {
      expect(result.warnings.some((w) => w.includes("не определяет назначение"))).toBe(true);
    });
  });

  describe("Предупреждения", () => {
    it("wallThickness=0 не назначает автоматически перегородку", () => {
      const result = calc({
        inputMode: 1,
        area: 10,
        brickType: 0,
        wallThickness: 0,
        workingConditions: 1,
      });
      expect(result.warnings.some((w) => w.includes("120 мм"))).toBe(true);
      expect(result.warnings.join(" ")).not.toContain("только для ненесущих перегородок");
    });

    it("большой объём раствора не назначает конкретное оборудование", () => {
      const result = calc({
        inputMode: 1,
        area: 40,
        brickType: 0,
        wallThickness: 1,
        workingConditions: 1,
      });
      expect(result.warnings.some((w) => w.includes("крупный предварительный объём"))).toBe(true);
      expect(result.warnings.join(" ")).not.toContain("рекомендуется бетономешалка");
    });
  });

  describe("Армирование и многослойные стены", () => {
    it("не добавляет гибкие связи только из-за толщины кладки", () => {
      const result = calc({
        inputMode: 1,
        area: 10,
        brickType: 0,
        wallThickness: 2,
        workingConditions: 1,
      });
      expect(findMaterial(result, "Гибкие связи")).toBeUndefined();
      expect(result.warnings.some((w) => w.includes("многослойной стены"))).toBe(true);
    });

    it("выдаёт кладочную сетку в погонных метрах, а не в квадратных", () => {
      const result = calc({
        inputMode: 0,
        wallWidth: 6,
        wallHeight: 2.7,
        brickType: 0,
        wallThickness: 1,
        workingConditions: 1,
      });
      const mesh = findMaterial(result, "Кладочная сетка");
      expect(mesh?.unit).toBe("п.м.");
      expect(result.totals.meshLengthM).toBeGreaterThan(0);
    });
  });

  describe("Прозрачный запас", () => {
    it("не добавляет второй скрытый запас режимами точности", () => {
      const inputs = { wallWidth: 5, wallHeight: 3, brickType: 0, wallThickness: 1, wasteMode: 0 };
      const results = ["basic", "realistic", "professional"].map((accuracyMode) =>
        brickDef.calculate({ ...inputs, accuracyMode }),
      );

      for (const r of results) {
        const brick = findMaterial(r, "Кирпич");
        expect(r.scenarios.MIN.exact_need).toBe(1530);
        expect(r.scenarios.REC.exact_need).toBeCloseTo(1606.5, 5);
        expect(r.scenarios.MAX.exact_need).toBe(1683);
        expect(brick?.quantity).toBe(1530);
        expect(brick?.withReserve).toBeCloseTo(1606.5, 5);
        expect(brick?.purchaseQty).toBe(1607);
        expect(r.accuracyExplanation?.combinedMultiplier).toBe(1);
      }
    });

    it("REC следует выбранному запасу, MAX не превышает доступные в форме 10%", () => {
      const minimal = calc({ wallWidth: 5, wallHeight: 3, wasteMode: 2 });
      const reinforced = calc({ wallWidth: 5, wallHeight: 3, wasteMode: 1 });

      expect(minimal.scenarios.REC.exact_need).toBeCloseTo(1530 * 1.03, 5);
      expect(minimal.scenarios.MAX.exact_need).toBe(1683);
      expect(reinforced.scenarios.REC.exact_need).toBe(1683);
      expect(reinforced.scenarios.MAX.exact_need).toBe(1683);
    });
  });

  describe("Прозрачная закупочная модель", () => {
    const result = calc({
      inputMode: 0,
      wallWidth: 6,
      wallHeight: 2.7,
      brickType: 0,
      wallThickness: 1,
      workingConditions: 2,
      wasteMode: 0,
      mortarAdditive: 0,
    });

    it("показывает табличный расход, запас и фиксированную модель раствора", () => {
      expect(findMaterial(result, "Кирпич")?.subtitle).toContain("102 шт/м²");
      expect(findMaterial(result, "Кирпич")?.subtitle).toContain("запаса 5%");
      expect(findMaterial(result, "Цемент")?.subtitle).toContain("0.023 м³/м² × 1,12");
      expect(findMaterial(result, "Цемент")?.subtitle).toContain("поправка условий 1.05 (+5%)");
      expect(findMaterial(result, "Песок")?.subtitle).toContain("1,2 м³ песка");
      expect(findMaterial(result, "Кладочная сетка")?.subtitle).toContain("каждые 5 рядов");
      expect(findMaterial(result, "Кладочная сетка")?.subtitle).toContain("не готовая ведомость");
    });

    it("раскрывает добавку, гидроизоляцию и инструменты как предварительные позиции", () => {
      expect(findMaterial(result, "Известь")?.subtitle).toContain("150 кг");
      expect(findMaterial(result, "Известь")?.subtitle).toContain("+10%");
      expect(findMaterial(result, "Рубероид")?.subtitle).toContain("введённая длина × выбранная толщина");
      expect(findMaterial(result, "Рубероид")?.subtitle).toContain("задаёт проект");
      expect(findMaterial(result, "Кельма")?.subtitle).toContain("не проверяет, что уже есть у бригады");
      expect(findMaterial(result, "Шнур-причалка")?.subtitle).toContain("справочная позиция");
    });

    it("оставляет длину и высоту видимыми в режиме площади", () => {
      const lengthField = brickDef.fields.find((field) => field.key === "wallWidth");
      const heightField = brickDef.fields.find((field) => field.key === "wallHeight");
      const areaField = brickDef.fields.find((field) => field.key === "area");

      expect(lengthField?.group).toBeUndefined();
      expect(heightField?.group).toBeUndefined();
      expect(lengthField?.hint).toContain("полный прямоугольник без вычета проёмов");
      expect(lengthField?.hint).toContain("предварительной сетки");
      expect(heightField?.hint).toContain("полос сетки");
      expect(areaField?.hint).toContain("без окон и дверей");
    });

    it("нейтрально показывает толщину, погодные множители, запас и добавку", () => {
      const thickness = brickDef.fields.find((field) => field.key === "wallThickness");
      const conditions = brickDef.fields.find((field) => field.key === "workingConditions");
      const waste = brickDef.fields.find((field) => field.key === "wasteMode");
      const additive = brickDef.fields.find((field) => field.key === "mortarAdditive");

      expect(thickness?.options?.[0].label).toBe("0,5 кирпича (120 мм)");
      expect(thickness?.hint).toContain("несущую способность");
      expect(conditions?.options?.map((option) => option.label)).toEqual([
        "Без поправки (×1,00)",
        "Ветер: +5% (×1,05)",
        "Ниже +5°C: +10% (×1,10)",
        "Выше +30°C: +8% (×1,08)",
      ]);
      expect(conditions?.hint).toContain("плановые коэффициенты");
      expect(waste?.options?.map((option) => option.label)).toEqual(["5%", "10%", "3%"]);
      expect(additive?.hint).toContain("Не покупайте добавку");
    });

    it("ссылается на действующие нормы и не выдаёт модель за рецепт М150", () => {
      const content = brickDef.seoContent?.descriptionHtml ?? "";
      const formula = brickDef.formulaDescription ?? "";

      expect(content).toContain("protect.gost.ru/gost/details/e3f3ca57-13cb-493c-a047-21814635e7fc");
      expect(content).toContain("СП 15.13330.2020 с изменением № 1");
      expect(content).toContain("СП 70.13330.2012 с изменениями № 1, 3&ndash;8");
      expect(content).toContain("ГОСТ Р 58766-2019");
      expect(content).toContain("не подтверждает эту таблицу");
      expect(content).not.toContain("Расход раствора М150");
      expect(formula).not.toContain("Пропорции раствора М150");
      expect(formula).not.toContain("Обязательная гидроизоляция");
    });
  });
});
