import type { CalculatorDefinition } from "../types";

export const aeratedConcreteDef: CalculatorDefinition = {
  id: "walls_aerated_concrete",
  slug: "gazobeton",
  title: "Калькулятор газобетона",
  h1: "Калькулятор газобетона онлайн — расчёт блоков и клея",
  description: "Рассчитайте количество газобетонных блоков, клея и армирования для стен и перегородок. Нормы по ГОСТ 31360-2007.",
  metaTitle: "Калькулятор газобетона | Расчёт блоков и клея — Мастерок",
  metaDescription: "Бесплатный калькулятор газобетона: рассчитайте количество блоков Ytong, Bonolit, Hebel и клея по ГОСТ 31360-2007. Учёт стен и перегородок.",
  category: "walls",
  categorySlug: "steny",
  tags: ["газобетон", "газосиликат", "блоки", "Ytong", "Bonolit", "перегородки", "газобетонные блоки"],
  popularity: 78,
  complexity: 2,
  fields: [
    {
      key: "inputMode",
      label: "Способ ввода",
      type: "radio",
      defaultValue: 0,
      options: [
        { value: 0, label: "По размерам стены" },
        { value: 1, label: "По площади" },
      ],
    },
    {
      key: "wallWidth",
      label: "Длина стены",
      type: "slider",
      unit: "м",
      min: 1,
      max: 100,
      step: 0.5,
      defaultValue: 10,
      group: "bySize",
    },
    {
      key: "wallHeight",
      label: "Высота стены",
      type: "slider",
      unit: "м",
      min: 1,
      max: 5,
      step: 0.1,
      defaultValue: 2.7,
      group: "bySize",
    },
    {
      key: "area",
      label: "Площадь стены",
      type: "slider",
      unit: "м²",
      min: 1,
      max: 500,
      step: 1,
      defaultValue: 27,
      group: "byArea",
    },
    {
      key: "openingsArea",
      label: "Площадь проёмов (окна, двери)",
      type: "slider",
      unit: "м²",
      min: 0,
      max: 50,
      step: 0.5,
      defaultValue: 5,
    },
    {
      key: "blockThickness",
      label: "Толщина блока",
      type: "select",
      defaultValue: 200,
      options: [
        { value: 100, label: "100 мм (перегородки)" },
        { value: 150, label: "150 мм (перегородки)" },
        { value: 200, label: "200 мм (несущие стены)" },
        { value: 250, label: "250 мм (несущие стены)" },
        { value: 300, label: "300 мм (наружные стены)" },
        { value: 375, label: "375 мм (наружные стены)" },
        { value: 400, label: "400 мм (наружные стены)" },
      ],
    },
    {
      key: "blockHeight",
      label: "Высота блока",
      type: "select",
      defaultValue: 200,
      options: [
        { value: 200, label: "200 мм (стандарт)" },
        { value: 250, label: "250 мм" },
      ],
    },
    {
      key: "blockLength",
      label: "Длина блока",
      type: "select",
      defaultValue: 600,
      options: [
        { value: 600, label: "600 мм (стандарт)" },
        { value: 625, label: "625 мм" },
      ],
    },
  ],
  calculate(inputs): import("../types").CalculatorResult {
    const inputMode = Math.round(inputs.inputMode ?? 0);
    let wallArea: number;

    if (inputMode === 0) {
      const w = Math.max(1, inputs.wallWidth ?? 10);
      const h = Math.max(1, inputs.wallHeight ?? 2.7);
      wallArea = w * h;
    } else {
      wallArea = Math.max(1, inputs.area ?? 27);
    }

    const openings = Math.max(0, inputs.openingsArea ?? 5);
    const netArea = Math.max(0.5, wallArea - openings);

    const blockT = inputs.blockThickness ?? 200; // мм
    const blockH = inputs.blockHeight ?? 200; // мм
    const blockL = inputs.blockLength ?? 600; // мм

    // Площадь грани блока (видимой) в м²
    const blockFaceArea = (blockH / 1000) * (blockL / 1000);
    const blocksPerSqm = 1 / blockFaceArea;

    const blocksNet = netArea * blocksPerSqm;
    const blocksWithReserve = Math.ceil(blocksNet * 1.05); // +5%

    // Клей для газобетона: 25–30 кг/м³ при шве 2–3 мм
    const volume = netArea * (blockT / 1000);
    const glueKg = volume * 28; // 28 кг/м³ — норма по ТЛ
    const glueBags = Math.ceil(glueKg / 25);

    // Армирование: каждый 4-й ряд или каждый ряд для перегородок
    const rows = Math.ceil((inputs.wallHeight ?? 2.7) / (blockH / 1000));
    const rebarRows = Math.ceil(rows / 4);
    const rebarLength = Math.ceil(
      (inputMode === 0 ? (inputs.wallWidth ?? 10) : Math.sqrt(netArea)) * rebarRows * 1.1
    );

    // Грунтовка глубокого проникновения: 150 мл/м²
    const primerLiters = netArea * 0.15;
    const primerWithReserve = primerLiters * 1.15;
    const primerCanisters = Math.ceil(primerWithReserve / 10); // канистра 10 л

    // U-блоки для перемычек: 1 перемычка на 3 м стены, длина перемычки ≈ 1 м, 1 блок на 0.5 м
    const wallLen = inputMode === 0 ? (inputs.wallWidth ?? 10) : Math.sqrt(wallArea);
    const lintelsCount = Math.max(1, Math.floor(wallLen / 3));
    const uBlocksNeeded = lintelsCount * 2; // 2 блока на перемычку (~1 м / 0.5 м)
    const uBlocksWithReserve = Math.ceil(uBlocksNeeded * 1.1);

    const warnings: string[] = [];
    if (blockT < 200) {
      warnings.push("Блоки ≤ 150 мм — только для ненесущих перегородок. Несущие стены от 200 мм");
    }
    if (blockT >= 300) {
      warnings.push("Для наружных стен 300+ мм рекомендуется проверить теплотехнический расчёт по СП 50.13330");
    }

    return {
      materials: [
        {
          name: `Блок газобетонный ${blockT}×${blockH}×${blockL} мм`,
          quantity: blocksNet,
          unit: "шт",
          withReserve: blocksWithReserve,
          purchaseQty: blocksWithReserve,
          category: "Блоки",
        },
        {
          name: "Клей для газобетона (мешки 25 кг)",
          quantity: glueKg / 25,
          unit: "мешков",
          withReserve: glueBags,
          purchaseQty: glueBags,
          category: "Кладочный клей",
        },
        {
          name: "Арматура Ø8 (армирование рядов)",
          quantity: rebarLength,
          unit: "м.п.",
          withReserve: rebarLength,
          purchaseQty: rebarLength,
          category: "Армирование",
        },
        {
          name: "Уголок защитный ПВХ",
          quantity: Math.ceil(Math.sqrt(netArea) * 4 * 1.1),
          unit: "м.п.",
          withReserve: Math.ceil(Math.sqrt(netArea) * 4 * 1.1),
          purchaseQty: Math.ceil(Math.sqrt(netArea) * 4 * 1.1 / 3),
          category: "Доп. материалы",
        },
        {
          name: "Грунтовка глубокого проникновения (канистра 10 л)",
          quantity: primerLiters,
          unit: "л",
          withReserve: Math.ceil(primerWithReserve * 10) / 10,
          purchaseQty: primerCanisters,
          category: "Грунтовка",
        },
        {
          name: "U-блок для перемычек",
          quantity: uBlocksNeeded,
          unit: "шт",
          withReserve: uBlocksWithReserve,
          purchaseQty: uBlocksWithReserve,
          category: "Перемычки",
        },
      ],
      totals: { wallArea, netArea, blocksNet, volume } as Record<string, number>,
      warnings,
    };
  },
  formulaDescription: `
**Расчёт газобетонных блоков:**
Блоков/м² = 1 / (Высота_блока × Длина_блока)

Стандартный блок 600×200 мм: 8.33 шт/м²
Клей: 25–30 кг/м³ кладки (шов 2–3 мм)

По ГОСТ 31360-2007: армирование каждые 4 ряда или по расчёту.
  `,
  howToUse: [
    "Введите размеры стены или площадь",
    "Укажите площадь проёмов (окна, двери)",
    "Выберите толщину и размер блока",
    "Нажмите «Рассчитать» — получите блоки, клей и армирование",
  ],
};
