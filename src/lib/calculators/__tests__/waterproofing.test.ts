import { describe, it, expect } from "vitest";
import { waterproofingDef } from "../formulas/waterproofing";
import { findMaterial, checkInvariants, withBasicAccuracy } from "./_helpers";

const calc = withBasicAccuracy(waterproofingDef.calculate.bind(waterproofingDef)) as (
  inputs: Record<string, any>,
) => ReturnType<typeof waterproofingDef.calculate>;

describe("Гидроизоляция", () => {
  it("описывает поисковый интент и типовой пример так же, как canonical-расчёт", () => {
    expect(waterproofingDef.metaTitle).toContain("расход мастики на м²");
    expect(waterproofingDef.metaDescription).toContain("количество вёдер к покупке");

    const consumptionFaq = waterproofingDef.seoContent?.faq?.find((item) =>
      item.question.includes("получается 16 кг"),
    );
    expect(consumptionFaq?.answer).toContain("16 кг");
    expect(consumptionFaq?.answer).toContain("двух вёдер, то есть 30 кг");
    expect(waterproofingDef.seoContent?.descriptionHtml).not.toContain("Цементная мастика (Ceresit CL 51)");
    expect(waterproofingDef.seoContent?.descriptionHtml).not.toContain("Пункт 4.11");
    expect(waterproofingDef.seoContent?.descriptionHtml).toContain("около 1,4 кг/м&sup2; суммарно за два слоя");
    expect(waterproofingDef.seoContent?.descriptionHtml).toContain("https://ceresit.ru/ru/products/waterproofing/waterproofing-materials/cl_51_combo");
    expect(waterproofingDef.seoContent?.descriptionHtml).toContain("https://protect.gost.ru/sp/details/a2711156-c40f-4d0f-89f1-7e3c366bc430");
    expect(waterproofingDef.seoContent?.descriptionHtml).toContain("https://protect.gost.ru/sp/details/ca915ed9-5bce-4de4-94af-debfd041a939");
  });

  it("показывает профили как коэффициенты, а не марки или химические типы", () => {
    const profileField = waterproofingDef.fields.find((field) => field.key === "masticType");
    const optionText = profileField?.options?.map((option) => option.label).join(" ") ?? "";

    expect(profileField?.label).toBe("Расчётный профиль мастики");
    expect(profileField?.hint).toContain("не марки и не химические типы");
    expect(optionText).not.toMatch(/Ceresit|жидкая резина|полимерная обмазочная/i);
  });

  describe("Расчётный профиль A (masticType=0)", () => {
    it("6 м² пол, 200 мм стены, периметр 10 м, 2 слоя", () => {
      const r = calc({ floorArea: 6, wallHeight: 200, roomPerimeter: 10, masticType: 0, layers: 2 });
      checkInvariants(r);
      // wallArea=10*0.2=2, totalArea=8
      // masticKg=8*1.0*2=16, buckets=ceil(16/15)=2
      expect(r.totals.totalArea).toBeCloseTo(8, 1);
      const mastic = findMaterial(r, "Расчётный профиль A");
      expect(mastic).toBeDefined();
      expect(mastic?.quantity).toBe(16);
      expect(mastic?.purchaseQty).toBe(30);
      expect(mastic?.subtitle).toContain("Это не паспорт продукта");
      expect(mastic?.subtitle).toContain("8 м² × 1 кг/м² × 2 сл.");
      expect(r.accuracyMode).toBe("basic");
      expect(r.warnings).toEqual(expect.arrayContaining([
        expect.stringContaining("только коэффициент 1 кг/м² за слой"),
        expect.stringContaining("предварительные независимые позиции"),
        expect.stringContaining("уже округлённому числу вёдер"),
      ]));
      expect(r.scenarios.MIN.exact_need).toBeLessThan(r.scenarios.REC.exact_need);
      expect(r.scenarios.REC.exact_need).toBeLessThan(r.scenarios.MAX.exact_need);
    });

    it("условная грунтовка профиля A", () => {
      const r = calc({ floorArea: 6, wallHeight: 200, roomPerimeter: 10, masticType: 0, layers: 2 });
      const primer = findMaterial(r, "Грунтовка (условная позиция");
      expect(primer).toBeDefined();
      expect(primer?.subtitle).toContain("0,15 кг/м²");
      expect(primer?.subtitle).toContain("совместимость системы");
    });
  });

  describe("Расчётный профиль B (masticType=1)", () => {
    it("расход 1.2 кг/м², ведро 20 кг", () => {
      const r = calc({ floorArea: 6, wallHeight: 200, roomPerimeter: 10, masticType: 1, layers: 2 });
      // totalArea=8, masticKg=8*1.2*2=19.2, buckets=ceil(19.2/20)=1
      const mastic = findMaterial(r, "Расчётный профиль B");
      expect(mastic).toBeDefined();
    });

    it("условный праймер профиля B", () => {
      const r = calc({ floorArea: 6, wallHeight: 200, roomPerimeter: 10, masticType: 1, layers: 2 });
      const primer = findMaterial(r, "Праймер (условная позиция");
      expect(primer).toBeDefined();
      expect(primer?.subtitle).toContain("0,30 л/м²");
      expect(primer?.subtitle).toContain("покупайте только");
    });
  });

  describe("Расчётный профиль C (masticType=2)", () => {
    it("расход 0.8 кг/м², ведро 15 кг", () => {
      const r = calc({ floorArea: 6, wallHeight: 200, roomPerimeter: 10, masticType: 2, layers: 2 });
      // totalArea=8, masticKg=8*0.8*2=12.8, buckets=ceil(12.8/15)=1
      const mastic = findMaterial(r, "Расчётный профиль C");
      expect(mastic).toBeDefined();
    });
  });

  describe("Высота обработки стен", () => {
    it("только пол — wallHeight=0", () => {
      const r = calc({ floorArea: 6, wallHeight: 0, roomPerimeter: 10, masticType: 0, layers: 2 });
      expect(r.totals.wallArea).toBeCloseTo(0, 1);
      expect(r.totals.totalArea).toBeCloseTo(6, 1);
      expect(r.warnings.some(w => w.includes("Стены не включены") && w.includes("проекту помещения"))).toBe(true);
      expect(r.warnings.every(w => !w.includes("обязательна минимум"))).toBe(true);
    });
  });

  describe("Количество слоёв", () => {
    it("1 слой → предупреждение о границе техкарты", () => {
      const r = calc({ floorArea: 6, wallHeight: 200, roomPerimeter: 10, masticType: 0, layers: 1 });
      expect(r.warnings.some(w => w.includes("множитель ×1 слой") && w.includes("техкарта"))).toBe(true);
      expect(r.warnings.every(w => !w.includes("нежилых помещений"))).toBe(true);
    });
  });

  describe("Сопутствующие материалы", () => {
    it("лента гидроизоляционная", () => {
      const r = calc({ floorArea: 6, wallHeight: 200, roomPerimeter: 10, masticType: 0, layers: 2 });
      const systemTape = findMaterial(r, "Гидроизоляционная лента (условная позиция");
      expect(systemTape?.quantity).toBeCloseTo(24.2, 3);
      expect(systemTape?.purchaseQty).toBe(30);
      expect(systemTape?.subtitle).toContain("периметр × 1,2");
      expect(systemTape?.subtitle).toContain("Реальные углы, швы и манжеты не измерены");
    });

    it("силиконовый герметик", () => {
      const r = calc({ floorArea: 6, wallHeight: 200, roomPerimeter: 10, masticType: 0, layers: 2 });
      // Engine: "Силиконовый герметик"
      const sealant = findMaterial(r, "Силиконовый герметик (условная позиция");
      expect(sealant).toBeDefined();
      expect(sealant?.name).toContain("280–310 мл");
    });

    it("герметик для стыков", () => {
      const r = calc({ floorArea: 6, wallHeight: 200, roomPerimeter: 10, masticType: 0, layers: 2 });
      const joint = findMaterial(r, "Герметик для примыканий (условная позиция");
      expect(joint).toBeDefined();
      expect(joint?.subtitle).toContain("× 0,5 / 10");
    });
  });

  describe("Условные надбавки на трубы и дополнительные узлы", () => {
    // Базовый кейс: 6 м² + 0.2 м стены, totalArea=8, masticKg = 8*1.0*2 = 16
    const noPenetrations = calc({ floorArea: 6, wallHeight: 200, roomPerimeter: 10, masticType: 0, layers: 2 });

    // С 4 примыканиями: +4 кг → masticKg = 20, buckets = ceil(20/15) = 2 (граница)
    const fourPipes = calc({ floorArea: 6, wallHeight: 200, roomPerimeter: 10, masticType: 0, layers: 2, pipePenetrations: 4 });

    // С 1 инсталляцией: +1.5 кг → masticKg = 17.5, buckets = ceil(17.5/15) = 2
    const withInset = calc({ floorArea: 6, wallHeight: 200, roomPerimeter: 10, masticType: 0, layers: 2, insetCount: 1 });

    // Полный санузел: 4 трубы + 1 инсталляция → +5.5 кг доп. мастики
    const fullRoom = calc({ floorArea: 6, wallHeight: 200, roomPerimeter: 10, masticType: 0, layers: 2, pipePenetrations: 4, insetCount: 1 });

    it("без примыканий: предупреждение без выдуманного процента", () => {
      const hasReminder = noPenetrations.warnings.some((w) =>
        w.includes("фиксированные надбавки не применены") && w.includes("не добавляет типовые 3–5 узлов"),
      );
      expect(hasReminder).toBe(true);
      expect(noPenetrations.warnings.every((w) => !w.includes("15-25%"))).toBe(true);
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
        n.includes("4 труб") && n.includes("1 дополнительных узлов") && n.includes("фиксированные надбавки"),
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

  it("явно сохраняет отличие базового примера от дефолтного реалистичного режима", () => {
    const realistic = waterproofingDef.calculate({
      floorArea: 6,
      wallHeight: 200,
      roomPerimeter: 10,
      masticType: 0,
      layers: 2,
      accuracyMode: "realistic",
    });
    const mastic = findMaterial(realistic, "Расчётный профиль A");

    expect(realistic.accuracyMode).toBe("realistic");
    expect(mastic?.quantity).toBeCloseTo(19.281, 3);
    expect(mastic?.purchaseQty).toBe(30);
    expect(mastic?.subtitle).toContain("19,281 кг");
  });
});
