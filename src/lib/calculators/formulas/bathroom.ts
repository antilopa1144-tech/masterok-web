import type { CalculatorDefinition } from "../types";
import { withSiteMetaTitle } from "../meta";
import { buildNativeScenarios } from "../scenario-native";

export const bathroomDef: CalculatorDefinition = {
  id: "bathroom",
  slug: "vannaya-komnata",
  title: "Калькулятор ванной комнаты",
  h1: "Калькулятор ванной комнаты онлайн — расчёт плитки, клея и гидроизоляции",
  description:
    "Комплексный расчёт материалов для ремонта ванной: плитка пола и стен, клей, затирка, гидроизоляция.",
  metaTitle: withSiteMetaTitle("Калькулятор ванной комнаты | Плитка, клей, гидроизоляция"),
  metaDescription:
    "Бесплатный калькулятор ванной комнаты: рассчитайте плитку пола и стен, плиточный клей, затирку, гидроизоляцию и грунтовку для ремонта санузла по размерам помещения.",
  category: "interior",
  categorySlug: "otdelka",
  tags: ["ванная", "плитка", "гидроизоляция", "ремонт ванной", "клей плиточный", "затирка"],
  popularity: 85,
  complexity: 3,
  fields: [
    {
      key: "length",
      label: "Длина помещения",
      type: "slider",
      unit: "м",
      min: 1,
      max: 10,
      step: 0.1,
      defaultValue: 2.5,
    },
    {
      key: "width",
      label: "Ширина помещения",
      type: "slider",
      unit: "м",
      min: 1,
      max: 10,
      step: 0.1,
      defaultValue: 1.7,
    },
    {
      key: "height",
      label: "Высота помещения",
      type: "slider",
      unit: "м",
      min: 2,
      max: 3.5,
      step: 0.1,
      defaultValue: 2.5,
    },
    {
      key: "floorTileSize",
      label: "Размер напольной плитки",
      type: "select",
      defaultValue: 0,
      options: [
        { value: 0, label: "300×300 мм" },
        { value: 1, label: "450×450 мм" },
        { value: 2, label: "600×600 мм" },
      ],
    },
    {
      key: "wallTileSize",
      label: "Размер настенной плитки",
      type: "select",
      defaultValue: 0,
      options: [
        { value: 0, label: "200×300 мм" },
        { value: 1, label: "250×400 мм" },
        { value: 2, label: "300×600 мм" },
      ],
    },
    {
      key: "hasWaterproofing",
      label: "Гидроизоляция",
      type: "switch",
      defaultValue: 1,
      hint: "Обмазочная гидроизоляция пола и примыканий (обязательна по СП 29.13330)",
    },
    {
      key: "doorWidth",
      label: "Ширина дверного проёма",
      type: "slider",
      unit: "м",
      min: 0.6,
      max: 1.0,
      step: 0.1,
      defaultValue: 0.7,
    },
  ],
  calculate(inputs) {
    const length = Math.max(1, inputs.length ?? 2.5);
    const width = Math.max(1, inputs.width ?? 1.7);
    const height = Math.max(2, inputs.height ?? 2.5);
    const floorTileSizeIdx = Math.round(inputs.floorTileSize ?? 0);
    const wallTileSizeIdx = Math.round(inputs.wallTileSize ?? 0);
    const hasWaterproofing = Math.round(inputs.hasWaterproofing ?? 1) === 1;
    const doorWidth = Math.max(0.6, Math.min(1.0, inputs.doorWidth ?? 0.7));

    // --- Геометрия ---
    const floorArea = length * width;
    const perimeter = 2 * (length + width);
    const wallArea = perimeter * height - doorWidth * 2.1;

    // --- Размеры плитки (в метрах) ---
    const floorTileSizes: Record<number, [number, number]> = {
      0: [0.3, 0.3],
      1: [0.45, 0.45],
      2: [0.6, 0.6],
    };
    const wallTileSizes: Record<number, [number, number]> = {
      0: [0.2, 0.3],
      1: [0.25, 0.4],
      2: [0.3, 0.6],
    };

    const [floorTW, floorTH] = floorTileSizes[floorTileSizeIdx] ?? [0.3, 0.3];
    const [wallTW, wallTH] = wallTileSizes[wallTileSizeIdx] ?? [0.2, 0.3];

    // --- Плитка (с запасом +10% на подрезку) ---
    const tilesFloor = Math.ceil((floorArea / (floorTW * floorTH)) * 1.1);
    const tilesWall = Math.ceil((wallArea / (wallTW * wallTH)) * 1.1);

    // --- Клей плиточный ---
    // Пол: 5 кг/м² (зубчатый шпатель 8-10 мм), мешки 25 кг
    const adhesiveFloorKg = floorArea * 5;
    const adhesiveFloorBags = Math.ceil(adhesiveFloorKg / 25);
    // Стены: 3.5 кг/м² (зубчатый шпатель 6 мм), мешки 25 кг
    const adhesiveWallKg = wallArea * 3.5;
    const adhesiveWallBags = Math.ceil(adhesiveWallKg / 25);

    // --- Затирка ---
    // Упрощённая оценка: 0.5 кг/м², мешки 2 кг
    const groutKg = (floorArea + wallArea) * 0.5;
    const groutBags = Math.ceil(groutKg / 2);

    // --- Гидроизоляция ---
    // Обмазочная мастика: пол + заведение на стены 200 мм (по периметру)
    // Расход 1.5 кг/м², вёдра 4 кг
    let waterproofingBuckets = 0;
    let waterproofingArea = 0;
    // Лента гидроизоляционная: периметр + 4 угла × 0.3 м, рулон 10 м
    let tapeRolls = 0;
    let tapeLength = 0;
    if (hasWaterproofing) {
      waterproofingArea = floorArea + perimeter * 0.2;
      const waterproofingKg = waterproofingArea * 1.5;
      waterproofingBuckets = Math.ceil(waterproofingKg / 4);
      tapeLength = perimeter + 1.2; // 4 угла × 0.3 м
      tapeRolls = Math.ceil(tapeLength / 10);
    }

    // --- Грунтовка ---
    // Глубокого проникновения: 0.2 л/м² по всем поверхностям, канистры 5 л
    const primerLiters = (floorArea + wallArea) * 0.2;
    const primerCans = Math.ceil(primerLiters / 5);

    // --- Крестики для швов ---
    // ~3 крестика на плитку, упаковка 100 шт
    const crossesTotal = (tilesFloor + tilesWall) * 3;
    const crossesPacks = Math.ceil(crossesTotal / 100);

    // --- Герметик силиконовый санитарный ---
    // 1 туба 280 мл ≈ 3 м.п. шва
    const sealantTubes = Math.ceil(perimeter / 3);

    // --- Формируем результат ---
    const materials = [
      {
        name: `Плитка напольная ${Math.round(floorTW * 1000)}×${Math.round(floorTH * 1000)} мм`,
        quantity: floorArea / (floorTW * floorTH),
        unit: "шт",
        withReserve: tilesFloor,
        purchaseQty: tilesFloor,
        category: "Плитка",
      },
      {
        name: `Плитка настенная ${Math.round(wallTW * 1000)}×${Math.round(wallTH * 1000)} мм`,
        quantity: wallArea / (wallTW * wallTH),
        unit: "шт",
        withReserve: tilesWall,
        purchaseQty: tilesWall,
        category: "Плитка",
      },
      {
        name: "Клей плиточный для пола (мешок 25 кг)",
        quantity: adhesiveFloorKg / 25,
        unit: "мешков",
        withReserve: adhesiveFloorBags,
        purchaseQty: adhesiveFloorBags,
        category: "Клей",
      },
      {
        name: "Клей плиточный для стен (мешок 25 кг)",
        quantity: adhesiveWallKg / 25,
        unit: "мешков",
        withReserve: adhesiveWallBags,
        purchaseQty: adhesiveWallBags,
        category: "Клей",
      },
      {
        name: "Затирка для швов (мешок 2 кг)",
        quantity: groutKg / 2,
        unit: "мешков",
        withReserve: groutBags,
        purchaseQty: groutBags,
        category: "Затирка",
      },
      ...(hasWaterproofing
        ? [
            {
              name: "Гидроизоляция обмазочная (ведро 4 кг)",
              quantity: waterproofingArea * 1.5 / 4,
              unit: "вёдер",
              withReserve: waterproofingBuckets,
              purchaseQty: waterproofingBuckets,
              category: "Гидроизоляция",
            },
            {
              name: "Лента гидроизоляционная (рулон 10 м)",
              quantity: tapeLength / 10,
              unit: "рулонов",
              withReserve: tapeRolls,
              purchaseQty: tapeRolls,
              category: "Гидроизоляция",
            },
          ]
        : []),
      {
        name: "Грунтовка глубокого проникновения (канистра 5 л)",
        quantity: primerLiters / 5,
        unit: "канистр",
        withReserve: primerCans,
        purchaseQty: primerCans,
        category: "Грунтовка",
      },
      {
        name: "Крестики для швов (упаковка 100 шт)",
        quantity: crossesTotal,
        unit: "шт",
        withReserve: crossesTotal,
        purchaseQty: crossesPacks,
        category: "Крепёж",
      },
      {
        name: "Герметик силиконовый санитарный (туба 280 мл)",
        quantity: perimeter / 3,
        unit: "шт",
        withReserve: sealantTubes,
        purchaseQty: sealantTubes,
        category: "Герметик",
      },
    ];

    // --- Предупреждения ---
    const warnings: string[] = [];
    if (floorArea < 2) {
      warnings.push("Маленькая площадь — расход на подрезку будет выше");
    }
    if (!hasWaterproofing) {
      warnings.push(
        "Гидроизоляция в ванной обязательна по СП 29.13330. Рекомендуется обмазочная гидроизоляция",
      );
    }

    const scenarios = buildNativeScenarios({
      id: "bathroom-main",
      title: "Bathroom main",
      exactNeed: (floorArea / (floorTW * floorTH)) * 1.1 + (wallArea / (wallTW * wallTH)) * 1.1,
      unit: "шт",
      packageSizes: [1],
      packageLabelPrefix: "bathroom-tile",
    });

    return {
      materials,
      totals: {
        floorArea,
        wallArea,
        perimeter,
        tilesFloor,
        tilesWall,
      },
      warnings,
      scenarios,
    };
  },
  formulaDescription: `
**Расчёт плитки:**
- Плитка пола: N = ceil(Площадь_пола / Площадь_плитки × 1.10)
- Плитка стен: N = ceil(Площадь_стен / Площадь_плитки × 1.10)
- Площадь стен = Периметр × Высота − Дверной_проём

**Расход клея:**
- Пол: 5 кг/м² (зубчатый шпатель 8–10 мм), мешок 25 кг
- Стены: 3.5 кг/м² (зубчатый шпатель 6 мм), мешок 25 кг

**Затирка:** 0.5 кг/м² по всей площади облицовки

**Гидроизоляция:** обмазочная мастика 1.5 кг/м² на пол + заведение на стены 200 мм
  `,
  howToUse: [
    "Введите длину, ширину и высоту ванной комнаты",
    "Выберите размер напольной и настенной плитки",
    "Укажите, нужна ли гидроизоляция (рекомендуется всегда)",
    "Задайте ширину дверного проёма",
    "Нажмите «Рассчитать» — получите полный список материалов",
  ],
faq: [
    {
      question: "Нужно ли делать гидроизоляцию в ванной комнате?",
      answer: "Да, гидроизоляцию пола и зон примыкания в ванной обычно делают обязательно, потому что именно эти участки первыми принимают на себя воду при проливах, протечках, влажной уборке и постоянной эксплуатации помещения. Она защищает перекрытие и соседние помещения, а также снижает риск скрытого намокания основания под плиткой, поэтому для качественного ремонта санузла это считается не опцией, а нормальной базовой практикой, особенно если под ванной комнатой уже есть жилое помещение или дорогая чистовая отделка. На практике именно экономия на этой стадии чаще всего оборачивается самой дорогой переделкой после первой серьёзной протечки, когда вода уже ушла под плитку и в примыкания. В санузлах без нормального гидроизоляционного контура слабое место почти всегда находится не по центру пола, а как раз в швах, углах и проходах коммуникаций. Особенно это важно не только в душевой, но и в зонах скрытых протечек у инсталляций, тумб, экранов ванны и проходок, где вода обнаруживается слишком поздно. Даже при аккуратной эксплуатации вода чаще всего уходит не в центр пола, а в примыкания, углы и скрытые узлы, поэтому без гидроизоляции ванная остаётся уязвимой именно там. Обычно да, особенно в мокрых зонах, у примыканий пола к стенам, вокруг трапов и выводов труб, где риск протечки выше даже при качественной плитке. Да, особенно в мокрых зонах и по примыканиям, где протечки почти всегда начинаются раньше всего. Да, особенно на полу, в душевой и по примыканиям, где протечки обычно появляются первыми. Для пола и мокрых примыканий это чаще базовый защитный слой, а не опция, которую можно безболезненно убрать ради экономии."
    },
    {
      question: "Сколько запаса плитки закладывать для ванной?",
      answer: "Для прямой укладки плитки в ванной обычно достаточно 7–10% запаса, если помещение простое, формат плитки удобен для раскладки и подрезка остаётся минимальной. Если есть декоративные вставки, ниши, сложная геометрия, диагональная схема, крупный формат или жёсткий подбор рисунка, запас лучше увеличивать до 12–15%, потому что отходов, подрезки и риска не попасть в ту же партию материала становится заметно больше, особенно на видимых участках с рисунком, бордюрами, скрытыми люками, экраном ванны, душевой зоной, подрезкой вокруг выпусков, локальным ремонтом и сопряжением с тёплым полом, где заменить одну испорченную плитку потом сложнее всего и дороже всего визуально. В ванной ошибка даже в пару плиток обычно всплывает уже на самом заметном участке около сантехники и ниш. Для коллекций со сложным декором, мозаикой и разнесёнными акцентными вставками лучше держать запас ближе к верхней границе, чтобы не собирать остаток из несовпадающих коробок. Если часть плитки уйдёт на экран ванны, ниши, короба и скрытые люки, запас лучше считать сразу вместе с этими зонами, а не вспоминать о них после основной закупки. Он особенно растёт в маленьких ванных с множеством подрезок, коробов, люков и раскладкой вокруг сантехники, где отход выше, чем в простой прямоугольной комнате. Если есть ниша, короб, мелкий формат или диагональная раскладка, запас обычно нужен больше базового. На маленьких санузлах запас часто растёт из-за подрезки вокруг коробов, ниш и сантехники. Для ванной с большим числом подрезок и ниш лучше сразу ориентироваться на верхнюю границу запаса, а не на чистый минимум."
    }
  ],
};


