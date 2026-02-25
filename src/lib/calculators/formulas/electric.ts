import type { CalculatorDefinition } from "../types";

export const electricDef: CalculatorDefinition = {
  id: "engineering_electrics",
  slug: "elektrika",
  title: "Калькулятор электропроводки",
  h1: "Калькулятор электропроводки онлайн — расчёт кабеля и автоматов",
  description: "Рассчитайте метраж кабеля, количество автоматических выключателей, УЗО и розеток для квартиры или дома.",
  metaTitle: "Калькулятор электропроводки | Расчёт кабеля ВВГнг — Мастерок",
  metaDescription: "Бесплатный калькулятор электропроводки: рассчитайте метраж кабеля ВВГнг, автоматы, УЗО и дифавтоматы по количеству комнат и площади.",
  category: "engineering",
  categorySlug: "inzhenernye",
  tags: ["электропроводка", "кабель ВВГнг", "автоматы", "УЗО", "розетки", "электрика"],
  popularity: 72,
  complexity: 2,
  fields: [
    {
      key: "apartmentArea",
      label: "Площадь квартиры / дома",
      type: "slider",
      unit: "м²",
      min: 20,
      max: 500,
      step: 5,
      defaultValue: 60,
    },
    {
      key: "roomsCount",
      label: "Количество комнат",
      type: "slider",
      unit: "шт",
      min: 1,
      max: 10,
      step: 1,
      defaultValue: 3,
    },
    {
      key: "ceilingHeight",
      label: "Высота потолков",
      type: "slider",
      unit: "м",
      min: 2.4,
      max: 4,
      step: 0.1,
      defaultValue: 2.7,
    },
    {
      key: "wiringType",
      label: "Тип разводки",
      type: "select",
      defaultValue: 0,
      options: [
        { value: 0, label: "Скрытая (в штробах / стяжке)" },
        { value: 1, label: "Открытая (в кабель-канале)" },
      ],
    },
    {
      key: "hasKitchen",
      label: "Есть кухня с электроплитой",
      type: "switch",
      defaultValue: 1,
      hint: "Требует отдельной линии 380В или 220В/32А",
    },
  ],
  calculate(inputs): import("../types").CalculatorResult {
    const area = Math.max(20, inputs.apartmentArea ?? 60);
    const rooms = Math.max(1, Math.round(inputs.roomsCount ?? 3));
    const height = Math.max(2.4, inputs.ceilingHeight ?? 2.7);
    const hasKitchen = (inputs.hasKitchen ?? 1) > 0;

    // Периметр ≈ √area × 4, длина трасс ≈ периметр × этажи ≈ площадь/4 × 2
    const perimeterEst = Math.sqrt(area) * 4;

    // Группы: освещение (1.5 мм²), розетки (2.5 мм²), сплит-системы (2.5 мм²), плита (4 или 6 мм²)
    const lightingGroups = rooms + 1; // по комнате + общий коридор
    const outletGroups = rooms + 2;   // по комнате + кухня + ванная
    const acGroups = Math.ceil(rooms / 2);

    // Длина кабеля 1.5 мм² (освещение): от щитка до каждой точки
    const distFromPanel = Math.sqrt(area); // среднее расстояние
    const cable15length = lightingGroups * (distFromPanel + height * 2) * 1.2;

    // Длина кабеля 2.5 мм² (розетки): от щитка по периметру
    const cable25length = outletGroups * (distFromPanel + 3) * 1.3
      + acGroups * (distFromPanel + height) * 1.2;

    // Кабель 6 мм² на кухонную плиту
    const cable6length = hasKitchen ? distFromPanel * 1.2 : 0;

    // Щиток: автоматы
    const breakersCount = lightingGroups + outletGroups + acGroups + (hasKitchen ? 1 : 0);
    const uzoCount = Math.ceil(outletGroups / 2) + (hasKitchen ? 1 : 0);

    // Гофра / кабель-канал
    const conduitLength = Math.ceil((cable15length + cable25length + cable6length) * 1.1);

    // Розетки и выключатели
    const outletsCount = Math.ceil(area * 0.5); // ~0.5 розетки/м²
    const switchesCount = rooms * 2 + 2;

    const warnings: string[] = [];
    if (area > 100) {
      warnings.push("Для площади > 100 м² рекомендуется трёхфазный ввод 380В");
    }
    if (hasKitchen) {
      warnings.push("Линия на электроплиту: ВВГнг 3×6 мм² с автоматом 32А и УЗО 40А/30мА");
    }

    return {
      materials: [
        {
          name: "Кабель ВВГнг-LS 3×1.5 (освещение)",
          quantity: Math.ceil(cable15length),
          unit: "м.п.",
          withReserve: Math.ceil(cable15length * 1.10),
          purchaseQty: Math.ceil(cable15length * 1.10),
          category: "Кабель",
        },
        {
          name: "Кабель ВВГнг-LS 3×2.5 (розетки)",
          quantity: Math.ceil(cable25length),
          unit: "м.п.",
          withReserve: Math.ceil(cable25length * 1.10),
          purchaseQty: Math.ceil(cable25length * 1.10),
          category: "Кабель",
        },
        ...(hasKitchen ? [{
          name: "Кабель ВВГнг-LS 3×6 (плита)",
          quantity: Math.ceil(cable6length),
          unit: "м.п.",
          withReserve: Math.ceil(cable6length * 1.10),
          purchaseQty: Math.ceil(cable6length * 1.10),
          category: "Кабель",
        }] : []),
        {
          name: "Автоматический выключатель",
          quantity: breakersCount,
          unit: "шт",
          withReserve: breakersCount + 2,
          purchaseQty: breakersCount + 2,
          category: "Щиток",
        },
        {
          name: "УЗО / дифавтомат",
          quantity: uzoCount,
          unit: "шт",
          withReserve: uzoCount,
          purchaseQty: uzoCount,
          category: "Щиток",
        },
        {
          name: "Розетки",
          quantity: outletsCount,
          unit: "шт",
          withReserve: Math.ceil(outletsCount * 1.05),
          purchaseQty: Math.ceil(outletsCount * 1.05),
          category: "Механизмы",
        },
        {
          name: "Выключатели",
          quantity: switchesCount,
          unit: "шт",
          withReserve: switchesCount,
          purchaseQty: switchesCount,
          category: "Механизмы",
        },
        {
          name: "Гофра ПВХ Ø20 мм (м.п.)",
          quantity: conduitLength,
          unit: "м.п.",
          withReserve: conduitLength,
          purchaseQty: conduitLength,
          category: "Защита кабеля",
        },
        {
          name: "Распределительная коробка",
          quantity: Math.ceil(outletGroups / 3),
          unit: "шт",
          withReserve: Math.ceil(outletGroups / 3),
          purchaseQty: Math.ceil(outletGroups / 3),
          category: "Монтаж",
        },
        {
          name: "Изолента ПВХ (рулон 20 м)",
          quantity: Math.ceil((breakersCount + outletGroups) * 2 / 20),
          unit: "рулонов",
          withReserve: Math.max(1, Math.ceil((breakersCount + outletGroups) * 2 / 20)),
          purchaseQty: Math.max(1, Math.ceil((breakersCount + outletGroups) * 2 / 20)),
          category: "Монтаж",
        },
      ],
      totals: {
        area,
        cable15length: Math.ceil(cable15length),
        cable25length: Math.ceil(cable25length),
        breakersCount,
      } as Record<string, number>,
      warnings,
    };
  },
  formulaDescription: `
**Нормы электропроводки:**
- Освещение: ВВГнг 3×1.5 мм², автомат 10А
- Розетки: ВВГнг 3×2.5 мм², автомат 16А
- Кондиционер: 3×2.5 мм², автомат 16А
- Электроплита: 3×6 мм², автомат 32А

По ПУЭ 7: розетки в ванной — только через УЗО 30 мА.
Расчёт кабеля: от щитка + перпендикуляр к стенам × 1.2 (запас на штробы).
  `,
  howToUse: [
    "Введите площадь и количество комнат",
    "Укажите высоту потолков",
    "Выберите тип разводки (скрытая или открытая)",
    "Нажмите «Рассчитать» — получите кабель, автоматы и механизмы",
  ],
};
