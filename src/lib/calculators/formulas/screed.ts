import type { CalculatorDefinition } from "../types";

export const screedDef: CalculatorDefinition = {
  id: "screed",
  slug: "styazhka",
  title: "Калькулятор стяжки пола",
  h1: "Калькулятор стяжки пола онлайн — расчёт цемента и песка",
  description: "Рассчитайте количество цемента, песка и воды для цементно-песчаной стяжки. Учёт толщины слоя.",
  metaTitle: "Калькулятор стяжки пола | Расчёт цемента и ЦПС — Мастерок",
  metaDescription: "Бесплатный калькулятор стяжки: рассчитайте цемент, песок и ЦПС для цементно-песчаной стяжки пола. Учёт площади и толщины по нормам.",
  category: "flooring",
  categorySlug: "poly",
  tags: ["стяжка", "цементная стяжка", "ЦПС", "цемент", "пол", "наливной пол"],
  popularity: 75,
  complexity: 2,
  fields: [
    {
      key: "inputMode",
      label: "Способ ввода",
      type: "radio",
      defaultValue: 0,
      options: [
        { value: 0, label: "По размерам помещения" },
        { value: 1, label: "По площади" },
      ],
    },
    {
      key: "length",
      label: "Длина помещения",
      type: "slider",
      unit: "м",
      min: 0.5,
      max: 50,
      step: 0.5,
      defaultValue: 5,
      group: "bySize",
    },
    {
      key: "width",
      label: "Ширина помещения",
      type: "slider",
      unit: "м",
      min: 0.5,
      max: 50,
      step: 0.5,
      defaultValue: 4,
      group: "bySize",
    },
    {
      key: "area",
      label: "Площадь",
      type: "slider",
      unit: "м²",
      min: 1,
      max: 1000,
      step: 1,
      defaultValue: 20,
      group: "byArea",
    },
    {
      key: "thickness",
      label: "Толщина стяжки",
      type: "slider",
      unit: "мм",
      min: 30,
      max: 200,
      step: 5,
      defaultValue: 50,
      hint: "Минимум по СНиП: 30 мм для армирования, 40 мм для тёплого пола",
    },
    {
      key: "screedType",
      label: "Тип стяжки",
      type: "select",
      defaultValue: 0,
      options: [
        { value: 0, label: "ЦПС (цемент + песок 1:3)" },
        { value: 1, label: "Готовая ЦПС М150 (мешки 40/50 кг)" },
        { value: 2, label: "Полусухая стяжка" },
      ],
    },
  ],
  calculate(inputs): import("../types").CalculatorResult {
    const inputMode = Math.round(inputs.inputMode ?? 0);
    let area: number;
    if (inputMode === 0) {
      const l = Math.max(0.5, inputs.length ?? 5);
      const w = Math.max(0.5, inputs.width ?? 4);
      area = l * w;
    } else {
      area = Math.max(1, inputs.area ?? 20);
    }

    const thicknessMm = Math.max(30, Math.min(200, inputs.thickness ?? 50));
    const thicknessM = thicknessMm / 1000;
    const type = Math.round(inputs.screedType ?? 0);

    const volume = area * thicknessM * 1.08; // +8% на неровности основания и потери

    const warnings: string[] = [];
    if (thicknessMm < 30) warnings.push("Минимальная толщина стяжки по СНиП — 30 мм");
    if (thicknessMm > 100) warnings.push("При толщине > 100 мм рекомендуется армирование сеткой 150×150 мм");

    if (type === 0) {
      // ЦПС 1:3 (цемент М400 + песок)
      const cementM3 = volume / 4; // 1 часть цемента из 4
      const sandM3 = volume * 3 / 4;
      const cementKg = cementM3 * 1300; // насыпная плотность ПЦ М400 — 1300 кг/м³
      const cementBags = Math.ceil(cementKg / 50);
      const sandTon = Math.ceil(sandM3 * 1.6 * 10) / 10;
      const waterL = volume * 200; // ~200 л/м³

      if (thicknessMm >= 80) {
        warnings.push("При толщине ≥ 80 мм: укладывайте слоями по 50–60 мм с технологическим перерывом");
      }

      // Периметр для демпферной ленты
      const perimeter = inputMode === 0
        ? 2 * (Math.max(0.5, inputs.length ?? 5) + Math.max(0.5, inputs.width ?? 4))
        : Math.sqrt(area) * 4;

      // Армосетка при толщине >= 40 мм
      const needMesh = thicknessMm >= 40;
      const meshArea = needMesh ? Math.ceil(area * 1.15) : 0; // +15% нахлёст

      return {
        materials: [
          { name: "Цемент М400 (мешки 50 кг)", quantity: cementBags, unit: "мешков", withReserve: cementBags, purchaseQty: cementBags, category: "Компоненты" },
          { name: "Песок строительный", quantity: sandM3 * 1.6, unit: "т", withReserve: sandTon, purchaseQty: Math.ceil(sandTon), category: "Компоненты" },
          { name: "Вода", quantity: waterL, unit: "л", withReserve: waterL, purchaseQty: Math.ceil(waterL), category: "Компоненты" },
          { name: "Плёнка полиэтиленовая (рулон 3×50 м)", quantity: area / 150, unit: "рулонов", withReserve: Math.ceil(area * 1.15 / 150), purchaseQty: Math.max(1, Math.ceil(area * 1.15 / 150)), category: "Гидроизоляция" },
          ...(needMesh ? [{ name: "Сетка армировочная 150×150 Ø4 мм (карта 2×0.5 м)", quantity: meshArea, unit: "м²", withReserve: meshArea, purchaseQty: Math.ceil(meshArea), category: "Армирование" }] : []),
          { name: "Маяки штукатурные 10 мм (3 м)", quantity: Math.ceil(perimeter / 1.2) * 2, unit: "шт", withReserve: Math.ceil(perimeter / 1.2 * 2 * 1.1), purchaseQty: Math.ceil(perimeter / 1.2 * 2 * 1.1), category: "Маяки" },
          { name: "Демпферная лента (рулон 50 м)", quantity: perimeter / 50, unit: "рулонов", withReserve: Math.max(1, Math.ceil(perimeter / 50)), purchaseQty: Math.max(1, Math.ceil(perimeter / 50)), category: "Доп. материалы" },
        ],
        totals: { area, thicknessMm, volume, cementKg } as Record<string, number>,
        warnings,
      };
    } else if (type === 1) {
      // Готовая ЦПС М150
      const cpsKgPerM3 = 2000; // насыпная плотность ~2000 кг/м³
      const cpsTotalKg = volume * cpsKgPerM3;
      const bags50 = Math.ceil(cpsTotalKg / 50);
      const bags40 = Math.ceil(cpsTotalKg / 40);

      const perimeter2 = inputMode === 0
        ? 2 * (Math.max(0.5, inputs.length ?? 5) + Math.max(0.5, inputs.width ?? 4))
        : Math.sqrt(area) * 4;
      const needMesh2 = thicknessMm >= 40;
      const meshArea2 = needMesh2 ? Math.ceil(area * 1.15) : 0;

      return {
        materials: [
          { name: "ЦПС М150 (мешки 50 кг)", quantity: cpsTotalKg / 50, unit: "мешков", withReserve: bags50, purchaseQty: bags50, category: "Основное" },
          { name: "ЦПС М150 (мешки 40 кг, альтернатива)", quantity: cpsTotalKg / 40, unit: "мешков", withReserve: bags40, purchaseQty: bags40, category: "Основное" },
          { name: "Плёнка полиэтиленовая (рулон 3×50 м)", quantity: area / 150, unit: "рулонов", withReserve: Math.max(1, Math.ceil(area * 1.15 / 150)), purchaseQty: Math.max(1, Math.ceil(area * 1.15 / 150)), category: "Гидроизоляция" },
          ...(needMesh2 ? [{ name: "Сетка армировочная 150×150 Ø4 мм (карта 2×0.5 м)", quantity: meshArea2, unit: "м²", withReserve: meshArea2, purchaseQty: Math.ceil(meshArea2), category: "Армирование" }] : []),
          { name: "Маяки штукатурные 10 мм (3 м)", quantity: Math.ceil(perimeter2 / 1.2) * 2, unit: "шт", withReserve: Math.ceil(perimeter2 / 1.2 * 2 * 1.1), purchaseQty: Math.ceil(perimeter2 / 1.2 * 2 * 1.1), category: "Маяки" },
          { name: "Демпферная лента (рулон 50 м)", quantity: perimeter2 / 50, unit: "рулонов", withReserve: Math.max(1, Math.ceil(perimeter2 / 50)), purchaseQty: Math.max(1, Math.ceil(perimeter2 / 50)), category: "Доп. материалы" },
        ],
        totals: { area, thicknessMm, volume, cpsTotalKg } as Record<string, number>,
        warnings,
      };
    } else {
      // Полусухая стяжка
      const cpsKg = volume * 1800; // меньше воды → больше цемента относительно
      const bags = Math.ceil(cpsKg / 50);
      const fiberKg = area * 0.6; // фиброволокно 0.6 кг/м²

      warnings.push("Полусухая стяжка требует специального оборудования (пневмонагнетатель)");

      const perimeter3 = inputMode === 0
        ? 2 * (Math.max(0.5, inputs.length ?? 5) + Math.max(0.5, inputs.width ?? 4))
        : Math.sqrt(area) * 4;

      return {
        materials: [
          { name: "ЦПС М150 для полусухой (мешки 50 кг)", quantity: cpsKg / 50, unit: "мешков", withReserve: bags, purchaseQty: bags, category: "Основное" },
          { name: "Фиброволокно полипропиленовое", quantity: fiberKg, unit: "кг", withReserve: Math.ceil(fiberKg * 10) / 10, purchaseQty: Math.ceil(fiberKg), category: "Армирование" },
          { name: "Плёнка полиэтиленовая (рулон 3×50 м)", quantity: area / 150, unit: "рулонов", withReserve: Math.max(1, Math.ceil(area * 1.15 / 150)), purchaseQty: Math.max(1, Math.ceil(area * 1.15 / 150)), category: "Гидроизоляция" },
          { name: "Демпферная лента (рулон 50 м)", quantity: perimeter3 / 50, unit: "рулонов", withReserve: Math.max(1, Math.ceil(perimeter3 / 50)), purchaseQty: Math.max(1, Math.ceil(perimeter3 / 50)), category: "Доп. материалы" },
        ],
        totals: { area, thicknessMm, volume } as Record<string, number>,
        warnings,
      };
    }
  },
  formulaDescription: `
**Расчёт стяжки:**
Объём (м³) = Площадь × Толщина × 1.15 (запас на усадку)

Пропорция ЦПС 1:3:
- Цемент: 1/4 от объёма = ~300 кг/м³
- Песок: 3/4 от объёма = ~900 кг/м³ ≈ 1.4 т

Готовая ЦПС М150: ~2000 кг/м³ (плотность смеси)

По СНиП 3.04.01-87: минимальная толщина стяжки — 30 мм
  `,
  howToUse: [
    "Введите размеры помещения или площадь",
    "Укажите толщину стяжки (обычно 40–70 мм, минимум 30 мм)",
    "Выберите тип: самомесная ЦПС 1:3 или готовая в мешках",
    "Нажмите «Рассчитать» — получите цемент, песок или мешки ЦПС",
  ],
};
