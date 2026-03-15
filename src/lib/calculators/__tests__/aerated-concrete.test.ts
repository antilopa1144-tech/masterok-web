import { describe, it, expect } from "vitest";
import { aeratedConcreteDef } from "../formulas/aerated-concrete";
import { findMaterial, checkInvariants } from "./_helpers";

const calc = aeratedConcreteDef.calculate.bind(aeratedConcreteDef);

describe("Калькулятор газобетона", () => {
  describe("По размерам: 10×2.7 м, проёмы 5 м², блок 200×200×600, толщина 200 мм", () => {
    // wallArea = 27, netArea = 22
    // blockFaceArea = 0.2*0.6 = 0.12, blocksPerSqm = 8.333
    // blocksNet = 22 * 8.333 = 183.33
    // blocksWithReserve = ceil(183.33 * 1.05) = ceil(192.5) = 193
    // volume = 22 * 0.2 = 4.4, glueKg = 4.4*28 = 123.2, glueBags = ceil(123.2/25) = 5
    const result = calc({
      inputMode: 0,
      wallWidth: 10,
      wallHeight: 2.7,
      openingsArea: 5,
      blockThickness: 200,
      blockHeight: 200,
      blockLength: 600,
    });

    it("площадь стены = 27 м²", () => {
      expect(result.totals.wallArea).toBeCloseTo(27, 1);
    });

    it("чистая площадь = 22 м²", () => {
      expect(result.totals.netArea).toBeCloseTo(22, 1);
    });

    it("блоков газобетонных = 205 шт (REC ×1.06)", () => {
      const blocks = findMaterial(result, "Газоблок");
      // blocksWithReserve=193, REC multiplier=1.06 → 204.58 → ceil=205
      expect(blocks?.purchaseQty).toBe(205);
    });

    it("клей для газобетона 5 мешков", () => {
      const glue = findMaterial(result, "Клей для газобетона");
      expect(glue?.purchaseQty).toBe(5);
    });

    it("арматура Ø8 присутствует", () => {
      expect(findMaterial(result, "Ø8")).toBeDefined();
    });

    it("грунтовка присутствует", () => {
      expect(findMaterial(result, "Грунтовка")).toBeDefined();
    });

    it("U-блоки для перемычек присутствуют", () => {
      expect(findMaterial(result, "U-блок")).toBeDefined();
    });

    it("инварианты", () => {
      checkInvariants(result);
    });
  });

  describe("Предупреждения", () => {
    it("блок ≤ 150 мм → только перегородки", () => {
      const result = calc({
        inputMode: 0,
        wallWidth: 10,
        wallHeight: 2.7,
        openingsArea: 0,
        blockThickness: 100,
        blockHeight: 200,
        blockLength: 600,
      });
      expect(result.warnings.some((w) => w.includes("перегородок"))).toBe(true);
    });

    it("блок >= 300 мм → проверка теплоизоляции", () => {
      const result = calc({
        inputMode: 0,
        wallWidth: 10,
        wallHeight: 2.7,
        openingsArea: 0,
        blockThickness: 375,
        blockHeight: 200,
        blockLength: 600,
      });
      expect(result.warnings.some((w) => w.includes("теплоизоляцию"))).toBe(true);
    });
  });

  describe("По площади", () => {
    const result = calc({
      inputMode: 1,
      area: 22,
      openingsArea: 0,
      blockThickness: 200,
      blockHeight: 200,
      blockLength: 600,
    });

    it("netArea = 22, blocksNet ≈ 183.33", () => {
      expect(result.totals.blocksNet).toBeCloseTo(183.33, 1);
    });
  });
});
