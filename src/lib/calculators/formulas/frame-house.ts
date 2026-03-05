import type { CalculatorDefinition } from "../types";
import { buildNativeScenarios } from "../scenario-native";

export const frameHouseDef: CalculatorDefinition = {
  id: "frame_house",
  slug: "karkasnyj-dom",
  title: "Калькулятор каркасного дома",
  h1: "Калькулятор каркасного дома онлайн — расчёт обшивки и утеплителя",
  description: "Рассчитайте стойки каркаса, обвязку, наружную и внутреннюю обшивку, утеплитель, пароизоляцию, ветрозащиту и крепёж для каркасного дома.",
  metaTitle: "Калькулятор каркасного дома онлайн | Обшивка и утеплитель — Мастерок",
  metaDescription: "Бесплатный калькулятор каркасного дома: расчёт стоек, ОСБ, ГКЛ, утеплителя, пароизоляции и ветрозащиты. Учёт проёмов и шага каркаса.",
  category: "walls",
  categorySlug: "steny",
  tags: ["каркасный дом", "каркасник", "ОСБ", "утеплитель", "пароизоляция", "ветрозащита"],
  popularity: 65,
  complexity: 3,
  fields: [
    {
      key: "wallLength",
      label: "Общая длина наружных стен (периметр)",
      type: "slider",
      unit: "м",
      min: 1,
      max: 100,
      step: 1,
      defaultValue: 30,
    },
    {
      key: "wallHeight",
      label: "Высота стен",
      type: "slider",
      unit: "м",
      min: 2,
      max: 4,
      step: 0.1,
      defaultValue: 2.7,
    },
    {
      key: "openingsArea",
      label: "Площадь проёмов (окна + двери)",
      type: "slider",
      unit: "м²",
      min: 0,
      max: 50,
      step: 0.5,
      defaultValue: 10,
    },
    {
      key: "studStep",
      label: "Шаг стоек каркаса",
      type: "select",
      defaultValue: 600,
      options: [
        { value: 400, label: "400 мм" },
        { value: 600, label: "600 мм (стандарт)" },
      ],
    },
    {
      key: "insulationType",
      label: "Тип утеплителя",
      type: "select",
      defaultValue: 0,
      options: [
        { value: 0, label: "Минвата 150 мм" },
        { value: 1, label: "Минвата 200 мм" },
        { value: 2, label: "ППС 150 мм" },
      ],
    },
    {
      key: "outerSheathing",
      label: "Наружная обшивка",
      type: "select",
      defaultValue: 0,
      options: [
        { value: 0, label: "ОСБ-3 9 мм" },
        { value: 1, label: "ОСБ-3 12 мм" },
        { value: 2, label: "ЦСП 12 мм" },
      ],
    },
    {
      key: "innerSheathing",
      label: "Внутренняя обшивка",
      type: "select",
      defaultValue: 0,
      options: [
        { value: 0, label: "ОСБ-3 9 мм" },
        { value: 1, label: "ГКЛ 12.5 мм" },
        { value: 2, label: "Вагонка" },
      ],
    },
  ],
  calculate(inputs): import("../types").CalculatorResult {
    const wallLength = Math.max(1, inputs.wallLength ?? 30);
    const wallHeight = Math.max(2, Math.min(4, inputs.wallHeight ?? 2.7));
    const openingsArea = Math.max(0, inputs.openingsArea ?? 10);
    const studStep = inputs.studStep ?? 600;
    const insulationType = Math.round(inputs.insulationType ?? 0);
    const outerSheathing = Math.round(inputs.outerSheathing ?? 0);
    const innerSheathing = Math.round(inputs.innerSheathing ?? 0);

    const wallArea = wallLength * wallHeight - openingsArea;

    // --- Стойки каркаса (доска 50×150 или 50×200) ---
    const studs = Math.ceil(wallLength / (studStep / 1000)) + 1;
    const studTotalMeters = studs * wallHeight * 1.05; // +5% запас
    const studBoards6m = Math.ceil(studTotalMeters / 6);

    // --- Обвязка верхняя + нижняя (доска 50×150 или 50×200) ---
    const strappingMeters = wallLength * 2 * 1.05; // верх + низ, +5% запас
    const strappingBoards6m = Math.ceil(strappingMeters / 6);

    // Толщина стойки зависит от утеплителя
    const studWidth = insulationType === 1 ? 200 : 150; // 50×150 или 50×200

    // --- Наружная обшивка ---
    const outerSheetAreas: Record<number, number> = {
      0: 3.125, // ОСБ 1250×2500 = 3.125 м²
      1: 3.125, // ОСБ 1250×2500 = 3.125 м²
      2: 3.84,  // ЦСП 1200×3200 = 3.84 м²
    };
    const outerSheetArea = outerSheetAreas[outerSheathing] ?? 3.125;
    const outerSheets = Math.ceil(wallArea / outerSheetArea * 1.08);

    const outerSheathingNames: Record<number, string> = {
      0: "ОСБ-3 9 мм (1250×2500)",
      1: "ОСБ-3 12 мм (1250×2500)",
      2: "ЦСП 12 мм (1200×3200)",
    };

    // --- Внутренняя обшивка ---
    const innerSheetAreas: Record<number, number> = {
      0: 3.125, // ОСБ 1250×2500
      1: 3.0,   // ГКЛ 1200×2500
      2: 1.0,   // Вагонка — считаем как м² с 10% запасом
    };
    const innerSheetArea = innerSheetAreas[innerSheathing] ?? 3.125;

    let innerSheets: number;
    let innerSheathingName: string;
    let innerSheathingUnit: string;

    if (innerSheathing === 2) {
      // Вагонка — в м²
      innerSheets = Math.ceil(wallArea * 1.10); // +10% запас
      innerSheathingName = "Вагонка (сорт А/В)";
      innerSheathingUnit = "м²";
    } else {
      innerSheets = Math.ceil(wallArea / innerSheetArea * 1.08);
      innerSheathingName = innerSheathing === 0
        ? "ОСБ-3 9 мм (1250×2500)"
        : "ГКЛ 12.5 мм (1200×2500)";
      innerSheathingUnit = "листов";
    }

    // --- Утеплитель ---
    const insulThickness: Record<number, number> = { 0: 0.15, 1: 0.2, 2: 0.15 };
    const thickness = insulThickness[insulationType] ?? 0.15;
    const insulVolume = wallArea * thickness;

    let insulationMaterial: {
      name: string; quantity: number; unit: string;
      withReserve: number; purchaseQty: number; category: string;
    };

    if (insulationType <= 1) {
      // Минвата: плиты 600×1200 мм, толщина 50 мм → слоёв = thickness / 0.05
      const plateArea = 0.6 * 1.2; // 0.72 м²
      const layers = thickness / 0.05;
      const platesPerLayer = Math.ceil(wallArea / plateArea * 1.05);
      const totalPlates = platesPerLayer * layers;
      const packsOf8 = Math.ceil(totalPlates / 8); // упаковки по 8 плит

      insulationMaterial = {
        name: `Минвата ${thickness * 1000} мм (плиты 600×1200×50, ${layers.toFixed(0)} слоя)`,
        quantity: totalPlates,
        unit: "плит",
        withReserve: totalPlates,
        purchaseQty: packsOf8,
        category: "Утеплитель",
      };
    } else {
      // ППС 150 мм: плиты 600×1200 мм
      const plateArea = 0.6 * 1.2; // 0.72 м²
      const totalPlates = Math.ceil(wallArea * 1.05 / plateArea);

      insulationMaterial = {
        name: "ППС-25 150 мм (плиты 600×1200)",
        quantity: totalPlates,
        unit: "плит",
        withReserve: totalPlates,
        purchaseQty: totalPlates,
        category: "Утеплитель",
      };
    }

    // --- Пароизоляция (внутренняя сторона) ---
    const vaporBarrierArea = wallArea * 1.15; // +15% на нахлёст
    const vaporBarrierRolls = Math.ceil(vaporBarrierArea / 75); // рулон 75 м² (Изоспан B)

    // --- Ветрозащитная мембрана (наружная сторона) ---
    const windMembraneArea = wallArea * 1.15;
    const windMembraneRolls = Math.ceil(windMembraneArea / 75); // рулон 75 м²

    // --- Скотч для мембран (2 рулона на каждый рулон мембраны) ---
    const totalMembraneRolls = vaporBarrierRolls + windMembraneRolls;
    const tapeRolls = totalMembraneRolls * 2;

    // --- Крепёж ---
    // Саморезы для обшивки ОСБ/ЦСП: 28 шт/лист
    const outerScrews = outerSheets * 28;
    // Саморезы для внутренней обшивки
    const innerScrews = innerSheathing === 2 ? 0 : innerSheets * 28;
    const totalScrewsCount = (outerScrews + innerScrews) * 1.05;
    const screwsKg = Math.ceil(totalScrewsCount / 600 * 10) / 10; // 600 шт/кг для 3.5×35

    // Гвозди для каркаса: 20 шт/стойка
    const nailsCount = studs * 20 * 1.05;
    const nailsKg = Math.ceil(nailsCount / 200 * 10) / 10; // ~200 шт/кг для гвоздей 3.5×90

    const warnings: string[] = [];
    if (studStep === 400) {
      warnings.push("Шаг 400 мм — усиленный каркас, подходит для двухэтажных домов");
    }
    if (insulationType === 2 && wallHeight > 3) {
      warnings.push("ППС паронепроницаем — требуется принудительная вентиляция при высоте стен > 3 м");
    }

    const scenarios = buildNativeScenarios({
      id: "frame-house-main",
      title: "Frame house main",
      exactNeed: outerSheets,
      unit: "листов",
      packageSizes: [1],
      packageLabelPrefix: "frame-house-sheet",
    });

    return {
      materials: [
        {
          name: `Стойки доска 50×${studWidth} мм (6 м)`,
          quantity: studs,
          unit: "шт досок 6 м",
          withReserve: studBoards6m,
          purchaseQty: studBoards6m,
          category: "Каркас",
        },
        {
          name: `Обвязка верх+низ доска 50×${studWidth} мм (6 м)`,
          quantity: wallLength * 2 / 6,
          unit: "шт досок 6 м",
          withReserve: strappingBoards6m,
          purchaseQty: strappingBoards6m,
          category: "Каркас",
        },
        {
          name: `Наружная обшивка ${outerSheathingNames[outerSheathing] ?? "ОСБ-3 9 мм"}`,
          quantity: wallArea / outerSheetArea,
          unit: "листов",
          withReserve: outerSheets,
          purchaseQty: outerSheets,
          category: "Обшивка",
        },
        {
          name: `Внутренняя обшивка ${innerSheathingName}`,
          quantity: innerSheathing === 2 ? wallArea : wallArea / innerSheetArea,
          unit: innerSheathingUnit,
          withReserve: innerSheets,
          purchaseQty: innerSheets,
          category: "Обшивка",
        },
        insulationMaterial,
        {
          name: "Пароизоляция (Изоспан B или аналог, рулон 75 м²)",
          quantity: wallArea / 75,
          unit: "рулонов",
          withReserve: vaporBarrierRolls,
          purchaseQty: vaporBarrierRolls,
          category: "Мембраны",
        },
        {
          name: "Ветрозащитная мембрана (Изоспан A или аналог, рулон 75 м²)",
          quantity: wallArea / 75,
          unit: "рулонов",
          withReserve: windMembraneRolls,
          purchaseQty: windMembraneRolls,
          category: "Мембраны",
        },
        {
          name: "Скотч для мембран (рулон)",
          quantity: tapeRolls,
          unit: "рулонов",
          withReserve: tapeRolls,
          purchaseQty: tapeRolls,
          category: "Мембраны",
        },
        {
          name: "Саморезы по дереву 3.5×35 мм",
          quantity: totalScrewsCount / 600,
          unit: "кг",
          withReserve: screwsKg,
          purchaseQty: Math.max(1, Math.ceil(screwsKg)),
          category: "Крепёж",
        },
        {
          name: "Гвозди 3.5×90 мм (каркас)",
          quantity: nailsCount / 200,
          unit: "кг",
          withReserve: nailsKg,
          purchaseQty: Math.max(1, Math.ceil(nailsKg)),
          category: "Крепёж",
        },
      ],
      totals: {
        wallArea,
        studs,
        outerSheets,
        innerSheets,
        insulVolume,
      },
      warnings,
      scenarios,
    };
  },
  formulaDescription: `
**Расчёт каркасного дома:**
- Площадь стен = Периметр × Высота − Площадь проёмов
- Стойки: по периметру с заданным шагом + 1
- Обвязка: верхняя + нижняя = периметр × 2
- Обшивка: листы ОСБ 1250×2500 (3.125 м²), ЦСП 1200×3200 (3.84 м²), ГКЛ 1200×2500 (3.0 м²)
- Утеплитель: минвата послойно (50 мм слой), ППС — целиковые плиты
- Мембраны: +15% на нахлёсты, рулон 75 м²
- Крепёж: 28 саморезов/лист, 20 гвоздей/стойка
  `,
  howToUse: [
    "Введите периметр наружных стен (общая длина)",
    "Укажите высоту стен и площадь проёмов",
    "Выберите шаг стоек, тип утеплителя и обшивки",
    "Нажмите «Рассчитать» — получите полный список материалов для каркаса",
  ],
};
