import type { CalculatorDefinition } from "../types";

// Размеры листов ГКЛ (ширина × высота, м)
const SHEET_SIZES: Record<number, [number, number]> = {
  0: [1.2, 2.5],  // 1200×2500 мм = 3.0 м²
  1: [1.2, 3.0],  // 1200×3000 мм = 3.6 м²
  2: [0.6, 2.5],  // 600×2500 мм = 1.5 м²
};

export const drywallDef: CalculatorDefinition = {
  id: "drywall",
  slug: "gipsokarton",
  title: "Калькулятор гипсокартона",
  h1: "Калькулятор гипсокартона онлайн — расчёт листов и профиля",
  description: "Рассчитайте количество листов ГКЛ, профилей ПП и ПН, крепежа для перегородок и обшивки стен.",
  metaTitle: "Калькулятор гипсокартона онлайн | Расчёт ГКЛ и профиля — Мастерок",
  metaDescription: "Бесплатный калькулятор гипсокартона: рассчитайте листы ГКЛ Knauf, профиль ПП/ПН, дюбели и саморезы для перегородок и обшивки стен.",
  category: "walls",
  categorySlug: "steny",
  tags: ["гипсокартон", "ГКЛ", "перегородка", "Knauf", "профиль", "ПП", "ПН", "обшивка"],
  popularity: 70,
  complexity: 2,
  fields: [
    {
      key: "workType",
      label: "Тип работы",
      type: "select",
      defaultValue: 0,
      options: [
        { value: 0, label: "Перегородка (двухсторонняя обшивка)" },
        { value: 1, label: "Обшивка стены (одна сторона)" },
        { value: 2, label: "Потолочная конструкция" },
      ],
    },
    {
      key: "length",
      label: "Длина конструкции",
      type: "slider",
      unit: "м",
      min: 0.5,
      max: 30,
      step: 0.5,
      defaultValue: 5,
    },
    {
      key: "height",
      label: "Высота конструкции",
      type: "slider",
      unit: "м",
      min: 1.5,
      max: 5,
      step: 0.1,
      defaultValue: 2.7,
    },
    {
      key: "layers",
      label: "Слои ГКЛ с каждой стороны",
      type: "select",
      defaultValue: 1,
      options: [
        { value: 1, label: "1 слой (стандарт)" },
        { value: 2, label: "2 слоя (огнестойкость, шумозащита)" },
      ],
    },
    {
      key: "sheetSize",
      label: "Размер листа ГКЛ",
      type: "select",
      defaultValue: 0,
      options: [
        { value: 0, label: "1200×2500 мм (стандарт)" },
        { value: 1, label: "1200×3000 мм" },
        { value: 2, label: "600×2500 мм (малоформатный)" },
      ],
    },
    {
      key: "profileStep",
      label: "Шаг профилей",
      type: "select",
      defaultValue: 0.6,
      options: [
        { value: 0.4, label: "400 мм (усиленный вариант)" },
        { value: 0.6, label: "600 мм (стандарт)" },
      ],
    },
  ],
  calculate(inputs) {
    const workType = Math.round(inputs.workType ?? 0);
    const length = Math.max(0.5, inputs.length ?? 5);
    const height = Math.max(1.5, inputs.height ?? 2.7);
    const layers = Math.round(inputs.layers ?? 1);
    const profileStep = inputs.profileStep ?? 0.6;
    const sheetSizeIdx = Math.round(inputs.sheetSize ?? 0);
    const [sheetW, sheetH] = SHEET_SIZES[sheetSizeIdx] ?? SHEET_SIZES[0];
    const gklArea = sheetW * sheetH;

    const area = length * height;
    const sides = workType === 0 ? 2 : 1; // перегородка — 2 стороны
    const totalSheetArea = area * sides * layers;
    const sheetsNeeded = Math.ceil((totalSheetArea / gklArea) * 1.10);

    // Профиль ПН 27×28 (направляющий): по периметру + запас 5%
    const pnPerimeter = workType === 2
      ? 2 * (length + height) // потолок: периметр
      : 2 * (length + height); // стена/перегородка
    const pnLength = Math.ceil(pnPerimeter * 1.05 / 3) * 3; // кратно 3 м (стандарт)

    // Профиль ПП 60×27 (стоечный/несущий): по длине / шаг + 1
    const ppCount = Math.ceil(length / profileStep) + 1;
    const ppLength = ppCount * height * 1.05;
    const ppPieces3m = Math.ceil(ppLength / 3);

    // Саморезы: ~30 шт/м² на ГКЛ (крепление к профилю)
    const screwsTFLength = Math.ceil(totalSheetArea * 30 * 1.05);
    // Саморезы металл-металл (LB): для соединения профилей
    const screwsLB = Math.ceil(ppCount * 4 * 1.05);
    // Дюбели для ПН: через каждые 60 см по периметру
    const pnDowels = Math.ceil(pnPerimeter / 0.6);

    // Шпаклёвка стартовая (Knauf Фуген): 0.8 кг/м² по площади ГКЛ
    const puttyStartKg = totalSheetArea * 0.8 * 1.15;
    const puttyStartBags = Math.ceil(puttyStartKg / 25);

    // Шпаклёвка финишная (Knauf Ротбанд Финиш): 1.0 кг/м²
    const puttyFinishKg = totalSheetArea * 1.0 * 1.15;
    const puttyFinishBags = Math.ceil(puttyFinishKg / 25);

    // Серпянка (лента армирующая 50 мм): ~2.5 м швов на каждый лист ГКЛ
    const totalSheetCount = sheetsNeeded;
    const seamLengthM = totalSheetCount * 2.5;
    const serpyankaRolls = Math.ceil(seamLengthM * 1.1 / 90);

    // Грунтовка глубокого проникновения: 150 мл/м² × 2 слоя = 300 мл/м²
    const primerLiters = totalSheetArea * 0.3 * 1.15;
    const primerCans = Math.ceil(primerLiters / 10);

    // Наждачная бумага P180: 1 лист на 5 м², упаковка 10 шт
    const sandpaperSheets = Math.ceil(totalSheetArea / 5);
    const sandpaperPacks = Math.ceil(sandpaperSheets / 10);

    const warnings: string[] = [];
    if (height > 3.5) warnings.push("При высоте > 3.5 м: требуется усиленный каркас (профиль шириной 100 мм)");
    if (layers === 2) warnings.push("Двойной слой: второй слой крепится со смещением стыков на 600 мм");

    return {
      materials: [
        {
          name: `ГКЛ ${Math.round(sheetW * 1000)}×${Math.round(sheetH * 1000)} мм (${workType === 0 ? "ГКЛ стандарт" : "ГКЛ"}), листы`,
          quantity: totalSheetArea / gklArea,
          unit: "листов",
          withReserve: sheetsNeeded,
          purchaseQty: sheetsNeeded,
          category: "Листы ГКЛ",
        },
        {
          name: "Профиль направляющий ПН 27×28 (3 м)",
          quantity: pnPerimeter / 3,
          unit: "шт (3 м)",
          withReserve: Math.ceil(pnLength / 3),
          purchaseQty: Math.ceil(pnLength / 3),
          category: "Профиль",
        },
        {
          name: "Профиль стоечный ПП 60×27 (3 м)",
          quantity: ppLength / 3,
          unit: "шт (3 м)",
          withReserve: ppPieces3m,
          purchaseQty: ppPieces3m,
          category: "Профиль",
        },
        {
          name: "Саморезы для ГКЛ 3.5×25 мм (чёрные фосфатированные)",
          quantity: (totalSheetArea * 30 * 2.5) / 1000,  // кг: ~2.5 г/шт
          unit: "кг",
          withReserve: Math.ceil(screwsTFLength * 2.5 / 500) / 2,  // кратно 0.5 кг
          purchaseQty: Math.ceil(screwsTFLength * 2.5 / 500) / 2,
          category: "Крепёж",
        },
        {
          name: "Саморезы-клопы 3.5×9.5 мм (металл–металл)",
          quantity: ppCount * 4,
          unit: "шт",
          withReserve: screwsLB,
          purchaseQty: Math.ceil(screwsLB / 100) * 100,
          category: "Крепёж",
        },
        {
          name: "Дюбели 6×40 для крепления ПН",
          quantity: pnDowels,
          unit: "шт",
          withReserve: Math.ceil(pnDowels * 1.05),
          purchaseQty: Math.ceil(pnDowels * 1.05 / 100) * 100,
          category: "Крепёж",
        },
        {
          name: "Лента уплотнительная (рулон 30 м)",
          quantity: pnPerimeter / 30,
          unit: "рулонов",
          withReserve: Math.ceil(pnPerimeter / 30),
          purchaseQty: Math.ceil(pnPerimeter / 30),
          category: "Доп. материалы",
        },
        {
          name: "Шпаклёвка стартовая Knauf Фуген (25 кг)",
          quantity: totalSheetArea * 0.8 / 25,
          unit: "мешок",
          withReserve: puttyStartBags,
          purchaseQty: puttyStartBags,
          category: "Отделка",
        },
        {
          name: "Шпаклёвка финишная Knauf Ротбанд Финиш (25 кг)",
          quantity: totalSheetArea * 1.0 / 25,
          unit: "мешок",
          withReserve: puttyFinishBags,
          purchaseQty: puttyFinishBags,
          category: "Отделка",
        },
        {
          name: "Серпянка (лента армирующая 50 мм, рулон 90 м)",
          quantity: seamLengthM / 90,
          unit: "рулон",
          withReserve: serpyankaRolls,
          purchaseQty: serpyankaRolls,
          category: "Отделка",
        },
        {
          name: "Грунтовка глубокого проникновения (канистра 10 л)",
          quantity: totalSheetArea * 0.3 / 10,
          unit: "канистра",
          withReserve: primerCans,
          purchaseQty: primerCans,
          category: "Отделка",
        },
        {
          name: "Наждачная бумага P180 (упаковка 10 шт)",
          quantity: sandpaperSheets / 10,
          unit: "упаковка",
          withReserve: sandpaperPacks,
          purchaseQty: sandpaperPacks,
          category: "Отделка",
        },
      ],
      totals: { area, sides, layers, sheetsNeeded },
      warnings,
    };
  },
  formulaDescription: `
**Расчёт ГКЛ:**
Листов = ⌈Площадь × Стороны × Слои / Площадь_листа⌉ × 1.10

Доступные размеры листа ГКЛ (Knauf):
- 1200×2500 мм = 3.0 м² (стандарт)
- 1200×3000 мм = 3.6 м²
- 600×2500 мм = 1.5 м² (малоформатный)

**Каркас:**
- ПН 27×28 направляющий: по периметру конструкции
- ПП 60×27 стоечный: каждые 400–600 мм
- Саморезы TN 25 мм: ~30 шт/м²

По ГОСТ 6266-97 и ТТК Knauf.
  `,
  howToUse: [
    "Выберите тип конструкции: перегородка или обшивка стены",
    "Введите длину и высоту конструкции",
    "Укажите количество слоёв ГКЛ (стандарт — 1)",
    "Выберите шаг профилей (стандарт 600 мм, усиленный — 400 мм)",
    "Нажмите «Рассчитать» — получите листы, профиль и весь крепёж",
  ],
};
