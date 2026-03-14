import type { CalculatorDefinition } from "../types";
import { withSiteMetaTitle } from "../meta";
import { buildNativeScenarios } from "../scenario-native";

export const doorsDef: CalculatorDefinition = {
  id: "doors_install",
  slug: "ustanovka-dverej",
  title: "Калькулятор установки дверей",
  h1: "Калькулятор установки дверей — расчёт материалов и крепежа",
  description: "Рассчитайте количество монтажной пены, наличников, доборов и крепежа для установки межкомнатных или входных дверей.",
  metaTitle: withSiteMetaTitle("Калькулятор установки дверей | Материалы"),
  metaDescription: "Бесплатный калькулятор установки дверей: рассчитайте монтажную пену, наличники, доборы и крепёж для межкомнатных и входных дверей.",
  category: "interior",
  categorySlug: "otdelka",
  tags: ["установка дверей", "межкомнатные двери", "наличники", "доборы", "монтажная пена"],
  popularity: 60,
  complexity: 1,
  fields: [
    {
      key: "doorCount",
      label: "Количество дверей",
      type: "slider",
      unit: "шт",
      min: 1,
      max: 20,
      step: 1,
      defaultValue: 3,
    },
    {
      key: "doorType",
      label: "Тип двери",
      type: "select",
      defaultValue: 0,
      options: [
        { value: 0, label: "Межкомнатная 700×2000 мм" },
        { value: 1, label: "Межкомнатная 800×2000 мм" },
        { value: 2, label: "Межкомнатная 900×2000 мм" },
        { value: 3, label: "Входная 860×2050 мм (двойная коробка)" },
        { value: 4, label: "Балконная 700×2100 мм" },
      ],
    },
    {
      key: "wallThickness",
      label: "Толщина стены",
      type: "select",
      defaultValue: 120,
      options: [
        { value: 80, label: "80 мм (гипсокартон)" },
        { value: 100, label: "100 мм (газобетон, тонкая перегородка)" },
        { value: 120, label: "120 мм (кирпич в полкирпича)" },
        { value: 200, label: "200 мм (кирпич в кирпич)" },
        { value: 250, label: "250 мм (несущая стена)" },
        { value: 380, label: "380 мм (кирпич 1.5 кирпича)" },
      ],
    },
    {
      key: "withNalichnik",
      label: "Наличники",
      type: "select",
      defaultValue: 1,
      options: [
        { value: 0, label: "Без наличников" },
        { value: 1, label: "С наличниками (с 2 сторон)" },
      ],
    },
  ],
  calculate(inputs): import("../types").CalculatorResult {
    const doorCount = Math.max(1, Math.round(inputs.doorCount ?? 3));
    const doorType = Math.round(inputs.doorType ?? 0);
    const wallThicknessMm = inputs.wallThickness ?? 120;
    const withNalichnik = Math.round(inputs.withNalichnik ?? 1);

    // Размеры дверей (Ш × В)
    const doorDims = [
      { w: 700, h: 2000 }, // 0
      { w: 800, h: 2000 }, // 1
      { w: 900, h: 2000 }, // 2
      { w: 860, h: 2050 }, // 3 входная
      { w: 700, h: 2100 }, // 4 балконная
    ];
    const dim = doorDims[doorType];

    const warnings: string[] = [];
    const materials = [];

    // Монтажная пена
    // Периметр проёма × 2 (зазор с каждой стороны)
    const openingPerimeterM = (2 * (dim.w + dim.h)) / 1000;
    const foamPerDoor = openingPerimeterM * 0.1; // ~100 мл/м.п. периметра
    const foamCanVolume = 0.75; // 750 мл = ~0.75 л выход
    const foamCansPerDoor = Math.ceil(foamPerDoor / foamCanVolume);
    const totalFoamCans = Math.ceil(doorCount * foamCansPerDoor * 1.1);

    materials.push({
      name: "Монтажная пена профессиональная (баллон 750 мл)",
      quantity: doorCount * foamCansPerDoor,
      unit: "баллонов",
      withReserve: totalFoamCans,
      purchaseQty: totalFoamCans,
      category: "Монтаж",
    });

    // Доборы (если толщина стены > стандартной коробки 70 мм)
    // Стандартная коробка = 70 мм, добор нужен при wallThickness > 70 мм
    const standardBoxDepth = 70; // мм
    const needDobor = wallThicknessMm > standardBoxDepth;
    if (needDobor) {
      const doborWidth = wallThicknessMm - standardBoxDepth;
      // Периметр коробки: 2 вертикали + 1 горизонталь
      const doborLengthPerDoor = (2 * dim.h + dim.w) / 1000 * 1.05;
      // Доборы по 2.2 м
      const doborPcs = Math.ceil((doborLengthPerDoor / 2.2)) * doorCount;

      materials.push({
        name: `Добор дверной ${doborWidth} мм × 2200 мм (расширение коробки)`,
        quantity: doborLengthPerDoor / 2.2 * doorCount,
        unit: "шт",
        withReserve: doborPcs,
        purchaseQty: doborPcs,
        category: "Добор",
      });
    }

    // Наличники
    if (withNalichnik > 0) {
      // Периметр наличника: 2 вертикали + 1 горизонталь (снизу нет)
      const nalichnikLengthPerDoor = (2 * dim.h + dim.w) / 1000 * 1.05;
      const nalichnikPcsPerDoor = Math.ceil(nalichnikLengthPerDoor / 2.2); // по 2.2 м
      const totalNalichnikPcs = nalichnikPcsPerDoor * doorCount * 2; // 2 стороны

      materials.push({
        name: "Наличник дверной 70×10 мм × 2200 мм",
        quantity: nalichnikLengthPerDoor / 2.2 * doorCount * 2,
        unit: "шт",
        withReserve: totalNalichnikPcs,
        purchaseQty: totalNalichnikPcs,
        category: "Наличники",
      });

      // Жидкие гвозди для наличников
      const glueCartridges = Math.ceil(doorCount * 0.5); // 0.5 картриджа на дверь
      materials.push({
        name: "Жидкие гвозди (картридж 310 мл)",
        quantity: doorCount * 0.5,
        unit: "шт",
        withReserve: glueCartridges,
        purchaseQty: glueCartridges,
        category: "Клей",
      });
    }

    // Шурупы для коробки
    const screwsPerDoor = 12; // ~12 точек крепления
    const screwPacks = Math.ceil(doorCount * screwsPerDoor / 50); // пачки 50 шт
    materials.push({
      name: "Шуруп 5×80 мм (пачка 50 шт) для крепления коробки",
      quantity: doorCount * screwsPerDoor / 50,
      unit: "пачек",
      withReserve: screwPacks,
      purchaseQty: screwPacks,
      category: "Крепёж",
    });

    // Дюбели
    const dubelsPerDoor = 6;
    const dubelsPacks = Math.ceil(doorCount * dubelsPerDoor / 20);
    materials.push({
      name: "Дюбель 8×80 мм (пачка 20 шт)",
      quantity: doorCount * dubelsPerDoor / 20,
      unit: "пачек",
      withReserve: dubelsPacks,
      purchaseQty: dubelsPacks,
      category: "Крепёж",
    });

    if (doorType === 3) {
      warnings.push("Входная дверь — монтажная пена должна быть непрерывным контуром для теплоизоляции; снаружи закройте гидроизоляционной лентой");
    }
    if (wallThicknessMm > 200 && !needDobor) {
      warnings.push("Проверьте, что ширина коробки соответствует толщине стены — возможно нужны доборы");
    }

    const scenarios = buildNativeScenarios({
      id: "doors-main",
      title: "Doors main",
      exactNeed: doorCount,
      unit: "шт",
      packageSizes: [1],
      packageLabelPrefix: "doors-piece",
    });

    return {
      materials,
      totals: {
        doorCount,
        totalFoamCans,
      } as Record<string, number>,
      warnings,
      scenarios,
    };
  },
  formulaDescription: `
**Расчёт установки дверей:**
- Пена: ~100 мл/м.п. периметра (баллон 750 мл)
- Доборы: если толщина стены > 70 мм (глубина стандартной коробки)
- Наличники: 2 вертикали + горизонталь × 2 стороны
  `,
  howToUse: [
    "Выберите количество и тип дверей",
    "Укажите толщину стены",
    "Выберите необходимость наличников",
    "Нажмите «Рассчитать»",
  ],
faq: [
    {
      question: "Что кроме двери учитывать при монтаже?",
      answer: "Кроме самой двери при монтаже обычно нужны монтажная пена, крепёж, доборы, наличники, пороговые и финишные элементы, а в некоторых случаях ещё клей, герметик и расходники для отделки проёма. Если не учитывать эти позиции заранее, итоговый бюджет и состав закупки по монтажу почти всегда оказываются неполными, а недостающие мелочи всплывают уже в день установки, когда проём разобран и остановка работ особенно неудобна, а часть узлов уже нельзя спокойно собрать за один выезд без повторного докупа материалов. В реальном монтаже чаще всего забывают не полотно, а именно доборные, крепёжные, расходные позиции и оформление примыкания к стене, без которых узел нельзя закончить аккуратно. Поэтому нормальный расчёт монтажа двери почти всегда шире, чем просто коробка и полотно. Если дверь ставят в санузел, холодный тамбур или проём с тёплым полом, список сопутствующих материалов и требований к узлу обычно ещё расширяется. Кроме полотна и коробки, в бюджет почти всегда входят доборы, наличники, крепёж, пена, расходники на врезку и иногда подготовка проёма, которая неожиданно оказывается самой дорогой частью узла. Помимо полотна и коробки обычно отдельно считают доборы, наличники, пену, крепёж, порог, замок, петли и подрезку проёма, иначе именно на доборных элементах чаще всего возникает недобор. Кроме полотна почти всегда нужны коробка, петли, замок, пена, крепёж, наличники и иногда доборы с порогом. В смету почти всегда входят коробка, наличники, крепёж, пена, расходники и иногда доборы с порогом. На смете доборы, наличники, пену, крепёж и порог часто забывают раньше самой коробки, а именно они и добирают итоговую стоимость."
    },
    {
      question: "Когда при установке двери нужны доборы?",
      answer: "Доборы нужны, когда толщина стены больше глубины стандартной дверной коробки и коробка не перекрывает откос по всей толщине, из-за чего проём остаётся незакрытым после установки полотна и коробки. Их лучше определять сразу на этапе расчёта и замера стены, потому что доборы влияют не только на внешний вид узла, но и на подбор наличников, монтажную схему и итоговый объём отделки проёма, особенно если стены имеют заметный разбег по толщине, коробку придётся выставлять по фактической плоскости откоса и нужен аккуратный стык с чистовой отделкой. Если доборы не учесть заранее, потом часто приходится заново подбирать комплект отделки уже после установки самой двери, а это почти всегда означает лишний добор, подрезку и потерю времени. На стенах с сильно гуляющей толщиной полезно закладывать запас по ширине добора и подгонять его уже по фактическому проёму. Доборы нужны тогда, когда толщина стены больше короба, и лучше проверять это заранее с учётом всей отделки, а не только голой стены до ремонта. Их наличие лучше проверять уже после понимания полного пирога отделки, потому что именно чистовая толщина стены решает, закроется ли короб без добора. Они нужны, когда толщина стены больше ширины дверной коробки, иначе откосы и примыкания приходится закрывать уже нештатными и менее аккуратными решениями. Они нужны, когда толщина стены больше коробки и откос нельзя закрыть только наличником без потери аккуратности. Они нужны, когда толщина стены больше коробки и откос нельзя закрыть только наличником без потери вида. Для стен с разной толщиной по высоте полезно сразу проверять обе стороны проёма, а не ориентироваться только на один самый удобный замер."
    }
  ],
};




