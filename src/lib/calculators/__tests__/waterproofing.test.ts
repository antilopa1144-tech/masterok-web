import { describe, it, expect } from "vitest";
import { waterproofingDef } from "../formulas/waterproofing";
import { findMaterial, checkInvariants, withBasicAccuracy } from "./_helpers";

const calc = withBasicAccuracy(waterproofingDef.calculate.bind(waterproofingDef));

describe("Гидроизоляция", () => {
  describe("Ceresit CL 51 (masticType=0, стандарт)", () => {
    it("6 м² пол, 200 мм стены, периметр 10 м, 2 слоя", () => {
      const r = calc({ floorArea: 6, wallHeight: 200, roomPerimeter: 10, masticType: 0, layers: 2 });
      checkInvariants(r);
      // wallArea=10*0.2=2, totalArea=8
      // masticKg=8*1.0*2=16, buckets=ceil(16/15)=2
      expect(r.totals.totalArea).toBeCloseTo(8, 1);
      // Engine: "Ceresit CL 51 (15 кг)"
      const mastic = findMaterial(r, "Ceresit");
      expect(mastic).toBeDefined();
    });

    it("грунтовка Ceresit для цементной мастики", () => {
      const r = calc({ floorArea: 6, wallHeight: 200, roomPerimeter: 10, masticType: 0, layers: 2 });
      // Engine: "Грунтовка Ceresit (2 кг)"
      const primer = findMaterial(r, "Грунтовка Ceresit");
      expect(primer).toBeDefined();
    });
  });

  describe("Жидкая резина (masticType=1)", () => {
    it("расход 1.2 кг/м², ведро 20 кг", () => {
      const r = calc({ floorArea: 6, wallHeight: 200, roomPerimeter: 10, masticType: 1, layers: 2 });
      // totalArea=8, masticKg=8*1.2*2=19.2, buckets=ceil(19.2/20)=1
      // Engine: "Жидкая резина (20 кг)"
      const mastic = findMaterial(r, "Жидкая резина");
      expect(mastic).toBeDefined();
    });

    it("битумный праймер для жидкой резины", () => {
      const r = calc({ floorArea: 6, wallHeight: 200, roomPerimeter: 10, masticType: 1, layers: 2 });
      // Engine: "Битумный праймер (20 л)"
      const primer = findMaterial(r, "Битумный праймер");
      expect(primer).toBeDefined();
    });
  });

  describe("Полимерная мастика (masticType=2)", () => {
    it("расход 0.8 кг/м², ведро 15 кг", () => {
      const r = calc({ floorArea: 6, wallHeight: 200, roomPerimeter: 10, masticType: 2, layers: 2 });
      // totalArea=8, masticKg=8*0.8*2=12.8, buckets=ceil(12.8/15)=1
      // Engine: "Полимерная мастика (15 кг)"
      const mastic = findMaterial(r, "Полимерная мастика");
      expect(mastic).toBeDefined();
    });
  });

  describe("Высота обработки стен", () => {
    it("только пол — wallHeight=0", () => {
      const r = calc({ floorArea: 6, wallHeight: 0, roomPerimeter: 10, masticType: 0, layers: 2 });
      expect(r.totals.wallArea).toBeCloseTo(0, 1);
      expect(r.totals.totalArea).toBeCloseTo(6, 1);
      // Engine: "Обработка стен обязательна минимум на 200 мм от пола"
      expect(r.warnings.some(w => w.includes("200 мм"))).toBe(true);
    });
  });

  describe("Количество слоёв", () => {
    it("1 слой → предупреждение о нежилых помещениях", () => {
      const r = calc({ floorArea: 6, wallHeight: 200, roomPerimeter: 10, masticType: 0, layers: 1 });
      // Engine: "Один слой допускается только для нежилых помещений"
      expect(r.warnings.some(w => w.includes("нежилых"))).toBe(true);
    });
  });

  describe("Сопутствующие материалы", () => {
    it("лента гидроизоляционная", () => {
      const r = calc({ floorArea: 6, wallHeight: 200, roomPerimeter: 10, masticType: 0, layers: 2 });
      // Engine: "Лента гидроизоляционная (10 м)"
      const tape = findMaterial(r, "Лента гидроизоляционная");
      expect(tape).toBeDefined();
    });

    it("силиконовый герметик", () => {
      const r = calc({ floorArea: 6, wallHeight: 200, roomPerimeter: 10, masticType: 0, layers: 2 });
      // Engine: "Силиконовый герметик"
      const sealant = findMaterial(r, "Силиконовый герметик");
      expect(sealant).toBeDefined();
    });

    it("герметик для стыков", () => {
      const r = calc({ floorArea: 6, wallHeight: 200, roomPerimeter: 10, masticType: 0, layers: 2 });
      // Engine: "Герметик для стыков"
      const joint = findMaterial(r, "Герметик для стыков");
      expect(joint).toBeDefined();
    });
  });
});
