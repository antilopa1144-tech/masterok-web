import type { CalculatorDefinition } from "../types";
import { withSiteMetaTitle } from "../meta";
import { buildNativeScenarios } from "../scenario-native";

export const waterproofingDef: CalculatorDefinition = {
  id: "bathroom_waterproof",
  slug: "gidroizolyaciya-vlagozaschita",
  title: "Калькулятор гидроизоляции",
  h1: "Калькулятор гидроизоляции — ванная, душевая, балкон",
  description: "Рассчитайте количество гидроизоляционной мастики, ленты и праймера для ванной комнаты, душевой зоны или санузла.",
  metaTitle: withSiteMetaTitle("Калькулятор гидроизоляции | Ванная, санузел"),
  metaDescription: "Бесплатный калькулятор гидроизоляции: рассчитайте мастику, гидроизоляционную ленту и праймер для ванной, душевой или санузла по площади пола и высоте примыканий.",
  category: "interior",
  categorySlug: "otdelka",
  tags: ["гидроизоляция", "ванная", "душевая", "санузел", "Ceresit CL 51"],
  popularity: 72,
  complexity: 1,
  fields: [
    {
      key: "floorArea",
      label: "Площадь пола",
      type: "slider",
      unit: "м²",
      min: 1,
      max: 50,
      step: 0.5,
      defaultValue: 6,
    },
    {
      key: "wallHeight",
      label: "Высота обработки стен",
      type: "select",
      defaultValue: 200,
      options: [
        { value: 0, label: "Только пол" },
        { value: 200, label: "200 мм от пола (стандарт)" },
        { value: 300, label: "300 мм (влажные зоны)" },
        { value: 500, label: "500 мм (зона душа)" },
        { value: 2000, label: "Полностью стены (душевая кабина)" },
      ],
    },
    {
      key: "roomPerimeter",
      label: "Периметр помещения",
      type: "slider",
      unit: "м",
      min: 4,
      max: 40,
      step: 0.5,
      defaultValue: 10,
    },
    {
      key: "masticType",
      label: "Тип гидроизоляции",
      type: "select",
      defaultValue: 0,
      options: [
        { value: 0, label: "Цементная мастика (Ceresit CL 51, Knauf)" },
        { value: 1, label: "Жидкая резина (2-компонентная)" },
        { value: 2, label: "Полимерная обмазочная" },
      ],
    },
    {
      key: "layers",
      label: "Количество слоёв",
      type: "select",
      defaultValue: 2,
      options: [
        { value: 1, label: "1 слой (минимум, нежилая зона)" },
        { value: 2, label: "2 слоя (стандарт для ванной)" },
        { value: 3, label: "3 слоя (душевой поддон, открытая душевая)" },
      ],
    },
  ],
  calculate(inputs): import("../types").CalculatorResult {
    const floorArea = Math.max(1, inputs.floorArea ?? 6);
    const wallHeightMm = inputs.wallHeight ?? 200;
    const perimeter = Math.max(4, inputs.roomPerimeter ?? 10);
    const masticType = Math.round(inputs.masticType ?? 0);
    const layers = Math.round(inputs.layers ?? 2);

    const wallArea = perimeter * (wallHeightMm / 1000);
    const totalArea = floorArea + wallArea;

    const warnings: string[] = [];
    const materials = [];

    // Расход мастики
    let consumptionPerLayer: number; // кг/м²
    let packageKg: number;
    let masticName: string;

    switch (masticType) {
      case 0:
        consumptionPerLayer = 1.0; packageKg = 15; masticName = "Гидроизоляционная мастика Ceresit CL 51 / Knauf Флэхендихт";
        break;
      case 1:
        consumptionPerLayer = 1.2; packageKg = 20; masticName = "Жидкая резина 2-компонентная";
        break;
      default:
        consumptionPerLayer = 0.8; packageKg = 15; masticName = "Полимерная гидроизоляционная мастика";
    }

    const totalMasticKg = totalArea * consumptionPerLayer * layers;
    const masticBuckets = Math.ceil(totalMasticKg / packageKg);

    materials.push({
      name: `${masticName} (ведро ${packageKg} кг)`,
      quantity: totalMasticKg / packageKg,
      unit: "вёдер",
      withReserve: masticBuckets,
      purchaseQty: masticBuckets,
      category: "Гидроизоляция",
    });

    // Гидроизоляционная лента для углов
    // Внутренние углы: пол+стены = периметр + 4 угла × (wallHeight × 2)
    const tapeLength = perimeter + (wallHeightMm > 0 ? perimeter * 1.2 : 0);
    const tapeLengthWithReserve = Math.ceil(tapeLength * 1.1);
    materials.push({
      name: "Гидроизоляционная лента для углов и швов (50 мм)",
      quantity: tapeLength,
      unit: "м.п.",
      withReserve: tapeLengthWithReserve,
      purchaseQty: tapeLengthWithReserve,
      category: "Лента",
    });

    // Герметик для примыкания ванной/поддона
    // 1 картридж 310 мл ≈ 6 м.п.
    const sealantCartridges = Math.ceil(perimeter / 6);
    materials.push({
      name: "Герметик силиконовый санитарный (картридж 310 мл)",
      quantity: perimeter / 6,
      unit: "шт",
      withReserve: sealantCartridges + 1,
      purchaseQty: sealantCartridges + 1,
      category: "Герметик",
    });

    // Праймер (для цементных мастик — обязателен)
    if (masticType === 0) {
      const primerKg = totalArea * 0.15 * 1.1; // 150 мл/м²
      const primerCans = Math.ceil(primerKg / 2); // канистра 2 кг
      materials.push({
        name: "Грунтовка адгезионная (концентрат) для основания (канистра 2 кг)",
        quantity: primerKg / 2,
        unit: "канистр",
        withReserve: primerCans,
        purchaseQty: primerCans,
        category: "Грунтовка",
      });
    }

    // Праймер битумный (для жидкой резины и полимерной мастики)
    if (masticType >= 1) {
      const primerBitumLiters = totalArea * 0.3 * 1.1; // 300 мл/м², запас 10%
      const primerBitumCans = Math.ceil(primerBitumLiters / 20); // канистра 20 л
      materials.push({
        name: "Праймер битумный (канистра 20 л, ~300 мл/м²)",
        quantity: primerBitumLiters / 20,
        unit: "канистр",
        withReserve: primerBitumCans,
        purchaseQty: primerBitumCans,
        category: "Грунтовка",
      });
    }

    // Герметик для стыков и примыканий труб/коммуникаций
    const sealantJointLength = perimeter * 0.5; // примыкания к стенам, трубам
    const sealantJointTubes = Math.ceil(sealantJointLength / 10); // 1 туба на 10 м.п.
    materials.push({
      name: "Герметик для стыков и примыканий (туба 310 мл, ~10 м.п.)",
      quantity: sealantJointTubes,
      unit: "туб",
      withReserve: sealantJointTubes,
      purchaseQty: sealantJointTubes,
      category: "Герметик",
    });

    if (layers < 2) {
      warnings.push("Один слой гидроизоляции допустим только в нежилых или технических помещениях — для ванной минимум 2 слоя");
    }
    if (wallHeightMm === 0) {
      warnings.push("Без обработки стен гидроизоляция пола не будет полноценной — рекомендуется поднять мастику на стены минимум на 200 мм");
    }
    warnings.push("Каждый слой мастики наносится после полного высыхания предыдущего (обычно 4–6 часов)");
    warnings.push("Перед укладкой плитки дайте гидроизоляции набрать прочность 24–72 часа");

    const scenarios = buildNativeScenarios({
      id: "waterproofing-main",
      title: "Waterproofing main",
      exactNeed: totalMasticKg,
      unit: "kg",
      packageSizes: [packageKg],
      packageLabelPrefix: "waterproofing-mastic",
    });

    return {
      materials,
      totals: {
        floorArea,
        wallArea,
        totalArea,
      } as Record<string, number>,
      warnings,
      scenarios,
    };
  },
  formulaDescription: `
**Расчёт гидроизоляции:**
- Площадь обработки = площадь пола + периметр × высота стен
- Мастика: ~1.0 кг/м² × слоёв (Ceresit CL 51)
- Лента: периметр + примыкания к стенам
  `,
  howToUse: [
    "Введите площадь пола и периметр",
    "Выберите высоту обработки стен",
    "Выберите тип гидроизоляции и количество слоёв",
    "Нажмите «Рассчитать»",
  ],
faq: [
    {
      question: "Сколько слоёв гидроизоляции наносить в ванной?",
      answer: "Для обмазочной гидроизоляции в ванной обычно делают 2 слоя, чтобы покрытие получилось сплошным, равномерным и без непрокрытых участков, особенно в углах, примыканиях и возле вводов коммуникаций. Первый слой работает по основанию и связывает поверхность, а второй формирует более надёжную защитную плёнку, поэтому именно двухслойная схема чаще всего считается рабочим минимумом для мокрых зон, а локально в душевых, у трапов и особо нагруженных местах защиту нередко усиливают дополнительно армирующей лентой и локальными проходами. Экономия на втором слое чаще всего становится заметной уже после первой серьёзной эксплуатационной нагрузки или при первой протечке на стыках, когда локальный ремонт уже сложнее, чем сделать нормальную систему сразу. В душевой без поддона полезно особенно тщательно усиливать углы, примыкания и зону трапа, а не полагаться только на средний расход по площади. Обычно делают минимум два полноценных слоя с контролем сплошности, потому что именно второй проход чаще закрывает микропропуски, оставшиеся после первого нанесения. Обычно решение зависит от типа состава, основания и зоны риска: в душевой, на примыканиях и вокруг выводов коммуникаций требования к слою и проклейке узлов обычно выше. Обычно решение зависит от типа состава и зоны риска: в душевой, на полу и в примыканиях требования к слою и армированию узлов обычно выше. В душевой зоне, на полу и в примыканиях обычно важнее не один толстый слой, а полноценная двухслойная система. В мокрых узлах важна не только цифра слоёв, но и соблюдение времени просушки между ними и усиление примыканий."
    },
    {
      question: "Нужно ли заводить гидроизоляцию на стены?",
      answer: "Да, гидроизоляцию обычно поднимают на стены минимум на 150–200 мм, а в душевой зоне, вокруг трапов, инсталляций и в наиболее мокрых местах делают подъём ещё выше, потому что именно там вода дольше задерживается и уходит в примыкания. Такой заход защищает углы, стыки пола со стенами и проходы коммуникаций, где протечки возникают чаще всего, и делает гидроизоляционный контур действительно замкнутым, а не только формальным покрытием по полу, особенно в зонах постоянного пролива воды, регулярной уборки, периодического перелива через борт, локальной просушки швов, примыкания душевого экрана и скрытых зон за сантехникой, где слабое место в мокром узле проявляется быстрее всего. Если не поднять слой на стены, течь обычно начинается как раз в этих примыканиях, а не на открытом центре пола. В душевых без поддона и у трапов такой подъём лучше сразу увязывать с лентами по углам и манжетами на проходках, иначе слабым местом останется не сама мастика, а узел примыкания. Подъём на стены особенно важен там, где вода идёт не только вниз, но и в сторону по примыканиям, швам, трапам и скрытым узлам за сантехникой. Да, особенно в душевой, мокрых углах и у примыканий пола к стене, потому что именно эти зоны чаще всего становятся местом протечки при формально “обработанном” полу. Именно примыкания пола к стенам и мокрые зоны по периметру чаще всего дают первые протечки. Обязательно в мокрых зонах, потому что именно примыкания пола и стены дают самые частые протечки. Без этого узел пола и стены остаётся уязвимым именно там, где влага чаще всего задерживается дольше всего. Именно этот подъём на стены чаще всего защищает узел в местах примыкания пола и не даёт воде пройти в отделку по шву."
    }
  ],
};


