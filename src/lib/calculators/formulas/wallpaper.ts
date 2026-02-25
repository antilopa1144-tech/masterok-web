import type { CalculatorDefinition } from "../types";

export const wallpaperDef: CalculatorDefinition = {
  id: "wallpaper",
  slug: "oboi",
  title: "Калькулятор обоев",
  h1: "Калькулятор обоев онлайн — расчёт количества рулонов",
  description: "Рассчитайте точное количество рулонов обоев с учётом высоты комнаты, дверей, окон и раппорта.",
  metaTitle: "Калькулятор обоев онлайн | Расчёт рулонов — Мастерок",
  metaDescription: "Бесплатный калькулятор обоев: рассчитайте количество рулонов с учётом окон, дверей и раппорта узора. Правильный расчёт без лишних рулонов.",
  category: "interior",
  categorySlug: "otdelka",
  tags: ["обои", "рулоны", "оклейка", "ремонт", "стены"],
  popularity: 78,
  complexity: 1,
  fields: [
    {
      key: "perimeter",
      label: "Периметр комнаты",
      type: "slider",
      unit: "м",
      min: 5,
      max: 60,
      step: 0.5,
      defaultValue: 14,
      hint: "Сумма длин всех стен",
    },
    {
      key: "height",
      label: "Высота помещения",
      type: "slider",
      unit: "м",
      min: 2.0,
      max: 5.0,
      step: 0.05,
      defaultValue: 2.7,
    },
    {
      key: "rollLength",
      label: "Длина рулона",
      type: "slider",
      unit: "м",
      min: 5,
      max: 25,
      step: 1,
      defaultValue: 10,
      hint: "Стандарт — 10 м, европейский — 10.05 м",
    },
    {
      key: "rollWidth",
      label: "Ширина рулона",
      type: "slider",
      unit: "мм",
      min: 530,
      max: 1060,
      step: 10,
      defaultValue: 530,
      hint: "Стандарт: 530 мм (0.53 м) или 1060 мм",
    },
    {
      key: "rapport",
      label: "Раппорт (подгонка узора)",
      type: "slider",
      unit: "см",
      min: 0,
      max: 64,
      step: 1,
      defaultValue: 0,
      hint: "Если рисунок без подгонки — 0",
    },
    {
      key: "doors",
      label: "Количество дверей",
      type: "slider",
      unit: "шт",
      min: 0,
      max: 10,
      step: 1,
      defaultValue: 1,
    },
    {
      key: "windows",
      label: "Количество окон",
      type: "slider",
      unit: "шт",
      min: 0,
      max: 10,
      step: 1,
      defaultValue: 1,
    },
  ],
  calculate(inputs) {
    const perimeter = Math.max(5, inputs.perimeter ?? 14);
    const height = Math.max(2, inputs.height ?? 2.7);
    const rollLength = Math.max(5, inputs.rollLength ?? 10);
    const rollWidthM = (inputs.rollWidth ?? 530) / 1000;
    const rapport = (inputs.rapport ?? 0) / 100; // в метры
    const doors = Math.round(inputs.doors ?? 1);
    const windows = Math.round(inputs.windows ?? 1);

    // Высота полосы с учётом раппорта
    const stripHeight = rapport > 0
      ? Math.ceil(height / rapport) * rapport
      : height;

    // Полос из одного рулона
    const stripsPerRoll = Math.floor(rollLength / stripHeight);

    // Общая длина стен
    const wallArea = perimeter * height;

    // Вычитаем проёмы: дверь ~1.9×0.9=1.71 м², окно ~1.4×1.2=1.68 м²
    const openingsArea = doors * 1.71 + windows * 1.68;
    const netArea = Math.max(0, wallArea - openingsArea);

    // Количество полос
    const totalStrips = Math.ceil(netArea / (rollWidthM * height));

    // Рулонов с запасом 1 полоса
    const rolls = Math.ceil(totalStrips / stripsPerRoll) + 1;

    // Клей: 1 пачка ~20 л → ~50 м² при разведении
    const gluePackets = Math.ceil(netArea / 50);

    const warnings: string[] = [];
    if (rapport > 0.32) warnings.push("Большой раппорт узора — отходы могут значительно превысить расчётные. Закупите на 1-2 рулона больше");
    if (rollWidthM > 0.7) warnings.push("Широкие обои (1.06 м) сложнее клеить — рекомендуется опыт или помощник");

    return {
      materials: [
        {
          name: "Обои",
          quantity: totalStrips / stripsPerRoll,
          unit: "рулонов",
          withReserve: rolls,
          purchaseQty: rolls,
          category: "Основное",
        },
        {
          name: "Клей обойный (пачка)",
          quantity: netArea / 50,
          unit: "пачек",
          withReserve: gluePackets,
          purchaseQty: gluePackets,
          category: "Клей",
        },
        {
          name: "Грунтовка глубокого проникновения (канистра 10 л)",
          quantity: wallArea * 0.3,
          unit: "л",
          withReserve: wallArea * 0.3 * 1.15,
          purchaseQty: Math.ceil((wallArea * 0.3 * 1.15) / 10) * 10,
          category: "Грунтовка",
        },
        {
          name: "Валик для обойного клея",
          quantity: 1,
          unit: "шт",
          withReserve: 1,
          purchaseQty: 1,
          category: "Инструмент",
        },
        {
          name: "Пластиковый шпатель для обоев",
          quantity: 1,
          unit: "шт",
          withReserve: 1,
          purchaseQty: 1,
          category: "Инструмент",
        },
      ],
      totals: {
        wallArea,
        netArea,
        perimeter,
        rollsNeeded: rolls,
        stripsPerRoll,
      },
      warnings,
    };
  },
  formulaDescription: `
**Расчёт обоев:**
1. Площадь стен = Периметр × Высота
2. Чистая площадь = Площадь − Площадь_проёмов
3. Полос из рулона = Длина_рулона / Высота_полосы_с_раппортом
4. Рулонов = ⌈Общее_число_полос / Полос_из_рулона⌉ + 1 (запас)

Стандартный рулон: 10 × 0.53 м = 5.3 м²
Площадь одного проёма: дверь ~1.7 м², окно ~1.7 м²
  `,
  howToUse: [
    "Измерьте периметр комнаты (сумму длин всех стен)",
    "Укажите высоту помещения",
    "Введите параметры рулона (написаны на упаковке)",
    "Укажите раппорт (подгонку узора) — 0, если обои однотонные",
    "Введите количество дверей и окон для вычета",
    "Нажмите «Рассчитать» — получите рулоны с запасом и количество клея",
  ],
};
