import type { CalculatorDefinition } from "../types";
import { buildNativeScenarios } from "../scenario-native";

export const linoleumDef: CalculatorDefinition = {
  id: "floors_linoleum",
  slug: "linoleum",
  title: "Калькулятор линолеума",
  h1: "Калькулятор линолеума онлайн — расчёт погонных метров и раскроя",
  description: "Рассчитайте количество линолеума с учётом ширины рулона и раскладки. Минимум отходов.",
  metaTitle: "Калькулятор линолеума | Расчёт погонных метров — Мастерок",
  metaDescription: "Бесплатный калькулятор линолеума: рассчитайте метраж с учётом ширины рулона и раскроя. Учёт стыков и запаса.",
  category: "flooring",
  categorySlug: "poly",
  tags: ["линолеум", "напольное покрытие", "рулонное покрытие", "линолеум ширина"],
  popularity: 60,
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
      key: "rollWidth",
      label: "Ширина рулона",
      type: "select",
      defaultValue: 3.5,
      options: [
        { value: 1.5, label: "1.5 м" },
        { value: 2.0, label: "2.0 м" },
        { value: 2.5, label: "2.5 м" },
        { value: 3.0, label: "3.0 м" },
        { value: 3.5, label: "3.5 м (стандарт)" },
        { value: 4.0, label: "4.0 м" },
        { value: 5.0, label: "5.0 м" },
      ],
    },
    {
      key: "hasPattern",
      label: "Рисунок с раппортом",
      type: "switch",
      defaultValue: 0,
      hint: "Раппорт — повторяющийся узор. Требует дополнительного запаса на подгонку",
    },
    {
      key: "patternRepeat",
      label: "Шаг раппорта",
      type: "slider",
      unit: "см",
      min: 10,
      max: 100,
      step: 5,
      defaultValue: 30,
      hint: "Указан на упаковке рулона",
    },
  ],
  calculate(inputs): import("../types").CalculatorResult {
    const roomL = Math.max(1, inputs.roomLength ?? 5);
    const roomW = Math.max(1, inputs.roomWidth ?? 4);
    const rollW = inputs.rollWidth ?? 3.5;
    const hasPattern = (inputs.hasPattern ?? 0) > 0;
    const patternRepeatM = (inputs.patternRepeat ?? 30) / 100;

    // Определяем ориентацию укладки
    // Рулон кладём вдоль длинной стороны для минимума стыков
    const longerSide = Math.max(roomL, roomW);
    const shorterSide = Math.min(roomL, roomW);

    // Количество полос вдоль короткой стороны
    const stripsNeeded = Math.ceil(shorterSide / rollW);

    // Длина каждой полосы = длинная сторона + запас на подрезку (0.1 м)
    let stripLength = longerSide + 0.1;

    // Если есть раппорт — каждая следующая полоса добавляет один полный раппорт
    // Первая полоса: stripLength, каждая последующая: stripLength + patternRepeatM
    let totalLinearM: number;
    if (hasPattern && stripsNeeded > 1) {
      totalLinearM = stripLength + (stripLength + patternRepeatM) * (stripsNeeded - 1);
    } else {
      totalLinearM = stripLength * stripsNeeded;
    }
    const totalArea = totalLinearM * rollW;
    const usefulArea = roomL * roomW;
    const wastePercent = Math.round(((totalArea - usefulArea) / usefulArea) * 100);

    const warnings: string[] = [];
    if (stripsNeeded > 1) {
      warnings.push(`Укладка потребует ${stripsNeeded} полосы. Рекомендуется ширина рулона ${Math.ceil(shorterSide * 10) / 10} м для укладки без стыка`);
    }
    if (wastePercent > 25) {
      warnings.push(`Отходы составят ${wastePercent}% — попробуйте рулон большей ширины`);
    }

    // Плинтус
    const perimeter = 2 * (roomL + roomW);
    const plinthPcs = Math.ceil(perimeter * 1.05 / 2.5);

    const scenarios = buildNativeScenarios({
      id: "linoleum-main",
      title: "Linoleum main",
      exactNeed: totalLinearM,
      unit: "м.п.",
      packageSizes: [0.1],
      packageLabelPrefix: "linoleum-linear",
    });

    return {
      materials: [
        {
          name: "Линолеум (м.п.)",
          quantity: totalLinearM,
          unit: "м.п.",
          withReserve: Math.ceil(totalLinearM * 10) / 10,
          purchaseQty: Math.ceil(totalLinearM * 10) / 10,
          category: "Покрытие",
        },
        {
          name: "Двусторонний скотч / клей",
          quantity: usefulArea,
          unit: "м²",
          withReserve: Math.ceil(usefulArea * 1.05),
          purchaseQty: Math.ceil(usefulArea * 1.05 / 10),
          category: "Крепление",
        },
        {
          name: "Плинтус ПВХ (2.5 м)",
          quantity: perimeter / 2.5,
          unit: "шт",
          withReserve: plinthPcs,
          purchaseQty: plinthPcs,
          category: "Плинтус",
        },
        {
          name: "Порог стыковочный",
          quantity: 1,
          unit: "шт",
          withReserve: 1,
          purchaseQty: 1,
          category: "Доборные",
        },
        {
          name: "Грунтовка (бетоноконтакт, канистра 10 л)",
          quantity: usefulArea * 0.15,
          unit: "л",
          withReserve: Math.ceil(usefulArea * 0.15 * 1.15 * 10) / 10,
          purchaseQty: Math.ceil(usefulArea * 0.15 * 1.15 / 10),
          category: "Подготовка",
        },
      ],
      totals: { usefulArea, totalLinearM, stripsNeeded, wastePercent } as Record<string, number>,
      warnings,
      scenarios,
    };
  },
  formulaDescription: `
**Раскрой линолеума:**
Полосы = ⌈Ширина_комнаты / Ширина_рулона⌉
Длина полос = Длина_комнаты + 0.1 м (подрезка)

При рисунке с раппортом:
Дополнительный запас = Шаг_раппорта × (Полос - 1)

Рекомендация: подбирайте ширину рулона равной ширине комнаты — это исключает стыки.
  `,
  howToUse: [
    "Введите длину и ширину комнаты",
    "Выберите ширину рулона",
    "Если у линолеума рисунок — включите раппорт",
    "Нажмите «Рассчитать» — получите метраж и плинтус",
  ],
};
