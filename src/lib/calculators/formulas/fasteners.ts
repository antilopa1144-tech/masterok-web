import type { CalculatorDefinition } from "../types";
import { buildNativeScenarios } from "../scenario-native";

// Нормы расхода крепежа по типу материала
// ГКЛ: саморезы 3.5×25, ~24 шт/лист (шаг 250мм по периметру + по стойкам)
// ОСБ/фанера: саморезы 3.5×35, ~28 шт/лист (шаг 200мм)
// Профлист: кровельные саморезы 4.8×35, ~8 шт/м²
// Вагонка/панели: кляймеры ~20 шт/м² + гвозди

const SCREW_SPECS: Record<number, {
  screwsPerUnit: number;
  screwName: string;
  screwSize: string;
  perKg: number; // штук в 1 кг
  unitLabel: string;
  unitArea: number; // площадь единицы (м²), 0 = считаем штуками
}> = {
  0: { screwsPerUnit: 24, screwName: "Саморезы для ГКЛ", screwSize: "3.5×25 мм", perKg: 1000, unitLabel: "лист", unitArea: 3.0 },
  1: { screwsPerUnit: 28, screwName: "Саморезы по дереву", screwSize: "3.5×35 мм", perKg: 600, unitLabel: "лист", unitArea: 3.125 },
  2: { screwsPerUnit: 8, screwName: "Саморезы кровельные с EPDM", screwSize: "4.8×35 мм", perKg: 250, unitLabel: "м²", unitArea: 1 },
  3: { screwsPerUnit: 20, screwName: "Кляймеры для вагонки", screwSize: "№3–№5", perKg: 0, unitLabel: "м²", unitArea: 1 },
};

export const fastenersDef: CalculatorDefinition = {
  id: "fasteners",
  slug: "krepezh",
  title: "Калькулятор крепежа",
  h1: "Калькулятор крепежа онлайн — расчёт саморезов, дюбелей и кляймеров",
  description: "Рассчитайте количество саморезов, дюбелей и кляймеров для ГКЛ, ОСБ, профлиста и вагонки.",
  metaTitle: "Калькулятор крепежа | Саморезы, дюбели, кляймеры — Мастерок",
  metaDescription: "Бесплатный калькулятор крепежа: рассчитайте саморезы для гипсокартона, ОСБ, профлиста и вагонки. Расход в штуках и килограммах.",
  category: "interior",
  categorySlug: "otdelka",
  tags: ["крепёж", "саморезы", "дюбели", "кляймеры", "ГКЛ", "ОСБ", "профлист", "вагонка"],
  popularity: 72,
  complexity: 2,
  fields: [
    {
      key: "materialType",
      label: "Тип материала",
      type: "select",
      defaultValue: 0,
      options: [
        { value: 0, label: "ГКЛ (гипсокартон)" },
        { value: 1, label: "ОСБ / фанера" },
        { value: 2, label: "Профлист (кровельный/стеновой)" },
        { value: 3, label: "Вагонка / стеновые панели" },
      ],
    },
    {
      key: "sheetCount",
      label: "Количество листов / площадь",
      type: "slider",
      unit: "шт/м²",
      min: 1,
      max: 200,
      step: 1,
      defaultValue: 10,
      hint: "Для ГКЛ и ОСБ — количество листов; для профлиста и вагонки — площадь в м²",
    },
    {
      key: "fastenerStep",
      label: "Шаг крепления",
      type: "select",
      defaultValue: 250,
      options: [
        { value: 150, label: "150 мм (усиленный)" },
        { value: 200, label: "200 мм (стандарт для ОСБ)" },
        { value: 250, label: "250 мм (стандарт для ГКЛ)" },
        { value: 300, label: "300 мм (облегчённый)" },
      ],
    },
    {
      key: "hasFrameScrews",
      label: "Саморезы для каркаса (клопы)",
      type: "switch",
      defaultValue: 1,
      hint: "Саморезы-клопы 3.5×9 мм для соединения металлопрофилей",
    },
    {
      key: "hasDowels",
      label: "Дюбели для крепления к бетону/кирпичу",
      type: "switch",
      defaultValue: 0,
      hint: "Дюбель-гвозди 6×40 для крепления направляющего профиля",
    },
  ],
  calculate(inputs) {
    const materialType = Math.round(inputs.materialType ?? 0);
    const count = Math.max(1, Math.round(inputs.sheetCount ?? 10));
    const step = inputs.fastenerStep ?? 250;
    const hasFrame = (inputs.hasFrameScrews ?? 1) > 0;
    const hasDowels = (inputs.hasDowels ?? 0) > 0;

    const spec = SCREW_SPECS[materialType] ?? SCREW_SPECS[0];

    // Корректировка расхода по шагу (базовый шаг = 250 для ГКЛ, 200 для ОСБ)
    const baseStep = materialType === 1 ? 200 : 250;
    const stepCoeff = baseStep / step;
    const screwsPerUnit = Math.ceil(spec.screwsPerUnit * stepCoeff);

    const totalScrews = count * screwsPerUnit;
    const screwsWithReserve = Math.ceil(totalScrews * 1.05); // +5% запас

    const materials: Array<{
      name: string; quantity: number; unit: string;
      withReserve: number; purchaseQty: number; category: string;
    }> = [];

    if (materialType === 3) {
      // Вагонка: кляймеры + гвозди
      const klyamers = screwsWithReserve;
      const nails = Math.ceil(klyamers * 1.5); // 1.5 гвоздя на кляймер
      materials.push(
        {
          name: `Кляймеры ${spec.screwSize}`,
          quantity: totalScrews,
          unit: "шт",
          withReserve: klyamers,
          purchaseQty: Math.ceil(klyamers / 100) * 100, // упаковки по 100
          category: "Крепёж",
        },
        {
          name: "Гвозди для кляймеров 1.5×20 мм",
          quantity: Math.ceil(totalScrews * 1.5),
          unit: "шт",
          withReserve: nails,
          purchaseQty: Math.ceil(nails / 100) * 100,
          category: "Крепёж",
        },
      );
    } else {
      // Саморезы
      const screwsKg = screwsWithReserve / spec.perKg;
      materials.push({
        name: `${spec.screwName} ${spec.screwSize}`,
        quantity: totalScrews,
        unit: "кг",
        withReserve: Math.ceil(screwsKg * 10) / 10,
        purchaseQty: Math.max(1, Math.ceil(screwsKg)),
        category: "Крепёж",
      });
    }

    // Клопы для каркаса
    if (hasFrame && (materialType === 0 || materialType === 1)) {
      const clopCount = count * 4; // ~4 соединения профилей на лист
      const clopWithReserve = Math.ceil(clopCount * 1.05);
      materials.push({
        name: "Саморезы-клопы 3.5×9 мм (металл-металл)",
        quantity: clopCount,
        unit: "шт",
        withReserve: clopWithReserve,
        purchaseQty: Math.ceil(clopWithReserve / 100) * 100,
        category: "Крепёж",
      });
    }

    // Дюбели
    if (hasDowels) {
      // ~1 дюбель на 0.5 м периметра крепления
      const perimeterEst = materialType <= 1
        ? Math.ceil(Math.sqrt(count * spec.unitArea)) * 4
        : Math.ceil(Math.sqrt(count)) * 4;
      const dowelCount = Math.ceil(perimeterEst / 0.5);
      const dowelWithReserve = Math.ceil(dowelCount * 1.05);
      materials.push({
        name: "Дюбель-гвозди 6×40 мм",
        quantity: dowelCount,
        unit: "шт",
        withReserve: dowelWithReserve,
        purchaseQty: Math.ceil(dowelWithReserve / 100) * 100,
        category: "Крепёж",
      });
    }

    // Бита
    const bitaCount = Math.max(1, Math.ceil(screwsWithReserve / 500)); // 1 бита на ~500 саморезов
    materials.push({
      name: materialType === 2 ? "Бита PH2 с ограничителем (для профлиста)" : "Бита PH2 (для шуруповёрта)",
      quantity: bitaCount,
      unit: "шт",
      withReserve: bitaCount,
      purchaseQty: bitaCount,
      category: "Инструмент",
    });

    const warnings: string[] = [];
    if (step <= 150) {
      warnings.push("Шаг 150 мм — усиленное крепление, применяется для потолков и зон повышенной нагрузки");
    }
    if (materialType === 2 && count >= 50) {
      warnings.push("При большой площади профлиста рекомендуется использовать шуруповёрт с регулировкой момента");
    }

    const scenarios = buildNativeScenarios({
      id: "fasteners-main",
      title: "Fasteners main",
      exactNeed: screwsWithReserve,
      unit: "шт",
      packageSizes: [100],
      packageLabelPrefix: "fasteners-pack",
    });

    return {
      materials,
      totals: {
        totalScrews: screwsWithReserve,
        sheetsOrArea: count,
        screwsPerUnit,
      },
      warnings,
      scenarios,
    };
  },
  formulaDescription: `
**Нормы расхода крепежа:**

| Материал | Крепёж | Расход на единицу |
|----------|--------|-------------------|
| ГКЛ | Саморезы 3.5×25 | ~24 шт/лист (шаг 250 мм) |
| ОСБ/фанера | Саморезы 3.5×35 | ~28 шт/лист (шаг 200 мм) |
| Профлист | Кровельные 4.8×35 | ~8 шт/м² |
| Вагонка | Кляймеры + гвозди | ~20 шт/м² |

Расход корректируется пропорционально шагу крепления.
  `,
  howToUse: [
    "Выберите тип материала (ГКЛ, ОСБ, профлист, вагонка)",
    "Укажите количество листов или площадь",
    "Выберите шаг крепления (стандарт — 250 мм для ГКЛ, 200 мм для ОСБ)",
    "Включите дополнительные опции (клопы, дюбели) при необходимости",
    "Нажмите «Рассчитать» — получите крепёж в штуках и килограммах",
  ],
};
