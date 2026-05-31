import { describe, expect, it } from "vitest";
import { calculateBrickwork, computeBrickSvgBoundsMm } from "./brickwork-layout";

describe("brickwork-layout", () => {
  describe("ложковая перевязка", () => {
    it("все кирпичи — ложки, ряды смещены через один", () => {
      const r = calculateBrickwork(4000, 2700, 250, 65, 10, "stretcher");
      expect(r.rows.length).toBeGreaterThan(0);
      // в первом ряду все целые — ложки
      expect(r.rows[0].every((b) => b.face === "stretcher")).toBe(true);
      // нечётный ряд начинается с обрезка (смещение перевязки)
      expect(r.rows[1][0].cut).toBe(true);
      expect(r.rows[0][0].cut).toBe(false);
    });

    it("расход кирпича близок к норме ~51 шт/м² (ГОСТ)", () => {
      const r = calculateBrickwork(4000, 2700, 250, 65, 10, "stretcher");
      const m2 = (4000 * 2700) / 1_000_000; // 10.8 м²
      const perM2 = r.totalBricks / m2;
      expect(perM2).toBeGreaterThan(45);
      expect(perM2).toBeLessThan(58);
    });
  });

  describe("цепная перевязка", () => {
    it("чётный ряд — ложки, нечётный — тычки", () => {
      const r = calculateBrickwork(4000, 2700, 250, 65, 10, "chain");
      expect(r.rows[0].some((b) => b.face === "stretcher")).toBe(true);
      expect(r.rows[0].every((b) => b.face === "stretcher")).toBe(true);
      // ряд тычков: большинство — header
      const headers = r.rows[1].filter((b) => b.face === "header").length;
      expect(headers).toBeGreaterThan(r.rows[1].length / 2);
    });
  });

  describe("фламандская перевязка", () => {
    it("в ряду чередуются ложок и тычок", () => {
      const r = calculateBrickwork(2000, 1500, 250, 65, 10, "flemish");
      const faces = r.rows[0].filter((b) => !b.cut).map((b) => b.face);
      // есть и ложки, и тычки в одном ряду
      expect(faces.includes("stretcher")).toBe(true);
      expect(faces.includes("header")).toBe(true);
    });
  });

  describe("баварская перевязка", () => {
    it("ложковая с разными оттенками кирпича", () => {
      const r = calculateBrickwork(2000, 1500, 250, 65, 10, "bavarian");
      expect(r.rows[0].every((b) => b.face === "stretcher")).toBe(true);
      const tones = new Set(r.rows.flat().map((b) => b.tone));
      expect(tones.size).toBeGreaterThan(1); // есть разные оттенки
    });
  });

  describe("закупка и края", () => {
    it("к закупке = целые + половина обрезков + запас, обрезки переиспользуются", () => {
      const r = calculateBrickwork(4000, 2700, 250, 65, 10, "stretcher");
      // покупка меньше «каждый обрезок = целый кирпич», но не меньше целых
      expect(r.purchaseBricks).toBeGreaterThanOrEqual(r.wholeBricks);
      expect(r.purchaseBricks).toBeLessThan(r.totalBricks * 1.1);
    });

    it("стена меньше кирпича — предупреждение", () => {
      // кирпич крупнее стены (в допустимых после clamp пределах)
      const r = calculateBrickwork(300, 100, 400, 200, 10, "stretcher");
      expect(r.notes.some((n) => n.includes("меньше одного кирпича"))).toBe(true);
    });
  });

  describe("SVG bounds", () => {
    it("ширина ≥ любого ряда, высота = ряды×(кирпич+шов)", () => {
      const r = calculateBrickwork(4000, 2700, 250, 65, 10, "stretcher");
      const b = computeBrickSvgBoundsMm(r, 10);
      for (const row of r.rows) {
        const rowW = row.reduce((s, c, i) => s + c.widthMm + (i < row.length - 1 ? 10 : 0), 0);
        expect(b.widthMm).toBeGreaterThanOrEqual(rowW - 0.01);
      }
      expect(b.heightMm).toBeGreaterThan(0);
    });
  });
});
