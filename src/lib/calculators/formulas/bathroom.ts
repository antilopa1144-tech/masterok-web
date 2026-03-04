import type { CalculatorDefinition } from "../types";

export const bathroomDef: CalculatorDefinition = {
  id: "bathroom",
  slug: "vannaya-komnata",
  title: "Калькулятор ванной комнаты",
  h1: "Калькулятор ванной комнаты онлайн — расчёт плитки, клея и гидроизоляции",
  description:
    "Комплексный расчёт материалов для ремонта ванной: плитка пола и стен, клей, затирка, гидроизоляция.",
  metaTitle: "Калькулятор ванной комнаты | Плитка, клей, гидроизоляция — Мастерок",
  metaDescription:
    "Бесплатный калькулятор ванной комнаты: плитка пола и стен, плиточный клей, затирка, гидроизоляция, грунтовка — расчёт онлайн.",
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
};
