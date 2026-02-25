import type { CalculatorDefinition } from "../types";

export const partitionsDef: CalculatorDefinition = {
  id: "partitions_blocks",
  slug: "peregorodki-iz-blokov",
  title: "Калькулятор перегородок из блоков",
  h1: "Калькулятор перегородок из газоблока и пеноблока онлайн",
  description: "Рассчитайте количество блоков (газобетон, пенобетон), клея и армирующей сетки для возведения перегородки.",
  metaTitle: "Калькулятор перегородок из блоков | Газоблок, пеноблок — Мастерок",
  metaDescription: "Бесплатный калькулятор перегородок: рассчитайте газоблоки, клей и армирующую сетку по длине и высоте перегородки.",
  category: "walls",
  categorySlug: "steny",
  tags: ["перегородки", "газоблок", "пеноблок", "перегородка из блоков", "газобетон"],
  popularity: 70,
  complexity: 2,
  fields: [
    {
      key: "length",
      label: "Длина перегородки",
      type: "slider",
      unit: "м",
      min: 1,
      max: 50,
      step: 0.5,
      defaultValue: 5,
    },
    {
      key: "height",
      label: "Высота перегородки",
      type: "slider",
      unit: "м",
      min: 2,
      max: 4,
      step: 0.1,
      defaultValue: 2.7,
    },
    {
      key: "thickness",
      label: "Толщина блока",
      type: "select",
      defaultValue: 100,
      options: [
        { value: 75, label: "75 мм (75мм — шумоизоляция)" },
        { value: 100, label: "100 мм (стандарт)" },
        { value: 150, label: "150 мм (усиленная)" },
        { value: 200, label: "200 мм (несущая)" },
      ],
    },
    {
      key: "blockType",
      label: "Тип блока",
      type: "select",
      defaultValue: 0,
      options: [
        { value: 0, label: "Газобетон D500 (Ytong, БЗТК)" },
        { value: 1, label: "Пенобетон D600" },
        { value: 2, label: "Гипсовые пазогребневые плиты" },
      ],
    },
  ],
  calculate(inputs): import("../types").CalculatorResult {
    const length = Math.max(1, inputs.length ?? 5);
    const height = Math.max(2, inputs.height ?? 2.7);
    const thickness = inputs.thickness ?? 100; // мм
    const blockType = Math.round(inputs.blockType ?? 0);

    const wallArea = length * height;

    // Размеры блоков по типу (ДхВхШ в мм)
    const blockDims: { l: number; h: number; w: number; gluePerM2: number } = blockType === 2
      ? { l: 667, h: 500, w: thickness, gluePerM2: 0 } // ПГП — на гипсовое молочко
      : { l: 625, h: 250, w: thickness, gluePerM2: 1.5 }; // газо/пенобетон — клей 1.5 кг/м²

    const blockAreaM2 = (blockDims.l / 1000) * (blockDims.h / 1000);
    const blocksNeeded = Math.ceil(wallArea / blockAreaM2 * 1.05);

    // Клей для блоков: 1.5 кг/м² при шве 3 мм
    const glueKg = blockType === 2
      ? 0
      : wallArea * blockDims.gluePerM2;
    const glueBags = Math.ceil(glueKg / 25); // мешок 25 кг

    // Армирующая сетка: каждые 3 ряда (≈75 см)
    const armRows = Math.ceil(height / 0.75);
    const armLength = length * armRows * 1.05;
    const armRolls = Math.ceil(armLength / 50); // рулон 50 м.п.

    // Монтажная пена для примыкания к стенам/потолку
    const foamBottles = Math.ceil((length + height * 2) / 5); // 1 баллон ≈ 5 м.п.

    const blockTypeNames = ["Газобетон", "Пенобетон", "ПГП"];
    const warnings: string[] = [];
    warnings.push("Первый ряд укладывайте на цементно-песчаный раствор для точной горизонтальной базы");
    if (blockType === 2) {
      warnings.push("ПГП монтируются на гипсовое молочко (Волма Монтаж или аналог)");
    }
    if (height > 3.0) {
      warnings.push("При высоте >3 м перегородку необходимо связать с несущими конструкциями анкерами");
    }

    return {
      materials: [
        {
          name: `${blockTypeNames[blockType]} блок ${blockDims.l}×${blockDims.h}×${thickness} мм`,
          quantity: wallArea / blockAreaM2,
          unit: "шт",
          withReserve: blocksNeeded,
          purchaseQty: blocksNeeded,
          category: "Блоки",
        },
        ...(glueBags > 0 ? [{
          name: "Клей для газобетона (25 кг)",
          quantity: glueKg / 25,
          unit: "мешков",
          withReserve: glueBags,
          purchaseQty: glueBags,
          category: "Клей",
        }] : [{
          name: "Гипсовое молочко для ПГП (20 кг)",
          quantity: wallArea * 0.8 / 20,
          unit: "мешков",
          withReserve: Math.ceil(wallArea * 0.8 / 20),
          purchaseQty: Math.ceil(wallArea * 0.8 / 20),
          category: "Клей",
        }]),
        {
          name: "Сетка армирующая стеклотканевая (рулон 50 м.п.)",
          quantity: armLength / 50,
          unit: "рулонов",
          withReserve: armRolls,
          purchaseQty: armRolls,
          category: "Армирование",
        },
        {
          name: "Монтажная пена (750 мл)",
          quantity: (length + height * 2) / 5,
          unit: "баллонов",
          withReserve: foamBottles,
          purchaseQty: foamBottles,
          category: "Примыкания",
        },
        {
          name: "Грунтовка глубокого проникновения (канистра 10 л)",
          quantity: wallArea * 2 * 0.15, // 150 мл/м² × 2 стороны → литры
          unit: "л",
          withReserve: Math.ceil(wallArea * 2 * 0.15 * 1.15 * 10) / 10,
          purchaseQty: Math.ceil(wallArea * 2 * 0.15 * 1.15 / 10), // канистра 10 л
          category: "Грунтовка",
        },
        {
          name: "Уплотнительная лента (рулон 30 м)",
          quantity: (() => {
            // Примыкания: к полу (length), к потолку (length), к стенам (height × 2)
            const sealLength = length * 2 + height * 2;
            return sealLength;
          })(),
          unit: "м.п.",
          withReserve: Math.ceil((length * 2 + height * 2) * 1.1),
          purchaseQty: Math.ceil((length * 2 + height * 2) * 1.1 / 30), // рулон 30 м
          category: "Примыкания",
        },
      ],
      totals: { wallArea, blocksNeeded, length, height } as Record<string, number>,
      warnings,
    };
  },
  formulaDescription: `
**Расчёт перегородки из блоков:**
- Газоблок 625×250: ~6.4 шт/м²
- ПГП 667×500: ~3.0 шт/м²
- Клей: 1.5 кг/м² (мешок 25 кг)
- Армирование: каждые 3 ряда (~75 см)
  `,
  howToUse: [
    "Введите длину и высоту перегородки",
    "Выберите толщину и тип блока",
    "Нажмите «Рассчитать»",
  ],
};
