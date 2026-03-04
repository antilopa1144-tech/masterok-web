import { describe, it, expect } from "vitest";
import { drywallCeilingDef } from "../formulas/drywall-ceiling";
import { findMaterial, checkInvariants } from "./_helpers";

const calc = drywallCeilingDef.calculate.bind(drywallCeilingDef);

describe("Подвесной потолок из ГКЛ", () => {
  describe("Потолок 5×4 м, 1 слой, шаг 600", () => {
    const r = calc({
      inputMode: 0,
      length: 5,
      width: 4,
      layers: 1,
      profileStep: 600,
    });

    it("ГКЛ: ceil(20/3×1.10) = 8 листов", () => {
      const gkl = findMaterial(r, "ГКЛ")!;
      expect(gkl.purchaseQty).toBe(8);
    });

    it("ПП 60×27: 20 шт (3 м)", () => {
      // mainRows=ceil(4/0.6)=7, mainM=7×5=35
      // crossRows=ceil(5/1.2)=5, crossM=5×4=20
      // total=(35+20)×1.05=57.75 → ceil(57.75/3)=20
      const pp = findMaterial(r, "ПП 60×27")!;
      expect(pp.purchaseQty).toBe(20);
    });

    it("ПН 27×28: 7 шт (3 м)", () => {
      // pnMeters=2×(5+4)×1.05=18.9 → ceil(18.9/3)=7
      const pn = findMaterial(r, "ПН 27×28")!;
      expect(pn.purchaseQty).toBe(7);
    });

    it("Подвесы: 56 шт", () => {
      // mainRows=7, ceil(5/0.7)=8, 7×8=56
      const susp = findMaterial(r, "Подвес")!;
      expect(susp.purchaseQty).toBe(56);
    });

    it("Крабы: 35 шт", () => {
      // mainRows=7 × crossRows=5 = 35
      const crab = findMaterial(r, "Краб")!;
      expect(crab.purchaseQty).toBe(35);
    });

    it("Саморезы ГКЛ: 0.2 кг", () => {
      // 8×23=184, ceil(184×1.05/1000×10)/10 = ceil(1.932)/10 = 0.2
      const screws = findMaterial(r, "Саморезы для ГКЛ")!;
      expect(screws.withReserve).toBe(0.2);
    });

    it("Саморезы-клопы: 252 шт", () => {
      // 56×2 + 35×4 = 112+140 = 252
      const clop = findMaterial(r, "клопы")!;
      expect(clop.purchaseQty).toBe(252);
    });

    it("Дюбель-гвозди: 150 шт", () => {
      // 56×2 + ceil(18.9/0.5) = 112+38 = 150
      const dowels = findMaterial(r, "Дюбель")!;
      expect(dowels.purchaseQty).toBe(150);
    });

    it("Серпянка: 1 рулон (45 м)", () => {
      // ceil(20×1.2×1.1)=27 м → ceil(27/45)=1
      const serp = findMaterial(r, "Серпянка")!;
      expect(serp.purchaseQty).toBe(1);
    });

    it("Шпаклёвка Knauf Фуген: 1 мешок (25 кг)", () => {
      // ceil(27×0.25)=7 кг → ceil(7/25)=1
      const putty = findMaterial(r, "Фуген")!;
      expect(putty.purchaseQty).toBe(1);
    });

    it("Грунтовка: 1 канистра (10 л)", () => {
      // 20×0.15=3.0 л → ceil(3.0×1.15/10)=1
      const primer = findMaterial(r, "Грунтовка")!;
      expect(primer.purchaseQty).toBe(1);
    });

    it("totals содержат area, sheets, ppPieces, suspCount, crabCount", () => {
      expect(r.totals.area).toBe(20);
      expect(r.totals.sheets).toBe(8);
      expect(r.totals.ppPieces).toBe(20);
      expect(r.totals.suspCount).toBe(56);
      expect(r.totals.crabCount).toBe(35);
    });

    it("инварианты: materials не пустые, purchaseQty > 0", () => {
      checkInvariants(r);
    });
  });

  describe("2 слоя — предупреждение о смещении", () => {
    it("warnings содержит текст о смещении стыков", () => {
      const r = calc({
        inputMode: 0,
        length: 5,
        width: 4,
        layers: 2,
        profileStep: 600,
      });
      expect(r.warnings.some((w) => w.includes("смещением стыков"))).toBe(
        true,
      );
    });

    it("листов в 2 раза больше чем при 1 слое", () => {
      const r1 = calc({
        inputMode: 0,
        length: 5,
        width: 4,
        layers: 1,
        profileStep: 600,
      });
      const r2 = calc({
        inputMode: 0,
        length: 5,
        width: 4,
        layers: 2,
        profileStep: 600,
      });
      const gkl1 = findMaterial(r1, "ГКЛ")!;
      const gkl2 = findMaterial(r2, "ГКЛ")!;
      // 1 слой: ceil(20/3×1.1)=8, 2 слоя: ceil(40/3×1.1)=ceil(14.667)=15
      expect(gkl1.purchaseQty).toBe(8);
      expect(gkl2.purchaseQty).toBe(15);
    });
  });

  describe("Шаг 400 мм — больше профилей", () => {
    it("ПП 60×27 при шаге 400 > чем при шаге 600", () => {
      const r600 = calc({
        inputMode: 0,
        length: 5,
        width: 4,
        layers: 1,
        profileStep: 600,
      });
      const r400 = calc({
        inputMode: 0,
        length: 5,
        width: 4,
        layers: 1,
        profileStep: 400,
      });
      const pp600 = findMaterial(r600, "ПП 60×27")!;
      const pp400 = findMaterial(r400, "ПП 60×27")!;
      // step 600: 20 шт, step 400: ceil((50+20)×1.05/3)=ceil(24.5)=25
      expect(pp600.purchaseQty).toBe(20);
      expect(pp400.purchaseQty).toBe(25);
      expect(pp400.purchaseQty).toBeGreaterThan(pp600.purchaseQty);
    });

    it("больше подвесов при шаге 400", () => {
      const r600 = calc({
        inputMode: 0,
        length: 5,
        width: 4,
        layers: 1,
        profileStep: 600,
      });
      const r400 = calc({
        inputMode: 0,
        length: 5,
        width: 4,
        layers: 1,
        profileStep: 400,
      });
      const susp600 = findMaterial(r600, "Подвес")!;
      const susp400 = findMaterial(r400, "Подвес")!;
      // step 600: 7×8=56, step 400: 10×8=80
      expect(susp600.purchaseQty).toBe(56);
      expect(susp400.purchaseQty).toBe(80);
    });

    it("больше крабов при шаге 400", () => {
      const r400 = calc({
        inputMode: 0,
        length: 5,
        width: 4,
        layers: 1,
        profileStep: 400,
      });
      const crab = findMaterial(r400, "Краб")!;
      // mainRows=10, crossRows=5 → 50
      expect(crab.purchaseQty).toBe(50);
    });
  });

  describe("По площади (inputMode=1)", () => {
    it("area=20 → length=width=sqrt(20), sheets=8", () => {
      const r = calc({
        inputMode: 1,
        area: 20,
        layers: 1,
        profileStep: 600,
      });
      checkInvariants(r);
      const gkl = findMaterial(r, "ГКЛ")!;
      // area=20, ceil(20/3×1.1)=8
      expect(gkl.purchaseQty).toBe(8);
      expect(r.totals.area).toBeCloseTo(20, 5);
    });

    it("area > 50 → предупреждение о деформационных швах", () => {
      const r = calc({
        inputMode: 1,
        area: 60,
        layers: 1,
        profileStep: 600,
      });
      expect(r.warnings.some((w) => w.includes("деформационных швов"))).toBe(
        true,
      );
    });
  });
});
