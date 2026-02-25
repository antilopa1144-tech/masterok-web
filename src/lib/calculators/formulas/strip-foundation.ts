import type { CalculatorDefinition } from "../types";

export const stripFoundationDef: CalculatorDefinition = {
  id: "strip_foundation",
  slug: "lentochnyy-fundament",
  title: "Калькулятор ленточного фундамента",
  h1: "Калькулятор ленточного фундамента — расчёт бетона и арматуры",
  description: "Рассчитайте объём бетона, количество арматуры и опалубки для ленточного фундамента дома.",
  metaTitle: "Калькулятор ленточного фундамента | Расчёт бетона — Мастерок",
  metaDescription: "Расчёт ленточного фундамента: бетон, арматура, опалубка. Введите размеры периметра и ленты — получите полный список материалов.",
  category: "foundation",
  categorySlug: "fundament",
  tags: ["ленточный фундамент", "фундамент", "бетон", "арматура", "опалубка"],
  popularity: 80,
  complexity: 3,
  fields: [
    {
      key: "perimeter",
      label: "Периметр ленты (все стены)",
      type: "slider",
      unit: "м",
      min: 10,
      max: 200,
      step: 1,
      defaultValue: 40,
      hint: "Общая длина всех несущих стен с учётом внутренних",
    },
    {
      key: "width",
      label: "Ширина ленты",
      type: "slider",
      unit: "мм",
      min: 200,
      max: 600,
      step: 50,
      defaultValue: 400,
    },
    {
      key: "depth",
      label: "Глубина ленты (ниже уровня земли)",
      type: "slider",
      unit: "мм",
      min: 300,
      max: 2000,
      step: 50,
      defaultValue: 700,
    },
    {
      key: "aboveGround",
      label: "Высота над землёй (цоколь)",
      type: "slider",
      unit: "мм",
      min: 0,
      max: 600,
      step: 50,
      defaultValue: 300,
    },
    {
      key: "reinforcement",
      label: "Армирование",
      type: "select",
      defaultValue: 0,
      options: [
        { value: 0, label: "2 нитки Ø12 мм (лёгкие постройки)" },
        { value: 1, label: "4 нитки Ø12 мм (дом 1–2 этажа)" },
        { value: 2, label: "4 нитки Ø14 мм (тяжёлые конструкции)" },
      ],
    },
  ],
  calculate(inputs) {
    const perimeter = Math.max(10, inputs.perimeter ?? 40);
    const widthMm = Math.max(200, inputs.width ?? 400);
    const depthMm = Math.max(300, inputs.depth ?? 700);
    const aboveMm = Math.max(0, inputs.aboveGround ?? 300);
    const reinforcement = Math.round(inputs.reinforcement ?? 1);

    const widthM = widthMm / 1000;
    const totalHeightM = (depthMm + aboveMm) / 1000;

    // Объём бетона
    const volume = perimeter * widthM * totalHeightM;
    const volumeWithReserve = volume * 1.05;

    // Арматура
    const rebarDiamMm = reinforcement === 2 ? 14 : 12;
    const rebarThreads = reinforcement === 0 ? 2 : 4;

    // Продольные нитки
    const longitudinalLength = perimeter * rebarThreads * 1.05;

    // Поперечные хомуты: каждые 400 мм
    const clampCount = Math.ceil(perimeter / 0.4);
    const clampPerimeter = 2 * (widthM + totalHeightM) + 0.4; // длина хомута
    const clampLength = clampCount * clampPerimeter * 1.05;

    const totalRebarLength = longitudinalLength + clampLength;
    const rebarWeightKg = totalRebarLength * (rebarDiamMm === 14 ? 1.21 : 0.888); // кг/м

    // Вязальная проволока: ~0.05 кг на соединение
    const connections = clampCount * rebarThreads;
    const wireKg = Math.ceil(connections * 0.05 * 1.1 * 10) / 10;

    // Опалубка
    const formworkArea = 2 * perimeter * totalHeightM * 1.05;
    const boards22m = Math.ceil(formworkArea / (0.15 * 6)); // доска 150×25×6000 мм

    // Цемент для бетона М200 (290 кг/м³)
    const cementKg = volumeWithReserve * 290;
    const cementBags = Math.ceil(cementKg / 50);

    const warnings: string[] = [];
    if (depthMm < 600 && perimeter > 30) warnings.push("Глубина менее 600 мм рискованна для отапливаемого здания в Центральной России. Проверьте глубину промерзания грунта");
    if (widthMm < 300) warnings.push("Ширина ленты менее 300 мм не рекомендуется для несущих стен");

    return {
      materials: [
        { name: "Бетон М200 (В15)", quantity: volume, unit: "м³", withReserve: Math.ceil(volumeWithReserve * 10) / 10, purchaseQty: Math.ceil(volumeWithReserve * 10) / 10, category: "Бетон" },
        { name: `Арматура Ø${rebarDiamMm} мм (продольная)`, quantity: longitudinalLength, unit: "м.п.", withReserve: Math.ceil(longitudinalLength), purchaseQty: Math.ceil(longitudinalLength), category: "Арматура" },
        { name: "Арматура Ø8 мм (хомуты)", quantity: clampLength, unit: "м.п.", withReserve: Math.ceil(clampLength), purchaseQty: Math.ceil(clampLength), category: "Арматура" },
        { name: "Вязальная проволока 3–4 мм", quantity: wireKg, unit: "кг", withReserve: wireKg, purchaseQty: Math.ceil(wireKg), category: "Арматура" },
        { name: "Доска опалубки 25×150×6000 мм", quantity: boards22m, unit: "шт", withReserve: boards22m, purchaseQty: boards22m, category: "Опалубка" },
        { name: "Цемент М400 (мешки 50 кг)", quantity: cementBags, unit: "мешков", withReserve: cementBags, purchaseQty: cementBags, category: "Компоненты (замес)" },
        // Гидроизоляция рулонная (Технониколь): все стороны ленты
        // Площадь = 2 боковые стороны + верх ленты = 2 × периметр × высота + периметр × ширина
        (() => {
          const hydroArea = 2 * perimeter * totalHeightM + perimeter * widthM;
          const hydroAreaReserve = hydroArea * 1.15;
          const hydroRolls = Math.ceil(hydroAreaReserve / 10); // 1 рулон = 10 м²
          return {
            name: "Гидроизоляция рулонная Технониколь (рулон 10 м²)",
            quantity: hydroArea,
            unit: "рулонов",
            withReserve: hydroRolls,
            purchaseQty: hydroRolls,
            category: "Гидроизоляция",
          };
        })(),
        // Обратная засыпка (песок): объём траншеи минус объём бетона
        // Траншея: perimeter × (widthM + 0.2) × (depthMm/1000) — с учётом зазора ~0.1 м с каждой стороны
        (() => {
          const trenchVolume = perimeter * (widthM + 0.2) * (depthMm / 1000);
          const backfillVolume = Math.max(0, trenchVolume - volume);
          const backfillReserve = backfillVolume * 1.1;
          return {
            name: "Обратная засыпка (песок крупнозернистый)",
            quantity: backfillVolume,
            unit: "м³",
            withReserve: Math.ceil(backfillReserve * 10) / 10,
            purchaseQty: Math.ceil(backfillReserve * 10) / 10,
            category: "Обратная засыпка",
          };
        })(),
      ],
      totals: { perimeter, widthMm, totalHeightM, volume, rebarWeightKg },
      warnings,
    };
  },
  formulaDescription: `
**Расчёт ленточного фундамента:**

Объём бетона = Периметр × Ширина_ленты × Высота_ленты

Арматура:
- Продольная: периметр × кол-во_ниток × 1.05
- Хомуты: через каждые 400 мм, по периметру сечения

Марка бетона: М200 (В15) — минимум для фундаментов жилых домов (СНиП 2.02.01-83)

Глубина промерзания: Москва ~1.4 м, СПб ~1.2 м, Урал ~1.8 м
  `,
  howToUse: [
    "Введите полный периметр ленты (все несущие стены, включая внутренние)",
    "Укажите ширину ленты (типично 300–500 мм)",
    "Задайте глубину залегания (ниже точки промерзания для вашего региона)",
    "Укажите высоту цоколя над землёй",
    "Выберите схему армирования по нагрузке",
    "Нажмите «Рассчитать» — получите бетон, арматуру и опалубку",
  ],
};
