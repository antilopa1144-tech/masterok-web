import type { CalculatorDefinition } from "../types";

export const primerDef: CalculatorDefinition = {
  id: "mixes_primer",
  slug: "gruntovka",
  title: "Калькулятор грунтовки",
  h1: "Калькулятор грунтовки онлайн — расчёт расхода и количества",
  description: "Рассчитайте количество грунтовки по площади стен, потолка и пола. Учёт типа поверхности и количества слоёв.",
  metaTitle: "Калькулятор грунтовки | Расчёт расхода на стены и пол — Мастерок",
  metaDescription: "Бесплатный калькулятор грунтовки: рассчитайте литры Ceresit CT 17, Knauf Тифенгрунд, Волма Контакт по площади. Учёт типа поверхности.",
  category: "interior",
  categorySlug: "otdelka",
  tags: ["грунтовка", "Ceresit", "Knauf", "глубокое проникновение", "грунт-контакт"],
  popularity: 55,
  complexity: 1,
  fields: [
    {
      key: "area",
      label: "Площадь поверхности",
      type: "slider",
      unit: "м²",
      min: 1,
      max: 500,
      step: 1,
      defaultValue: 50,
    },
    {
      key: "surfaceType",
      label: "Тип поверхности",
      type: "select",
      defaultValue: 0,
      options: [
        { value: 0, label: "Бетон, пеноблок (впитывающая)" },
        { value: 1, label: "Гипсокартон, штукатурка" },
        { value: 2, label: "Кафель, стекло (непористая)" },
        { value: 3, label: "Дерево, OSB" },
      ],
    },
    {
      key: "primerType",
      label: "Тип грунтовки",
      type: "select",
      defaultValue: 0,
      options: [
        { value: 0, label: "Глубокого проникновения (Ceresit CT 17)" },
        { value: 1, label: "Контакт-грунт (бетонконтакт)" },
        { value: 2, label: "Специальная для ГКЛ" },
      ],
    },
    {
      key: "coats",
      label: "Количество слоёв",
      type: "select",
      defaultValue: 1,
      options: [
        { value: 1, label: "1 слой" },
        { value: 2, label: "2 слоя (сильно впитывающая)" },
      ],
    },
    {
      key: "canSize",
      label: "Ёмкость канистры",
      type: "select",
      defaultValue: 5,
      options: [
        { value: 5, label: "5 л" },
        { value: 10, label: "10 л" },
        { value: 20, label: "20 л" },
      ],
    },
  ],
  calculate(inputs): import("../types").CalculatorResult {
    const area = Math.max(1, inputs.area ?? 50);
    const surfaceType = Math.round(inputs.surfaceType ?? 0);
    const primerType = Math.round(inputs.primerType ?? 0);
    const coats = Math.round(inputs.coats ?? 1);
    const canSize = inputs.canSize ?? 5;

    // Расход л/м² по типу грунтовки и поверхности
    const baseConsumption: Record<number, number> = {
      0: 0.1,  // глубокое проникновение
      1: 0.35, // бетонконтакт
      2: 0.12, // для ГКЛ
    };

    const surfaceMultiplier: Record<number, number> = {
      0: 1.5,  // бетон, пеноблок — сильно впитывает
      1: 1.0,  // ГКЛ, штукатурка
      2: 1.2,  // непористая (бетонконтакт)
      3: 1.3,  // дерево, OSB
    };

    const lPerSqm = (baseConsumption[primerType] ?? 0.1) * (surfaceMultiplier[surfaceType] ?? 1.0);
    const totalL = area * lPerSqm * coats * 1.05; // +5% запас
    const cans = Math.ceil(totalL / canSize);

    const warnings: string[] = [];
    if (surfaceType === 0 && primerType !== 0) {
      warnings.push("Для сильно впитывающих поверхностей (бетон, пеноблок) рекомендуется грунтовка глубокого проникновения");
    }
    if (primerType === 1 && surfaceType === 0) {
      warnings.push("Бетон-контакт используется для гладких невпитывающих поверхностей (бетон, кафель)");
    }
    if (coats === 1 && surfaceType === 0) {
      warnings.push("Рекомендуется 2 слоя на сильно впитывающих поверхностях (пеноблок, ракушняк)");
    }

    const primerNames = ["Грунтовка глубокого проникновения", "Бетон-контакт", "Грунтовка для ГКЛ"];

    return {
      materials: [
        {
          name: `${primerNames[primerType] ?? primerNames[0]} (${canSize} л)`,
          quantity: totalL,
          unit: "л",
          withReserve: Math.ceil(totalL * 10) / 10,
          purchaseQty: cans,
          category: "Основное",
        },
        {
          name: "Валик малярный 250 мм",
          quantity: 1,
          unit: "шт",
          withReserve: 1,
          purchaseQty: 1,
          category: "Инструмент",
        },
        {
          name: "Кювета для грунтовки",
          quantity: 1,
          unit: "шт",
          withReserve: 1,
          purchaseQty: 1,
          category: "Инструмент",
        },
      ],
      totals: { area, lPerSqm, totalL, coats } as Record<string, number>,
      warnings,
    };
  },
  formulaDescription: `
**Расход грунтовки:**
Литров = Площадь × Расход (л/м²) × Кол-во слоёв

Нормы расхода (л/м²):
- Глубокого проникновения: 0.10–0.15 (впитывающие 0.15–0.20)
- Бетон-контакт: 0.30–0.40 л/м²
- Для ГКЛ: 0.10–0.12 л/м²

Запас 5% на потери при нанесении.
  `,
  howToUse: [
    "Введите площадь поверхности",
    "Выберите тип поверхности",
    "Выберите тип грунтовки",
    "Укажите количество слоёв (для пористых — 2)",
    "Нажмите «Рассчитать» — получите количество канистр",
  ],
};
