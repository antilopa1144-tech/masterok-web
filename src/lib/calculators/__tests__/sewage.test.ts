import { describe, it, expect } from "vitest";
import { sewageDef } from "../formulas/sewage";
import { findMaterial, checkInvariants, withBasicAccuracy } from "./_helpers";

const calc = withBasicAccuracy(sewageDef.calculate.bind(sewageDef));

describe("Калькулятор септика", () => {
  describe("4 человека, бетонные кольца, 2 камеры, песок", () => {
    const result = calc({
      residents: 4,
      septikType: 0,
      chambersCount: 2,
      pipeLength: 10,
      groundType: 0,
    });

    it("объём септика = 2.4 м³", () => {
      expect(result.totals.totalVolume).toBeCloseTo(2.4, 2);
    });

    it("4 бетонных кольца (2 камеры × 2 кольца)", () => {
      // Engine: "Кольца ЖБ КС 10-9"
      const rings = findMaterial(result, "КС 10-9");
      expect(rings).toBeDefined();
      expect(rings!.quantity).toBe(4);
    });

    it("2 днища ПН-10", () => {
      // Engine: "Днища ПН-10"
      const bottoms = findMaterial(result, "ПН-10");
      expect(bottoms).toBeDefined();
      expect(bottoms!.quantity).toBe(2);
    });

    it("2 плиты перекрытия ПП-10", () => {
      // Engine: "Плиты перекрытия ПП-10"
      const lids = findMaterial(result, "ПП-10");
      expect(lids).toBeDefined();
      expect(lids!.quantity).toBe(2);
    });

    it("2 люка чугунных", () => {
      // Engine: "Люки чугунные"
      const manholes = findMaterial(result, "Люки чугунные");
      expect(manholes).toBeDefined();
      expect(manholes!.quantity).toBe(2);
    });

    it("4 уплотнительных кольца", () => {
      // Engine: "Кольца уплотнительные"
      const seals = findMaterial(result, "уплотнительн");
      expect(seals).toBeDefined();
      expect(seals!.quantity).toBe(4);
    });

    it("трубы ПВХ ø110 присутствуют", () => {
      // Engine: "Труба ПВХ ø110 (секции 3 м)"
      const pipes = findMaterial(result, "ø110");
      expect(pipes).toBeDefined();
      // 10 * 1.05 / 3 = 3.5 → ceil = 4
      expect(pipes!.quantity).toBe(4);
    });

    it("отводы (колена) = 3 шт", () => {
      // Engine: "Отводы (колена)"
      const elbows = findMaterial(result, "Отводы");
      expect(elbows).toBeDefined();
      expect(elbows!.quantity).toBe(3);
    });

    it("тройники = 2 шт", () => {
      // Engine: "Тройники"
      const tees = findMaterial(result, "Тройники");
      expect(tees).toBeDefined();
      expect(tees!.quantity).toBe(2);
    });

    it("нет щебня для песчаного грунта", () => {
      const gravel = findMaterial(result, "Щебень");
      expect(gravel).toBeUndefined();
    });

    it("инварианты", () => {
      checkInvariants(result);
    });
  });

  describe("Пластиковый септик", () => {
    const result = calc({
      residents: 4,
      septikType: 1,
      chambersCount: 2,
      pipeLength: 8,
      groundType: 0,
    });

    it("1 пластиковый септик", () => {
      // Engine: "Септик пластиковый"
      const septik = findMaterial(result, "Септик пластиковый");
      expect(septik).toBeDefined();
      expect(septik!.quantity).toBe(1);
    });

    it("песок для обсыпки присутствует", () => {
      // Engine: "Песок для обсыпки"
      const sand = findMaterial(result, "Песок");
      expect(sand).toBeDefined();
    });

    it("нет бетонных колец", () => {
      const rings = findMaterial(result, "КС 10-9");
      expect(rings).toBeUndefined();
    });

    it("инварианты", () => {
      checkInvariants(result);
    });
  });

  describe("Еврокубы", () => {
    const result = calc({
      residents: 4,
      septikType: 2,
      chambersCount: 2,
      pipeLength: 10,
      groundType: 0,
    });

    it("еврокубов = 3 шт", () => {
      // Engine: "Еврокубы", eurocubes=ceil(2.4/0.8)=3
      const cubes = findMaterial(result, "Еврокуб");
      expect(cubes).toBeDefined();
      expect(cubes!.quantity).toBe(3);
    });

    it("инварианты", () => {
      checkInvariants(result);
    });
  });

  describe("Глинистый грунт → предупреждение + щебень", () => {
    const result = calc({
      residents: 4,
      septikType: 0,
      chambersCount: 2,
      pipeLength: 10,
      groundType: 2,
    });

    it("предупреждение о глинистом грунте", () => {
      // Engine: "Глинистый грунт — рекомендуется дренажный тоннель"
      expect(result.warnings.some((w) => w.includes("Глинистый грунт"))).toBe(true);
    });

    it("щебень = 4 м³ для глины", () => {
      // Engine: "Щебень фракция 20-40"
      const gravel = findMaterial(result, "Щебень");
      expect(gravel).toBeDefined();
      expect(gravel!.quantity).toBe(4);
    });

    it("геотекстиль присутствует", () => {
      // Engine: "Геотекстиль"
      const geo = findMaterial(result, "Геотекстиль");
      expect(geo).toBeDefined();
    });

    it("инварианты", () => {
      checkInvariants(result);
    });
  });

  describe("Однокамерный → предупреждение", () => {
    const result = calc({
      residents: 4,
      septikType: 0,
      chambersCount: 1,
      pipeLength: 10,
      groundType: 0,
    });

    it("предупреждение о минимуме камер", () => {
      // Engine: "Одна камера — минимум, рекомендуется 2-3 камеры"
      expect(result.warnings.some((w) => w.includes("Одна камера"))).toBe(true);
    });

    it("кольца для 1 камеры", () => {
      const rings = findMaterial(result, "КС 10-9");
      expect(rings).toBeDefined();
      // totalVolume=2.4 / 1 = 2.4, ceil(2.4/0.71) = 4 rings
      expect(rings!.quantity).toBe(4);
    });

    it("инварианты", () => {
      checkInvariants(result);
    });
  });

  describe("> 10 человек → предупреждение о биоочистке", () => {
    const result = calc({
      residents: 12,
      septikType: 0,
      chambersCount: 3,
      pipeLength: 15,
      groundType: 0,
    });

    it("предупреждение о биологической очистке", () => {
      // Engine: "Более 10 жителей — рекомендуется станция биологической очистки"
      expect(result.warnings.some((w) => w.includes("биологической очистки"))).toBe(true);
    });

    it("объём = 12 * 0.2 * 3 = 7.2 м³", () => {
      expect(result.totals.totalVolume).toBeCloseTo(7.2, 2);
    });

    it("инварианты", () => {
      checkInvariants(result);
    });
  });
});
