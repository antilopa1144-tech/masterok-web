import type { CalculatorDefinition } from "../types";

export const softRoofingDef: CalculatorDefinition = {
  id: "soft_roofing",
  slug: "myagkaya-krovlya",
  title: "Калькулятор мягкой кровли",
  h1: "Калькулятор мягкой кровли онлайн — расчёт гибкой черепицы",
  description: "Рассчитайте количество гибкой черепицы, подкладочного ковра, ОСБ, мастики, гвоздей и доборных элементов для мягкой кровли.",
  metaTitle: "Калькулятор мягкой кровли онлайн | Гибкая черепица — Мастерок",
  metaDescription: "Бесплатный калькулятор мягкой кровли: расчёт гибкой черепицы Шинглас, подкладочного ковра, ОСБ-основания, мастики и доборных элементов.",
  category: "roofing",
  categorySlug: "krovlya",
  tags: ["мягкая кровля", "гибкая черепица", "Шинглас", "Технониколь", "битумная черепица"],
  popularity: 71,
  complexity: 2,
  fields: [
    {
      key: "roofArea",
      label: "Площадь кровли",
      type: "slider",
      unit: "м²",
      min: 10,
      max: 500,
      step: 1,
      defaultValue: 80,
      hint: "Площадь скатов кровли (не проекция, а реальная площадь по скатам)",
    },
    {
      key: "slope",
      label: "Уклон кровли",
      type: "slider",
      unit: "°",
      min: 12,
      max: 60,
      step: 1,
      defaultValue: 30,
    },
    {
      key: "ridgeLength",
      label: "Длина конька",
      type: "slider",
      unit: "м",
      min: 0,
      max: 50,
      step: 0.5,
      defaultValue: 8,
    },
    {
      key: "eaveLength",
      label: "Длина карнизов",
      type: "slider",
      unit: "м",
      min: 0,
      max: 100,
      step: 1,
      defaultValue: 20,
    },
    {
      key: "valleyLength",
      label: "Длина ендов",
      type: "slider",
      unit: "м",
      min: 0,
      max: 30,
      step: 0.5,
      defaultValue: 0,
      hint: "Ендова — внутренний стык скатов. Если нет — оставьте 0",
    },
  ],
  calculate(inputs): import("../types").CalculatorResult {
    const roofArea = Math.max(10, inputs.roofArea ?? 80);
    const slope = Math.max(5, Math.min(60, inputs.slope ?? 30));
    const ridgeLength = Math.max(0, inputs.ridgeLength ?? 8);
    const eaveLength = Math.max(0, inputs.eaveLength ?? 20);
    const valleyLength = Math.max(0, inputs.valleyLength ?? 0);

    const warnings: string[] = [];

    // --- Гибкая черепица ---
    const packArea = 3.0; // 1 упаковка = 3 м²
    const packs = Math.ceil(roofArea / packArea * 1.05); // +5% запас

    // --- Подкладочный ковёр ---
    let underlaymentRolls: number;
    const underlaymentRollArea = 15; // рулон 15 м²

    if (slope < 18) {
      // Сплошной подкладочный ковёр по всей площади
      underlaymentRolls = Math.ceil(roofArea * 1.15 / underlaymentRollArea);
      warnings.push("При уклоне 12–18° сплошной подкладочный ковёр обязателен по всей площади");
    } else {
      // Только критические зоны: карнизы, ендовы, конёк
      const criticalLinear = eaveLength + valleyLength + ridgeLength;
      // Ширина рулона ~1 м, длина = линейные метры с нахлёстом
      const criticalArea = criticalLinear * 1.0 * 1.15; // ширина 1 м, +15% нахлёст
      underlaymentRolls = Math.ceil(criticalArea / underlaymentRollArea);
      if (criticalLinear > 0 && underlaymentRolls < 1) {
        underlaymentRolls = 1;
      }
    }

    // --- Ендовный ковёр ---
    let valleyRolls = 0;
    if (valleyLength > 0) {
      valleyRolls = Math.ceil(valleyLength * 1.15 / 10); // рулон 10 м.п.
    }

    // --- Мастика битумная ---
    const totalLinear = ridgeLength + eaveLength + valleyLength;
    const masticKg = totalLinear * 0.1 + roofArea * 0.1; // 100 г/м.п. примыканий + 100 г/м² площади
    const masticBuckets = Math.ceil(masticKg / 3); // ведро 3 кг

    // --- Кровельные гвозди ---
    // 80 гвоздей на м², 400 гвоздей в 1 кг
    const nailsCount = roofArea * 80;
    const nailsKg = nailsCount / 400 * 1.05; // +5% запас
    const nailsKgRounded = Math.ceil(nailsKg * 10) / 10;

    // --- Карнизная планка ---
    const eaveDripPcs = Math.ceil(eaveLength / 2 * 1.05); // планки по 2 м, +5%

    // --- Торцевая (ветровая) планка ---
    // Оценка: ~40% от длины карнизов
    const windStripPcs = Math.ceil(eaveLength * 0.4 / 2 * 1.05); // планки по 2 м

    // --- Коньковая черепица ---
    // 1 элемент закрывает ~0.5 м.п. конька
    const ridgeShinglesPcs = Math.ceil(ridgeLength / 0.5 * 1.05);

    // --- ОСБ-3 основание 9 мм ---
    const osbSheetArea = 3.125; // 1250×2500 мм
    const osbSheets = Math.ceil(roofArea / osbSheetArea * 1.05);

    // --- Вентиляционные выходы ---
    // 1 на каждые 25 м²
    const ventOutputs = Math.ceil(roofArea / 25);

    // Предупреждения
    if (slope < 12) {
      warnings.push("Уклон < 12° не рекомендуется для гибкой черепицы");
    }
    if (roofArea > 200) {
      warnings.push("При большой площади кровли рекомендуется профессиональный монтаж");
    }

    const materials: Array<{
      name: string; quantity: number; unit: string;
      withReserve?: number; purchaseQty?: number; category?: string;
    }> = [
      {
        name: "Гибкая черепица (упаковка 3 м²)",
        quantity: roofArea / packArea,
        unit: "упак.",
        withReserve: packs,
        purchaseQty: packs,
        category: "Кровля",
      },
      {
        name: "ОСБ-3 9 мм (1250×2500) — сплошное основание",
        quantity: roofArea / osbSheetArea,
        unit: "листов",
        withReserve: osbSheets,
        purchaseQty: osbSheets,
        category: "Основание",
      },
      {
        name: "Подкладочный ковёр (рулон 15 м²)",
        quantity: slope < 18 ? roofArea / underlaymentRollArea : (eaveLength + valleyLength + ridgeLength) / underlaymentRollArea,
        unit: "рулонов",
        withReserve: underlaymentRolls,
        purchaseQty: underlaymentRolls,
        category: "Гидроизоляция",
      },
    ];

    if (valleyLength > 0) {
      materials.push({
        name: "Ендовный ковёр (рулон 10 м.п.)",
        quantity: valleyLength / 10,
        unit: "рулонов",
        withReserve: valleyRolls,
        purchaseQty: valleyRolls,
        category: "Гидроизоляция",
      });
    }

    materials.push(
      {
        name: "Мастика битумная (ведро 3 кг)",
        quantity: masticKg / 3,
        unit: "вёдер",
        withReserve: masticBuckets,
        purchaseQty: masticBuckets,
        category: "Герметизация",
      },
      {
        name: "Гвозди кровельные ершёные 3.2×30 мм",
        quantity: nailsCount / 400,
        unit: "кг",
        withReserve: nailsKgRounded,
        purchaseQty: Math.max(1, Math.ceil(nailsKgRounded)),
        category: "Крепёж",
      },
      {
        name: "Карнизная планка (2 м)",
        quantity: eaveLength / 2,
        unit: "шт",
        withReserve: eaveDripPcs,
        purchaseQty: eaveDripPcs,
        category: "Доборные элементы",
      },
      {
        name: "Торцевая (ветровая) планка (2 м)",
        quantity: eaveLength * 0.4 / 2,
        unit: "шт",
        withReserve: windStripPcs,
        purchaseQty: windStripPcs,
        category: "Доборные элементы",
      },
      {
        name: "Коньковая черепица",
        quantity: ridgeLength / 0.5,
        unit: "шт",
        withReserve: ridgeShinglesPcs,
        purchaseQty: ridgeShinglesPcs,
        category: "Доборные элементы",
      },
      {
        name: "Вентиляционный выход кровельный",
        quantity: ventOutputs,
        unit: "шт",
        withReserve: ventOutputs,
        purchaseQty: ventOutputs,
        category: "Вентиляция",
      },
    );

    return {
      materials,
      totals: {
        roofArea,
        slope,
        packs,
        osbSheets,
        underlaymentRolls,
        totalLinear,
      },
      warnings,
    };
  },
  formulaDescription: `
**Расчёт мягкой кровли (гибкой черепицы):**
- 1 упаковка = 3 м², запас +5%
- ОСБ-3 9 мм: сплошное основание, лист 1250×2500 = 3.125 м²
- Подкладочный ковёр: при уклоне <18° — сплошной; при >18° — только карнизы, ендовы, конёк
- Ендовный ковёр: рулон 10 м.п., только при наличии ендов
- Мастика: 100 г/м.п. примыканий + 100 г/м² площади
- Гвозди: ~80 шт/м² (ершёные 3.2×30), 400 шт/кг
- Карнизная и ветровая планки: по 2 м
- Коньковая черепица: 1 элемент = 0.5 м.п.
- Вентвыходы: 1 на каждые 25 м²
  `,
  howToUse: [
    "Введите площадь кровли (по скатам, не в проекции)",
    "Укажите уклон крыши (минимум 12° для гибкой черепицы)",
    "Введите длину конька, карнизов и ендов",
    "Нажмите «Рассчитать» — получите полный список материалов",
  ],
};
