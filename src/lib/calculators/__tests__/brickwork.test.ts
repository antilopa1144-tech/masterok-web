import { describe, it, expect } from "vitest";
import { brickworkDef } from "../formulas/brickwork";
import { findMaterial, checkInvariants, withBasicAccuracy } from "./_helpers";

const calc = withBasicAccuracy(brickworkDef.calculate.bind(brickworkDef));

describe("Калькулятор кладки кирпича", () => {
  describe("Входы и проектные границы", () => {
    it("показывает длину и высоту в обоих режимах, потому что они нужны для справочной сетки", () => {
      const wallLength = brickworkDef.fields.find((field) => field.key === "wallLength");
      const wallHeight = brickworkDef.fields.find((field) => field.key === "wallHeight");

      expect(wallLength?.group).toBeUndefined();
      expect(wallHeight?.group).toBeUndefined();
      expect(wallLength?.hint).toContain("в режиме по площади");
      expect(wallHeight?.hint).toContain("предварительного числа рядов");
    });

    it("не назначает несущую или наружную стену только по толщине", () => {
      const thickness = brickworkDef.fields.find((field) => field.key === "wallThickness");
      const labels = thickness?.options?.map((option) => option.label).join(" ") ?? "";

      expect(labels).not.toContain("несущие стены");
      expect(labels).not.toContain("наружные стены");
      expect(thickness?.hint).toContain("не определяет назначение");
    });

    it("раскрывает фиксированные коэффициенты и актуальную нормативную базу", () => {
      const formula = brickworkDef.formulaDescription ?? "";
      const seo = brickworkDef.seoContent?.descriptionHtml ?? "";

      expect(formula).toContain("фиксированные 5%");
      expect(formula).toContain("Поле шва этот расход не меняет");
      expect(formula).toContain("один проём на каждые 2 м²");
      expect(seo).toContain("ГОСТ Р 58766-2019");
      expect(seo).toContain("СП 15.13330.2020 с изменением № 1");
      expect(seo).toContain("СП 70.13330.2012 с изменениями № 1, 3–8");
      expect(seo).toContain("утратившего силу в РФ ГОСТ 28013-98");
    });

    it("маркирует раствор, поддоны, сетку и перемычки как предварительные позиции", () => {
      const result = calc({
        inputMode: 0,
        wallLength: 10,
        wallHeight: 2.7,
        openingsArea: 5,
        brickFormat: 0,
        wallThickness: 1,
        mortarJoint: 10,
      });

      expect(findMaterial(result, "Кирпич одинарный")?.subtitle).toContain("Базовые 5%");
      expect(findMaterial(result, "Поддоны")?.subtitle).toContain("480 шт. на поддоне");
      expect(findMaterial(result, "Раствор кладочный")?.subtitle).toContain("Поле шва не изменяет");
      expect(findMaterial(result, "Кладочная сетка")?.subtitle).toContain("не готовая ведомость");
      expect(findMaterial(result, "Железобетонные перемычки")?.subtitle).toContain("один проём на каждые 2 м²");
      expect(result.practicalNotes?.some((note) => note.includes("допущения текущей модели"))).toBe(true);
    });

    it("не обещает армопояс без проектной проверки", () => {
      const result = calc({
        inputMode: 0,
        wallLength: 10,
        wallHeight: 4,
        openingsArea: 0,
        brickFormat: 0,
        wallThickness: 2,
        mortarJoint: 10,
      });

      expect(result.warnings.some((warning) => warning.includes("проверьте по проекту"))).toBe(true);
      expect(result.practicalNotes?.some((note) => note.includes("требует проектной проверки"))).toBe(true);
      expect([...result.warnings, ...(result.practicalNotes ?? [])].join(" ")).not.toContain("армопояс по верху обязателен");
    });
  });

  describe("Одинарный кирпич, в кирпич (250 мм), 10×2.7 м, проёмы 5 м²", () => {
    // netArea = 22 м²
    // bricksPerSqm = 102 (одинарный, в кирпич, шов 10мм)
    // totalBricks = 22 × 102 = 2244
    // bricksWithReserve = ceil(2244 × 1.05) = 2357
    const result = calc({
      inputMode: 0,
      wallLength: 10,
      wallHeight: 2.7,
      openingsArea: 5,
      brickFormat: 0,
      wallThickness: 1,
      mortarJoint: 10,
    });

    it("кирпич ≈ 2499 шт (с запасом + REC ×1.06)", () => {
      const bricks = findMaterial(result, "Кирпич одинарный");
      expect(bricks).toBeDefined();
      // totalBricks=2244, ×1.05=2357 (withReserve), ×1.06(REC)=2498.42 → ceil=2499
      expect(bricks!.purchaseQty).toBe(2499);
    });

    it("поддоны кирпича", () => {
      const pallets = findMaterial(result, "Поддоны");
      expect(pallets).toBeDefined();
      // 2357 / 480 = 4.91 → 5 поддонов
      expect(pallets!.purchaseQty).toBe(5);
    });

    it("раствор кладочный", () => {
      expect(findMaterial(result, "Раствор кладочный")).toBeDefined();
    });

    it("кладочная сетка", () => {
      expect(findMaterial(result, "Кладочная сетка")).toBeDefined();
    });

    it("перемычки", () => {
      expect(findMaterial(result, "Железобетонные перемычки")).toBeDefined();
    });

    it("totals", () => {
      expect(result.totals.netArea).toBe(22);
      expect(result.totals.bricksWithReserve).toBe(2357);
    });

    it("инварианты", () => {
      checkInvariants(result);
    });
  });

  describe("Полуторный кирпич, в полкирпича", () => {
    const result = calc({
      inputMode: 1,
      area: 15,
      openingsArea: 2,
      brickFormat: 1,
      wallThickness: 0,
      mortarJoint: 10,
    });

    it("полуторный кирпич", () => {
      const bricks = findMaterial(result, "полуторный");
      expect(bricks).toBeDefined();
      // netArea = 13, 13 × 39 = 507, × 1.05 = 533, × 1.06(REC) = 564.98 → ceil = 565
      expect(bricks!.purchaseQty).toBe(565);
    });

    it("предупреждение о проектной проверке тонкой стены", () => {
      expect(result.warnings.some((w) => w.includes("несущую способность") && w.includes("по проекту"))).toBe(true);
    });

    it("инварианты", () => {
      checkInvariants(result);
    });
  });

  describe("Двойной кирпич, в 1.5 кирпича", () => {
    const result = calc({
      inputMode: 0,
      wallLength: 8,
      wallHeight: 3,
      openingsArea: 4,
      brickFormat: 2,
      wallThickness: 2,
      mortarJoint: 12,
    });

    it("двойной кирпич рассчитан", () => {
      const bricks = findMaterial(result, "двойной");
      expect(bricks).toBeDefined();
      expect(bricks!.purchaseQty).toBeGreaterThan(0);
    });

    it("инварианты", () => {
      checkInvariants(result);
    });
  });

  describe("Без проёмов → перемычек 0 шт", () => {
    const result = calc({
      inputMode: 0,
      wallLength: 5,
      wallHeight: 2.7,
      openingsArea: 0,
      brickFormat: 0,
      wallThickness: 1,
      mortarJoint: 10,
    });

    it("перемычек 0 шт", () => {
      const lintels = findMaterial(result, "Железобетонные перемычки");
      expect(lintels).toBeDefined();
      expect(lintels!.purchaseQty).toBe(0);
    });
  });
});
