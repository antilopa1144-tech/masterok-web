import type { CalculatorDefinition } from "../types";

/** Масса 1 м.п. арматуры по ГОСТ 5781-82, кг */
const WEIGHT_PER_METER: Record<number, number> = {
  6: 0.222,
  8: 0.395,
  10: 0.617,
  12: 0.888,
  14: 1.21,
  16: 1.58,
};

export const rebarDef: CalculatorDefinition = {
  id: "rebar",
  slug: "armatura",
  title: "Калькулятор арматуры",
  h1: "Калькулятор арматуры онлайн — расчёт арматуры для фундамента",
  description:
    "Рассчитайте количество арматуры, вязальной проволоки и фиксаторов для плитного и ленточного фундамента, армопояса и перекрытия.",
  metaTitle:
    "Калькулятор арматуры онлайн | Расчёт арматуры для фундамента — Мастерок",
  metaDescription:
    "Бесплатный калькулятор арматуры: рассчитайте метраж, вес, количество стержней 11.7 м, вязальную проволоку и фиксаторы для плиты, ленты, армопояса по СП 63.13330.",
  category: "foundation",
  categorySlug: "fundament",
  tags: [
    "арматура",
    "фундамент",
    "армирование",
    "каркас",
    "вязальная проволока",
  ],
  popularity: 74,
  complexity: 2,
  fields: [
    {
      key: "structureType",
      label: "Тип конструкции",
      type: "select",
      defaultValue: 0,
      options: [
        { value: 0, label: "Плитный фундамент (двойная сетка)" },
        { value: 1, label: "Ленточный фундамент (каркас)" },
        { value: 2, label: "Армопояс" },
        { value: 3, label: "Перекрытие (одинарная сетка)" },
      ],
    },
    {
      key: "length",
      label: "Длина конструкции",
      type: "slider",
      unit: "м",
      min: 1,
      max: 30,
      step: 0.5,
      defaultValue: 10,
    },
    {
      key: "width",
      label: "Ширина конструкции",
      type: "slider",
      unit: "м",
      min: 1,
      max: 30,
      step: 0.5,
      defaultValue: 8,
    },
    {
      key: "height",
      label: "Толщина (высота) конструкции",
      type: "slider",
      unit: "м",
      min: 0.1,
      max: 2,
      step: 0.05,
      defaultValue: 0.3,
    },
    {
      key: "mainDiameter",
      label: "Диаметр рабочей арматуры",
      type: "select",
      defaultValue: 12,
      options: [
        { value: 8, label: "∅8 мм" },
        { value: 10, label: "∅10 мм" },
        { value: 12, label: "∅12 мм (стандарт)" },
        { value: 14, label: "∅14 мм" },
        { value: 16, label: "∅16 мм" },
      ],
    },
    {
      key: "gridStep",
      label: "Шаг сетки (ячейка)",
      type: "select",
      defaultValue: 200,
      options: [
        { value: 150, label: "150 мм (усиленная)" },
        { value: 200, label: "200 мм (стандарт)" },
        { value: 250, label: "250 мм" },
        { value: 300, label: "300 мм (облегчённая)" },
      ],
    },
  ],

  calculate(inputs) {
    const structureType = Math.round(inputs.structureType ?? 0);
    const length = Math.max(1, inputs.length ?? 10);
    const width = Math.max(1, inputs.width ?? 8);
    const height = Math.max(0.1, inputs.height ?? 0.3);
    const mainDiameter = inputs.mainDiameter ?? 12;
    const gridStepMm = inputs.gridStep ?? 200;
    const gridStepM = gridStepMm / 1000;

    const mainKgPerM = WEIGHT_PER_METER[mainDiameter] ?? 0.888;
    const tieKgPerM = WEIGHT_PER_METER[6] ?? 0.222; // Ø6 для связей/хомутов

    let mainRebarLength = 0; // м.п. рабочей арматуры
    let tieRebarLength = 0; // м.п. связей / хомутов
    let totalIntersections = 0; // количество пересечений для проволоки
    let fixatorCount = 0; // фиксаторы защитного слоя

    const warnings: string[] = [];

    if (structureType === 0) {
      // ═══ Плитный фундамент: 2 сетки (верхняя + нижняя) ═══
      const barsAlongLength = Math.ceil(width / gridStepM) + 1;
      const barsAlongWidth = Math.ceil(length / gridStepM) + 1;

      // 2 сетки × (прутки вдоль длины + прутки вдоль ширины) × запас 5%
      mainRebarLength =
        2 *
        (barsAlongLength * length + barsAlongWidth * width) *
        1.05;

      // Вертикальные связи Ø6: шаг 600 мм в обоих направлениях
      const tieCountX = Math.ceil(length / 0.6);
      const tieCountY = Math.ceil(width / 0.6);
      const totalTies = tieCountX * tieCountY;
      const tieLength = height + 0.2; // высота + загибы
      tieRebarLength = totalTies * tieLength;

      // Пересечения: каждый узел в обеих сетках
      totalIntersections =
        barsAlongLength * barsAlongWidth * 2 + totalTies * 2;

      // Фиксаторы: 4–6 шт/м² (берём 5)
      const area = length * width;
      fixatorCount = Math.ceil(area * 5);

      if (mainDiameter <= 8) {
        warnings.push(
          "Для плитного фундамента рекомендуется арматура \u221212 и более"
        );
      }
      if (height < 0.15) {
        warnings.push(
          "Минимальная толщина плиты \u2014 150 мм по СП 22.13330"
        );
      }
    } else if (structureType === 1) {
      // ═══ Ленточный фундамент: каркас 4 продольных прутка ═══
      const perimeter = 2 * (length + width);
      const stripWidth = 0.4; // ширина ленты по умолчанию, м

      // 4 продольных прутка (2 верхних + 2 нижних) + запас 5%
      mainRebarLength = perimeter * 4 * 1.05;

      // Поперечные хомуты Ø6–8: через каждые 400 мм
      const stirrupCount = Math.ceil(perimeter / 0.4);
      const sectionPerimeter = 2 * (stripWidth + height - 0.1);
      tieRebarLength = stirrupCount * sectionPerimeter;

      // Пересечения: каждый хомут пересекает 4 продольных прутка
      totalIntersections = stirrupCount * 4;

      // Фиксаторы: 2 шт/м.п. (нижний защитный слой)
      fixatorCount = Math.ceil(perimeter * 2);

      if (mainDiameter <= 8) {
        warnings.push(
          "Для ленточного фундамента рекомендуется арматура \u221210 и более"
        );
      }
    } else if (structureType === 2) {
      // ═══ Армопояс: 4 прутка по периметру, хомуты через 400 мм ═══
      const perimeter = 2 * (length + width);
      const beltHeight = 0.25; // высота армопояса фиксированная
      const beltWidth = 0.3; // типичная ширина армопояса

      // 4 продольных прутка + запас 5%
      mainRebarLength = perimeter * 4 * 1.05;

      // Хомуты через каждые 400 мм
      const stirrupCount = Math.ceil(perimeter / 0.4);
      const sectionPerimeter = 2 * (beltWidth + beltHeight - 0.1);
      tieRebarLength = stirrupCount * sectionPerimeter;

      totalIntersections = stirrupCount * 4;
      fixatorCount = Math.ceil(perimeter * 2);
    } else if (structureType === 3) {
      // ═══ Перекрытие: одинарная сетка + вторичная сетка Ø6 ═══
      const barsAlongLength = Math.ceil(width / gridStepM) + 1;
      const barsAlongWidth = Math.ceil(length / gridStepM) + 1;

      // Одинарная основная сетка + запас 5%
      mainRebarLength =
        (barsAlongLength * length + barsAlongWidth * width) * 1.05;

      // Вторичная сетка Ø6 (шаг в 2 раза больше основного)
      const secStep = gridStepM * 2;
      const secBarsX = Math.ceil(width / secStep) + 1;
      const secBarsY = Math.ceil(length / secStep) + 1;
      tieRebarLength = secBarsX * length + secBarsY * width;

      totalIntersections =
        barsAlongLength * barsAlongWidth + secBarsX * secBarsY;

      const area = length * width;
      fixatorCount = Math.ceil(area * 4);

      if (height < 0.15) {
        warnings.push(
          "Минимальная толщина монолитного перекрытия \u2014 150 мм по СП 63.13330"
        );
      }
    }

    // ═══ Общие расчёты ═══

    const mainRebarKg = mainRebarLength * mainKgPerM;

    // Вязальная проволока: 0.3 м на каждое пересечение, Ø1.2 ≈ 6 г/м = 0.006 кг/м
    const wireLength = totalIntersections * 0.3;
    const wireKg = wireLength * 0.006;
    const wireKgWithReserve = Math.ceil(wireKg * 1.1 * 10) / 10;

    // Стержни стандартной длины 11.7 м
    const mainRods = Math.ceil(mainRebarLength / 11.7);

    // Связи / хомуты
    const tieRebarKg = tieRebarLength * tieKgPerM;

    const totalRebarLength = mainRebarLength + tieRebarLength;
    const totalRebarKg = mainRebarKg + tieRebarKg;

    const structureNames = [
      "плитный фундамент",
      "ленточный фундамент",
      "армопояс",
      "перекрытие",
    ];

    const materials = [
      {
        name: `Арматура А500С \u2205${mainDiameter} мм (${structureNames[structureType]})`,
        quantity: Math.round(mainRebarLength * 100) / 100,
        unit: "м.п.",
        withReserve: Math.round(mainRebarLength * 100) / 100,
        purchaseQty: Math.round(mainRebarLength * 100) / 100,
        category: "Арматура",
      },
      {
        name: `Арматура А500С \u2205${mainDiameter} мм — стержни 11.7 м`,
        quantity: mainRods,
        unit: "шт",
        withReserve: mainRods,
        purchaseQty: mainRods,
        category: "Арматура",
      },
      {
        name: `Масса арматуры \u2205${mainDiameter} мм`,
        quantity: Math.round(mainRebarKg * 100) / 100,
        unit: "кг",
        withReserve: Math.round(mainRebarKg * 1.05 * 100) / 100,
        purchaseQty: Math.ceil(mainRebarKg * 1.05),
        category: "Арматура",
      },
      {
        name:
          structureType === 0
            ? "Вертикальные связи \u22056 мм"
            : structureType === 3
              ? "Вторичная сетка \u22056 мм"
              : "Хомуты (поперечная арматура) \u22056–8 мм",
        quantity: Math.round(tieRebarLength * 100) / 100,
        unit: "м.п.",
        withReserve: Math.round(tieRebarLength * 1.05 * 100) / 100,
        purchaseQty: Math.ceil(tieRebarLength * 1.05),
        category: "Арматура",
      },
      {
        name: "Проволока вязальная \u22051.2 мм",
        quantity: Math.round(wireKg * 100) / 100,
        unit: "кг",
        withReserve: wireKgWithReserve,
        purchaseQty: Math.max(1, Math.ceil(wireKgWithReserve)),
        category: "Крепёж",
      },
      {
        name: "Фиксаторы защитного слоя (пластиковые)",
        quantity: fixatorCount,
        unit: "шт",
        withReserve: Math.ceil(fixatorCount * 1.1),
        purchaseQty: Math.ceil(fixatorCount * 1.1),
        category: "Крепёж",
      },
    ];

    return {
      materials,
      totals: {
        mainRebarLength: Math.round(mainRebarLength * 100) / 100,
        mainRebarKg: Math.round(mainRebarKg * 100) / 100,
        tieRebarLength: Math.round(tieRebarLength * 100) / 100,
        totalRebarLength: Math.round(totalRebarLength * 100) / 100,
        totalRebarKg: Math.round(totalRebarKg * 100) / 100,
        mainRods,
        wireKg: Math.round(wireKg * 100) / 100,
        fixatorCount,
        intersections: totalIntersections,
      },
      warnings,
    };
  },

  formulaDescription: `
**Расчёт арматуры по типам конструкций:**

- **Плитный фундамент:** 2 сетки (верх + низ), шаг 150–300 мм, вертикальные связи Ø6 через 600 мм
- **Ленточный фундамент:** 4 продольных прутка (2 верх + 2 низ), поперечные хомуты через 400 мм
- **Армопояс:** 4 прутка по периметру, хомуты через 400 мм, высота 250 мм
- **Перекрытие:** одинарная рабочая сетка + вторичная сетка Ø6

Масса арматуры по ГОСТ 5781-82: Ø8 = 0.395 кг/м, Ø10 = 0.617, Ø12 = 0.888, Ø14 = 1.21, Ø16 = 1.58 кг/м

Вязальная проволока: 0.3 м на пересечение (Ø1.2 мм ≈ 6 г/м)
  `,
  howToUse: [
    "Выберите тип конструкции (плита, лента, армопояс, перекрытие)",
    "Укажите габариты конструкции: длину, ширину и толщину",
    "Выберите диаметр рабочей арматуры и шаг сетки",
    "Нажмите «Рассчитать» — получите метраж, вес, количество стержней и расходники",
  ],
};
