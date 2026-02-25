import type { CalculatorDefinition } from "../types";

export const ceilingCassetteDef: CalculatorDefinition = {
  id: "ceilings_cassette",
  slug: "kassetnyi-potolok",
  title: "Калькулятор кассетного потолка",
  h1: "Калькулятор кассетного потолка онлайн — расчёт кассет и профилей",
  description: "Рассчитайте количество кассет (600×600 или 595×595 мм), несущих профилей и подвесов для кассетного подвесного потолка.",
  metaTitle: "Калькулятор кассетного потолка | Расчёт кассет Armstrong — Мастерок",
  metaDescription: "Бесплатный калькулятор кассетного потолка Armstrong: рассчитайте кассеты 600×600, профили Т-24 и крепёж по площади.",
  category: "ceiling",
  categorySlug: "potolki",
  tags: ["кассетный потолок", "кассеты 600x600", "Armstrong", "Т-24", "подвесной потолок"],
  popularity: 58,
  complexity: 2,
  fields: [
    {
      key: "area",
      label: "Площадь потолка",
      type: "slider",
      unit: "м²",
      min: 1,
      max: 500,
      step: 1,
      defaultValue: 20,
    },
    {
      key: "cassetteSize",
      label: "Размер кассеты",
      type: "select",
      defaultValue: 600,
      options: [
        { value: 595, label: "595×595 мм (Т-24)" },
        { value: 600, label: "600×600 мм (открытый)" },
        { value: 300, label: "300×300 мм (декоративные)" },
      ],
    },
    {
      key: "roomLength",
      label: "Длина помещения",
      type: "slider",
      unit: "м",
      min: 2,
      max: 50,
      step: 0.5,
      defaultValue: 5,
    },
  ],
  calculate(inputs): import("../types").CalculatorResult {
    const area = Math.max(1, inputs.area ?? 20);
    const cassetteSize = inputs.cassetteSize ?? 600; // мм
    const cassetteSizeM = cassetteSize / 1000;
    const roomLength = Math.max(2, inputs.roomLength ?? 5);
    const roomWidth = area / roomLength;

    // Кассеты: +10% на подрезку крайних рядов
    const cassettesPerRow = Math.ceil(roomLength / cassetteSizeM);
    const rows = Math.ceil(roomWidth / cassetteSizeM);
    const totalCassettes = cassettesPerRow * rows;
    const cassettesWithReserve = Math.ceil(totalCassettes * 1.1);

    // Главный несущий профиль (1200 мм, монтируется через 1200 мм)
    const mainSpacing = 1.2;
    const mainRows = Math.ceil(roomWidth / mainSpacing) + 1;
    const mainProfileLength = 1.2; // м
    const mainProfilePcs = Math.ceil((mainRows * roomLength) / mainProfileLength);

    // Поперечный профиль (600 мм), монтируется между главными
    const crossProfileLength = 0.6; // м
    const crossPerRow = Math.ceil(roomLength / crossProfileLength);
    const crossProfilePcs = Math.ceil(mainRows * crossPerRow * cassetteSizeM / crossProfileLength);

    // Подвесы: 1 на 1.2 м вдоль главного профиля
    const hangersPerMainRow = Math.ceil(roomLength / 1.2) + 1;
    const hangers = mainRows * hangersPerMainRow;

    const warnings: string[] = [];
    if (cassetteSize === 300) {
      warnings.push("Кассеты 300×300 требуют сдвоенной решётки профилей — умножьте количество профилей на 2");
    }
    if (area > 50) {
      warnings.push("Для больших площадей рекомендуйте устанавливать профили с шагом 600 мм для жёсткости");
    }

    return {
      materials: [
        {
          name: `Кассета ${cassetteSize}×${cassetteSize} мм`,
          quantity: totalCassettes,
          unit: "шт",
          withReserve: cassettesWithReserve,
          purchaseQty: cassettesWithReserve,
          category: "Кассеты",
        },
        {
          name: "Профиль несущий Т-24 (1200 мм)",
          quantity: mainProfilePcs,
          unit: "шт",
          withReserve: Math.ceil(mainProfilePcs * 1.05),
          purchaseQty: Math.ceil(mainProfilePcs * 1.05),
          category: "Профили",
        },
        {
          name: "Профиль поперечный Т-24 (600 мм)",
          quantity: crossProfilePcs,
          unit: "шт",
          withReserve: Math.ceil(crossProfilePcs * 1.05),
          purchaseQty: Math.ceil(crossProfilePcs * 1.05),
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
          name: "Профиль пристенный L-образный",
          quantity: Math.ceil((roomLength + roomWidth) * 2 * 1.05 / 3),
          unit: "шт (3 м)",
          withReserve: Math.ceil((roomLength + roomWidth) * 2 * 1.1 / 3),
          purchaseQty: Math.ceil((roomLength + roomWidth) * 2 * 1.1 / 3),
          category: "Профили",
        },
      ],
      totals: { area, totalCassettes, hangers } as Record<string, number>,
      warnings,
    };
  },
  formulaDescription: `
**Расчёт кассетного потолка:**
- Кассет = Рядов × Кассет/ряд × 1.1
- Несущий профиль 1200 мм: через каждые 1.2 м
- Поперечный профиль 600 мм: заполняет ячейки решётки
  `,
  howToUse: [
    "Введите площадь потолка",
    "Выберите размер кассеты",
    "Укажите длину помещения",
    "Нажмите «Рассчитать»",
  ],
};
