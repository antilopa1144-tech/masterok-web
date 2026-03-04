import type { CalculatorDefinition } from "../types";

export const laminateDef: CalculatorDefinition = {
  id: "laminate",
  slug: "laminat",
  title: "Калькулятор ламината",
  h1: "Калькулятор ламината онлайн — расчёт количества упаковок",
  description: "Рассчитайте количество упаковок ламината, подложки и плинтуса для вашей комнаты. Учёт способа укладки.",
  metaTitle: "Калькулятор ламината онлайн | Расчёт упаковок — Мастерок",
  metaDescription: "Бесплатный калькулятор ламината: рассчитайте точное количество упаковок с учётом способа укладки, подложки и плинтуса. Быстро и без ошибок.",
  category: "flooring",
  categorySlug: "poly",
  tags: ["ламинат", "напольное покрытие", "подложка", "плинтус", "пол"],
  popularity: 82,
  complexity: 1,
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
      min: 1,
      max: 30,
      step: 0.1,
      defaultValue: 5,
      group: "bySize",
    },
    {
      key: "width",
      label: "Ширина комнаты",
      type: "slider",
      unit: "м",
      min: 1,
      max: 30,
      step: 0.1,
      defaultValue: 4,
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
      defaultValue: 20,
      group: "byArea",
    },
    {
      key: "packArea",
      label: "Площадь упаковки",
      type: "slider",
      unit: "м²",
      min: 1,
      max: 5,
      step: 0.001,
      defaultValue: 2.397,
      hint: "Указано на упаковке. Популярные: 2.397, 2.178, 1.9965 м²",
    },
    {
      key: "layingMethod",
      label: "Способ укладки",
      type: "select",
      defaultValue: 0,
      options: [
        { value: 0, label: "Прямая — +5% отходов" },
        { value: 1, label: "Диагональная — +15% отходов" },
        { value: 2, label: "Ёлочка — +20% отходов" },
      ],
    },
    {
      key: "hasUnderlayment",
      label: "Подложка",
      type: "switch",
      defaultValue: 1,
    },
    {
      key: "underlaymentRoll",
      label: "Площадь рулона подложки",
      type: "slider",
      unit: "м²",
      min: 5,
      max: 20,
      step: 1,
      defaultValue: 10,
    },
    {
      key: "offsetMode",
      label: "Смещение досок",
      type: "select",
      defaultValue: 0,
      options: [
        { value: 0, label: "Хаотичное (экономное)" },
        { value: 1, label: "На 1/3 длины (классика)" },
        { value: 2, label: "На 1/2 длины (кирпичная)" },
      ],
    },
  ],
  calculate(inputs) {
    const inputMode = Math.round(inputs.inputMode ?? 0);
    let area: number;
    let perimeter: number;

    if (inputMode === 0) {
      const l = Math.max(1, inputs.length ?? 5);
      const w = Math.max(1, inputs.width ?? 4);
      area = l * w;
      perimeter = 2 * (l + w);
    } else {
      area = Math.max(1, inputs.area ?? 20);
      const side = Math.sqrt(area);
      perimeter = 4 * side;
    }

    const packArea = Math.max(0.5, inputs.packArea ?? 2.397);
    const method = Math.round(inputs.layingMethod ?? 0);
    const offset = Math.round(inputs.offsetMode ?? 0);
    const hasUnderlayment = (inputs.hasUnderlayment ?? 1) > 0;
    const underlaymentRoll = Math.max(5, inputs.underlaymentRoll ?? 10);

    // Коэффициент отходов: способ укладки + смещение
    const methodWaste: Record<number, number> = { 0: 1.05, 1: 1.15, 2: 1.20 };
    const offsetWaste = [0, 0.03, 0.07]; // хаотично - 0, 1/3 - +3%, 1/2 - +7%
    
    const coeff = (methodWaste[method] ?? 1.05) + (offsetWaste[offset] ?? 0);

    const laminateArea = area * coeff;
    const packs = Math.ceil(laminateArea / packArea);

    // Подложка с нахлёстом 10%
    const underlaymentArea = hasUnderlayment ? area * 1.10 : 0;
    const underlaymentRolls = hasUnderlayment ? Math.ceil(underlaymentArea / underlaymentRoll) : 0;

    // Плинтус: периметр минус двери (~0.9 м на каждую), +7% подрезка
    const doorCount = Math.max(1, Math.ceil(area / 15)); // примерная оценка кол-ва дверей
    const plinthLength = (perimeter - doorCount * 0.9) * 1.07;
    const plinthPieces = Math.ceil(plinthLength / 2.5);

    // Распорные клинья: каждые 0.4 м по периметру
    const wedges = Math.ceil(perimeter / 0.4);

    const warnings: string[] = [];
    if (area < 5) warnings.push("Маленькая площадь: процент отходов может быть выше из-за невозможности использовать обрезки");
    if (method === 2) warnings.push("Укладка ёлочкой: требует идеально ровного основания и высокой квалификации");
    if (offset === 2) warnings.push("Смещение на 1/2: самый неэкономный способ укладки, много коротких обрезков");

    const materials = [
      {
        name: "Ламинат (упаковки)",
        quantity: laminateArea / packArea,
        unit: "упак.",
        withReserve: packs,
        purchaseQty: packs,
        category: "Напольное покрытие",
      },
      ...(hasUnderlayment ? [{
        name: "Подложка (рулонная)",
        quantity: area / underlaymentRoll,
        unit: "рулонов",
        withReserve: underlaymentRolls,
        purchaseQty: underlaymentRolls,
        category: "Подложка",
      }] : []),
      {
        name: "Плинтус напольный (2.5 м)",
        quantity: plinthLength / 2.5,
        unit: "шт",
        withReserve: plinthPieces,
        purchaseQty: plinthPieces,
        category: "Плинтус",
      },
      {
        name: "Углы и заглушки для плинтуса",
        quantity: Math.ceil(perimeter / 2),
        unit: "шт",
        withReserve: Math.ceil(perimeter / 2),
        purchaseQty: Math.ceil(perimeter / 2),
        category: "Плинтус",
      },
      {
        name: "Клинья распорные (набор)",
        quantity: 1,
        unit: "упак",
        withReserve: 1,
        purchaseQty: 1,
        category: "Инструмент",
      },
      ...(hasUnderlayment ? [{
        name: "Скотч алюминиевый (для стыков подложки)",
        quantity: 1,
        unit: "рулон",
        withReserve: 1,
        purchaseQty: 1,
        category: "Подложка",
      }] : []),
      {
        name: "Порожек стыковочный (0.9 м)",
        quantity: doorCount,
        unit: "шт",
        withReserve: doorCount,
        purchaseQty: doorCount,
        category: "Плинтус",
      },
    ];

    return {
      materials,
      totals: {
        area,
        perimeter,
        packs,
        wastePercent: Math.round((coeff - 1) * 100),
      },
      warnings,
    };
  },
  formulaDescription: `
**Расчёт ламината (профессиональный подход):**

1. **Площадь**: Учитывается чистая площадь пола.
2. **Запас на подрезку**:
   - Прямая укладка + хаотичное смещение: 5%
   - Прямая укладка + смещение 1/2: 12%
   - Диагональная укладка: 15-18%
3. **Подложка**: Площадь пола + 10% на перехлест полотен.
4. **Плинтус**: Периметр за вычетом дверных проемов + 7% на углы.
  `,
  howToUse: [
    "Введите размеры комнаты",
    "Укажите площадь одной упаковки (из характеристик товара)",
    "Выберите способ укладки и тип смещения досок",
    "Нажмите «Рассчитать» — вы получите количество упаковок, подложки и погонаж плинтуса",
  ],
  expertTips: [
    {
      title: "Акклиматизация",
      content: "Ламинат должен отлежаться в помещении, где будет укладываться, минимум 48 часов. Это предотвратит вздутие швов после монтажа.",
      author: "Мастер по полам"
    },
    {
      title: "Направление укладки",
      content: "Укладывайте ламинат длинной стороной вдоль лучей света из окна. Так стыки будут практически незаметны.",
      author: "Дизайнер-технолог"
    }
  ],
  faq: [
    {
      question: "Нужна ли пароизоляция под подложку?",
      answer: "Если основание — бетонная стяжка (особенно в новостройке), обязательно постелите полиэтиленовую пленку 200 мкр под подложку, чтобы влага из бетона не испортила ламинат."
    },
    {
      question: "Какой зазор оставлять у стен?",
      answer: "Обязательно оставляйте деформационный зазор 10–15 мм по всему периметру. Ламинат «дышит», и без зазора он встанет «домиком»."
    }
  ]
};
