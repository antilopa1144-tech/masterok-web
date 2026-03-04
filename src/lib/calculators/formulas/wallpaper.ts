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
          name: "Пластиковый шпатель (крыло) для обоев",
          quantity: 1,
          unit: "шт",
          withReserve: 1,
          purchaseQty: 1,
          category: "Инструмент",
        },
        {
          name: "Нож малярный (со сменными лезвиями)",
          quantity: 1,
          unit: "шт",
          withReserve: 1,
          purchaseQty: 1,
          category: "Инструмент",
        },
        {
          name: "Запасные лезвия для ножа (уп. 10 шт)",
          quantity: 1,
          unit: "уп",
          withReserve: 1,
          purchaseQty: 1,
          category: "Расходники",
        },
        {
          name: "Ведро для клея (10-12 л)",
          quantity: 1,
          unit: "шт",
          withReserve: 1,
          purchaseQty: 1,
          category: "Инструмент",
        },
        {
          name: "Губка поролоновая (для удаления клея)",
          quantity: 2,
          unit: "шт",
          withReserve: 2,
          purchaseQty: 2,
          category: "Расходники",
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
**Расчёт обоев (практика отделочников):**

1. **Полосы**: Считаются по периметру. Из одного рулона 10 м обычно выходит 3 целых полосы при высоте потолка 2.7 м и наличии рисунка.
2. **Запас**: Мы всегда добавляем +1 рулон к расчёту. Он нужен на случай брака, повреждения полотна или будущих подклеек.
3. **Клей**: Расход зависит от типа обоев (флизелин/винил). Наносите клей на стену, если иное не указано на рулоне.
4. **Инструмент**: Острый нож — залог ровного стыка у плинтуса. Меняйте лезвие каждые 3-4 полосы.
  `,
  howToUse: [
    "Измерьте периметр комнаты и высоту потолков",
    "Укажите параметры рулона и раппорт (шаг рисунка)",
    "Нажмите «Рассчитать» — получите список рулонов, клея и необходимых инструментов",
  ],
  expertTips: [
    {
      title: "Партия обоев",
      content: "При покупке обязательно проверяйте номер партии (Batch No) на всех рулонах. Обои из разных партий могут отличаться по оттенку, что будет заметно на стене.",
      author: "Мастер-отделочник"
    },
    {
      title: "Сквозняки",
      content: "После оклейки обоев окна и двери должны быть закрыты минимум 24 часа. Сквозняк приведет к неравномерному высыханию и расхождению швов.",
      author: "Прораб"
    }
  ],
  faq: [
    {
      question: "Нужно ли мазать клеем сами обои?",
      answer: "Современные флизелиновые обои не требуют нанесения клея на полотно — мажется только стена. Бумажные и виниловые на бумажной основе нужно мазать и выдерживать 5-7 минут."
    },
    {
      question: "Как убрать пузыри?",
      answer: "Если пузырь не уходит при разглаживании шпателем, аккуратно проколите его шприцем с клеем, введите немного клея и прижмите."
    }
  ]
};
