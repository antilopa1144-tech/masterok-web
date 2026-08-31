import { describe, expect, it } from "vitest";
import { guttersDef } from "../formulas/gutters";
import { checkInvariants, findMaterial, withBasicAccuracy } from "./_helpers";

const calc = withBasicAccuracy(guttersDef.calculate.bind(guttersDef));

const standardInputs = {
  roofPerimeter: 20,
  roofArea: 100,
  roofHeight: 5,
  funnels: 2,
  systemType: 1,
  gutterLength: 3,
  gutterSections: 2,
  gutterCornerCount: 0,
  endCapCount: 4,
  hasEaveOffset: 1,
};

describe("Водосточная система", () => {
  describe("Два прямых карниза по 10 м, кровля 100 м², два стояка", () => {
    const result = calc(standardInputs);

    it("разделяет точную длину и покупку желобов по каждому участку", () => {
      const gutters = findMaterial(result, "Желоб водосточный");

      expect(gutters?.quantity).toBe(6.667);
      expect(gutters?.purchaseQty).toBe(8);
      expect(result.totals.gutterPcs).toBe(8);
    });

    it("не добавляет целую лишнюю трубу на каждый стояк", () => {
      const pipes = findMaterial(result, "Труба водосточная");

      expect(pipes?.quantity).toBe(3.333);
      expect(pipes?.purchaseQty).toBe(4);
      expect(result.totals.pipePerFunnel).toBe(2);
    });

    it("добавляет по одной муфте между двумя трубами каждого стояка", () => {
      const couplings = findMaterial(result, "Муфты соединительные");

      expect(couplings?.purchaseQty).toBe(2);
    });

    it("считает соединители отдельно для двух прямых участков", () => {
      const connectors = findMaterial(result, "Соединители желобов");

      expect(connectors?.purchaseQty).toBe(6);
    });

    it("сохраняет число кронштейнов старой общей модели, но не выдаёт его за заказ", () => {
      const hooks = findMaterial(result, "Кронштейны желоба");

      expect(hooks?.purchaseQty).toBe(46);
      expect(hooks?.subtitle).toContain("Предварительная общая модель");
      expect(hooks?.subtitle).toContain("одна добавочная точка на введённый угол");
    });

    it("считает хомуты с дополнительной точкой крепления на каждый стояк", () => {
      const clamps = findMaterial(result, "Хомуты трубы");

      expect(clamps?.purchaseQty).toBe(9);
    });

    it("при карнизном вылете даёт два колена и один слив на стояк", () => {
      const elbows = findMaterial(result, "Колена универсальные");
      const outlets = findMaterial(result, "Водосточные сливы");

      expect(elbows?.purchaseQty).toBe(4);
      expect(outlets?.purchaseQty).toBe(2);
    });

    it("не выдумывает углы и не включает герметик", () => {
      expect(findMaterial(result, "Угловые элементы")).toBeUndefined();
      expect(findMaterial(result, "Герметик")).toBeUndefined();
    });

    it("двух воронок достаточно по площади и длине", () => {
      expect(result.totals.recommendedFunnelsByArea).toBe(2);
      expect(result.totals.recommendedFunnelsByLength).toBe(2);
      expect(result.totals.recommendedFunnels).toBe(2);
      expect(result.warnings.some((warning) => warning.includes("Недостаточно воронок"))).toBe(false);
    });

    it("сохраняет инварианты результата", () => {
      checkInvariants(result);
    });
  });

  it("длинные участки повышают консервативный ориентир воронок, но не изображают гидравлический проект", () => {
    const result = calc({
      ...standardInputs,
      roofPerimeter: 50,
      roofArea: 100,
      funnels: 2,
      gutterSections: 2,
    });

    expect(result.totals.recommendedFunnelsByArea).toBe(2);
    expect(result.totals.recommendedFunnelsByLength).toBe(6);
    expect(result.totals.recommendedFunnels).toBe(6);
    expect(result.warnings.some((warning) => warning.includes("ориентир не менее 6"))).toBe(true);
    expect(result.warnings.some((warning) => warning.includes("не гидравлический проект"))).toBe(true);
  });

  it("углы и заглушки берёт из явной геометрии, а не из константы", () => {
    const result = calc({
      ...standardInputs,
      roofPerimeter: 40,
      gutterSections: 4,
      gutterCornerCount: 4,
      endCapCount: 0,
      funnels: 4,
    });

    expect(findMaterial(result, "Угловые элементы")?.purchaseQty).toBe(4);
    expect(findMaterial(result, "Заглушки желоба")).toBeUndefined();
  });

  it("без карнизного вылета не добавляет два переходных колена", () => {
    const result = calc({ ...standardInputs, hasEaveOffset: 0 });

    expect(findMaterial(result, "Колена универсальные")).toBeUndefined();
    expect(findMaterial(result, "Водосточные сливы")?.purchaseQty).toBe(2);
  });

  it("минимальные значения рассчитываются без нулевых покупных позиций", () => {
    const result = calc({
      ...standardInputs,
      roofPerimeter: 5,
      roofArea: 10,
      roofHeight: 2,
      funnels: 1,
      gutterSections: 1,
      endCapCount: 2,
    });

    checkInvariants(result);
  });

  it("не применяет несуществующую длину 1,5 м к металлу и МАКСИ", () => {
    for (const systemType of [2, 3]) {
      const result = calc({ ...standardInputs, systemType, gutterLength: 1.5 });

      expect(result.totals.gutterLength).toBe(3);
      expect(findMaterial(result, "Желоб водосточный")?.name).toContain("3 м");
      expect(result.warnings).toEqual(expect.arrayContaining([
        expect.stringContaining("значение 1,5 м не применено"),
        expect.stringContaining("выполнен по общей длине 3 м"),
      ]));
    }
  });

  it("сохраняет паспортный вариант 1,5 м для двух ПВХ-линеек", () => {
    for (const systemType of [0, 1]) {
      const result = calc({ ...standardInputs, systemType, gutterLength: 1.5 });

      expect(result.totals.gutterLength).toBe(1.5);
      expect(result.totals.gutterPcs).toBe(14);
      expect(result.totals.pipePcs).toBe(8);
      expect(result.warnings.some((warning) => warning.includes("значение 1,5 м не применено"))).toBe(false);
    }
  });

  it("раскрывает товарное округление и неполную комплектацию трассы", () => {
    const result = calc(standardInputs);

    expect(findMaterial(result, "Желоб водосточный")?.subtitle).toContain("2 × ceil(10 / 3) = 8 шт.");
    expect(findMaterial(result, "Труба водосточная")?.subtitle).toContain("Короткий отрезок обхода карниза");
    expect(findMaterial(result, "Водосточные сливы")?.subtitle).toContain("Ливнеприёмник");
    expect(findMaterial(result, "Воронки водосборные")?.subtitle).toContain("Распределение воды по линиям не рассчитано");
  });

  it("всегда показывает границы усреднения, дождя, крепежа и сценариев", () => {
    const result = calc(standardInputs);

    expect(result.warnings).toEqual(expect.arrayContaining([
      expect.stringContaining("усредняются между 2 участками"),
      expect.stringContaining("80 л/(с·га)"),
      expect.stringContaining("Кронштейны и хомуты — предварительная оценка"),
      expect.stringContaining("MIN/REC/MAX меняют только сценарное число желобов"),
    ]));
  });

  it("объясняет равные участки и ограничения единой длины прямо в полях", () => {
    const sections = guttersDef.fields.find((field) => field.key === "gutterSections");
    const length = guttersDef.fields.find((field) => field.key === "gutterLength");
    const area = guttersDef.fields.find((field) => field.key === "roofArea");

    expect(sections?.label).toContain("равной длины");
    expect(sections?.hint).toContain("делится на это число поровну");
    expect(length?.options?.find((option) => option.value === 1.5)?.label).toContain("только ПВХ");
    expect(length?.hint).toContain("короткая труба имеет длину 1 м");
    expect(area?.hint).toContain("не распределяет площадь ендов");
  });

  it("ссылается на первичные карточки систем и действующий СП", () => {
    const html = guttersDef.seoContent?.descriptionHtml ?? "";

    expect(html).toContain("https://www.tn.ru/journal/ustanovka-vodostochnoy-sistemy-na-kryshe-komplektuyushchie-i-etapy-rabot/");
    expect(html).toContain("https://www.tn.ru/catalogue/vodostochnye_sistemy/vodostochnaya-sistema-optima/");
    expect(html).toContain("https://www.tn.ru/catalogue/vodostochnye_sistemy/plastikovaya-vodostochnaya-sistema/");
    expect(html).toContain("https://www.tn.ru/catalogue/vodostochnye_sistemy/metallicheskaya-vodostochnaya-sistema/");
    expect(html).toContain("https://www.tn.ru/catalogue/vodostochnye_sistemy/plastikovaya-vodostochnaya-sistema-maksi/");
    expect(html).toContain("https://protect.gost.ru/sp/details/cf3b6ea5-c63b-4aa4-9dd3-4295fcaef945");
    expect(html).toContain("MIN/REC/MAX в этой версии меняют только сценарное число желобов");
  });
});
