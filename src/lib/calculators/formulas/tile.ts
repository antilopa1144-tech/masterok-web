import type { CalculatorDefinition } from "../types";

export const tileDef: CalculatorDefinition = {
  id: "tile",
  slug: "plitka",
  title: "Калькулятор плитки",
  h1: "Калькулятор плитки онлайн — расчёт количества плитки и клея",
  description: "Рассчитайте количество плитки, клея и затирки для пола и стен. Учёт способа укладки, отходов и размера плитки.",
  metaTitle: "Калькулятор плитки онлайн | Расчёт плитки и клея — Мастерок",
  metaDescription: "Бесплатный калькулятор плитки: рассчитайте количество керамической плитки, плиточного клея и затирки. Учёт способа укладки, размера швов и отходов.",
  category: "flooring",
  categorySlug: "poly",
  tags: ["плитка", "кафель", "керамика", "плиточный клей", "затирка", "ванная", "кухня"],
  popularity: 88,
  complexity: 2,
  fields: [
    {
      key: "inputMode",
      label: "Способ ввода",
      type: "radio",
      defaultValue: 0,
      options: [
        { value: 0, label: "По размерам комнаты" },
        { value: 1, label: "По площади" },
      ],
    },
    {
      key: "length",
      label: "Длина комнаты",
      type: "slider",
      unit: "м",
      min: 0.5,
      max: 30,
      step: 0.1,
      defaultValue: 4,
      group: "bySize",
    },
    {
      key: "width",
      label: "Ширина комнаты",
      type: "slider",
      unit: "м",
      min: 0.5,
      max: 30,
      step: 0.1,
      defaultValue: 3,
      group: "bySize",
    },
    {
      key: "area",
      label: "Площадь",
      type: "slider",
      unit: "м²",
      min: 1,
      max: 500,
      step: 0.5,
      defaultValue: 12,
      group: "byArea",
    },
    {
      key: "tileWidth",
      label: "Ширина плитки",
      type: "slider",
      unit: "мм",
      min: 50,
      max: 1200,
      step: 10,
      defaultValue: 300,
    },
    {
      key: "tileHeight",
      label: "Высота/длина плитки",
      type: "slider",
      unit: "мм",
      min: 50,
      max: 1200,
      step: 10,
      defaultValue: 300,
    },
    {
      key: "layingMethod",
      label: "Способ укладки",
      type: "select",
      defaultValue: 0,
      options: [
        { value: 0, label: "Прямая (параллельная) — +5%" },
        { value: 1, label: "Диагональная — +15%" },
        { value: 2, label: "Кирпичная (со смещением) — +8%" },
      ],
    },
    {
      key: "jointWidth",
      label: "Ширина шва",
      type: "slider",
      unit: "мм",
      min: 1,
      max: 10,
      step: 0.5,
      defaultValue: 2,
    },
  ],
  calculate(inputs) {
    const inputMode = Math.round(inputs.inputMode ?? 0);
    let area: number;
    if (inputMode === 0) {
      const l = Math.max(0.5, inputs.length ?? 4);
      const w = Math.max(0.5, inputs.width ?? 3);
      area = l * w;
    } else {
      area = Math.max(1, inputs.area ?? 12);
    }

    const tileW = (inputs.tileWidth ?? 300) / 1000; // перевод в метры
    const tileH = (inputs.tileHeight ?? 300) / 1000;
    const method = Math.round(inputs.layingMethod ?? 0);
    const jointW = (inputs.jointWidth ?? 2) / 1000;

    // Площадь одной плитки с учётом шва
    const tileArea = (tileW + jointW) * (tileH + jointW);

    // Коэффициент отходов по способу укладки
    const wasteCoeff: Record<number, number> = { 0: 1.05, 1: 1.15, 2: 1.08 };
    const coeff = wasteCoeff[method] ?? 1.05;

    const tilesExact = area / tileArea;
    const tilesWithWaste = Math.ceil(tilesExact * coeff);

    // Клей: ~5 кг/м² при слое 6 мм, мешок 25 кг
    const adhesiveKg = area * 5 * coeff;
    const adhesiveBags = Math.ceil(adhesiveKg / 25);

    // Затирка по формуле: расход = (W+H)/(W×H) × шов × глубина × плотность
    // Упрощённо: ~0.3 кг/м² при шве 2 мм для плитки 30×30
    const jointDepth = 0.008; // 8 мм — стандартная глубина затирки (≈ толщина плитки)
    const groutKgPerSqm = ((1 / tileW + 1 / tileH) * jointW * jointDepth * 1600);
    const groutKg = area * groutKgPerSqm * 1.05;
    const groutBags = Math.ceil(groutKg / 2); // мешки 2 кг

    const warnings: string[] = [];
    if (tilesExact < 5) warnings.push("При укладке меньше 5 плиток процент отходов может быть выше расчётного");
    if (method === 1) warnings.push("Диагональная укладка: заранее выберите центр комнаты и выложите пробный ряд");

    return {
      materials: [
        {
          name: `Плитка ${Math.round(tileW * 1000)}×${Math.round(tileH * 1000)} мм`,
          quantity: tilesExact,
          unit: "шт",
          withReserve: tilesWithWaste,
          purchaseQty: tilesWithWaste,
          category: "Основное",
        },
        {
          name: "Плиточный клей (мешки 25 кг)",
          quantity: adhesiveBags,
          unit: "мешков",
          withReserve: adhesiveBags,
          purchaseQty: adhesiveBags,
          category: "Клей",
        },
        {
          name: "Затирка (мешки 2 кг)",
          quantity: groutBags,
          unit: "мешков",
          withReserve: groutBags,
          purchaseQty: groutBags,
          category: "Затирка",
        },
        {
          name: "Крестики для швов",
          quantity: Math.ceil(tilesWithWaste * 4 * 0.75),
          unit: "шт",
          withReserve: Math.ceil(tilesWithWaste * 4 * 0.75),
          purchaseQty: Math.ceil(tilesWithWaste * 4 * 0.75 / 100) * 100,
          category: "Крепёж",
        },
        {
          name: "Грунтовка глубокого проникновения (канистра 10 л)",
          quantity: area * 0.3,
          unit: "л",
          withReserve: area * 0.3 * 1.15,
          purchaseQty: Math.ceil((area * 0.3 * 1.15) / 10) * 10,
          category: "Грунтовка",
        },
        ...((inputs.tileWidth ?? 300) >= 300 || (inputs.tileHeight ?? 300) >= 300
          ? [
              {
                name: "СВП (система выравнивания плитки, комплект 100 шт)",
                quantity: area / (tileW * tileH),
                unit: "комплект",
                withReserve: Math.ceil((area / (tileW * tileH)) * 1.1 / 100),
                purchaseQty: Math.ceil((area / (tileW * tileH)) * 1.1 / 100),
                category: "Крепёж",
              },
            ]
          : []),
        {
          name: "Силиконовый герметик (туба 280 мл)",
          quantity: Math.ceil(area / 10),
          unit: "шт",
          withReserve: Math.ceil(area / 10),
          purchaseQty: Math.max(1, Math.ceil(area / 10)),
          category: "Герметик",
        },
      ],
      totals: {
        area,
        tilesNeeded: tilesWithWaste,
        tileArea: tileArea,
        wastePercent: (coeff - 1) * 100,
      },
      warnings,
    };
  },
  formulaDescription: `
**Расчёт количества плитки:**
N = (Площадь / Площадь_плитки) × Коэффициент_отходов

Площадь плитки = (Ширина + Шов) × (Высота + Шов)

Коэффициенты отходов:
- Прямая укладка: ×1.05 (+5%)
- Диагональная: ×1.15 (+15%)
- Кирпичная (смещение): ×1.08 (+8%)

**Расход клея:** ~5 кг/м² при слое 6 мм (мешок 25 кг)

**Расход затирки:** зависит от размера плитки и ширины шва
  `,
  howToUse: [
    "Введите размеры комнаты или площадь укладки",
    "Укажите размер плитки (обычно 300×300, 600×300 или 600×600 мм)",
    "Выберите способ укладки (прямая — минимум отходов)",
    "Задайте ширину шва (стандарт 2–3 мм для пола, 1.5–2 мм для стен)",
    "Нажмите «Рассчитать» — получите плитку, клей и затирку с запасом",
  ],
};
