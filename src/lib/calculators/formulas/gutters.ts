import type { CalculatorDefinition } from "../types";

export const guttersDef: CalculatorDefinition = {
  id: "roofing_gutters",
  slug: "vodostok",
  title: "Калькулятор водосточной системы",
  h1: "Калькулятор водостока онлайн — расчёт труб и желобов",
  description: "Рассчитайте количество желобов, труб, воронок и крепежа для водосточной системы. Технониколь, Docke, Profil.",
  metaTitle: "Калькулятор водостока | Расчёт водосточной системы — Мастерок",
  metaDescription: "Бесплатный калькулятор водостока: рассчитайте желоба, трубы, воронки и держатели для Технониколь, Docke, Profil по периметру кровли.",
  category: "roofing",
  categorySlug: "krovlya",
  tags: ["водосток", "водосточная система", "желоб", "Технониколь", "Docke"],
  popularity: 58,
  complexity: 1,
  fields: [
    {
      key: "roofPerimeter",
      label: "Периметр кровли",
      type: "slider",
      unit: "м",
      min: 5,
      max: 200,
      step: 1,
      defaultValue: 40,
      hint: "Сумма длин всех карнизных свесов, где устанавливается желоб",
    },
    {
      key: "roofHeight",
      label: "Высота стены (от карниза до отмостки)",
      type: "slider",
      unit: "м",
      min: 2,
      max: 15,
      step: 0.5,
      defaultValue: 5,
    },
    {
      key: "funnels",
      label: "Количество водосточных воронок",
      type: "slider",
      unit: "шт",
      min: 1,
      max: 20,
      step: 1,
      defaultValue: 4,
      hint: "Одна воронка на 10–12 м желоба",
    },
    {
      key: "gutterDia",
      label: "Диаметр системы",
      type: "select",
      defaultValue: 90,
      options: [
        { value: 75, label: "75 мм (малые строения)" },
        { value: 90, label: "90 мм (жилые дома)" },
        { value: 110, label: "110 мм (большие площади)" },
        { value: 125, label: "125 мм (коммерческие здания)" },
      ],
    },
    {
      key: "gutterLength",
      label: "Длина элементов",
      type: "select",
      defaultValue: 3,
      options: [
        { value: 3, label: "3 м (стандарт)" },
        { value: 4, label: "4 м" },
      ],
    },
  ],
  calculate(inputs): import("../types").CalculatorResult {
    const perimeter = Math.max(5, inputs.roofPerimeter ?? 40);
    const height = Math.max(2, inputs.roofHeight ?? 5);
    const funnels = Math.max(1, Math.round(inputs.funnels ?? 4));
    const elemLen = inputs.gutterLength ?? 3;

    // Желоба
    const gutterPcs = Math.ceil((perimeter / elemLen) * 1.05);

    // Трубы (на каждую воронку — труба от карниза до земли)
    const pipePerFunnel = Math.ceil(height / elemLen) + 1; // +1 на изгиб у земли
    const pipePcs = pipePerFunnel * funnels;

    // Соединители желобов
    const gutterJoints = Math.ceil(perimeter / elemLen) - 1;

    // Держатели желоба: через каждые 600 мм
    const gutterHooks = Math.ceil((perimeter / 0.6) * 1.05);

    // Хомуты для трубы: через каждые 1.5 м
    const pipeClamps = Math.ceil((height / 1.5) * funnels * 1.05);

    // Угловые элементы: по 2 на угол здания (≈4 угла)
    const corners = 8; // 4 наружных угла × 2

    const warnings: string[] = [];
    const recommendedFunnels = Math.ceil(perimeter / 11);
    if (funnels < recommendedFunnels) {
      warnings.push(`Рекомендуется ${recommendedFunnels} воронок (1 на 10–12 м желоба)`);
    }

    return {
      materials: [
        {
          name: `Желоб ${inputs.gutterDia ?? 90} мм (${elemLen} м)`,
          quantity: perimeter / elemLen,
          unit: "шт",
          withReserve: gutterPcs,
          purchaseQty: gutterPcs,
          category: "Желоб",
        },
        {
          name: `Труба водосточная ${inputs.gutterDia ?? 90} мм (${elemLen} м)`,
          quantity: (height / elemLen) * funnels,
          unit: "шт",
          withReserve: pipePcs,
          purchaseQty: pipePcs,
          category: "Труба",
        },
        {
          name: "Воронка",
          quantity: funnels,
          unit: "шт",
          withReserve: funnels,
          purchaseQty: funnels,
          category: "Фитинги",
        },
        {
          name: "Соединитель желобов",
          quantity: gutterJoints,
          unit: "шт",
          withReserve: Math.ceil(gutterJoints * 1.05),
          purchaseQty: Math.ceil(gutterJoints * 1.05),
          category: "Фитинги",
        },
        {
          name: "Колено сливное",
          quantity: funnels,
          unit: "шт",
          withReserve: funnels,
          purchaseQty: funnels,
          category: "Фитинги",
        },
        {
          name: "Заглушки торцевые (пара)",
          quantity: funnels,
          unit: "пар",
          withReserve: funnels,
          purchaseQty: funnels,
          category: "Фитинги",
        },
        {
          name: "Держатель желоба",
          quantity: perimeter / 0.6,
          unit: "шт",
          withReserve: gutterHooks,
          purchaseQty: gutterHooks,
          category: "Крепёж",
        },
        {
          name: "Хомут трубы",
          quantity: (height / 1.5) * funnels,
          unit: "шт",
          withReserve: pipeClamps,
          purchaseQty: pipeClamps,
          category: "Крепёж",
        },
        {
          name: "Угловой элемент желоба",
          quantity: corners,
          unit: "шт",
          withReserve: corners,
          purchaseQty: corners,
          category: "Углы",
        },
        {
          name: "Герметик для стыков водосточной системы (туба 310 мл, ~20 соединений)",
          quantity: (gutterJoints + funnels * 2) / 20,
          unit: "туб",
          withReserve: Math.ceil((gutterJoints + funnels * 2) / 20),
          purchaseQty: Math.max(1, Math.ceil((gutterJoints + funnels * 2) / 20)),
          category: "Герметик",
        },
      ],
      totals: { perimeter, funnels, pipePcs, gutterPcs } as Record<string, number>,
      warnings,
    };
  },
  formulaDescription: `
**Расчёт водосточной системы:**
- Желоба: Периметр / Длина_элемента × 1.05
- Трубы: на каждую воронку (Высота / Длина_элемента + 1)
- Держатели желоба: шаг 600 мм
- Хомуты труб: шаг 1500 мм
- Воронки: 1 на каждые 10–12 м желоба
  `,
  howToUse: [
    "Введите периметр кровли (длина карнизных свесов)",
    "Укажите высоту стены от карниза до земли",
    "Задайте количество воронок (1 на 10–12 м)",
    "Выберите диаметр системы",
    "Нажмите «Рассчитать» — получите полный список элементов",
  ],
};
