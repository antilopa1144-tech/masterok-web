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
    const hasUnderlayment = (inputs.hasUnderlayment ?? 1) > 0;
    const underlaymentRoll = Math.max(5, inputs.underlaymentRoll ?? 10);

    const wasteCoeff: Record<number, number> = { 0: 1.05, 1: 1.15, 2: 1.20 };
    const coeff = wasteCoeff[method] ?? 1.05;

    const laminateArea = area * coeff;
    const packs = Math.ceil(laminateArea / packArea);

    // Подложка с нахлёстом 15%
    const underlaymentArea = hasUnderlayment ? area * 1.15 : 0;
    const underlaymentRolls = hasUnderlayment ? Math.ceil(underlaymentArea / underlaymentRoll) : 0;

    // Плинтус: периметр минус дверь (~0.9 м), +5% подрезка, стандарт 2.5 м
    const plinthLength = (perimeter - 0.9) * 1.05;
    const plinthPieces = Math.ceil(plinthLength / 2.5);

    // Распорные клинья: каждые 0.5 м по периметру
    const wedges = Math.ceil((perimeter - 0.9) / 0.5);

    const warnings: string[] = [];
    if (area < 3) warnings.push("Маленькая площадь — процент отходов может быть выше расчётного");
    if (method === 2 && area > 50) warnings.push("Укладка ёлочкой на большой площади: расход материала +20%");

    return {
      materials: [
        {
          name: "Ламинат",
          quantity: laminateArea / packArea,
          unit: "упак.",
          withReserve: packs,
          purchaseQty: packs,
          category: "Напольное покрытие",
        },
        ...(hasUnderlayment ? [{
          name: "Подложка",
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
          name: "Клинья распорные",
          quantity: wedges,
          unit: "шт",
          withReserve: wedges,
          purchaseQty: Math.ceil(wedges / 10) * 10,
          category: "Крепёж",
        },
        ...(hasUnderlayment ? [{
          name: "Скотч для подложки (рулон 50 м)",
          quantity: 1,
          unit: "рулон",
          withReserve: 1,
          purchaseQty: 1,
          category: "Подложка",
        }] : []),
        {
          name: "Порожек стыковочный",
          quantity: 1,
          unit: "шт",
          withReserve: 1,
          purchaseQty: 1,
          category: "Плинтус",
        },
      ],
      totals: {
        area,
        perimeter,
        packs,
        wastePercent: (coeff - 1) * 100,
      },
      warnings,
    };
  },
  formulaDescription: `
**Расчёт ламината:**
Упаковок = (Площадь × Коэффициент_отходов) / Площадь_упаковки

Коэффициенты отходов:
- Прямая укладка: +5%
- Диагональная: +15%
- Ёлочка: +20%

**Подложка:** площадь × 1.15 (нахлёст 15 см)

**Плинтус:** периметр − 0.9 м (дверь) × 1.05
  `,
  howToUse: [
    "Введите размеры комнаты или площадь",
    "Укажите площадь упаковки (написана на упаковке, обычно 1.99–2.40 м²)",
    "Выберите способ укладки (прямая — меньше отходов)",
    "Включите подложку, если нужна (рекомендуется всегда)",
    "Нажмите «Рассчитать» — получите упаковки ламината, подложку и плинтус",
  ],
};
