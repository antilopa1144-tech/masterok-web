import type { CalculatorDefinition } from "../types";
import { buildNativeScenarios } from "../scenario-native";

export const parquetDef: CalculatorDefinition = {
  id: "floors_parquet",
  slug: "parket",
  title: "Калькулятор паркетной доски",
  h1: "Калькулятор паркетной доски онлайн — расчёт количества упаковок",
  description: "Рассчитайте количество паркетной доски, подложки и плинтуса с учётом способа укладки и запаса.",
  metaTitle: "Калькулятор паркетной доски | Расчёт онлайн — Мастерок",
  metaDescription: "Бесплатный калькулятор паркетной доски: рассчитайте упаковки Tarkett, Quick-Step, Haro по площади комнаты с учётом укладки.",
  category: "flooring",
  categorySlug: "poly",
  tags: ["паркет", "паркетная доска", "Tarkett", "Quick-Step", "напольное покрытие"],
  popularity: 62,
  complexity: 1,
  fields: [
    {
      key: "roomLength",
      label: "Длина комнаты",
      type: "slider",
      unit: "м",
      min: 1,
      max: 30,
      step: 0.1,
      defaultValue: 5,
    },
    {
      key: "roomWidth",
      label: "Ширина комнаты",
      type: "slider",
      unit: "м",
      min: 1,
      max: 20,
      step: 0.1,
      defaultValue: 4,
    },
    {
      key: "layingMethod",
      label: "Способ укладки",
      type: "select",
      defaultValue: 0,
      options: [
        { value: 0, label: "Прямая (+5%)" },
        { value: 1, label: "Диагональная (+15%)" },
        { value: 2, label: "Ёлочка (+20%)" },
      ],
    },
    {
      key: "packArea",
      label: "Площадь упаковки",
      type: "slider",
      unit: "м²",
      min: 1,
      max: 4,
      step: 0.01,
      defaultValue: 1.892,
      hint: "Указана на упаковке. Tarkett: 1.892 м², Quick-Step: 1.835 м²",
    },
    {
      key: "boardWidth",
      label: "Ширина доски",
      type: "select",
      defaultValue: 190,
      options: [
        { value: 120, label: "120 мм" },
        { value: 150, label: "150 мм" },
        { value: 190, label: "190 мм (стандарт)" },
        { value: 200, label: "200 мм" },
        { value: 220, label: "220 мм (широкая)" },
      ],
    },
  ],
  calculate(inputs): import("../types").CalculatorResult {
    const roomL = Math.max(1, inputs.roomLength ?? 5);
    const roomW = Math.max(1, inputs.roomWidth ?? 4);
    const area = roomL * roomW;
    const method = Math.round(inputs.layingMethod ?? 0);
    const packArea = Math.max(0.5, inputs.packArea ?? 1.892);
    const boardWidthMm = inputs.boardWidth ?? 190;

    const wasteCoeff = [1.05, 1.15, 1.20][method] ?? 1.05;
    const areaWithWaste = area * wasteCoeff;
    const packs = Math.ceil(areaWithWaste / packArea);

    // Подложка: с нахлёстом 10 см
    const underlayArea = area * 1.10;
    const underlayRolls = Math.ceil(underlayArea / 10);

    // Плинтус: периметр − 1 проём (0.9 м), +5% запас
    const perimeter = 2 * (roomL + roomW);
    const plinthLength = (perimeter - 0.9) * 1.05;
    const plinthPcs = Math.ceil(plinthLength / 2.5);

    // Распорные клинья: по периметру каждые 0.5 м
    const wedges = Math.ceil(perimeter / 0.5);

    const warnings: string[] = [];
    if (area < 5) warnings.push("Маленькая площадь — отходы будут выше расчётного процента");
    if (method === 2) warnings.push("Укладка ёлочкой требует профессионального инструмента и опыта");

    const methodNames = ["Прямая", "Диагональная", "Ёлочка"];

    const scenarios = buildNativeScenarios({
      id: "parquet-main",
      title: "Parquet main",
      exactNeed: areaWithWaste,
      unit: "м²",
      packageSizes: [packArea],
      packageLabelPrefix: "parquet-pack",
    });

    return {
      materials: [
        {
          name: `Паркетная доска (упак. ~${packArea} м²)`,
          quantity: areaWithWaste / packArea,
          unit: "упак.",
          withReserve: packs,
          purchaseQty: packs,
          category: "Покрытие",
        },
        {
          name: "Подложка (рулон 10 м²)",
          quantity: area / 10,
          unit: "рулонов",
          withReserve: underlayRolls,
          purchaseQty: underlayRolls,
          category: "Подложка",
        },
        {
          name: "Плинтус напольный (2.5 м)",
          quantity: plinthLength / 2.5,
          unit: "шт",
          withReserve: plinthPcs,
          purchaseQty: plinthPcs,
          category: "Плинтус",
        },
        {
          name: "Клинья распорные",
          quantity: wedges,
          unit: "шт",
          withReserve: wedges,
          purchaseQty: Math.ceil(wedges / 10) * 10,
          category: "Монтаж",
        },
        {
          name: "Скотч для подложки",
          quantity: 1,
          unit: "рулон",
          withReserve: 1,
          purchaseQty: 1,
          category: "Подложка",
        },
        {
          name: "Порожек стыковочный (для дверного проёма)",
          quantity: 1,
          unit: "шт",
          withReserve: 1,
          purchaseQty: 1,
          category: "Доборные",
        },
        {
          name: "Масло/лак для паркета (банка 2.5 л, для массива)",
          quantity: area * 0.2,
          unit: "л",
          withReserve: Math.ceil(area * 0.2 * 1.1 * 10) / 10,
          purchaseQty: Math.ceil(area * 0.2 * 1.1 / 2.5),
          category: "Покрытие",
        },
      ],
      totals: {
        area,
        areaWithWaste,
        wastePercent: (wasteCoeff - 1) * 100,
        perimeter,
      } as Record<string, number>,
      warnings,
      scenarios,
    };
  },
  formulaDescription: `
**Расчёт паркетной доски:**
Упаковок = ⌈Площадь × Коэффициент_отходов / Площадь_упаковки⌉

Коэффициенты отходов:
- Прямая укладка: ×1.05 (+5%)
- Диагональная: ×1.15 (+15%)
- Ёлочка: ×1.20 (+20%)

Подложка: площадь × 1.10 (нахлёст 10 см по швам)
  `,
  howToUse: [
    "Введите размеры комнаты",
    "Выберите способ укладки",
    "Укажите площадь упаковки (на этикетке)",
    "Нажмите «Рассчитать» — получите упаковки, подложку и плинтус",
  ],
};
