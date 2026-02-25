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
  ],
  calculate(inputs) {
    const inputMode = Math.round(inputs.inputMode ?? 0);
    const brickType = Math.round(Math.min(2, Math.max(0, inputs.brickType ?? 0)));
    const wallThickness = Math.round(Math.min(3, Math.max(0, inputs.wallThickness ?? 1)));
    const conditions = Math.round(Math.min(4, Math.max(1, inputs.workingConditions ?? 1)));

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

    const bricksPerM2 = BRICKS_PER_SQM[brickType]?.[wallThickness] ?? 102;
    const bricksNeeded = Math.ceil(area * bricksPerM2 * 1.05); // 5% запас

    const mortarPerM2 = MORTAR_PER_SQM[brickType]?.[wallThickness] ?? 0.023;
    const mortarVolume = area * mortarPerM2 * 1.08 * mult;
    const mortarBags = Math.ceil(mortarVolume / 0.015); // мешок 25 кг → 0.015 м³

    const cementKg = mortarVolume * 375;
    const cementBags50 = Math.ceil(cementKg / 50);
    const sandM3 = mortarVolume * 1.5;

    // Кладочная сетка
    const brickHeightMm = BRICK_HEIGHT_MM[brickType] ?? 65;
    const rowHeight = brickHeightMm + 10;
    const totalRows = Math.ceil((wallHeight * 1000) / rowHeight);
    const meshInterval = wallThickness === 0 ? 3 : 5;
    const meshLayers = Math.ceil(totalRows / meshInterval);
    const meshArea = Math.ceil(meshLayers * wallWidth * 1.1 * 10) / 10;

    const warnings: string[] = [];
    if (conditions === 3) warnings.push("При кладке в мороз: применяйте противоморозные добавки в раствор, прогревайте кладку");
    if (conditions === 4) warnings.push("При жаркой погоде: смачивайте кирпич водой перед укладкой, увлажняйте свежую кладку");
    if (wallThickness === 0 && area > 15) warnings.push("Для перегородки площадью > 15 м² рекомендуется армирование каждые 3 ряда");

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
          name: "Цемент М400",
          quantity: cementKg,
          unit: "кг",
          withReserve: cementKg,
          purchaseQty: cementBags50,
          category: "Раствор",
        },
        {
          name: "Мешки цемента (50 кг)",
          quantity: cementBags50,
          unit: "мешков",
          withReserve: cementBags50,
          purchaseQty: cementBags50,
          category: "Раствор",
        },
        {
          name: "Песок строительный",
          quantity: sandM3,
          unit: "м³",
          withReserve: Math.ceil(sandM3 * 10) / 10,
          purchaseQty: Math.ceil(sandM3 * 10) / 10,
          category: "Раствор",
        },
        {
          name: "Кладочная сетка (карты 0.5×2 м)",
          quantity: meshArea,
          unit: "м²",
          withReserve: meshArea,
          purchaseQty: Math.ceil(meshArea),
          category: "Армирование",
        },
        {
          name: "Сухая кладочная смесь 25 кг",
          quantity: mortarBags,
          unit: "мешков",
          withReserve: mortarBags,
          purchaseQty: mortarBags,
          category: "Альтернатива раствору",
        },
        {
          name: "Грунтовка по кладке (канистра 10 л)",
          quantity: area * 0.15, // 150 мл/м² × 1 слой → литры
          unit: "л",
          withReserve: Math.ceil(area * 0.15 * 1.15 * 10) / 10,
          purchaseQty: Math.ceil(area * 0.15 * 1.15 / 10), // канистра 10 л
          category: "Грунтовка",
        },
        ...(wallThickness >= 2 ? [{
          name: "Гибкие связи (облицовочная кладка)",
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
**Нормы по ГОСТ 530-2012 и СНиП 3.03.01-87:**

Количество кирпичей на 1 м² кладки:
| Тип кирпича | 0.5 кирпича | 1 кирпич | 1.5 кирпича | 2 кирпича |
|-------------|-------------|----------|-------------|-----------|
| Одинарный   | 51 шт       | 102 шт   | 153 шт      | 204 шт    |
| Полуторный  | 39 шт       | 78 шт    | 117 шт      | 156 шт    |
| Двойной     | 26 шт       | 52 шт    | 78 шт       | 104 шт    |

Запас 5% на бой и подрезку.
Расход раствора: 0.019–0.045 м³/м² в зависимости от типа кирпича и толщины.
  `,
  howToUse: [
    "Выберите способ ввода: по размерам стены или по площади",
    "Укажите тип кирпича (одинарный — самый распространённый)",
    "Выберите толщину кладки: 0.5 кирпича — перегородка, 1 кирпич — обычная стена",
    "Укажите условия работы для точного расчёта расхода раствора",
    "Нажмите «Рассчитать» — получите количество кирпичей, цемента и песка",
  ],
};
