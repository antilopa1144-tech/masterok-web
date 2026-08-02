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

    it("считает специальные и рядовые кронштейны по формуле производителя", () => {
      const hooks = findMaterial(result, "Кронштейны желоба");

      expect(hooks?.purchaseQty).toBe(46);
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

  it("длинные участки требуют больше воронок, даже если площади немного", () => {
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
    expect(result.warnings.some((warning) => warning.includes("минимум 6"))).toBe(true);
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
});
