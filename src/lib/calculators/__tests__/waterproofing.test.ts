import { describe, it, expect } from "vitest";
import { waterproofingDef } from "../formulas/waterproofing";
import { findMaterial, checkInvariants, withBasicAccuracy } from "./_helpers";

const calc = withBasicAccuracy(waterproofingDef.calculate.bind(waterproofingDef)) as (
  inputs: Record<string, any>,
) => ReturnType<typeof waterproofingDef.calculate>;

describe("Гидроизоляция", () => {
  describe("Ceresit CL 51 (masticType=0, стандарт)", () => {
    it("6 м² пол, 200 мм стены, периметр 10 м, 2 слоя", () => {
      const r = calc({ floorArea: 6, wallHeight: 200, roomPerimeter: 10, masticType: 0, layers: 2 });
      checkInvariants(r);
      // wallArea=10*0.2=2, totalArea=8
      // masticKg=8*1.0*2=16, buckets=ceil(16/15)=2
      expect(r.totals.totalArea).toBeCloseTo(8, 1);
      const mastic = findMaterial(r, "Готовая полимерная гидроизоляция");
      expect(mastic).toBeDefined();
      expect(mastic?.subtitle).toContain("внутренних мокрых зон");
    });

    it("грунтовка Ceresit для цементной мастики", () => {
      const r = calc({ floorArea: 6, wallHeight: 200, roomPerimeter: 10, masticType: 0, layers: 2 });
      const primer = findMaterial(r, "Грунтовка под полимерную гидроизоляцию");
      expect(primer).toBeDefined();
      expect(primer?.subtitle).toContain("той же системы");
    });
  });

  describe("Жидкая резина (masticType=1)", () => {
    it("расход 1.2 кг/м², ведро 20 кг", () => {
      const r = calc({ floorArea: 6, wallHeight: 200, roomPerimeter: 10, masticType: 1, layers: 2 });
      // totalArea=8, masticKg=8*1.2*2=19.2, buckets=ceil(19.2/20)=1
      const mastic = findMaterial(r, "Двухкомпонентная жидкая гидроизоляция");
      expect(mastic).toBeDefined();
    });

    it("битумный праймер для жидкой резины", () => {
      const r = calc({ floorArea: 6, wallHeight: 200, roomPerimeter: 10, masticType: 1, layers: 2 });
      const primer = findMaterial(r, "Праймер для выбранной гидроизоляции");
      expect(primer).toBeDefined();
      expect(primer?.subtitle).toContain("производителем");
    });
  });

  describe("Полимерная мастика (masticType=2)", () => {
    it("расход 0.8 кг/м², ведро 15 кг", () => {
      const r = calc({ floorArea: 6, wallHeight: 200, roomPerimeter: 10, masticType: 2, layers: 2 });
      // totalArea=8, masticKg=8*0.8*2=12.8, buckets=ceil(12.8/15)=1
      // Engine: "Полимерная мастика (15 кг)"
      const mastic = findMaterial(r, "Полимерная обмазочная гидроизоляция");
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
      const systemTape = findMaterial(r, "Системная эластичная гидроизоляционная лента");
      expect(systemTape?.subtitle).toContain("совместим");
    });

    it("силиконовый герметик", () => {
      const r = calc({ floorArea: 6, wallHeight: 200, roomPerimeter: 10, masticType: 0, layers: 2 });
      // Engine: "Силиконовый герметик"
      const sealant = findMaterial(r, "Санитарный нейтральный силиконовый герметик");
      expect(sealant).toBeDefined();
      expect(sealant?.name).toContain("280–310 мл");
    });

    it("герметик для стыков", () => {
      const r = calc({ floorArea: 6, wallHeight: 200, roomPerimeter: 10, masticType: 0, layers: 2 });
      // Engine: "Герметик для стыков"
      const joint = findMaterial(r, "Эластичный герметик для примыканий");
      expect(joint).toBeDefined();
    });
  });

  describe("Примыкания труб и инсталляции (СП 71.13330.2017)", () => {
    // Базовый кейс: 6 м² + 0.2 м стены, totalArea=8, masticKg = 8*1.0*2 = 16
    const noPenetrations = calc({ floorArea: 6, wallHeight: 200, roomPerimeter: 10, masticType: 0, layers: 2 });

    // С 4 примыканиями: +4 кг → masticKg = 20, buckets = ceil(20/15) = 2 (граница)
    const fourPipes = calc({ floorArea: 6, wallHeight: 200, roomPerimeter: 10, masticType: 0, layers: 2, pipePenetrations: 4 });

    // С 1 инсталляцией: +1.5 кг → masticKg = 17.5, buckets = ceil(17.5/15) = 2
    const withInset = calc({ floorArea: 6, wallHeight: 200, roomPerimeter: 10, masticType: 0, layers: 2, insetCount: 1 });

    // Полный санузел: 4 трубы + 1 инсталляция → +5.5 кг доп. мастики
    const fullRoom = calc({ floorArea: 6, wallHeight: 200, roomPerimeter: 10, masticType: 0, layers: 2, pipePenetrations: 4, insetCount: 1 });

    it("без примыканий: warning о недостаче 15-25%", () => {
      const hasReminder = noPenetrations.warnings.some((w) =>
        w.includes("примыкания") && w.includes("15-25"),
      );
      expect(hasReminder).toBe(true);
    });

    it("без примыканий: extraMasticKg = 0 (backward-compat)", () => {
      expect(noPenetrations.totals.extraMasticKg).toBe(0);
    });

    it("4 примыкания труб: extraMasticKg = 4.0", () => {
      expect(fourPipes.totals.extraMasticKg).toBeCloseTo(4.0, 1);
    });

    it("4 примыкания труб: penetrationTapeM = 2.0 (4 × 0.5 м манжеты)", () => {
      expect(fourPipes.totals.penetrationTapeM).toBeCloseTo(2.0, 1);
    });

    it("1 инсталляция: extraMasticKg = 1.5, penetrationTapeM = 2.0", () => {
      expect(withInset.totals.extraMasticKg).toBeCloseTo(1.5, 1);
      expect(withInset.totals.penetrationTapeM).toBeCloseTo(2.0, 1);
    });

    it("полный санузел (4 трубы + 1 инст): extraMasticKg = 5.5", () => {
      expect(fullRoom.totals.extraMasticKg).toBeCloseTo(5.5, 1);
    });

    it("полный санузел: больше мастики чем без примыканий", () => {
      const noPenMastic = noPenetrations.totals.masticKg as number;
      const fullMastic = fullRoom.totals.masticKg as number;
      expect(fullMastic).toBeGreaterThan(noPenMastic);
    });

    it("полный санузел: practicalNote упоминает примыкания", () => {
      const hasNote = fullRoom.practicalNotes?.some((n) =>
        n.includes("4 примыкан") && n.includes("1 инсталляц"),
      ) ?? false;
      expect(hasNote).toBe(true);
    });
  });

  describe("Класс кривизны пола", () => {
    const flat = calc({ floorArea: 6, wallHeight: 200, roomPerimeter: 10, masticType: 0, layers: 2, floorCurvatureClass: 0 });
    const medium = calc({ floorArea: 6, wallHeight: 200, roomPerimeter: 10, masticType: 0, layers: 2, floorCurvatureClass: 1 });
    const high = calc({ floorArea: 6, wallHeight: 200, roomPerimeter: 10, masticType: 0, layers: 2, floorCurvatureClass: 2 });

    it("класс 0 (ровный): множитель 1.0, backward-compat", () => {
      expect(flat.totals.curvatureMult).toBe(1.0);
      expect(flat.totals.masticKg).toBe(16);
    });

    it("класс 1 (средний): +10% мастики", () => {
      // 16 * 1.1 = 17.6
      expect(medium.totals.masticKg).toBeCloseTo(17.6, 1);
    });

    it("класс 2 (сильный): +20% мастики", () => {
      // 16 * 1.2 = 19.2
      expect(high.totals.masticKg).toBeCloseTo(19.2, 1);
    });

    it("монотонность: ровный < средний < сильный", () => {
      expect(flat.totals.masticKg).toBeLessThan(medium.totals.masticKg as number);
      expect(medium.totals.masticKg).toBeLessThan(high.totals.masticKg as number);
    });
  });
});
