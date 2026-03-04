import type { CalculatorDefinition } from "../types";

export const drywallCeilingDef: CalculatorDefinition = {
  id: "drywall_ceiling",
  slug: "podvesnoy-potolok-gkl",
  title: "Калькулятор подвесного потолка из ГКЛ",
  h1: "Калькулятор подвесного потолка из ГКЛ онлайн — расчёт профилей и листов",
  description:
    "Рассчитайте количество ГКЛ, профилей ПП и ПН, подвесов и крабов для подвесного потолка.",
  metaTitle:
    "Калькулятор потолка из гипсокартона | ГКЛ, профили — Мастерок",
  metaDescription:
    "Бесплатный калькулятор подвесного потолка из гипсокартона: ГКЛ, профиль ПП 60×27, ПН 27×28, подвесы, крабы, крепёж и финишные материалы.",
  category: "ceiling",
  categorySlug: "potolki",
  tags: [
    "подвесной потолок",
    "ГКЛ",
    "гипсокартон",
    "потолок",
    "ПП 60×27",
    "ПН 27×28",
    "подвесы",
    "крабы",
  ],
  popularity: 70,
  complexity: 2,
  fields: [
    {
      key: "inputMode",
      label: "Способ ввода",
      type: "radio",
      defaultValue: 0,
      options: [
        { value: 0, label: "По размерам" },
        { value: 1, label: "По площади" },
      ],
    },
    {
      key: "length",
      label: "Длина помещения",
      type: "slider",
      unit: "м",
      min: 1,
      max: 20,
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
      max: 20,
      step: 0.5,
      defaultValue: 4,
      group: "bySize",
    },
    {
      key: "area",
      label: "Площадь потолка",
      type: "slider",
      unit: "м²",
      min: 1,
      max: 200,
      step: 1,
      defaultValue: 20,
      group: "byArea",
    },
    {
      key: "layers",
      label: "Количество слоёв ГКЛ",
      type: "select",
      defaultValue: 1,
      options: [
        { value: 1, label: "1 слой" },
        { value: 2, label: "2 слоя" },
      ],
    },
    {
      key: "profileStep",
      label: "Шаг основных профилей",
      type: "select",
      defaultValue: 600,
      options: [
        { value: 400, label: "400 мм (усиленный)" },
        { value: 600, label: "600 мм (стандарт)" },
      ],
    },
  ],
  calculate(inputs) {
    const inputMode = Math.round(inputs.inputMode ?? 0);
    let length: number;
    let width: number;

    if (inputMode === 0) {
      length = Math.max(1, inputs.length ?? 5);
      width = Math.max(1, inputs.width ?? 4);
    } else {
      const a = Math.max(1, inputs.area ?? 20);
      length = Math.sqrt(a);
      width = Math.sqrt(a);
    }

    const area = length * width;
    const layers = Math.round(inputs.layers ?? 1);
    const profileStep = inputs.profileStep ?? 600; // мм
    const profileStepM = profileStep / 1000;

    // --- ГКЛ ---
    const sheetArea = 1.2 * 2.5; // 3.0 м²
    const sheets = Math.ceil((area * layers) / sheetArea * 1.10);

    // --- Профиль ПП 60×27 (основной несущий, вдоль длины) ---
    const mainProfileRows = Math.ceil(width / profileStepM);
    const mainProfileMeters = mainProfileRows * length;

    // --- Профиль ПП 60×27 (поперечный, перпендикулярно основным) ---
    const crossProfileRows = Math.ceil(length / 1.2);
    const crossProfileMeters = crossProfileRows * width;

    const totalProfileMeters =
      (mainProfileMeters + crossProfileMeters) * 1.05;
    const ppPieces = Math.ceil(totalProfileMeters / 3); // профиль 3 м

    // --- Профиль ПН 27×28 (направляющий, по периметру) ---
    const pnMeters = 2 * (length + width) * 1.05;
    const pnPieces = Math.ceil(pnMeters / 3);

    // --- Подвесы прямые ---
    const suspCount =
      mainProfileRows * Math.ceil(length / 0.7); // каждые 700 мм

    // --- Крабы соединительные ---
    const crabCount = mainProfileRows * crossProfileRows;

    // --- Саморезы для ГКЛ 3.5×25 ---
    const screwsGKL = sheets * 23;
    const screwsKg =
      Math.ceil(screwsGKL * 1.05 / 1000 * 10) / 10; // вес, кг

    // --- Саморезы-клопы (профиль-профиль) ---
    const clopCount = suspCount * 2 + crabCount * 4;

    // --- Дюбель-гвозди ---
    const dowelCount =
      suspCount * 2 + Math.ceil(pnMeters / 0.5);

    // --- Серпянка ---
    const serpyankaMeters = Math.ceil(area * 1.2 * 1.1);
    const serpyankaRolls = Math.ceil(serpyankaMeters / 45); // рулон 45 м

    // --- Шпаклёвка Knauf Фуген ---
    const puttyKg = Math.ceil(serpyankaMeters * 0.25); // 0.25 кг/м шва
    const puttyBags = Math.ceil(puttyKg / 25);

    // --- Грунтовка ---
    const primerL = area * 0.15;
    const primerCans = Math.ceil(primerL * 1.15 / 10); // канистра 10 л

    // --- Warnings ---
    const warnings: string[] = [];
    if (layers === 2) {
      warnings.push(
        "При 2 слоях ГКЛ укладывайте листы со смещением стыков минимум 400 мм",
      );
    }
    if (area > 50) {
      warnings.push(
        "При площади > 50 м² рекомендуется устройство деформационных швов",
      );
    }

    return {
      materials: [
        {
          name: "ГКЛ 1200×2500 мм",
          quantity: (area * layers) / sheetArea,
          unit: "листов",
          withReserve: sheets,
          purchaseQty: sheets,
          category: "Листы ГКЛ",
        },
        {
          name: "Профиль ПП 60×27 (3 м)",
          quantity: (mainProfileMeters + crossProfileMeters) / 3,
          unit: "шт",
          withReserve: ppPieces,
          purchaseQty: ppPieces,
          category: "Профиль",
        },
        {
          name: "Профиль ПН 27×28 (3 м)",
          quantity: (2 * (length + width)) / 3,
          unit: "шт",
          withReserve: pnPieces,
          purchaseQty: pnPieces,
          category: "Профиль",
        },
        {
          name: "Подвес прямой",
          quantity: suspCount,
          unit: "шт",
          withReserve: suspCount,
          purchaseQty: suspCount,
          category: "Крепёж",
        },
        {
          name: "Краб соединительный",
          quantity: crabCount,
          unit: "шт",
          withReserve: crabCount,
          purchaseQty: crabCount,
          category: "Крепёж",
        },
        {
          name: "Саморезы для ГКЛ 3.5×25 мм",
          quantity: screwsGKL / 1000,
          unit: "кг",
          withReserve: screwsKg,
          purchaseQty: Math.ceil(screwsKg),
          category: "Крепёж",
        },
        {
          name: "Саморезы-клопы 3.5×9.5 мм",
          quantity: clopCount,
          unit: "шт",
          withReserve: clopCount,
          purchaseQty: clopCount,
          category: "Крепёж",
        },
        {
          name: "Дюбель-гвозди 6×40 мм",
          quantity: dowelCount,
          unit: "шт",
          withReserve: dowelCount,
          purchaseQty: dowelCount,
          category: "Крепёж",
        },
        {
          name: "Серпянка (рулон 45 м)",
          quantity: serpyankaMeters / 45,
          unit: "рулон",
          withReserve: serpyankaRolls,
          purchaseQty: serpyankaRolls,
          category: "Отделка",
        },
        {
          name: "Шпаклёвка Knauf Фуген (25 кг)",
          quantity: puttyKg / 25,
          unit: "мешок",
          withReserve: puttyBags,
          purchaseQty: puttyBags,
          category: "Отделка",
        },
        {
          name: "Грунтовка глубокого проникновения (10 л)",
          quantity: primerL / 10,
          unit: "канистра",
          withReserve: primerCans,
          purchaseQty: primerCans,
          category: "Отделка",
        },
      ],
      totals: {
        area,
        length,
        width,
        sheets,
        ppPieces,
        pnPieces,
        suspCount,
        crabCount,
      } as Record<string, number>,
      warnings,
    };
  },
  formulaDescription: `
**Расчёт подвесного потолка из ГКЛ:**
- ГКЛ = \u2308Площадь \u00d7 Слои / 3.0 \u00d7 1.10\u2309
- Основные профили ПП 60\u00d727: через каждые 400\u2013600 мм вдоль длины
- Поперечные профили ПП 60\u00d727: через каждые 1200 мм
- Подвесы: каждые 700 мм вдоль каждого основного профиля
- Крабы: в каждом пересечении основного и поперечного профилей
- ПН 27\u00d728: по периметру помещения

По технологической карте Knauf (система П 113).
  `,
  howToUse: [
    "Укажите размеры помещения (длину и ширину) или введите площадь напрямую",
    "Выберите количество слоёв ГКЛ (1 — стандарт, 2 — повышенная прочность)",
    "Выберите шаг основных профилей (600 мм — стандарт, 400 мм — усиленный)",
    "Нажмите «Рассчитать» — получите полный список материалов и крепежа",
  ],
};
