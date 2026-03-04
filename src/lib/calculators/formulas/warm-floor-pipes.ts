import type { CalculatorDefinition } from "../types";

export const warmFloorPipesDef: CalculatorDefinition = {
  id: "warm_floor_pipes",
  slug: "vodyanoy-teplyy-pol",
  title: "Калькулятор водяного тёплого пола",
  h1: "Калькулятор водяного тёплого пола онлайн — расчёт труб и материалов",
  description: "Рассчитайте длину труб, количество контуров, утеплитель, демпферную ленту и стяжку для водяного тёплого пола.",
  metaTitle: "Калькулятор водяного тёплого пола | Расчёт труб PEX — Мастерок",
  metaDescription: "Бесплатный калькулятор водяного тёплого пола: длина труб PEX/PE-RT, количество контуров, утеплитель ЭППС, коллектор, стяжка. Быстрый расчёт онлайн.",
  category: "engineering",
  categorySlug: "inzhenernye",
  tags: ["тёплый пол", "водяной тёплый пол", "трубы", "PEX", "коллектор"],
  popularity: 68,
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
      min: 1,
      max: 30,
      step: 0.5,
      defaultValue: 5,
      group: "bySize",
    },
    {
      key: "width",
      label: "Ширина комнаты",
      type: "slider",
      unit: "м",
      min: 1,
      max: 30,
      step: 0.5,
      defaultValue: 4,
      group: "bySize",
    },
    {
      key: "area",
      label: "Площадь помещения",
      type: "slider",
      unit: "м²",
      min: 1,
      max: 300,
      step: 1,
      defaultValue: 20,
      group: "byArea",
    },
    {
      key: "pipeStep",
      label: "Шаг укладки трубы",
      type: "select",
      defaultValue: 200,
      options: [
        { value: 100, label: "100 мм — максимальная теплоотдача" },
        { value: 150, label: "150 мм — повышенная теплоотдача" },
        { value: 200, label: "200 мм — стандартный (рекомендуется)" },
        { value: 250, label: "250 мм — экономичный" },
        { value: 300, label: "300 мм — минимальная теплоотдача" },
      ],
      hint: "Чем меньше шаг, тем теплее пол, но больше расход трубы",
    },
    {
      key: "pipeType",
      label: "Тип трубы",
      type: "select",
      defaultValue: 0,
      options: [
        { value: 0, label: "PEX-a 16 мм (сшитый полиэтилен)" },
        { value: 1, label: "PEX-b 16 мм (сшитый полиэтилен)" },
        { value: 2, label: "PE-RT 16 мм (термостойкий полиэтилен)" },
        { value: 3, label: "Металлопластик 16 мм (PEX-AL-PEX)" },
      ],
    },
  ],
  calculate(inputs): import("../types").CalculatorResult {
    const inputMode = Math.round(inputs.inputMode ?? 0);
    let area: number;
    let length: number;
    let width: number;

    if (inputMode === 0) {
      length = Math.max(1, inputs.length ?? 5);
      width = Math.max(1, inputs.width ?? 4);
      area = length * width;
    } else {
      area = Math.max(1, inputs.area ?? 20);
      // Estimate dimensions for perimeter (aspect ratio ~5:4)
      length = Math.sqrt(area * 1.25);
      width = area / length;
    }

    const perimeter = 2 * (length + width);
    const pipeStep = inputs.pipeStep ?? 200; // мм
    const pipeType = Math.round(inputs.pipeType ?? 0);

    // Полезная площадь: минус ~15% под мебель и отступы от стен
    const usefulArea = area * 0.85;

    // Длина трубы: площадь / шаг + подводка к коллектору (~3 м)
    const pipeStepM = pipeStep / 1000;
    const pipeLength = usefulArea / pipeStepM + 3;

    // Максимальная длина контура для трубы 16 мм — 80 м
    const maxCircuit = 80;
    const circuits = Math.max(1, Math.ceil(pipeLength / maxCircuit));

    // Итоговая длина трубы с запасом 5%
    const totalPipe = pipeLength * 1.05;

    // Бухты по 200 м
    const coils = Math.ceil(totalPipe / 200);

    // Название трубы
    const pipeNames: Record<number, string> = {
      0: "PEX-a 16 мм",
      1: "PEX-b 16 мм",
      2: "PE-RT 16 мм",
      3: "Металлопластик 16 мм (PEX-AL-PEX)",
    };
    const pipeName = pipeNames[pipeType] ?? "PEX-a 16 мм";

    // Утеплитель ЭППС 30 мм (плиты 1200×600 мм = 0.72 м²)
    const insulationSheets = Math.ceil(area * 1.05 / 0.72);

    // Демпферная лента (рулоны по 25 м)
    const damperLength = perimeter * 1.05;
    const damperRolls = Math.ceil(damperLength / 25);

    // Якорные скобы: через каждые 0.3 м трубы, запас 5%, упаковки по 100 шт
    const clipsRaw = Math.ceil(totalPipe / 0.3) * 1.05;
    const clipsPacks = Math.ceil(clipsRaw / 100);
    const clipsTotal = clipsPacks * 100;

    // Коллекторная группа
    const collectorOutputs = circuits;

    // Стяжка ЦПС: толщина 50 мм (0.05 м), плотность раствора ~1500 кг/м³, мешки 25 кг
    const screedMass = area * 0.05 * 1500;
    const screedBags = Math.ceil(screedMass / 25);

    const materials: import("../types").MaterialResult[] = [
      {
        name: `Труба ${pipeName}`,
        quantity: Math.round(pipeLength * 100) / 100,
        unit: "м.п.",
        withReserve: Math.round(totalPipe * 100) / 100,
        purchaseQty: coils * 200,
        category: "Труба",
      },
      {
        name: `Труба ${pipeName} (бухта 200 м)`,
        quantity: totalPipe / 200,
        unit: "бухт",
        withReserve: coils,
        purchaseQty: coils,
        category: "Труба",
      },
      {
        name: "Утеплитель ЭППС 30 мм (плита 1200×600 мм)",
        quantity: Math.round(area / 0.72 * 100) / 100,
        unit: "шт",
        withReserve: insulationSheets,
        purchaseQty: insulationSheets,
        category: "Теплоизоляция",
      },
      {
        name: "Демпферная лента (рулон 25 м)",
        quantity: Math.round(perimeter / 25 * 100) / 100,
        unit: "рулонов",
        withReserve: damperRolls,
        purchaseQty: damperRolls,
        category: "Монтаж",
      },
      {
        name: "Якорные скобы (упак. 100 шт)",
        quantity: Math.ceil(totalPipe / 0.3),
        unit: "шт",
        withReserve: Math.round(clipsRaw),
        purchaseQty: clipsTotal,
        category: "Крепёж",
      },
      {
        name: `Коллекторная группа на ${collectorOutputs} контуров`,
        quantity: 1,
        unit: "шт",
        withReserve: 1,
        purchaseQty: 1,
        category: "Коллектор",
      },
      {
        name: "Стяжка ЦПС (мешок 25 кг)",
        quantity: Math.round(screedMass / 25 * 100) / 100,
        unit: "мешков",
        withReserve: screedBags,
        purchaseQty: screedBags,
        category: "Стяжка",
      },
    ];

    const warnings: string[] = [];
    if (pipeLength > maxCircuit) {
      warnings.push(`Рекомендуется ${circuits} контуров для равномерного нагрева (макс. ${maxCircuit} м на контур для трубы 16 мм)`);
    }
    if (area > 40) {
      warnings.push("При площади > 40 м² рекомендуется проектный расчёт теплопотерь");
    }

    return {
      materials,
      totals: {
        area,
        usefulArea,
        perimeter,
        pipeLength: Math.round(pipeLength * 100) / 100,
        totalPipe: Math.round(totalPipe * 100) / 100,
        circuits,
        coils,
      } as Record<string, number>,
      warnings,
    };
  },
  formulaDescription: `
**Расчёт водяного тёплого пола:**

Полезная площадь = Площадь × 0.85 (минус мебель и отступы)
Длина трубы = Полезная_площадь / Шаг_укладки + 3 м (подводка к коллектору)
Контуры = Длина_трубы / 80 м (макс. длина контура для Ø16 мм)

**Рекомендуемый шаг укладки:**
- 100–150 мм — ванная, санузел (холодный кафель)
- 200 мм — жилые комнаты (стандарт)
- 250–300 мм — коридоры, подсобные помещения

**Стяжка:** минимум 50 мм над трубой (по СП 29.13330)
  `,
  howToUse: [
    "Введите размеры помещения или площадь",
    "Выберите шаг укладки трубы (200 мм — стандарт)",
    "Выберите тип трубы (PEX-a — самый надёжный)",
    "Нажмите «Рассчитать» — получите длину трубы, утеплитель, коллектор и стяжку",
  ],
};
