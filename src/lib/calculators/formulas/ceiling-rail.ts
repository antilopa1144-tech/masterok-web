import type { CalculatorDefinition } from "../types";

export const ceilingRailDef: CalculatorDefinition = {
  id: "ceilings_rail",
  slug: "reechnyj-potolok",
  title: "Калькулятор реечного потолка",
  h1: "Калькулятор реечного потолка онлайн — расчёт реек и профилей",
  description: "Рассчитайте количество алюминиевых реек, направляющих профилей и крепежа для реечного потолка.",
  metaTitle: "Калькулятор реечного потолка | Расчёт реек Armstrong, Cesal — Мастерок",
  metaDescription: "Бесплатный калькулятор реечного потолка: рассчитайте рейки, профили и крепёж для потолка Armstrong, Cesal по площади.",
  category: "ceiling",
  categorySlug: "potolki",
  tags: ["реечный потолок", "рейка", "алюминиевый потолок", "Armstrong", "Cesal"],
  popularity: 60,
  complexity: 2,
  fields: [
    {
      key: "area",
      label: "Площадь потолка",
      type: "slider",
      unit: "м²",
      min: 1,
      max: 200,
      step: 1,
      defaultValue: 15,
    },
    {
      key: "railWidth",
      label: "Ширина рейки",
      type: "select",
      defaultValue: 10,
      options: [
        { value: 10, label: "100 мм (стандарт)" },
        { value: 15, label: "150 мм" },
        { value: 20, label: "200 мм" },
      ],
    },
    {
      key: "railLength",
      label: "Длина рейки",
      type: "select",
      defaultValue: 3,
      options: [
        { value: 3, label: "3.0 м" },
        { value: 3.6, label: "3.6 м" },
        { value: 4, label: "4.0 м" },
      ],
    },
    {
      key: "roomLength",
      label: "Длина комнаты (для направления монтажа)",
      type: "slider",
      unit: "м",
      min: 1,
      max: 30,
      step: 0.5,
      defaultValue: 5,
    },
  ],
  calculate(inputs): import("../types").CalculatorResult {
    const area = Math.max(1, inputs.area ?? 15);
    const railWidthCm = inputs.railWidth ?? 10; // см
    const railWidthM = railWidthCm / 100;
    const railLength = inputs.railLength ?? 3;
    const roomLength = Math.max(1, inputs.roomLength ?? 5);

    // Ширина комнаты из площади и длины
    const roomWidth = area / roomLength;

    // Количество рядов реек
    const rowCount = Math.ceil(roomWidth / railWidthM);

    // Длина реек в каждом ряду = длина комнаты + 10% запас
    const totalRailLength = rowCount * roomLength * 1.1;
    const railPcs = Math.ceil(totalRailLength / railLength);

    // Направляющие профили (Т-профиль, монтируются поперёк реек с шагом ~1 м)
    const guideSpacing = 1.0; // м
    const guideCount = Math.ceil(roomLength / guideSpacing) + 1;
    // Длина каждой направляющей = ширина комнаты
    const guideTotalLength = guideCount * roomWidth * 1.05;
    const guideLength = 3.0; // стандартный 3 м
    const guidePcs = Math.ceil(guideTotalLength / guideLength);

    // Подвесы (через каждые 1.2 м на направляющей)
    const hangersPerGuide = Math.ceil(roomWidth / 1.2) + 1;
    const hangers = guideCount * hangersPerGuide;

    // Саморезы: ~4 шт на подвес + ~2 шт на стыки реек
    const screws = hangers * 4 + railPcs * 2;

    return {
      materials: [
        {
          name: `Рейка алюминиевая ${railWidthCm * 10} мм × ${railLength} м`,
          quantity: totalRailLength / railLength,
          unit: "шт",
          withReserve: railPcs,
          purchaseQty: railPcs,
          category: "Рейки",
        },
        {
          name: `Профиль направляющий T-образный 3 м`,
          quantity: guideTotalLength / guideLength,
          unit: "шт",
          withReserve: guidePcs,
          purchaseQty: guidePcs,
          category: "Профили",
        },
        {
          name: "Подвес прямой",
          quantity: hangers,
          unit: "шт",
          withReserve: Math.ceil(hangers * 1.1),
          purchaseQty: Math.ceil(hangers * 1.1),
          category: "Крепёж",
        },
        {
          name: "Саморез ТН 3.5×25 мм",
          quantity: screws,
          unit: "шт",
          withReserve: Math.ceil(screws * 1.1),
          purchaseQty: Math.ceil(screws / 50) * 50,
          category: "Крепёж",
        },
        {
          name: "Дюбель для подвесов 6×40 мм",
          quantity: hangers,
          unit: "шт",
          withReserve: Math.ceil(hangers * 1.05),
          purchaseQty: Math.ceil(hangers * 1.05),
          category: "Крепёж",
        },
      ],
      totals: { area, rowCount, railPcs } as Record<string, number>,
      warnings: [
        "Рейки монтируются перпендикулярно направляющим профилям",
        "Оставляйте зазор 5–10 мм для вентиляции у стен",
      ],
    };
  },
  formulaDescription: `
**Расчёт реечного потолка:**
- Рядов реек = ⌈Ширина комнаты / Ширина рейки⌉
- Реек = ⌈(Рядов × Длина комнаты × 1.1) / Длина рейки⌉
- Направляющих = ⌈Длина / 1.0⌉ + 1 (шаг 1 м)
  `,
  howToUse: [
    "Введите площадь потолка",
    "Выберите ширину и длину рейки",
    "Укажите длину комнаты",
    "Нажмите «Рассчитать»",
  ],
};
