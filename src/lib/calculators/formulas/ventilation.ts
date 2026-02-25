import type { CalculatorDefinition } from "../types";

export const ventilationDef: CalculatorDefinition = {
  id: "engineering_ventilation",
  slug: "ventilyaciya",
  title: "Калькулятор вентиляции",
  h1: "Калькулятор вентиляции — расчёт воздухообмена и каналов",
  description: "Рассчитайте требуемый воздухообмен, сечение вентиляционных каналов и диаметр вентилятора для квартиры, дома или офиса.",
  metaTitle: "Калькулятор вентиляции | Воздухообмен, каналы — Мастерок",
  metaDescription: "Бесплатный калькулятор вентиляции: нормы воздухообмена по СП 54.13330, расчёт воздуховодов, вентиляторов для квартиры и частного дома.",
  category: "engineering",
  categorySlug: "inzhenernye",
  tags: ["вентиляция", "воздухообмен", "вентилятор", "воздуховод", "приточная вентиляция"],
  popularity: 62,
  complexity: 2,
  fields: [
    {
      key: "totalArea",
      label: "Общая площадь помещений",
      type: "slider",
      unit: "м²",
      min: 10,
      max: 1000,
      step: 5,
      defaultValue: 80,
    },
    {
      key: "ceilingHeight",
      label: "Высота потолков",
      type: "select",
      defaultValue: 270,
      options: [
        { value: 250, label: "2.5 м" },
        { value: 270, label: "2.7 м (стандарт)" },
        { value: 300, label: "3.0 м" },
        { value: 350, label: "3.5 м" },
      ],
    },
    {
      key: "buildingType",
      label: "Тип здания",
      type: "select",
      defaultValue: 0,
      options: [
        { value: 0, label: "Квартира (жилая)" },
        { value: 1, label: "Частный дом (жилой)" },
        { value: 2, label: "Офис/коммерческое" },
        { value: 3, label: "Производственное/складское" },
      ],
    },
    {
      key: "peopleCount",
      label: "Количество постоянных жильцов/сотрудников",
      type: "slider",
      unit: "чел",
      min: 1,
      max: 50,
      step: 1,
      defaultValue: 3,
    },
    {
      key: "ductType",
      label: "Тип воздуховода",
      type: "select",
      defaultValue: 0,
      options: [
        { value: 0, label: "Круглый ∅100–160 мм (спирально-навивной)" },
        { value: 1, label: "Прямоугольный 200×100 мм" },
        { value: 2, label: "Гибкий гофрированный ∅125 мм" },
      ],
    },
  ],
  calculate(inputs): import("../types").CalculatorResult {
    const totalArea = Math.max(10, inputs.totalArea ?? 80);
    const ceilingHeightMm = inputs.ceilingHeight ?? 270;
    const buildingType = Math.round(inputs.buildingType ?? 0);
    const peopleCount = Math.max(1, Math.round(inputs.peopleCount ?? 3));
    const ductType = Math.round(inputs.ductType ?? 0);

    const ceilingH = ceilingHeightMm / 1000;
    const volume = totalArea * ceilingH;

    // Нормы воздухообмена по СП 54.13330 и СП 118.13330
    // Кратность воздухообмена
    const exchangeRates = [1.5, 2.0, 3.0, 5.0][buildingType]; // крат/час
    const airByVolume = volume * exchangeRates; // м³/час

    // Норма по людям: 30 м³/час на человека (СП 54.13330)
    const airByPeople = peopleCount * 30; // 30 м³/час/чел (жилые помещения)
    const requiredAirflow = Math.max(airByVolume, airByPeople);
    const requiredAirflowRounded = Math.ceil(requiredAirflow / 50) * 50;

    const warnings: string[] = [];
    const materials = [];

    // Вентилятор
    // Запас по производительности 20%
    const fanCapacity = Math.ceil(requiredAirflowRounded * 1.2 / 50) * 50;
    const fanDiameter = fanCapacity <= 300 ? 100 : fanCapacity <= 500 ? 125 : fanCapacity <= 800 ? 150 : 200;
    materials.push({
      name: `Вентилятор канальный ∅${fanDiameter} мм (~${fanCapacity} м³/ч)`,
      quantity: 1,
      unit: "шт",
      withReserve: 1,
      purchaseQty: 1,
      category: "Вентилятор",
    });

    // Воздуховоды
    // Длина основной магистрали ≈ √(area) × 2 + 15% ответвления
    const mainDuctLength = Math.sqrt(totalArea) * 2.5 * 1.15;
    const ductPcs = Math.ceil(mainDuctLength / 3); // секции по 3 м

    const ductNames = [
      `Воздуховод круглый оцинкованный ∅${fanDiameter} мм (секция 3 м)`,
      "Воздуховод прямоугольный 200×100 мм (секция 3 м)",
      "Гофра гибкая ∅125 мм (бухта 10 м)",
    ];

    if (ductType <= 1) {
      materials.push({
        name: ductNames[ductType],
        quantity: mainDuctLength / 3,
        unit: "шт",
        withReserve: ductPcs,
        purchaseQty: ductPcs,
        category: "Воздуховод",
      });
    } else {
      const hoflaBuhtas = Math.ceil(mainDuctLength / 10);
      materials.push({
        name: ductNames[2],
        quantity: mainDuctLength / 10,
        unit: "бухт",
        withReserve: hoflaBuhtas,
        purchaseQty: hoflaBuhtas,
        category: "Воздуховод",
      });
    }

    // Фасонные части (отводы 90°, тройники, переходники)
    const fittingsCount = Math.ceil(ductPcs * 0.5 * 1.1);
    materials.push({
      name: `Отвод 90° ∅${fanDiameter} мм / тройник`,
      quantity: ductPcs * 0.5,
      unit: "шт",
      withReserve: fittingsCount,
      purchaseQty: fittingsCount,
      category: "Фасонные части",
    });

    // Решётки вентиляционные
    const grateCount = Math.ceil(totalArea / 15) + 1; // 1 решётка на 15 м² + 1 входная
    materials.push({
      name: `Решётка вентиляционная 150×150 мм (или круглый диффузор ∅${fanDiameter} мм)`,
      quantity: grateCount,
      unit: "шт",
      withReserve: grateCount,
      purchaseQty: grateCount,
      category: "Решётки",
    });

    // Хомуты и крепёж
    const clampsCount = Math.ceil(ductPcs * 2 * 1.1);
    materials.push({
      name: `Хомут крепёжный ∅${fanDiameter} мм с шпилькой`,
      quantity: ductPcs * 2,
      unit: "шт",
      withReserve: clampsCount,
      purchaseQty: clampsCount,
      category: "Крепёж",
    });

    // Шумоглушитель (для жилых помещений)
    if (buildingType <= 1) {
      materials.push({
        name: `Шумоглушитель цилиндрический ∅${fanDiameter} мм`,
        quantity: 1,
        unit: "шт",
        withReserve: 1,
        purchaseQty: 1,
        category: "Шумоглушение",
      });
    }

    if (requiredAirflow > 2000) {
      warnings.push("Производительность >2000 м³/ч — рекомендуется проектирование системы специалистом");
    }
    if (buildingType === 0 && peopleCount > 6) {
      warnings.push("Для квартиры с >6 жильцами стандартной вытяжной вентиляции недостаточно — нужна приточно-вытяжная установка");
    }
    warnings.push(`Расчётный воздухообмен: ${requiredAirflowRounded} м³/ч (кратность ${exchangeRates}×/ч + 60 м³/ч/чел)`);

    return {
      materials,
      totals: {
        requiredAirflow: requiredAirflowRounded,
        volume,
        exchangeRate: exchangeRates,
      } as Record<string, number>,
      warnings,
    };
  },
  formulaDescription: `
**Расчёт вентиляции по СП 54.13330:**
- Воздухообмен = max(Объём × Кратность, Люди × 60 м³/ч)
- Кратность: квартира 1.5×, дом 2×, офис 3×/ч
- Воздуховод: диаметр по производительности вентилятора
  `,
  howToUse: [
    "Введите площадь и высоту потолков",
    "Выберите тип здания и количество жильцов",
    "Выберите тип воздуховода",
    "Нажмите «Рассчитать»",
  ],
};
