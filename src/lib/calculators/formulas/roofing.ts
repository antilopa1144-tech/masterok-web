import type { CalculatorDefinition } from "../types";

export const roofingDef: CalculatorDefinition = {
  id: "roofing_unified",
  slug: "krovlya",
  title: "Калькулятор кровли",
  h1: "Калькулятор кровли онлайн — расчёт материалов для крыши",
  description: "Рассчитайте материалы для кровли: металлочерепица, профнастил, ондулин, мягкая черепица, шифер. Учёт уклона и сопутствующих материалов.",
  metaTitle: "Калькулятор кровли онлайн | Расчёт материалов — Мастерок",
  metaDescription: "Бесплатный калькулятор кровли: рассчитайте количество металлочерепицы, профнастила, мягкой черепицы с учётом уклона. Учёт обрешётки, гидроизоляции, снегозадержателей.",
  category: "roofing",
  categorySlug: "krovlya",
  tags: ["кровля", "крыша", "металлочерепица", "профнастил", "ондулин", "мягкая черепица"],
  popularity: 85,
  complexity: 2,
  fields: [
    {
      key: "roofingType",
      label: "Тип кровельного материала",
      type: "select",
      defaultValue: 0,
      options: [
        { value: 0, label: "Металлочерепица" },
        { value: 1, label: "Мягкая черепица (битумная)" },
        { value: 2, label: "Профнастил" },
        { value: 3, label: "Ондулин" },
        { value: 4, label: "Шифер" },
        { value: 5, label: "Керамическая черепица" },
      ],
    },
    {
      key: "area",
      label: "Площадь кровли (в плане)",
      type: "slider",
      unit: "м²",
      min: 10,
      max: 500,
      step: 5,
      defaultValue: 80,
      hint: "Площадь горизонтальной проекции крыши",
    },
    {
      key: "slope",
      label: "Уклон крыши",
      type: "slider",
      unit: "°",
      min: 5,
      max: 60,
      step: 1,
      defaultValue: 30,
    },
    {
      key: "ridgeLength",
      label: "Длина конька",
      type: "slider",
      unit: "м",
      min: 1,
      max: 30,
      step: 0.5,
      defaultValue: 8,
    },
    {
      key: "sheetWidth",
      label: "Ширина листа (полезная)",
      type: "slider",
      unit: "м",
      min: 0.8,
      max: 1.5,
      step: 0.01,
      defaultValue: 1.18,
      hint: "Для металлочерепицы стандарт 1.18 м, полезная ширина ~1.10 м",
    },
    {
      key: "sheetLength",
      label: "Длина листа",
      type: "slider",
      unit: "м",
      min: 1,
      max: 8,
      step: 0.5,
      defaultValue: 2.5,
    },
  ],
  calculate(inputs): import("../types").CalculatorResult {
    const type = Math.round(inputs.roofingType ?? 0);
    const area = Math.max(10, inputs.area ?? 80);
    const slope = Math.max(5, Math.min(60, inputs.slope ?? 30));
    const ridgeLength = Math.max(1, inputs.ridgeLength ?? 8);
    const sheetWidth = inputs.sheetWidth ?? 1.18;
    const sheetLength = inputs.sheetLength ?? 2.5;

    // Реальная площадь с учётом уклона
    const slopeFactor = 1 / Math.max(0.01, Math.cos((slope * Math.PI) / 180));
    const realArea = area * slopeFactor;

    const perimeter = 4 * Math.sqrt(area);

    const warnings: string[] = [];
    warnings.push("Если крыша имеет ендовы (внутренние стыки скатов) — добавьте ендовые планки: длина ендовы × 1.1, элемент 2 м");

    // Расчёт по типу
    if (type === 0) {
      // Металлочерепица
      const effectiveWidth = sheetWidth * 0.92;
      const sheetArea = effectiveWidth * sheetLength;
      const sheetsNeeded = Math.ceil((realArea / sheetArea) * 1.10);

      const snowGuards = Math.ceil(perimeter / 3.5);
      const screws = Math.ceil(realArea * 8);
      const waterproofing = Math.ceil(realArea * 1.10);
      const battens = Math.ceil((realArea / 0.35) * 1.05 * 10) / 10;

      if (slope < 14) warnings.push("Для металлочерепицы рекомендуется уклон не менее 14°");

      return {
        materials: [
          { name: "Металлочерепица (листы)", quantity: realArea / sheetArea, unit: "шт", withReserve: sheetsNeeded, purchaseQty: sheetsNeeded, category: "Кровля" },
          { name: "Конёк", quantity: ridgeLength, unit: "м.п.", withReserve: Math.ceil(ridgeLength * 1.05), purchaseQty: Math.ceil(ridgeLength / 2) * 2, category: "Доборные элементы" },
          { name: "Снегозадержатели", quantity: snowGuards, unit: "шт", withReserve: snowGuards, purchaseQty: snowGuards, category: "Доборные элементы" },
          { name: "Саморезы кровельные 4.8×35 мм", quantity: (screws * 4.5) / 1000, unit: "кг", withReserve: Math.ceil(screws * 1.05 * 4.5 / 500) / 2, purchaseQty: Math.ceil(screws * 1.05 * 4.5 / 500) / 2, category: "Крепёж" },
          { name: "Гидроизоляционная плёнка", quantity: realArea, unit: "м²", withReserve: waterproofing, purchaseQty: Math.ceil(waterproofing / 65), category: "Гидроизоляция" },
          { name: "Обрешётка (доска 25×100)", quantity: battens, unit: "м.п.", withReserve: battens, purchaseQty: Math.ceil(battens), category: "Обрешётка" },
          { name: "Ветровая (торцевая) планка 2 м", quantity: 2 * Math.sqrt(realArea / 2), unit: "шт", withReserve: Math.ceil(2 * Math.sqrt(realArea / 2) * 1.1 / 2), purchaseQty: Math.ceil(2 * Math.sqrt(realArea / 2) * 1.1 / 2), category: "Доборные элементы" },
        ],
        totals: { area, realArea, slope, sheetsNeeded } as Record<string, number>,
        warnings,
      };
    } else if (type === 1) {
      // Мягкая черепица
      if (slope < 12) warnings.push("Мягкая черепица требует уклон не менее 12°");
      const packArea = 3.0; // 1 упаковка = 3 м²
      const packs = Math.ceil((realArea / packArea) * 1.10);
      const osb = Math.ceil(realArea * 1.05 * 10) / 10; // сплошная обрешётка ОСБ
      const ventilations = Math.ceil(realArea / 55);
      const nails = Math.ceil(realArea * 12);
      return {
        materials: [
          { name: "Мягкая черепица", quantity: realArea / packArea, unit: "упак.", withReserve: packs, purchaseQty: packs, category: "Кровля" },
          { name: "ОСБ под сплошную обрешётку", quantity: realArea, unit: "м²", withReserve: osb, purchaseQty: Math.ceil(osb / 2.8), category: "Обрешётка" },
          { name: "Подкладочный ковёр", quantity: realArea, unit: "м²", withReserve: Math.ceil(realArea * 1.10), purchaseQty: Math.ceil(realArea * 1.10 / 20), category: "Гидроизоляция" },
          { name: "Гвозди кровельные 3.5×35 мм (с шайбой)", quantity: (nails * 3.0) / 1000, unit: "кг", withReserve: Math.ceil(nails * 1.05 * 3.0 / 500) / 2, purchaseQty: Math.ceil(nails * 1.05 * 3.0 / 500) / 2, category: "Крепёж" },
          { name: "Кровельные вентиляторы", quantity: ventilations, unit: "шт", withReserve: ventilations, purchaseQty: ventilations, category: "Вентиляция" },
          { name: "Карнизные планки", quantity: perimeter, unit: "м.п.", withReserve: Math.ceil(perimeter * 1.05), purchaseQty: Math.ceil(perimeter / 2), category: "Доборные элементы" },
          { name: "Ветровая (торцевая) планка 2 м", quantity: 2 * Math.sqrt(realArea / 2), unit: "шт", withReserve: Math.ceil(2 * Math.sqrt(realArea / 2) * 1.1 / 2), purchaseQty: Math.ceil(2 * Math.sqrt(realArea / 2) * 1.1 / 2), category: "Доборные элементы" },
        ],
        totals: { area, realArea, slope, packs } as Record<string, number>,
        warnings,
      };
    } else if (type === 2) {
      // Профнастил
      if (slope < 8) warnings.push("Профнастил рекомендуется при уклоне от 8°");
      const effectiveWidth = sheetWidth * 0.95;
      const sheetArea = effectiveWidth * sheetLength;
      const sheetsNeeded = Math.ceil((realArea / sheetArea) * 1.10);
      const battens = Math.ceil((realArea / 0.5) * 1.05);
      return {
        materials: [
          { name: "Профнастил (листы)", quantity: realArea / sheetArea, unit: "шт", withReserve: sheetsNeeded, purchaseQty: sheetsNeeded, category: "Кровля" },
          { name: "Конёк", quantity: ridgeLength, unit: "м.п.", withReserve: Math.ceil(ridgeLength * 1.05), purchaseQty: Math.ceil(ridgeLength / 2), category: "Доборные элементы" },
          { name: "Саморезы кровельные 4.8×35 мм", quantity: (realArea * 7 * 4.5) / 1000, unit: "кг", withReserve: Math.ceil(realArea * 7 * 1.05 * 4.5 / 500) / 2, purchaseQty: Math.ceil(realArea * 7 * 1.05 * 4.5 / 500) / 2, category: "Крепёж" },
          { name: "Гидроизоляционная плёнка", quantity: realArea, unit: "м²", withReserve: Math.ceil(realArea * 1.10), purchaseQty: Math.ceil(realArea * 1.10 / 65), category: "Гидроизоляция" },
          { name: "Обрешётка (шаг 500 мм)", quantity: battens, unit: "м.п.", withReserve: battens, purchaseQty: Math.ceil(battens), category: "Обрешётка" },
          { name: "Ветровая (торцевая) планка 2 м", quantity: 2 * Math.sqrt(realArea / 2), unit: "шт", withReserve: Math.ceil(2 * Math.sqrt(realArea / 2) * 1.1 / 2), purchaseQty: Math.ceil(2 * Math.sqrt(realArea / 2) * 1.1 / 2), category: "Доборные элементы" },
        ],
        totals: { area, realArea, slope, sheetsNeeded } as Record<string, number>,
        warnings,
      };
    } else if (type === 3) {
      // Ондулин
      const sheetAreaOndulin = 1.6;
      const sheets = Math.ceil((realArea / sheetAreaOndulin) * 1.15);
      const ridgeElements = Math.ceil(ridgeLength / 0.85);
      return {
        materials: [
          { name: "Ондулин (листы 2.0×0.95 м)", quantity: realArea / sheetAreaOndulin, unit: "шт", withReserve: sheets, purchaseQty: sheets, category: "Кровля" },
          { name: "Коньковые элементы ондулин", quantity: ridgeElements, unit: "шт", withReserve: ridgeElements, purchaseQty: ridgeElements, category: "Доборные элементы" },
          { name: "Гвозди для ондулина (уп. 100 шт)", quantity: sheets * 20, unit: "шт", withReserve: Math.ceil(sheets * 20 * 1.05), purchaseQty: Math.ceil(sheets * 20 * 1.05 / 100), category: "Крепёж" },
          { name: "Ветровая (торцевая) планка 2 м", quantity: 2 * Math.sqrt(realArea / 2), unit: "шт", withReserve: Math.ceil(2 * Math.sqrt(realArea / 2) * 1.1 / 2), purchaseQty: Math.ceil(2 * Math.sqrt(realArea / 2) * 1.1 / 2), category: "Доборные элементы" },
        ],
        totals: { area, realArea, slope, sheets } as Record<string, number>,
        warnings,
      };
    } else if (type === 4) {
      // Шифер
      const sheetAreaSlate = 1.5;
      const sheets = Math.ceil((realArea / sheetAreaSlate) * 1.10);
      return {
        materials: [
          { name: "Шифер (листы 1.75×1.13 м)", quantity: realArea / sheetAreaSlate, unit: "шт", withReserve: sheets, purchaseQty: sheets, category: "Кровля" },
          { name: "Конёк шифера", quantity: Math.ceil(ridgeLength), unit: "м.п.", withReserve: Math.ceil(ridgeLength), purchaseQty: Math.ceil(ridgeLength), category: "Доборные элементы" },
          { name: "Гвозди шиферные 3.5×90 мм (с резиновой шайбой)", quantity: (sheets * 6 * 8.0) / 1000, unit: "кг", withReserve: Math.ceil(sheets * 6 * 1.05 * 8.0 / 500) / 2, purchaseQty: Math.ceil(sheets * 6 * 1.05 * 8.0 / 500) / 2, category: "Крепёж" },
          { name: "Ветровая (торцевая) планка 2 м", quantity: 2 * Math.sqrt(realArea / 2), unit: "шт", withReserve: Math.ceil(2 * Math.sqrt(realArea / 2) * 1.1 / 2), purchaseQty: Math.ceil(2 * Math.sqrt(realArea / 2) * 1.1 / 2), category: "Доборные элементы" },
        ],
        totals: { area, realArea, slope, sheets } as Record<string, number>,
        warnings,
      };
    } else {
      // Керамическая черепица
      if (slope < 22) warnings.push("Керамическая черепица требует уклон от 22°");
      const tiles = Math.ceil(realArea * 12 * 1.05);
      const ridgeTiles = Math.ceil(ridgeLength * 3);
      const battens = Math.ceil((realArea / 0.32) * 1.05);
      return {
        materials: [
          { name: "Керамическая черепица", quantity: realArea * 12, unit: "шт", withReserve: tiles, purchaseQty: tiles, category: "Кровля" },
          { name: "Коньковая черепица", quantity: ridgeTiles, unit: "шт", withReserve: ridgeTiles, purchaseQty: ridgeTiles, category: "Доборные элементы" },
          { name: "Гидроизоляция", quantity: realArea, unit: "м²", withReserve: Math.ceil(realArea * 1.10), purchaseQty: Math.ceil(realArea * 1.10 / 65), category: "Гидроизоляция" },
          { name: "Обрешётка (шаг 320 мм)", quantity: battens, unit: "м.п.", withReserve: battens, purchaseQty: Math.ceil(battens), category: "Обрешётка" },
          { name: "Ветровая (торцевая) планка 2 м", quantity: 2 * Math.sqrt(realArea / 2), unit: "шт", withReserve: Math.ceil(2 * Math.sqrt(realArea / 2) * 1.1 / 2), purchaseQty: Math.ceil(2 * Math.sqrt(realArea / 2) * 1.1 / 2), category: "Доборные элементы" },
        ],
        totals: { area, realArea, slope, tiles } as Record<string, number>,
        warnings,
      };
    }
  },
  formulaDescription: `
**Реальная площадь кровли:**
S_реал = S_план × (1 / cos(угол_уклона))

Например, при уклоне 30° коэффициент = 1.155 (площадь больше на 15.5%)

**Нормы укладки:**
- Металлочерепица: нахлёст ≥ 150 мм, шаг обрешётки = шаг волны
- Профнастил: нахлёст 1 волна при уклоне > 14°, 2 волны при меньшем
- Мягкая черепица: уклон от 12°, сплошная обрешётка ОСБ или фанера
- Ондулин: полезная площадь листа 1.6 м²
  `,
  howToUse: [
    "Выберите тип кровельного материала",
    "Введите площадь кровли в горизонтальной проекции (измеряется по периметру здания)",
    "Укажите уклон крыши в градусах (типичный: 25–35°)",
    "Введите длину конька и размеры листов",
    "Нажмите «Рассчитать» — получите полный список материалов с запасом",
  ],
};
