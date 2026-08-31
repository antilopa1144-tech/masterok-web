import { describe, it, expect } from "vitest";
import { septicRingsDef } from "../formulas/septic-rings";
import { findMaterial, checkInvariants, withBasicAccuracy } from "./_helpers";

const calc = withBasicAccuracy(septicRingsDef.calculate.bind(septicRingsDef));

const baseInputs = {
  residents: 4,
  chambersCount: 3,
  ringDiameter: 1000,
  groundType: 1,
  withFilterWell: 1,
  pipeLengthFromHouse: 8,
};

describe("Калькулятор септика из ЖБИ-колец", () => {
  describe("Рабочий объём по ГОСТ Р 70818-2023", () => {
    it("считает default как max(3 × 0,8, 2,4) = 2,4 м³", () => {
      const result = calc(baseInputs);

      expect(result.totals.dailyVolumeLiters).toBe(800);
      expect(result.totals.totalVolumeLiters).toBe(2400);
      expect(result.totals.totalVolume).toBe(2.4);
      expect(result.totals.volumePerChamber).toBeCloseTo(0.8, 6);
    });

    it("не переключает семью из восьми человек на 2,5 суток", () => {
      const result = calc({ ...baseInputs, residents: 8 });

      expect(result.totals.totalVolumeLiters).toBe(4800);
      expect(result.totals.totalVolume).toBe(4.8);
      expect(result.totals.ringsPerChamber).toBe(3);
      expect(result.totals.totalRings).toBe(9);
    });

    it("сохраняет минимум 2,4 м³ для одного жителя", () => {
      const result = calc({
        ...baseInputs,
        residents: 1,
        chambersCount: 1,
        withFilterWell: 0,
      });

      expect(result.totals.totalVolume).toBe(2.4);
      expect(result.totals.ringsPerChamber).toBe(4);
      expect(result.totals.totalRings).toBe(4);
    });

    it("не применяет выдуманный минимум два кольца к каждой камере", () => {
      const result = calc({
        ...baseInputs,
        residents: 6,
        ringDiameter: 1500,
      });

      expect(result.totals.totalVolume).toBe(3.6);
      expect(result.totals.ringsPerChamber).toBe(1);
      expect(result.totals.totalRings).toBe(3);
      expect(findMaterial(result, "КС-15-9")).toBeDefined();
    });
  });

  describe("Фильтрующий колодец отделён от септика", () => {
    it("не уменьшает число герметичных камер, колец и днищ", () => {
      const withFilter = calc(baseInputs);
      const withoutFilter = calc({ ...baseInputs, withFilterWell: 0 });

      expect(withFilter.totals.sealedChambers).toBe(3);
      expect(withFilter.totals.bottomPlates).toBe(3);
      expect(withFilter.totals.totalRings).toBe(withoutFilter.totals.totalRings);
      expect(withFilter.totals.bottomPlates).toBe(withoutFilter.totals.bottomPlates);
      expect(withFilter.totals.totalVolume).toBe(withoutFilter.totals.totalVolume);
    });

    it("не превращает единственную герметичную камеру в фильтрующий колодец", () => {
      const result = calc({
        ...baseInputs,
        chambersCount: 1,
        withFilterWell: 1,
      });

      expect(result.totals.sealedChambers).toBe(1);
      expect(result.totals.bottomPlates).toBe(1);
      expect(result.totals.totalRings).toBe(4);
    });

    it("не назначает щебень и песок без фильтрационного расчёта", () => {
      const result = calc(baseInputs);

      expect(findMaterial(result, "Щебень")).toBeUndefined();
      expect(findMaterial(result, "Песок")).toBeUndefined();
      expect(result.totals.filterGravelM3).toBeUndefined();
      expect(result.totals.filterSandM3).toBeUndefined();
      expect(result.warnings.some((warning) => warning.includes("не рассчитаны"))).toBe(true);
    });

    it("усиливает предупреждение для глины", () => {
      const result = calc({ ...baseInputs, groundType: 2 });

      expect(result.warnings.some((warning) => warning.includes("глинистого грунта"))).toBe(true);
      expect(result.warnings.some((warning) => warning.includes("инженерно-геологические"))).toBe(true);
    });
  });

  describe("Предварительная ведомость без скрытых материалов", () => {
    const result = calc(baseInputs);

    it("показывает только кольца, днища, перекрытия и прямые отрезки трубы", () => {
      expect(result.materials).toHaveLength(4);
      expect(findMaterial(result, "геометрический минимум")).toBeDefined();
      expect(findMaterial(result, "Днище ПН-10")).toBeDefined();
      expect(findMaterial(result, "Плита перекрытия ПП-10")).toBeDefined();
      expect(findMaterial(result, "прямая трасса")).toBeDefined();
    });

    it("не добавляет мастику, рулонную гидроизоляцию, манжеты, горловины, люки и отводы", () => {
      const names = result.materials.map((material) => material.name).join(" ");

      expect(names).not.toContain("Мастика");
      expect(names).not.toContain("Гидростеклоизол");
      expect(names).not.toContain("манжет");
      expect(names).not.toContain("КС-7-9");
      expect(names).not.toContain("Люк");
      expect(names).not.toContain("Отводы");
    });

    it("считает прямую трубу без скрытого резерва 5%", () => {
      expect(result.totals.pipeWithReserveM).toBe(8);
      expect(result.totals.pipeSections).toBe(3);
      expect(findMaterial(result, "прямая трасса")?.purchaseQty).toBe(3);
    });

    it("сохраняет инварианты результата", () => {
      checkInvariants(result);
    });
  });

  describe("Границы и предупреждения", () => {
    it("объясняет, что три камеры при 0,8 м³/сут — выбранная проектная схема", () => {
      const result = calc(baseInputs);

      expect(result.warnings.some((warning) => warning.includes("однокамерный септик"))).toBe(true);
      expect(result.warnings.some((warning) => warning.includes("не рекомендация"))).toBe(true);
    });

    it("предупреждает о двух камерах при притоке от 1 до 10 м³/сут", () => {
      const result = calc({ ...baseInputs, residents: 6, chambersCount: 1 });

      expect(result.warnings.some((warning) => warning.includes("двухкамерный септик"))).toBe(true);
    });

    it("не требует колодец для выпуска ровно 12 м", () => {
      const result = calc({ ...baseInputs, pipeLengthFromHouse: 12 });

      expect(result.warnings.some((warning) => warning.includes("превышает 12 м"))).toBe(false);
    });

    it("требует дополнительный смотровой колодец после 12 м", () => {
      const result = calc({ ...baseInputs, pipeLengthFromHouse: 13 });

      expect(result.warnings.some((warning) => warning.includes("превышает 12 м"))).toBe(true);
      expect(result.warnings.some((warning) => warning.includes("дополнительные смотровые колодцы"))).toBe(true);
    });
  });

  describe("Сценарии и режим точности", () => {
    it("не меняет конструктивные элементы общими MIN/REC/MAX коэффициентами", () => {
      const result = calc(baseInputs);

      expect(result.scenarios?.MIN.exact_need).toBe(6);
      expect(result.scenarios?.REC.exact_need).toBe(6);
      expect(result.scenarios?.MAX.exact_need).toBe(6);
      expect(result.scenarios?.MIN.purchase_quantity).toBe(6);
      expect(result.scenarios?.MAX.leftover).toBe(0);
    });

    it("сбрасывает accuracy-множитель для числа колец", () => {
      const result = calc(baseInputs);

      expect(result.accuracyExplanation?.combinedMultiplier).toBe(1);
      expect(result.accuracyExplanation?.appliedModifiers).toEqual([]);
      expect(result.accuracyExplanation?.notes.join(" ")).toContain("не меняет число колец");
    });
  });

  describe("Пользовательский контракт и источники", () => {
    it("склоняет число камер и колец в карточке результата", () => {
      const oneChamber = calc({
        ...baseInputs,
        residents: 1,
        chambersCount: 1,
        withFilterWell: 0,
      });
      const defaultResult = calc(baseInputs);
      const oneChamberCard = oneChamber.summaryCards?.find(
        (card) => card.label === "Геометрический минимум",
      );
      const defaultCard = defaultResult.summaryCards?.find(
        (card) => card.label === "Геометрический минимум",
      );

      expect(oneChamberCard?.unit).toBe("кольца");
      expect(oneChamberCard?.hint).toContain("1 герметичная камера");
      expect(oneChamber.materials[0].subtitle).toContain("1 герметичная камера × 4 кольца");
      expect(defaultCard?.unit).toBe("колец");
      expect(defaultCard?.hint).toContain("3 герметичные камеры");
    });

    it("называет только герметичные камеры и отдельную фильтрацию", () => {
      const chambers = septicRingsDef.fields.find((field) => field.key === "chambersCount");
      const filter = septicRingsDef.fields.find((field) => field.key === "withFilterWell");

      expect(chambers?.label).toContain("герметичных камер");
      expect(chambers?.hint).toContain("не является камерой септика");
      expect(filter?.label).toContain("Отдельное сооружение фильтрации");
      expect(filter?.hint).toContain("не назначает размеры");
    });

    it("не обещает автоматический заказ скрытых материалов в metadata", () => {
      expect(septicRingsDef.description).toContain("Фильтрация и узлы — только по проекту");
      expect(septicRingsDef.metaDescription).toMatch(/^Бесплатный калькулятор/);
      expect(septicRingsDef.metaDescription).toContain("без подмены проекта фильтрации");
    });

    it("ссылается на действующие карточки ГОСТ и раскрывает границы", () => {
      const html = septicRingsDef.seoContent?.descriptionHtml ?? "";

      expect(html).toContain("https://protect.gost.ru/gost/details/00dced5b-5991-4f1a-9516-1f88c4ad53f6");
      expect(html).toContain("https://protect.gost.ru/gost/details/2bde3665-9b67-4026-a77e-ea8318e89d63");
      expect(html).toContain("не входит в рабочий объём");
      expect(html).toContain("полный геометрический объём");
      expect(html).not.toContain("2.5 для N&gt;5");
      expect(html).not.toContain("штрафом по КоАП");
      expect(html).not.toContain("50+ лет");
    });
  });
});
