import type { CalculatorDefinition } from "../types";

export const paintDef: CalculatorDefinition = {
  id: "paint",
  slug: "kraska",
  title: "Калькулятор краски",
  h1: "Калькулятор краски онлайн — расчёт количества краски для стен и потолка",
  description: "Рассчитайте точное количество краски для стен, потолка или фасада. Учёт количества слоёв и типа поверхности.",
  metaTitle: "Калькулятор краски онлайн | Расчёт краски — Мастерок",
  metaDescription: "Бесплатный калькулятор краски: рассчитайте литраж краски для стен и потолка с учётом количества слоёв, впитываемости и площади.",
  category: "interior",
  categorySlug: "otdelka",
  tags: ["краска", "покраска", "стены", "потолок", "фасад", "расход краски"],
  popularity: 72,
  complexity: 1,
  fields: [
    {
      key: "area",
      label: "Площадь поверхности",
      type: "slider",
      unit: "м²",
      min: 1,
      max: 1000,
      step: 1,
      defaultValue: 40,
    },
    {
      key: "coats",
      label: "Количество слоёв",
      type: "select",
      defaultValue: 2,
      options: [
        { value: 1, label: "1 слой (подкраска)" },
        { value: 2, label: "2 слоя (стандарт)" },
        { value: 3, label: "3 слоя (тёмные цвета, экономные краски)" },
      ],
    },
    {
      key: "surfaceType",
      label: "Тип поверхности",
      type: "select",
      defaultValue: 0,
      options: [
        { value: 0, label: "Гладкая шпатлёванная" },
        { value: 1, label: "Бетон, штукатурка" },
        { value: 2, label: "Пористая (газоблок, кирпич)" },
        { value: 3, label: "Дерево" },
      ],
    },
    {
      key: "consumption",
      label: "Расход краски (на упаковке)",
      type: "slider",
      unit: "м²/л",
      min: 5,
      max: 20,
      step: 0.5,
      defaultValue: 10,
      hint: "Указан на упаковке краски. Типичный расход 8–14 м²/л",
    },
  ],
  calculate(inputs) {
    const area = Math.max(1, inputs.area ?? 40);
    const coats = Math.round(Math.max(1, Math.min(3, inputs.coats ?? 2)));
    const surfaceType = Math.round(inputs.surfaceType ?? 0);
    const consumption = Math.max(5, inputs.consumption ?? 10); // м²/л

    // Коэффициент для типа поверхности
    const surfaceCoeff: Record<number, number> = {
      0: 1.0,  // гладкая
      1: 1.15, // бетон/штукатурка
      2: 1.30, // пористая
      3: 1.10, // дерево
    };
    const coeff = surfaceCoeff[surfaceType] ?? 1.0;

    const litersNeeded = (area / consumption) * coats * coeff;
    const litersWithReserve = litersNeeded * 1.10; // +10% запас

    // Тара: 3 л, 5 л, 10 л, 15 л — берём оптимальную
    const sizes = [3, 5, 10, 15];
    let bestCans = 0;
    let bestSize = 5;
    for (const size of sizes) {
      const cans = Math.ceil(litersWithReserve / size);
      if (bestCans === 0 || cans * size < bestCans * bestSize) {
        bestCans = cans;
        bestSize = size;
      }
    }

    // Грунтовка: 1 слой, ~8–12 м²/л
    const primerLiters = Math.ceil((area / 10) * 1.10);

    const warnings: string[] = [];
    if (surfaceType >= 2) warnings.push("Для пористых поверхностей: обязательно нанесите грунтовку перед покраской");
    if (coats === 1) warnings.push("Один слой не обеспечит равномерного покрытия. Рекомендуется 2 слоя");

    return {
      materials: [
        {
          name: `Краска (банки ${bestSize} л)`,
          quantity: litersWithReserve / bestSize,
          unit: "банок",
          withReserve: bestCans,
          purchaseQty: bestCans,
          category: "Основное",
        },
        {
          name: "Краска (литры)",
          quantity: litersNeeded,
          unit: "л",
          withReserve: litersWithReserve,
          purchaseQty: Math.ceil(litersWithReserve),
          category: "Основное",
        },
        {
          name: "Грунтовка (банка 10 л)",
          quantity: primerLiters / 10,
          unit: "банок",
          withReserve: Math.ceil(primerLiters / 10),
          purchaseQty: Math.ceil(primerLiters / 10),
          category: "Грунтовка",
        },
        {
          name: "Валик малярный 250 мм",
          quantity: Math.max(1, Math.ceil(area / 50)),
          unit: "шт",
          withReserve: Math.max(1, Math.ceil(area / 50)),
          purchaseQty: Math.max(1, Math.ceil(area / 50)),
          category: "Инструмент",
        },
        {
          name: "Кювета для краски",
          quantity: 1,
          unit: "шт",
          withReserve: 1,
          purchaseQty: 1,
          category: "Инструмент",
        },
        {
          name: "Малярная лента 50 мм (рулон 50 м)",
          quantity: Math.sqrt(area) * 4 / 50,
          unit: "рулон",
          withReserve: (Math.sqrt(area) * 4 * 1.1) / 50,
          purchaseQty: Math.max(1, Math.ceil((Math.sqrt(area) * 4 * 1.1) / 50)),
          category: "Расходники",
        },
        {
          name: "Плёнка защитная (рулон 30 м²)",
          quantity: area / 30,
          unit: "рулон",
          withReserve: (area * 1.1) / 30,
          purchaseQty: Math.max(1, Math.ceil((area * 1.1) / 30)),
          category: "Расходники",
        },
      ],
      totals: {
        area,
        litersNeeded,
        litersWithReserve,
        coats,
      },
      warnings,
    };
  },
  formulaDescription: `
**Расчёт краски:**
Литров = (Площадь / Расход) × Слои × Коэффициент_поверхности

Коэффициент поверхности:
- Гладкая: ×1.0
- Штукатурка/бетон: ×1.15
- Пористая: ×1.30
- Дерево: ×1.10

Запас: +10%

Типичный расход краски: 8–14 м²/л
  `,
  howToUse: [
    "Введите общую площадь окрашиваемой поверхности",
    "Укажите количество слоёв (стандарт — 2)",
    "Выберите тип поверхности",
    "Введите расход краски из инструкции на упаковке",
    "Нажмите «Рассчитать» — получите литраж и количество банок",
  ],
};
