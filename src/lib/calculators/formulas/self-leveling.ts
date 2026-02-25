import type { CalculatorDefinition } from "../types";

export const selfLevelingDef: CalculatorDefinition = {
  id: "floors_self_leveling",
  slug: "nalivnoy-pol",
  title: "Калькулятор наливного пола",
  h1: "Калькулятор наливного пола онлайн — расчёт расхода смеси",
  description: "Рассчитайте количество самовыравнивающейся смеси для наливного пола. Ceresit CN, Knauf Боден, Волма Нивелир.",
  metaTitle: "Калькулятор наливного пола | Расчёт Ceresit CN, Knauf — Мастерок",
  metaDescription: "Бесплатный калькулятор наливного пола: рассчитайте мешки Ceresit CN 175, Knauf Боден 25, Волма Нивелир по площади и толщине слоя.",
  category: "flooring",
  categorySlug: "poly",
  tags: ["наливной пол", "самовыравнивающийся пол", "Ceresit CN", "Knauf Боден", "Волма Нивелир"],
  popularity: 58,
  complexity: 1,
  fields: [
    {
      key: "inputMode",
      label: "Способ ввода",
      type: "radio",
      defaultValue: 0,
      options: [
        { value: 0, label: "По размерам помещения" },
        { value: 1, label: "По площади" },
      ],
    },
    {
      key: "length",
      label: "Длина помещения",
      type: "slider",
      unit: "м",
      min: 1,
      max: 50,
      step: 0.5,
      defaultValue: 5,
      group: "bySize",
    },
    {
      key: "width",
      label: "Ширина помещения",
      type: "slider",
      unit: "м",
      min: 1,
      max: 50,
      step: 0.5,
      defaultValue: 4,
      group: "bySize",
    },
    {
      key: "area",
      label: "Площадь",
      type: "slider",
      unit: "м²",
      min: 1,
      max: 1000,
      step: 1,
      defaultValue: 20,
      group: "byArea",
    },
    {
      key: "thickness",
      label: "Толщина слоя",
      type: "slider",
      unit: "мм",
      min: 3,
      max: 100,
      step: 1,
      defaultValue: 10,
      hint: "Выравнивающий слой: 5–30 мм, финишный: 3–5 мм",
    },
    {
      key: "mixtureType",
      label: "Тип смеси",
      type: "select",
      defaultValue: 0,
      options: [
        { value: 0, label: "Выравнивающая (Ceresit CN 175, Волма Нивелир)" },
        { value: 1, label: "Финишная (Ceresit CN 68, Knauf Боден 25)" },
        { value: 2, label: "Быстросхватывающаяся (Ceresit CN 76)" },
      ],
    },
    {
      key: "bagWeight",
      label: "Фасовка мешка",
      type: "select",
      defaultValue: 25,
      options: [
        { value: 20, label: "20 кг" },
        { value: 25, label: "25 кг" },
      ],
    },
  ],
  calculate(inputs): import("../types").CalculatorResult {
    const inputMode = Math.round(inputs.inputMode ?? 0);
    let area: number;
    if (inputMode === 0) {
      area = Math.max(1, inputs.length ?? 5) * Math.max(1, inputs.width ?? 4);
    } else {
      area = Math.max(1, inputs.area ?? 20);
    }

    const thickness = Math.max(3, Math.min(100, inputs.thickness ?? 10));
    const mixtureType = Math.round(inputs.mixtureType ?? 0);
    const bagWeight = inputs.bagWeight ?? 25;

    // Расход на 1 мм толщины (кг/м²): выравнивающие ~1.6, финишные ~1.4, быстрые ~1.8
    const consumptionPer1mm: Record<number, number> = { 0: 1.6, 1: 1.4, 2: 1.8 };
    const kgPerSqmPer1mm = consumptionPer1mm[mixtureType] ?? 1.6;
    const kgPerSqm = kgPerSqmPer1mm * thickness;

    const totalKg = area * kgPerSqm * 1.05; // +5% запас
    const bags = Math.ceil(totalKg / bagWeight);

    // Грунтовка
    const primerL = area * 0.15;
    const primerCans = Math.ceil(primerL / 5);

    // Демпферная лента
    const perimeterEst = Math.ceil(Math.sqrt(area) * 4);
    const tapeRolls = Math.ceil(perimeterEst / 25);

    const warnings: string[] = [];
    if (thickness < 5 && mixtureType === 0) {
      warnings.push("Минимальная толщина выравнивающей смеси — 5 мм. Для тонкого слоя используйте финишную смесь");
    }
    if (thickness > 30 && mixtureType !== 0) {
      warnings.push("Для больших перепадов (> 30 мм) используйте выравнивающую базовую смесь");
    }
    if (area > 30) {
      warnings.push("При площади > 30 м² необходимо устройство деформационных швов");
    }

    const typeNames = ["Выравнивающая смесь", "Финишная смесь", "Быстросхватывающаяся"];

    return {
      materials: [
        {
          name: `${typeNames[mixtureType] ?? typeNames[0]} (мешки ${bagWeight} кг)`,
          quantity: totalKg / bagWeight,
          unit: "мешков",
          withReserve: bags,
          purchaseQty: bags,
          category: "Основное",
        },
        {
          name: "Грунтовка глубокого проникновения (5 л)",
          quantity: primerL / 5,
          unit: "шт",
          withReserve: primerCans,
          purchaseQty: primerCans,
          category: "Подготовка",
        },
        {
          name: "Демпферная лента (рулон 25 м)",
          quantity: perimeterEst / 25,
          unit: "рулонов",
          withReserve: tapeRolls,
          purchaseQty: tapeRolls,
          category: "Подготовка",
        },
      ],
      totals: { area, thickness, kgPerSqm, totalKg } as Record<string, number>,
      warnings,
    };
  },
  formulaDescription: `
**Расход наливного пола:**
кг/м² = Расход_на_1мм × Толщина (мм)

Нормы расхода на 1 мм:
- Выравнивающая (Ceresit CN 175): ~1.6 кг/м²
- Финишная (Knauf Боден 25): ~1.4 кг/м²
- Быстросхватывающаяся (Ceresit CN 76): ~1.8 кг/м²

По СНиП 3.04.01-87: при перепадах до 4 мм — финишная, 5–30 мм — выравнивающая.
  `,
  howToUse: [
    "Введите размеры помещения или площадь",
    "Укажите толщину слоя (фактический перепад пола)",
    "Выберите тип смеси",
    "Нажмите «Рассчитать» — получите мешки, грунтовку и ленту",
  ],
};
