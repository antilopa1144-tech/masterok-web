import type { CalculatorDefinition } from "../types";

export const slopesDef: CalculatorDefinition = {
  id: "slopes_finishing",
  slug: "otkosy-okon-i-dverej",
  title: "Калькулятор откосов окон и дверей",
  h1: "Калькулятор откосов — расчёт материалов для отделки",
  description: "Рассчитайте материалы для отделки откосов окон и дверей: пластиковые панели, сэндвич-панели или штукатурка.",
  metaTitle: "Калькулятор откосов | Окна и двери — Мастерок",
  metaDescription: "Бесплатный калькулятор откосов окон и дверей: сэндвич-панели, пластик, штукатурка — рассчитайте количество материалов.",
  category: "interior",
  categorySlug: "otdelka",
  tags: ["откосы", "отделка откосов", "сэндвич-панели", "откосы окон", "откосы дверей"],
  popularity: 55,
  complexity: 1,
  fields: [
    {
      key: "openingCount",
      label: "Количество проёмов",
      type: "slider",
      unit: "шт",
      min: 1,
      max: 30,
      step: 1,
      defaultValue: 5,
    },
    {
      key: "openingType",
      label: "Тип проёма",
      type: "select",
      defaultValue: 0,
      options: [
        { value: 0, label: "Окно 1200×1400 мм" },
        { value: 1, label: "Окно 900×1200 мм" },
        { value: 2, label: "Дверь 800×2000 мм (2 боковых откоса)" },
        { value: 3, label: "Дверь 900×2000 мм с верхним проёмом" },
      ],
    },
    {
      key: "slopeWidth",
      label: "Ширина откоса (толщина стены)",
      type: "select",
      defaultValue: 350,
      options: [
        { value: 150, label: "150 мм (тонкая стена/перегородка)" },
        { value: 250, label: "250 мм" },
        { value: 350, label: "350 мм (кирпичная стена)" },
        { value: 500, label: "500 мм (толстая стена)" },
      ],
    },
    {
      key: "finishType",
      label: "Тип отделки",
      type: "select",
      defaultValue: 0,
      options: [
        { value: 0, label: "Сэндвич-панель ПВХ 10 мм" },
        { value: 1, label: "Пластиковые панели 8 мм" },
        { value: 2, label: "Штукатурка + шпаклёвка" },
        { value: 3, label: "Гипсокартон + шпаклёвка" },
      ],
    },
  ],
  calculate(inputs): import("../types").CalculatorResult {
    const openingCount = Math.max(1, Math.round(inputs.openingCount ?? 5));
    const openingType = Math.round(inputs.openingType ?? 0);
    const slopeWidthMm = inputs.slopeWidth ?? 350;
    const finishType = Math.round(inputs.finishType ?? 0);

    const slopeWidthM = slopeWidthMm / 1000;

    // Размеры проёмов [ширина, высота]
    const dims = [
      { w: 1200, h: 1400, sides: 3 }, // окно: 2 боковых + верхний
      { w: 900, h: 1200, sides: 3 },
      { w: 800, h: 2000, sides: 2 },  // дверь: 2 боковых (без верхнего если нет)
      { w: 900, h: 2000, sides: 3 },
    ];
    const dim = dims[openingType];
    const wM = dim.w / 1000;
    const hM = dim.h / 1000;

    // Площадь откосов одного проёма
    let slopeAreaPerOpening: number;
    if (dim.sides === 3) {
      slopeAreaPerOpening = (2 * hM + wM) * slopeWidthM;
    } else {
      slopeAreaPerOpening = 2 * hM * slopeWidthM;
    }
    const totalSlopeArea = slopeAreaPerOpening * openingCount;

    // Периметр для профилей
    const perimeterPerOpening = dim.sides === 3 ? (2 * hM + wM) : 2 * hM;
    const totalPerimeter = perimeterPerOpening * openingCount;

    const warnings: string[] = [];
    const materials = [];

    switch (finishType) {
      case 0:
      case 1: {
        const panelArea = finishType === 0 ? 1200 * 3000 / 1e6 : 1200 * 3000 / 1e6; // 3.6 м²
        const panelName = finishType === 0 ? "Сэндвич-панель ПВХ 10 мм (лист 1200×3000 мм)" : "Панель ПВХ 8 мм (лист 1200×3000 мм)";
        const areaWithReserve = totalSlopeArea * 1.12;
        const panelCount = Math.ceil(areaWithReserve / panelArea);
        materials.push({
          name: panelName,
          quantity: areaWithReserve / panelArea,
          unit: "листов",
          withReserve: panelCount,
          purchaseQty: panelCount,
          category: "Панели",
        });

        // F-профиль
        const fProfileLength = totalPerimeter * 1.1;
        const fProfilePcs = Math.ceil(fProfileLength / 3);
        materials.push({
          name: "F-профиль ПВХ 3 м (обрамление)",
          quantity: fProfileLength / 3,
          unit: "шт",
          withReserve: fProfilePcs,
          purchaseQty: fProfilePcs,
          category: "Профиль",
        });

        // Стартовый профиль
        const startProfileLength = totalPerimeter * 1.1;
        const startProfilePcs = Math.ceil(startProfileLength / 3);
        materials.push({
          name: "Стартовый профиль J-образный 3 м",
          quantity: startProfileLength / 3,
          unit: "шт",
          withReserve: startProfilePcs,
          purchaseQty: startProfilePcs,
          category: "Профиль",
        });

        // Монтажная пена (крепление панелей)
        const foamCans = Math.ceil(openingCount * 0.5);
        materials.push({
          name: "Монтажная пена (баллон 750 мл)",
          quantity: openingCount * 0.5,
          unit: "баллонов",
          withReserve: foamCans,
          purchaseQty: foamCans,
          category: "Монтаж",
        });
        break;
      }

      case 2: {
        // Штукатурка
        const plasterKg = totalSlopeArea * 12 * 1.1; // ~12 кг/м² (2 слоя)
        const plasterBags = Math.ceil(plasterKg / 25);
        materials.push({
          name: "Штукатурка финишная Knauf Ротбанд (мешок 25 кг)",
          quantity: plasterKg / 25,
          unit: "мешков",
          withReserve: plasterBags,
          purchaseQty: plasterBags,
          category: "Штукатурка",
        });

        const puttyKg = totalSlopeArea * 1.2 * 1.1;
        const puttyBags = Math.ceil(puttyKg / 25);
        materials.push({
          name: "Шпаклёвка финишная (мешок 25 кг)",
          quantity: puttyKg / 25,
          unit: "мешков",
          withReserve: puttyBags,
          purchaseQty: puttyBags,
          category: "Шпаклёвка",
        });

        const cornerPcs = Math.ceil(totalPerimeter / 3);
        materials.push({
          name: "Уголок перфорированный 3 м",
          quantity: totalPerimeter / 3,
          unit: "шт",
          withReserve: cornerPcs,
          purchaseQty: cornerPcs,
          category: "Крепёж",
        });
        break;
      }

      case 3: {
        // Гипсокартон
        const gklArea = totalSlopeArea * 1.12;
        const gklSheets = Math.ceil(gklArea / 3); // лист 1200×2500 = 3 м²
        materials.push({
          name: "ГКЛ 12.5 мм (лист 1200×2500 мм)",
          quantity: gklArea / 3,
          unit: "листов",
          withReserve: gklSheets,
          purchaseQty: gklSheets,
          category: "ГКЛ",
        });

        const screwsCount = Math.ceil(gklSheets * 20 * 1.05);
        materials.push({
          name: "Саморез ТН 3.5×25 мм (пачка 200 шт)",
          quantity: gklSheets * 20 / 200,
          unit: "пачек",
          withReserve: Math.ceil(gklSheets * 20 / 200),
          purchaseQty: Math.ceil(gklSheets * 20 / 200),
          category: "Крепёж",
        });

        const puttyKg = totalSlopeArea * 1.5 * 1.1;
        const puttyBags = Math.ceil(puttyKg / 25);
        materials.push({
          name: "Шпаклёвка для ГКЛ Knauf Фуген (мешок 25 кг)",
          quantity: puttyKg / 25,
          unit: "мешков",
          withReserve: puttyBags,
          purchaseQty: puttyBags,
          category: "Шпаклёвка",
        });
        break;
      }
    }

    // Герметик силиконовый — 1 туба на окно/дверь
    materials.push({
      name: "Герметик силиконовый белый (туба 310 мл)",
      quantity: openingCount,
      unit: "туб",
      withReserve: openingCount,
      purchaseQty: openingCount,
      category: "Герметик",
    });

    // Грунтовка для основания откосов
    const slopePrimerLiters = totalSlopeArea * 0.15 * 1.15; // 150 мл/м², запас 15%
    const slopePrimerCans = Math.ceil(slopePrimerLiters / 10); // канистра 10 л
    materials.push({
      name: "Грунтовка глубокого проникновения (канистра 10 л, ~150 мл/м²)",
      quantity: slopePrimerLiters / 10,
      unit: "канистр",
      withReserve: slopePrimerCans,
      purchaseQty: Math.max(1, slopePrimerCans),
      category: "Подготовка",
    });

    return {
      materials,
      totals: {
        totalSlopeArea,
        openingCount,
      } as Record<string, number>,
      warnings,
    };
  },
  formulaDescription: `
**Расчёт откосов:**
- Площадь = (2 × высота + ширина) × ширина откоса
- Сэндвич-панель (1200×3000 мм = 3.6 м²) +12%
- Штукатурка: ~12 кг/м² (2 слоя)
  `,
  howToUse: [
    "Введите количество и тип проёмов",
    "Укажите ширину откоса (толщину стены)",
    "Выберите тип отделки",
    "Нажмите «Рассчитать»",
  ],
};
