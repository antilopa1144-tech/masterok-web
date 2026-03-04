import type { CalculatorDefinition } from "../types";

// Кирпичей на 1 м² кладки (с учётом швов 10 мм), по СНиП 3.03.01-87
const BRICKS_PER_SQM: Record<number, Record<number, number>> = {
  0: { 0: 51, 1: 102, 2: 153, 3: 204 },  // одинарный 250×120×65
  1: { 0: 39, 1: 78, 2: 117, 3: 156 },   // полуторный 250×120×88
  2: { 0: 26, 1: 52, 2: 78, 3: 104 },    // двойной 250×120×138
};

// Расход раствора на 1 м² кладки (м³), по СНиП
const MORTAR_PER_SQM: Record<number, Record<number, number>> = {
  0: { 0: 0.019, 1: 0.023, 2: 0.034, 3: 0.045 },
  1: { 0: 0.016, 1: 0.020, 2: 0.029, 3: 0.038 },
  2: { 0: 0.013, 1: 0.017, 2: 0.024, 3: 0.031 },
};

const WALL_THICKNESS_MM: Record<number, number> = {
  0: 120, 1: 250, 2: 380, 3: 510,
};

const BRICK_HEIGHT_MM: Record<number, number> = { 0: 65, 1: 88, 2: 138 };

export const brickDef: CalculatorDefinition = {
  id: "brick",
  slug: "kirpich",
  title: "Калькулятор кирпича",
  h1: "Калькулятор кирпича онлайн — расчёт количества кирпичей и раствора",
  description: "Рассчитайте точное количество кирпича, цемента и песка для кладки. Учёт типа кирпича, толщины стены, условий работы.",
  metaTitle: "Калькулятор кирпича онлайн | Расчёт кладки — Мастерок",
  metaDescription: "Бесплатный калькулятор кирпичной кладки: рассчитайте количество кирпичей, цемента и песка по площади или размерам стены. Нормы по ГОСТ 530-2012 и СНиП.",
  category: "walls",
  categorySlug: "steny",
  tags: ["кирпич", "кладка", "кирпичная кладка", "стена", "перегородка", "раствор"],
  popularity: 90,
  complexity: 2,
  fields: [
    {
      key: "inputMode",
      label: "Способ задания площади",
      type: "radio",
      defaultValue: 0,
      options: [
        { value: 0, label: "По размерам стены" },
        { value: 1, label: "По площади" },
      ],
    },
    {
      key: "wallWidth",
      label: "Ширина стены",
      type: "slider",
      unit: "м",
      min: 0.5,
      max: 50,
      step: 0.5,
      defaultValue: 6,
      group: "bySize",
    },
    {
      key: "wallHeight",
      label: "Высота стены",
      type: "slider",
      unit: "м",
      min: 0.5,
      max: 10,
      step: 0.1,
      defaultValue: 2.7,
      group: "bySize",
    },
    {
      key: "area",
      label: "Площадь кладки",
      type: "slider",
      unit: "м²",
      min: 1,
      max: 1000,
      step: 1,
      defaultValue: 20,
      group: "byArea",
    },
    {
      key: "brickType",
      label: "Тип кирпича",
      type: "select",
      defaultValue: 0,
      options: [
        { value: 0, label: "Одинарный 250×120×65 мм" },
        { value: 1, label: "Полуторный 250×120×88 мм" },
        { value: 2, label: "Двойной 250×120×138 мм" },
      ],
    },
    {
      key: "wallThickness",
      label: "Толщина кладки",
      type: "select",
      defaultValue: 1,
      options: [
        { value: 0, label: "0.5 кирпича (120 мм) — перегородка" },
        { value: 1, label: "1 кирпич (250 мм) — стена" },
        { value: 2, label: "1.5 кирпича (380 мм) — несущая" },
        { value: 3, label: "2 кирпича (510 мм) — несущая усил." },
      ],
    },
    {
      key: "workingConditions",
      label: "Условия работы",
      type: "select",
      defaultValue: 1,
      options: [
        { value: 1, label: "Нормальные" },
        { value: 2, label: "Ветреные" },
        { value: 3, label: "Холодные (ниже +5°C)" },
        { value: 4, label: "Жаркие (выше +30°C)" },
      ],
    },
    {
      key: "wasteMode",
      label: "Запас на бой и подрезку",
      type: "select",
      defaultValue: 0,
      options: [
        { value: 0, label: "Стандартный (5%)" },
        { value: 1, label: "Усиленный (10%) — сложная геометрия" },
        { value: 2, label: "Минимальный (3%) — опытный мастер" },
      ],
    },
  ],
  calculate(inputs) {
    const inputMode = Math.round(inputs.inputMode ?? 0);
    const brickType = Math.round(Math.min(2, Math.max(0, inputs.brickType ?? 0)));
    const wallThickness = Math.round(Math.min(3, Math.max(0, inputs.wallThickness ?? 1)));
    const conditions = Math.round(Math.min(4, Math.max(1, inputs.workingConditions ?? 1)));
    const wasteMode = Math.round(inputs.wasteMode ?? 0);

    let area: number;
    let wallHeight: number;
    let wallWidth: number;

    if (inputMode === 1) {
      area = Math.max(1, inputs.area ?? 20);
      wallHeight = Math.sqrt(area); // оценка для расчёта армирования
      wallWidth = wallHeight;
    } else {
      wallWidth = Math.max(0.5, inputs.wallWidth ?? 6);
      wallHeight = Math.max(0.5, inputs.wallHeight ?? 2.7);
      area = wallWidth * wallHeight;
    }

    const conditionsMultiplier: Record<number, number> = { 1: 1.0, 2: 1.05, 3: 1.10, 4: 1.08 };
    const mult = conditionsMultiplier[conditions] ?? 1.0;

    const wasteCoeffs = [1.05, 1.10, 1.03];
    const wasteCoeff = wasteCoeffs[wasteMode] ?? 1.05;

    const bricksPerM2 = BRICKS_PER_SQM[brickType]?.[wallThickness] ?? 102;
    const bricksNeeded = Math.ceil(area * bricksPerM2 * wasteCoeff);

    const mortarPerM2 = MORTAR_PER_SQM[brickType]?.[wallThickness] ?? 0.023;
    const mortarVolume = area * mortarPerM2 * 1.12 * mult; // 12% запас на потери раствора
    const mortarBags = Math.ceil(mortarVolume / 0.015); // мешок 25 кг → 0.015 м³

    const cementKg = mortarVolume * 400; // М400 для раствора М150
    const cementBags50 = Math.ceil(cementKg / 50);
    const sandM3 = mortarVolume * 1.2; // коэффициент рыхлости песка

    // Кладочная сетка
    const brickHeightMm = BRICK_HEIGHT_MM[brickType] ?? 65;
    const rowHeight = brickHeightMm + 10;
    const totalRows = Math.ceil((wallHeight * 1000) / rowHeight);
    const meshInterval = wallThickness === 0 ? 3 : 5;
    const meshLayers = Math.ceil(totalRows / meshInterval);
    const meshArea = Math.ceil(meshLayers * wallWidth * 1.1 * 10) / 10;

    const warnings: string[] = [];
    if (conditions === 3) warnings.push("При кладке в мороз: применяйте противоморозные добавки (ПМД) в раствор");
    if (conditions === 4) warnings.push("При жаре: обязательно смачивайте кирпич водой, иначе он «выпьет» воду из раствора");
    if (wallThickness === 0 && area > 15) warnings.push("Для перегородки в полкирпича такой площади обязательно армирование каждые 3 ряда");

    return {
      materials: [
        {
          name: `Кирпич (${["одинарный", "полуторный", "двойной"][brickType]})`,
          quantity: area * bricksPerM2,
          unit: "шт",
          withReserve: bricksNeeded,
          purchaseQty: bricksNeeded,
          category: "Основное",
        },
        {
          name: "Цемент М400 (для раствора)",
          quantity: cementKg,
          unit: "кг",
          withReserve: cementKg,
          purchaseQty: cementBags50,
          category: "Раствор",
        },
        {
          name: "Песок строительный (сеяный)",
          quantity: sandM3,
          unit: "м³",
          withReserve: Math.ceil(sandM3 * 1.1 * 10) / 10,
          purchaseQty: Math.ceil(sandM3 * 1.1 * 10) / 10,
          category: "Раствор",
        },
        {
          name: "Кладочная сетка (ячейка 50х50)",
          quantity: meshArea,
          unit: "м²",
          withReserve: meshArea,
          purchaseQty: Math.ceil(meshArea),
          category: "Армирование",
        },
        {
          name: "Пластификатор для раствора",
          quantity: Math.ceil(cementBags50 * 0.5),
          unit: "л",
          withReserve: Math.ceil(cementBags50 * 0.5),
          purchaseQty: Math.ceil(cementBags50 * 0.5),
          category: "Раствор",
        },
        ...(wallThickness >= 2 ? [{
          name: "Гибкие связи (для облицовки)",
          quantity: area * 5,
          unit: "шт",
          withReserve: Math.ceil(area * 5 * 1.05),
          purchaseQty: Math.ceil(area * 5 * 1.05),
          category: "Армирование",
        }] : []),
      ],
      totals: {
        area,
        bricksNeeded,
        mortarVolume,
        wallThicknessMm: WALL_THICKNESS_MM[wallThickness] ?? 250,
      },
      warnings,
    };
  },
  formulaDescription: `
**Нормы расчёта кирпичной кладки (ГОСТ 530-2012):**

1. **Количество кирпича**: Рассчитывается исходя из объёма кладки за вычетом растворных швов (стандарт 10 мм).
2. **Расход раствора**: В среднем 0.23–0.25 м³ на 1 м³ кладки.
3. **Запас**: 5% — стандарт на бой при разгрузке и подрезку. 10% — если в стене много проёмов и углов.

**Пропорции раствора М150**: 1 часть цемента М400 на 3 части песка.
  `,
  howToUse: [
    "Выберите тип кирпича и толщину стены",
    "Укажите размеры стены или чистую площадь кладки",
    "Выберите условия работы (влияет на расход воды и добавки)",
    "Укажите желаемый запас (рекомендуем 5%)",
    "Нажмите «Рассчитать» для получения полной сметы",
  ],
  expertTips: [
    {
      title: "Бой кирпича",
      content: "При покупке кирпича рядового (забутовочного) закладывайте минимум 5% на бой. Если кирпич везут издалека навалом, а не на поддонах — бой может составить до 10%.",
      author: "Петрович, каменщик"
    },
    {
      title: "Цвет шва",
      content: "Если кладка лицевая, используйте готовые цветные кладочные смеси. Самодельный раствор из песка и цемента всегда будет «гулять» по оттенку, что испортит вид фасада.",
      author: "Прораб-облицовщик"
    }
  ],
  faq: [
    {
      question: "Нужно ли армировать кладку?",
      answer: "Да, несущие стены армируют сеткой каждые 5 рядов одинарного кирпича. Перегородки в полкирпича — каждые 3-4 ряда."
    },
    {
      question: "Какой песок лучше для раствора?",
      answer: "Только сеяный или мытый карьерный песок. Речной песок слишком быстро оседает в ведре, с ним тяжело работать каменщику."
    }
  ]
};
