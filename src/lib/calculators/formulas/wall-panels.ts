import type { CalculatorDefinition } from "../types";
import { buildNativeScenarios } from "../scenario-native";

export const wallPanelsDef: CalculatorDefinition = {
  id: "walls_panels",
  slug: "paneli-dlya-sten",
  title: "Калькулятор панелей для стен",
  h1: "Калькулятор панелей для стен — ПВХ, МДФ, 3D панели",
  description: "Рассчитайте количество декоративных панелей (ПВХ, МДФ, 3D), клея и плинтусов для отделки стен.",
  metaTitle: "Калькулятор панелей для стен | ПВХ, МДФ, 3D — Мастерок",
  metaDescription: "Бесплатный калькулятор панелей для стен: рассчитайте количество ПВХ, МДФ или 3D панелей, клея и плинтусов по площади.",
  category: "walls",
  categorySlug: "steny",
  tags: ["панели для стен", "ПВХ панели", "МДФ панели", "3D панели", "вагонка", "декоративные панели"],
  popularity: 65,
  complexity: 1,
  fields: [
    {
      key: "area",
      label: "Площадь стен",
      type: "slider",
      unit: "м²",
      min: 1,
      max: 200,
      step: 1,
      defaultValue: 15,
    },
    {
      key: "panelType",
      label: "Тип панели",
      type: "select",
      defaultValue: 0,
      options: [
        { value: 0, label: "ПВХ панели (25 см × 3 м)" },
        { value: 1, label: "МДФ панели (19 см × 2.6 м)" },
        { value: 2, label: "3D панели (50×50 см)" },
        { value: 3, label: "Вагонка (10 см × 3 м)" },
        { value: 4, label: "Декоративный камень (0.5 м²/упак.)" },
      ],
    },
    {
      key: "mountMethod",
      label: "Способ монтажа",
      type: "select",
      defaultValue: 0,
      options: [
        { value: 0, label: "На клей" },
        { value: 1, label: "На обрешётку (рейки)" },
      ],
    },
  ],
  calculate(inputs): import("../types").CalculatorResult {
    const area = Math.max(1, inputs.area ?? 15);
    const panelType = Math.round(inputs.panelType ?? 0);
    const mountMethod = Math.round(inputs.mountMethod ?? 0);

    const areaWithReserve = area * 1.1;
    const warnings: string[] = [];
    const materials = [];

    // Параметры панелей по типу
    const panelData: { name: string; w: number; l: number; unit: string; packArea?: number }[] = [
      { name: "Панель ПВХ 250×3000 мм", w: 0.25, l: 3.0, unit: "шт" },
      { name: "Панель МДФ 190×2600 мм", w: 0.19, l: 2.6, unit: "шт" },
      { name: "3D панель 500×500 мм", w: 0.5, l: 0.5, unit: "шт" },
      { name: "Вагонка 100×3000 мм", w: 0.1, l: 3.0, unit: "шт" },
      { name: "Декоративный камень (упаковка 0.5 м²)", w: 1, l: 0.5, unit: "упаковок", packArea: 0.5 },
    ];

    const panel = panelData[panelType] ?? panelData[0];

    let piecesNeeded: number;
    if (panel.packArea) {
      piecesNeeded = Math.ceil(areaWithReserve / panel.packArea);
      materials.push({
        name: panel.name,
        quantity: area / panel.packArea,
        unit: panel.unit,
        withReserve: piecesNeeded,
        purchaseQty: piecesNeeded,
        category: "Панели",
      });
    } else {
      const panelArea = panel.w * panel.l;
      piecesNeeded = Math.ceil(areaWithReserve / panelArea);
      materials.push({
        name: panel.name,
        quantity: area / panelArea,
        unit: panel.unit,
        withReserve: piecesNeeded,
        purchaseQty: piecesNeeded,
        category: "Панели",
      });
    }

    // Клей или обрешётка
    if (mountMethod === 0) {
      // Клей-пена или жидкие гвозди: 1 баллон/тюбик ≈ 3-5 м²
      const glueBottles = Math.ceil(area / 4);
      materials.push({
        name: panelType <= 1 ? "Жидкие гвозди (300 мл тюбик)" : "Клей для 3D панелей (1 кг)",
        quantity: area / 4,
        unit: "шт",
        withReserve: glueBottles,
        purchaseQty: glueBottles,
        category: "Клей",
      });
    } else {
      // Обрешётка: рейки 20×40 мм, шаг 400-600 мм
      const battensSpacing = panelType === 0 ? 0.5 : 0.4; // м
      const wallHeight = 2.5; // предполагаем стандартную высоту
      const wallLength = area / wallHeight;
      const battenRows = Math.ceil(wallHeight / battensSpacing) + 1;
      const battenMeters = battenRows * wallLength * 1.05;
      const battenPcs = Math.ceil(battenMeters / 3.0); // рейки по 3 м

      materials.push({
        name: "Рейка 20×40 мм (3 м) — обрешётка",
        quantity: battenMeters / 3.0,
        unit: "шт",
        withReserve: battenPcs,
        purchaseQty: battenPcs,
        category: "Обрешётка",
      });

      const dubelCount = Math.ceil(battenMeters / 0.5);
      materials.push({
        name: "Дюбель-гвоздь 6×40 мм",
        quantity: dubelCount,
        unit: "шт",
        withReserve: Math.ceil(dubelCount * 1.1),
        purchaseQty: Math.ceil(dubelCount / 50) * 50,
        category: "Крепёж",
      });

      if (panelType === 0 || panelType === 1 || panelType === 3) {
        // Кляймеры для скрытого крепления
        const klaimers = Math.ceil(area * 5);
        materials.push({
          name: "Кляймер для панелей",
          quantity: klaimers,
          unit: "шт",
          withReserve: Math.ceil(klaimers * 1.1),
          purchaseQty: Math.ceil(klaimers / 50) * 50,
          category: "Крепёж",
        });
      }
    }

    // Молдинги и стартовые профили по периметру
    const perimeter = 2 * (area / 2.5 + 2.5); // приближение: ширина = area/2.5
    const moldingPcs = Math.ceil(perimeter * 1.05 / 3.0);
    materials.push({
      name: "Стартовый/финишный молдинг (3 м)",
      quantity: perimeter / 3.0,
      unit: "шт",
      withReserve: moldingPcs,
      purchaseQty: moldingPcs,
      category: "Молдинги",
    });

    // Герметик силиконовый: 1 туба на 10 м.п. стыков (по молдингам и углам)
    const sealantJointLength = perimeter; // стыки по периметру
    const sealantTubes = Math.ceil(sealantJointLength / 10);
    materials.push({
      name: "Герметик силиконовый (280 мл, туба)",
      quantity: sealantJointLength / 10,
      unit: "шт",
      withReserve: sealantTubes,
      purchaseQty: sealantTubes,
      category: "Герметик",
    });

    // Грунтовка — только при монтаже на клей (стены нужно грунтовать)
    if (mountMethod === 0) {
      const primerLiters = area * 0.15; // 150 мл/м²
      const primerWithReserve = primerLiters * 1.15;
      materials.push({
        name: "Грунтовка глубокого проникновения (канистра 10 л)",
        quantity: primerLiters,
        unit: "л",
        withReserve: Math.ceil(primerWithReserve * 10) / 10,
        purchaseQty: Math.ceil(primerWithReserve / 10), // канистра 10 л
        category: "Грунтовка",
      });
    }

    if (panelType === 3) {
      warnings.push("Вагонка требует акклиматизации 48 ч в помещении перед монтажом");
      warnings.push("Обработайте антисептиком для защиты от влаги и плесени");
    }
    if (panelType === 4) {
      warnings.push("Декоративный камень — обработайте гидрофобизатором после укладки");
    }

    const scenarios = buildNativeScenarios({
      id: "wall-panels-main",
      title: "Wall panels main",
      exactNeed: piecesNeeded,
      unit: "шт",
      packageSizes: [1],
      packageLabelPrefix: "wall-panel-piece",
    });

    return {
      materials,
      totals: { area, piecesNeeded } as Record<string, number>,
      warnings,
      scenarios,
    };
  },
  formulaDescription: `
**Расчёт панелей для стен:**
- Запас +10% на подрезку
- ПВХ 250×3000: ~1.32 шт/м²
- МДФ 190×2600: ~2.02 шт/м²
- Вагонка 100×3000: ~3.33 шт/м²
  `,
  howToUse: [
    "Введите площадь стен",
    "Выберите тип панели",
    "Укажите способ монтажа",
    "Нажмите «Рассчитать»",
  ],
};
