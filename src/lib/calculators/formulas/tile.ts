import type { CalculatorDefinition } from "../types";
import { buildNativeScenarios } from "../scenario-native";

export const tileDef: CalculatorDefinition = {
  id: "tile",
  slug: "plitka",
  title: "Калькулятор плитки",
  h1: "Калькулятор плитки онлайн — расчёт количества плитки и клея",
  description: "Рассчитайте количество плитки, клея и затирки для пола и стен. Учёт способа укладки, отходов и размера плитки.",
  metaTitle: "Калькулятор плитки онлайн | Расчёт плитки и клея — Мастерок",
  metaDescription: "Бесплатный калькулятор плитки: рассчитайте количество керамической плитки, плиточного клея и затирки. Учёт способа укладки, размера швов и отходов.",
  category: "flooring",
  categorySlug: "poly",
  tags: ["плитка", "кафель", "керамика", "плиточный клей", "затирка", "ванная", "кухня"],
  popularity: 88,
  complexity: 2,
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
      min: 0.5,
      max: 30,
      step: 0.1,
      defaultValue: 4,
      group: "bySize",
    },
    {
      key: "width",
      label: "Ширина комнаты",
      type: "slider",
      unit: "м",
      min: 0.5,
      max: 30,
      step: 0.1,
      defaultValue: 3,
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
      defaultValue: 12,
      group: "byArea",
    },
    {
      key: "tileWidth",
      label: "Ширина плитки",
      type: "slider",
      unit: "мм",
      min: 50,
      max: 1200,
      step: 10,
      defaultValue: 300,
    },
    {
      key: "tileHeight",
      label: "Высота/длина плитки",
      type: "slider",
      unit: "мм",
      min: 50,
      max: 1200,
      step: 10,
      defaultValue: 300,
    },
    {
      key: "layingMethod",
      label: "Способ укладки",
      type: "select",
      defaultValue: 0,
      options: [
        { value: 0, label: "Прямая (параллельная) — +5%" },
        { value: 1, label: "Диагональная — +15%" },
        { value: 2, label: "Кирпичная (со смещением) — +8%" },
      ],
    },
    {
      key: "jointWidth",
      label: "Ширина шва",
      type: "slider",
      unit: "мм",
      min: 1,
      max: 10,
      step: 0.5,
      defaultValue: 2,
    },
    {
      key: "jointDepth",
      label: "Глубина шва затирки",
      type: "slider",
      unit: "мм",
      min: 2,
      max: 15,
      step: 0.5,
      defaultValue: 6,
      hint: "Обычно равна ширине шва или 2/3 толщины плитки",
    },
    {
      key: "roomComplexity",
      label: "Сложность помещения",
      type: "select",
      defaultValue: 0,
      options: [
        { value: 0, label: "Простое (прямоугольник)" },
        { value: 1, label: "Среднее (короба, ниши)" },
        { value: 2, label: "Сложное (много углов, радиусы)" },
      ],
    },
  ],
  calculate(inputs) {
    const inputMode = Math.round(inputs.inputMode ?? 0);
    let area: number;
    if (inputMode === 0) {
      const l = Math.max(0.5, inputs.length ?? 4);
      const w = Math.max(0.5, inputs.width ?? 3);
      area = l * w;
    } else {
      area = Math.max(1, inputs.area ?? 12);
    }

    const tileW = (inputs.tileWidth ?? 300) / 1000; // перевод в метры
    const tileH = (inputs.tileHeight ?? 300) / 1000;
    const method = Math.round(inputs.layingMethod ?? 0);
    const jointW = (inputs.jointWidth ?? 2) / 1000;
    const complexity = Math.round(inputs.roomComplexity ?? 0);

    // Площадь одной плитки с учётом шва
    const tileArea = (tileW + jointW) * (tileH + jointW);

    // Коэффициент отходов по способу укладки + сложность
    const baseWaste: Record<number, number> = { 0: 1.05, 1: 1.15, 2: 1.08 };
    const complexityExtra = [0, 0.05, 0.10];
    const coeff = (baseWaste[method] ?? 1.05) + (complexityExtra[complexity] ?? 0);

    const tilesExact = area / tileArea;
    const tilesWithWaste = Math.ceil(tilesExact * coeff);

    // Клей: ~5 кг/м² при слое 6 мм, мешок 25 кг
    // Для крупного формата (от 600мм) расход выше на 20% (двойное нанесение)
    const isLargeFormat = tileW >= 0.6 || tileH >= 0.6;
    const adhesiveRate = isLargeFormat ? 6.5 : 5;
    const adhesiveKg = area * adhesiveRate * 1.05;
    const adhesiveBags = Math.ceil(adhesiveKg / 25);

    // Затирка по формуле: расход = (W+H)/(W×H) × шов × глубина × плотность
    const jointDepth = (inputs.jointDepth ?? 6) / 1000; // перевод мм → м
    const groutKgPerSqm = ((1 / tileW + 1 / tileH) * jointW * jointDepth * 1600);
    const groutKg = area * groutKgPerSqm * 1.1; // 10% запас на потери в ведре
    const groutBags = Math.ceil(groutKg / 2); // мешки 2 кг

    const warnings: string[] = [];
    if (tilesExact < 5) warnings.push("При укладке меньше 5 плиток процент отходов может быть выше расчётного");
    if (method === 1) warnings.push("Диагональная укладка: требует высокой квалификации мастера и большего запаса");
    if (isLargeFormat) warnings.push("Крупный формат: требуется двойное нанесение клея (на пол и на плитку)");

    const materials = [
      {
        name: `Плитка ${Math.round(tileW * 1000)}×${Math.round(tileH * 1000)} мм`,
        quantity: tilesExact,
        unit: "шт",
        withReserve: tilesWithWaste,
        purchaseQty: tilesWithWaste,
        category: "Основное",
      },
      {
        name: "Плиточный клей (усиленный, 25 кг)",
        quantity: adhesiveBags,
        unit: "мешков",
        withReserve: adhesiveBags,
        purchaseQty: adhesiveBags,
        category: "Клей",
      },
      {
        name: "Затирка цементная (2 кг)",
        quantity: groutBags,
        unit: "мешков",
        withReserve: groutBags,
        purchaseQty: groutBags,
        category: "Затирка",
      },
      {
        name: "Грунтовка глубокого проникновения",
        quantity: area * 0.3,
        unit: "л",
        withReserve: area * 0.3 * 1.15,
        purchaseQty: Math.ceil((area * 0.3 * 1.15) / 10) * 10,
        category: "Подготовка",
      },
      {
        name: "Бетоноконтакт (для слабовпитывающих)",
        quantity: area * 0.3,
        unit: "кг",
        withReserve: area * 0.3,
        purchaseQty: Math.ceil(area * 0.3 / 5) * 5,
        category: "Подготовка",
      },
      ...((inputs.tileWidth ?? 300) >= 300 || (inputs.tileHeight ?? 300) >= 300
        ? [
            {
              name: "СВП (зажимы + клинья, комплект)",
              quantity: area / (tileW * tileH),
              unit: "шт",
              withReserve: Math.ceil((area / (tileW * tileH)) * 1.1),
              purchaseQty: Math.ceil((area / (tileW * tileH)) * 1.1 / 100) * 100,
              category: "Крепёж",
            },
          ]
        : []),
      {
        name: "Герметик силиконовый (в цвет затирки)",
        quantity: Math.ceil(area / 15),
        unit: "шт",
        withReserve: Math.ceil(area / 15),
        purchaseQty: Math.max(1, Math.ceil(area / 15)),
        category: "Затирка",
      },
    ];

    const scenarios = buildNativeScenarios({
      id: "tile-main",
      title: "Tile main",
      exactNeed: tilesExact * coeff,
      unit: "шт",
      packageSizes: [1],
      packageLabelPrefix: "tile-piece",
    });

    return {
      materials,
      totals: {
        area,
        tilesNeeded: tilesWithWaste,
        tileArea: tileArea,
        wastePercent: Math.round((coeff - 1) * 100),
      },
      warnings,
      scenarios,
    };
  },
  formulaDescription: `
**Расчёт плитки (практика отделочников):**

1. **Количество**: N = (S / S_плитки) × K_отходов.
2. **Запас**: 
   - Прямая укладка: 5%
   - Диагональ: 15%
   - Сложная геометрия (короба): +5-10% к базе.
3. **Клей**: Расход 5 кг/м² для плитки до 30х30 см и 6.5 кг/м² для крупного формата (двойной слой).
4. **Затирка**: Расход зависит от периметра плитки, ширины и глубины шва.
  `,
  howToUse: [
    "Введите размеры или площадь укладки",
    "Укажите размер плитки и ширину шва",
    "Выберите способ укладки и сложность помещения",
    "Нажмите «Рассчитать» — получите список материалов с учётом подготовки основания",
  ],
  expertTips: [
    {
      title: "Подготовка основания",
      content: "Никогда не кладите плитку на гипсовую штукатурку без специального грунта (бетоноконтакта). Гипс вытягивает влагу из клея, и плитка со временем отвалится.",
      author: "Петрович, мастер-отделочник"
    },
    {
      title: "Запас на подрезку",
      content: "Если в ванной много коробов, ниш и углов, даже при прямой укладке берите запас 10–12%. При крупном формате плитки (600х600 и выше) отходов всегда больше.",
      author: "Прораб"
    }
  ],
  faq: [
    {
      question: "Какую ширину шва выбрать?",
      answer: "Для настенной плитки стандарт 1.5–2 мм. Для напольной — 2.5–3 мм. Бесшовная укладка (ректификат) всё равно требует минимального шва в 1 мм для компенсации температурных расширений."
    },
    {
      question: "Сколько сохнет плиточный клей?",
      answer: "Ходить по плитке и затирать швы можно через 24 часа. Полную нагрузку (установка мебели) можно давать через 7–14 дней."
    }
  ]
};
