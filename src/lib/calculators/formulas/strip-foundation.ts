import type { CalculatorDefinition } from "../types";
import { buildNativeScenarios } from "../scenario-native";

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
      defaultValue: 1,
      options: [
        { value: 0, label: "2 нитки Ø12 мм (лёгкие постройки)" },
        { value: 1, label: "4 нитки Ø12 мм (дом 1–2 этажа)" },
        { value: 2, label: "4 нитки Ø14 мм (тяжёлые конструкции)" },
        { value: 3, label: "6 ниток Ø12 мм (широкая лента)" },
      ],
    },
    {
      key: "deliveryMethod",
      label: "Способ заливки",
      type: "select",
      defaultValue: 0,
      options: [
        { value: 0, label: "Миксер (самослив)" },
        { value: 1, label: "Бетононасос (+0.5 м³ потери)" },
        { value: 2, label: "Вручную (замес на месте)" },
      ],
    },
  ],
  calculate(inputs) {
    const perimeter = Math.max(10, inputs.perimeter ?? 40);
    const widthMm = Math.max(200, inputs.width ?? 400);
    const depthMm = Math.max(300, inputs.depth ?? 700);
    const aboveMm = Math.max(0, inputs.aboveGround ?? 300);
    const reinforcement = Math.round(inputs.reinforcement ?? 1);
    const delivery = Math.round(inputs.deliveryMethod ?? 0);

    const widthM = widthMm / 1000;
    const totalHeightM = (depthMm + aboveMm) / 1000;

    // Объём бетона
    let volume = perimeter * widthM * totalHeightM;
    
    // Технологические потери
    let techLoss = 0;
    if (delivery === 1) techLoss = 0.5; // остаток в системе насоса
    
    const volumeWithReserve = (volume + techLoss) * 1.07; // 7% на усадку и недовоз

    // Арматура
    const rebarDiamMm = reinforcement === 2 ? 14 : 12;
    let rebarThreads = 4;
    if (reinforcement === 0) rebarThreads = 2;
    if (reinforcement === 3) rebarThreads = 6;

    // Продольные нитки (нахлест 30-40 диаметров ~ 10% длины)
    const longitudinalLength = perimeter * rebarThreads * 1.12;

    // Поперечные хомуты (шаг 300-400 мм)
    const clampStep = 0.4;
    const clampCount = Math.ceil(perimeter / clampStep);
    // Длина хомута: 2*(W-0.1) + 2*(H-0.1) + 0.3 (загибы)
    const clampPerimeter = 2 * (widthM - 0.1 + totalHeightM - 0.1) + 0.3; 
    const clampLength = clampCount * Math.max(0.8, clampPerimeter) * 1.05;

    const totalRebarLength = longitudinalLength + clampLength;
    const rebarWeightKg = longitudinalLength * (rebarDiamMm === 14 ? 1.21 : 0.888) + clampLength * 0.395; // Ø8 = 0.395 кг/м

    // Вязальная проволока: ~0.05 кг на соединение
    const connections = clampCount * rebarThreads;
    const wireKg = Math.ceil(connections * 0.05 * 1.1 * 10) / 10;

    // Опалубка (две стороны)
    const formworkArea = 2 * perimeter * (aboveMm / 1000 + 0.1); // цоколь + 10см в землю
    const boardsPcs = Math.ceil(formworkArea / (0.15 * 6)); // доска 150×25×6000 мм

    const warnings: string[] = [];
    if (depthMm < 600 && perimeter > 30) warnings.push("Глубина менее 600 мм рискованна для отапливаемого здания. Проверьте глубину промерзания грунта");
    if (widthMm < 300) warnings.push("Ширина ленты менее 300 мм не рекомендуется для несущих стен из кирпича или блоков");
    if (delivery === 1 && volume < 5) warnings.push("Заказ бетононасоса для объёма < 5 м³ экономически невыгоден");

    const materials = [
      { name: "Бетон М250 (В20)", quantity: volume, unit: "м³", withReserve: Math.ceil(volumeWithReserve * 10) / 10, purchaseQty: Math.ceil(volumeWithReserve * 10) / 10, category: "Бетон" },
      { name: `Арматура Ø${rebarDiamMm} мм (рабочая)`, quantity: longitudinalLength, unit: "м.п.", withReserve: Math.ceil(longitudinalLength), purchaseQty: Math.ceil(longitudinalLength), category: "Арматура" },
      { name: "Арматура Ø8 мм (хомуты)", quantity: clampLength, unit: "м.п.", withReserve: Math.ceil(clampLength), purchaseQty: Math.ceil(clampLength), category: "Арматура" },
      { name: "Вязальная проволока (отожженная)", quantity: wireKg, unit: "кг", withReserve: wireKg, purchaseQty: Math.ceil(wireKg), category: "Арматура" },
      { name: "Доска опалубки 25×150×6000 мм", quantity: boardsPcs, unit: "шт", withReserve: boardsPcs, purchaseQty: boardsPcs, category: "Опалубка" },
      { name: "Брус 50×50 мм (распорки/колья)", quantity: Math.ceil(perimeter / 2), unit: "шт", withReserve: Math.ceil(perimeter / 2), purchaseQty: Math.ceil(perimeter / 2), category: "Опалубка" },
      { name: "Саморезы по дереву 70-90 мм", quantity: boardsPcs * 4, unit: "шт", withReserve: boardsPcs * 4, purchaseQty: Math.ceil(boardsPcs * 4 / 100) * 100, category: "Опалубка" },
    ];

    if (delivery === 2) {
      const cementBags = Math.ceil(volumeWithReserve * 300 / 50);
      materials.push({ name: "Цемент М400 (мешки 50 кг)", quantity: cementBags, unit: "мешков", withReserve: cementBags, purchaseQty: cementBags, category: "Компоненты (замес)" });
    }

    const scenarios = buildNativeScenarios({
      id: "strip-foundation-main",
      title: "Strip foundation main",
      exactNeed: volumeWithReserve,
      unit: "м³",
      packageSizes: [0.1],
      packageLabelPrefix: "strip-foundation-concrete",
    });

    return {
      materials,
      totals: { perimeter, widthMm, totalHeightM, volume, rebarWeightKg },
      warnings,
      scenarios,
    };
  },
  formulaDescription: `
**Расчёт ленточного фундамента (нормы РФ):**

1. **Бетон**: Объём = Периметр × Ширина × Высота. Запас 7% учитывает усадку при вибрировании и погрешность приёмки.
2. **Арматура**: 
   - Продольная: нахлёст 12% (по 40 диаметров в местах стыка).
   - Хомуты: шаг 400 мм, защитный слой бетона 50 мм с каждой стороны.
3. **Опалубка**: Расчёт по площади боковых поверхностей цокольной части.

Рекомендуемая марка бетона: М250 (В20) и выше.
  `,
  howToUse: [
    "Введите полный периметр ленты (все несущие стены)",
    "Укажите ширину ленты (обычно на 100 мм шире стены)",
    "Задайте глубину залегания и высоту цоколя",
    "Выберите способ заливки (насос требует доп. объёма)",
    "Нажмите «Рассчитать» — получите полную смету материалов",
  ],
  expertTips: [
    {
      title: "Защитный слой",
      content: "Арматура не должна касаться земли или опалубки. Используйте пластиковые фиксаторы («стульчики» и «звёздочки»), чтобы обеспечить слой бетона 50 мм. Это защитит металл от коррозии.",
      author: "Иваныч, прораб"
    },
    {
      title: "Продухи в цоколе",
      content: "Не забудьте заложить гильзы для продухов (вентиляции подполья) и ввода коммуникаций (вода, канализация) до заливки бетона. Долбить готовый монолит — дорого и долго.",
      author: "Инженер-строитель"
    }
  ],
  faq: [
    {
      question: "Нужна ли подбетонка?",
      answer: "Для частного дома достаточно песчано-гравийной подушки 200 мм с тщательным трамбованием и слоем гидроизоляции (плёнки), чтобы цементное молочко не ушло в песок."
    },
    {
      question: "Когда можно снимать опалубку?",
      answer: "В летнее время — через 3-5 дней. Бетон набирает 70% прочности за 7-10 дней при температуре +20°C."
    }
  ]
};
