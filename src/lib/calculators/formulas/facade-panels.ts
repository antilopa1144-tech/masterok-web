import type { CalculatorDefinition } from "../types";

export const facadePanelsDef: CalculatorDefinition = {
  id: "exterior_facade_panels",
  slug: "fasadnye-paneli",
  title: "Калькулятор фасадных панелей",
  h1: "Калькулятор фасадных панелей — расчёт обшивки фасада",
  description: "Рассчитайте количество фасадных панелей (фиброцемент, металл, HPL), подсистемы и крепежа для вентилируемого фасада.",
  metaTitle: "Калькулятор фасадных панелей | Вентфасад — Мастерок",
  metaDescription: "Бесплатный калькулятор фасадных панелей: фиброцементные, металлические, HPL панели — рассчитайте материалы для вентилируемого фасада.",
  category: "facade",
  categorySlug: "fasad",
  tags: ["фасадные панели", "вентфасад", "фиброцемент", "металлокассеты", "HPL панели"],
  popularity: 55,
  complexity: 2,
  fields: [
    {
      key: "area",
      label: "Площадь фасада (без проёмов)",
      type: "slider",
      unit: "м²",
      min: 10,
      max: 2000,
      step: 5,
      defaultValue: 120,
    },
    {
      key: "panelType",
      label: "Тип панелей",
      type: "select",
      defaultValue: 0,
      options: [
        { value: 0, label: "Фиброцементные (1200×3000 мм)" },
        { value: 1, label: "Металлокассеты (600×1200 мм)" },
        { value: 2, label: "HPL компакт (1200×2440 мм)" },
        { value: 3, label: "Сайдинг металлический (0.23 м²/полоса)" },
      ],
    },
    {
      key: "substructureType",
      label: "Подсистема (несущий каркас)",
      type: "select",
      defaultValue: 0,
      options: [
        { value: 0, label: "Алюминиевый профиль (стандарт)" },
        { value: 1, label: "Оцинкованная сталь (бюджетная)" },
        { value: 2, label: "Деревянная обрешётка 50×50 мм" },
      ],
    },
    {
      key: "insulationIncluded",
      label: "Утеплитель в составе",
      type: "select",
      defaultValue: 0,
      options: [
        { value: 0, label: "Без утеплителя" },
        { value: 1, label: "Минвата 50 мм" },
        { value: 2, label: "Минвата 100 мм" },
      ],
    },
  ],
  calculate(inputs): import("../types").CalculatorResult {
    const area = Math.max(10, inputs.area ?? 120);
    const panelType = Math.round(inputs.panelType ?? 0);
    const substructureType = Math.round(inputs.substructureType ?? 0);
    const insulationIncluded = Math.round(inputs.insulationIncluded ?? 0);

    const warnings: string[] = [];
    const materials = [];

    // Площадь панелей
    const panelAreas = [
      1200 * 3000 / 1e6, // фиброцемент 3.6 м²
      600 * 1200 / 1e6,  // металлокассеты 0.72 м²
      1200 * 2440 / 1e6, // HPL 2.928 м²
      0.23,              // сайдинг полоса
    ];
    const panelNames = [
      "Фиброцементная панель 1200×3000 мм",
      "Металлокассета 600×1200 мм",
      "HPL компакт-панель 1200×2440 мм",
      "Сайдинг металлический (полоса ~0.23 м²)",
    ];

    const panelArea = panelAreas[panelType];
    const areaWithReserve = area * (panelType <= 1 ? 1.10 : 1.08); // 10% на подрезку
    const panelCount = Math.ceil(areaWithReserve / panelArea);

    materials.push({
      name: panelNames[panelType],
      quantity: areaWithReserve / panelArea,
      unit: "шт",
      withReserve: panelCount,
      purchaseQty: panelCount,
      category: "Панели",
    });

    // Подсистема
    // Вертикальные кронштейны: шаг 600 мм по вертикали, каждые 600 мм по горизонтали
    // Количество кронштейнов ≈ area / (0.6 × 0.6) × 1.1
    const bracketsCount = Math.ceil((area / 0.36) * 1.1);
    const bracketName = substructureType === 0 ? "Кронштейн алюминиевый" :
                        substructureType === 1 ? "Кронштейн оцинкованный" :
                        "Кронштейн деревянный 50×50";

    materials.push({
      name: bracketName + " (шаг 600×600 мм)",
      quantity: area / 0.36,
      unit: "шт",
      withReserve: bracketsCount,
      purchaseQty: bracketsCount,
      category: "Подсистема",
    });

    // Вертикальные направляющие
    // Периметр несущих профилей ≈ area / 0.6 м.п.
    const guideLength = (area / 0.6) * 1.1;
    const guideLength3m = Math.ceil(guideLength / 3);
    const guideName = substructureType === 0 ? "Профиль направляющий алюминиевый 3 м" :
                      substructureType === 1 ? "Профиль несущий оцинкованный 3 м" :
                      "Брусок обрешётки 50×50 мм, L=3 м";

    materials.push({
      name: guideName,
      quantity: guideLength / 3,
      unit: "шт",
      withReserve: guideLength3m,
      purchaseQty: guideLength3m,
      category: "Подсистема",
    });

    // Крепёж для панелей
    const screwsCount = Math.ceil(panelCount * 8 * 1.05); // ~8 саморезов на панель
    materials.push({
      name: "Крепёж для фасадных панелей (заклёпки алюминиевые или саморезы по металлу)",
      quantity: panelCount * 8,
      unit: "шт",
      withReserve: screwsCount,
      purchaseQty: screwsCount,
      category: "Крепёж",
    });

    // Дюбели для кронштейнов
    const dubelsCount = Math.ceil(bracketsCount * 2 * 1.05); // 2 дюбеля на кронштейн
    materials.push({
      name: "Дюбель анкерный 10×100 мм для кронштейнов",
      quantity: bracketsCount * 2,
      unit: "шт",
      withReserve: dubelsCount,
      purchaseQty: dubelsCount,
      category: "Крепёж",
    });

    // Утеплитель если выбран
    if (insulationIncluded > 0) {
      const thickness = insulationIncluded === 1 ? 50 : 100;
      const insPlates = Math.ceil(area * 1.05 / 0.72);
      materials.push({
        name: `Минвата фасадная ${thickness} мм (плита 600×1200 мм, 0.72 м²)`,
        quantity: area * 1.05 / 0.72,
        unit: "плит",
        withReserve: insPlates,
        purchaseQty: insPlates,
        category: "Утеплитель",
      });

      const dubelsInsCount = Math.ceil(area * 6 * 1.05); // 6 дюбелей на м²
      materials.push({
        name: "Дюбель-грибок для утеплителя (фасадный)",
        quantity: area * 6,
        unit: "шт",
        withReserve: dubelsInsCount,
        purchaseQty: dubelsInsCount,
        category: "Крепёж",
      });

      const windMeshRolls = Math.ceil(area * 1.15 / 50);
      materials.push({
        name: "Ветрозащитная мембрана (рулон 50 м²)",
        quantity: area * 1.15 / 50,
        unit: "рулонов",
        withReserve: windMeshRolls,
        purchaseQty: windMeshRolls,
        category: "Изоляция",
      });
    }

    // Грунтовка для основания
    const primerLiters = area * 0.15 * 1.15; // 150 мл/м², запас 15%
    const primerCans = Math.ceil(primerLiters / 10); // канистра 10 л
    materials.push({
      name: "Грунтовка для основания (канистра 10 л, ~150 мл/м²)",
      quantity: primerLiters / 10,
      unit: "канистр",
      withReserve: primerCans,
      purchaseQty: primerCans,
      category: "Подготовка",
    });

    // Герметик для стыков панелей
    const jointLength = Math.sqrt(area) * 4; // приблизительная длина стыков ≈ периметр
    const sealantTubes = Math.ceil(jointLength / 10); // 1 туба на 10 м.п.
    materials.push({
      name: "Герметик для стыков панелей (туба 310 мл, ~10 м.п.)",
      quantity: sealantTubes,
      unit: "туб",
      withReserve: sealantTubes,
      purchaseQty: sealantTubes,
      category: "Герметик",
    });

    if (substructureType === 2) {
      warnings.push("Деревянная обрешётка требует антисептической обработки — не рекомендуется под фиброцемент и металл, только для сайдинга");
    }
    if (panelType === 1 && insulationIncluded === 0) {
      warnings.push("Металлокассеты без утеплителя — возможно образование конденсата изнутри. Рекомендуется утепление");
    }

    return {
      materials,
      totals: {
        area,
        panelCount,
        bracketsCount,
      } as Record<string, number>,
      warnings,
    };
  },
  formulaDescription: `
**Расчёт фасадных панелей:**
- Панели: площадь × 1.10 / площадь одной панели
- Кронштейны: ~4 шт/м² (шаг 600×600 мм)
- Направляющие: площадь / 0.6 м.п. (шаг 600 мм)
  `,
  howToUse: [
    "Введите площадь фасада",
    "Выберите тип панелей и подсистемы",
    "Укажите наличие утеплителя",
    "Нажмите «Рассчитать»",
  ],
};
