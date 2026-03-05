import type { CalculatorDefinition } from "../types";
import { buildNativeScenarios } from "../scenario-native";

export const doorsDef: CalculatorDefinition = {
  id: "doors_install",
  slug: "ustanovka-dverej",
  title: "Калькулятор установки дверей",
  h1: "Калькулятор установки дверей — расчёт материалов и крепежа",
  description: "Рассчитайте количество монтажной пены, наличников, доборов и крепежа для установки межкомнатных или входных дверей.",
  metaTitle: "Калькулятор установки дверей | Материалы — Мастерок",
  metaDescription: "Бесплатный калькулятор установки дверей: монтажная пена, наличники, доборы, крепёж для межкомнатных и входных дверей.",
  category: "interior",
  categorySlug: "otdelka",
  tags: ["установка дверей", "межкомнатные двери", "наличники", "доборы", "монтажная пена"],
  popularity: 60,
  complexity: 1,
  fields: [
    {
      key: "doorCount",
      label: "Количество дверей",
      type: "slider",
      unit: "шт",
      min: 1,
      max: 20,
      step: 1,
      defaultValue: 3,
    },
    {
      key: "doorType",
      label: "Тип двери",
      type: "select",
      defaultValue: 0,
      options: [
        { value: 0, label: "Межкомнатная 700×2000 мм" },
        { value: 1, label: "Межкомнатная 800×2000 мм" },
        { value: 2, label: "Межкомнатная 900×2000 мм" },
        { value: 3, label: "Входная 860×2050 мм (двойная коробка)" },
        { value: 4, label: "Балконная 700×2100 мм" },
      ],
    },
    {
      key: "wallThickness",
      label: "Толщина стены",
      type: "select",
      defaultValue: 120,
      options: [
        { value: 80, label: "80 мм (гипсокартон)" },
        { value: 100, label: "100 мм (газобетон, тонкая перегородка)" },
        { value: 120, label: "120 мм (кирпич в полкирпича)" },
        { value: 200, label: "200 мм (кирпич в кирпич)" },
        { value: 250, label: "250 мм (несущая стена)" },
        { value: 380, label: "380 мм (кирпич 1.5 кирпича)" },
      ],
    },
    {
      key: "withNalichnik",
      label: "Наличники",
      type: "select",
      defaultValue: 1,
      options: [
        { value: 0, label: "Без наличников" },
        { value: 1, label: "С наличниками (с 2 сторон)" },
      ],
    },
  ],
  calculate(inputs): import("../types").CalculatorResult {
    const doorCount = Math.max(1, Math.round(inputs.doorCount ?? 3));
    const doorType = Math.round(inputs.doorType ?? 0);
    const wallThicknessMm = inputs.wallThickness ?? 120;
    const withNalichnik = Math.round(inputs.withNalichnik ?? 1);

    // Размеры дверей (Ш × В)
    const doorDims = [
      { w: 700, h: 2000 }, // 0
      { w: 800, h: 2000 }, // 1
      { w: 900, h: 2000 }, // 2
      { w: 860, h: 2050 }, // 3 входная
      { w: 700, h: 2100 }, // 4 балконная
    ];
    const dim = doorDims[doorType];

    const warnings: string[] = [];
    const materials = [];

    // Монтажная пена
    // Периметр проёма × 2 (зазор с каждой стороны)
    const openingPerimeterM = (2 * (dim.w + dim.h)) / 1000;
    const foamPerDoor = openingPerimeterM * 0.1; // ~100 мл/м.п. периметра
    const foamCanVolume = 0.75; // 750 мл = ~0.75 л выход
    const foamCansPerDoor = Math.ceil(foamPerDoor / foamCanVolume);
    const totalFoamCans = Math.ceil(doorCount * foamCansPerDoor * 1.1);

    materials.push({
      name: "Монтажная пена профессиональная (баллон 750 мл)",
      quantity: doorCount * foamCansPerDoor,
      unit: "баллонов",
      withReserve: totalFoamCans,
      purchaseQty: totalFoamCans,
      category: "Монтаж",
    });

    // Доборы (если толщина стены > стандартной коробки 70 мм)
    // Стандартная коробка = 70 мм, добор нужен при wallThickness > 70 мм
    const standardBoxDepth = 70; // мм
    const needDobor = wallThicknessMm > standardBoxDepth;
    if (needDobor) {
      const doborWidth = wallThicknessMm - standardBoxDepth;
      // Периметр коробки: 2 вертикали + 1 горизонталь
      const doborLengthPerDoor = (2 * dim.h + dim.w) / 1000 * 1.05;
      // Доборы по 2.2 м
      const doborPcs = Math.ceil((doborLengthPerDoor / 2.2)) * doorCount;

      materials.push({
        name: `Добор дверной ${doborWidth} мм × 2200 мм (расширение коробки)`,
        quantity: doborLengthPerDoor / 2.2 * doorCount,
        unit: "шт",
        withReserve: doborPcs,
        purchaseQty: doborPcs,
        category: "Добор",
      });
    }

    // Наличники
    if (withNalichnik > 0) {
      // Периметр наличника: 2 вертикали + 1 горизонталь (снизу нет)
      const nalichnikLengthPerDoor = (2 * dim.h + dim.w) / 1000 * 1.05;
      const nalichnikPcsPerDoor = Math.ceil(nalichnikLengthPerDoor / 2.2); // по 2.2 м
      const totalNalichnikPcs = nalichnikPcsPerDoor * doorCount * 2; // 2 стороны

      materials.push({
        name: "Наличник дверной 70×10 мм × 2200 мм",
        quantity: nalichnikLengthPerDoor / 2.2 * doorCount * 2,
        unit: "шт",
        withReserve: totalNalichnikPcs,
        purchaseQty: totalNalichnikPcs,
        category: "Наличники",
      });

      // Жидкие гвозди для наличников
      const glueCartridges = Math.ceil(doorCount * 0.5); // 0.5 картриджа на дверь
      materials.push({
        name: "Жидкие гвозди (картридж 310 мл)",
        quantity: doorCount * 0.5,
        unit: "шт",
        withReserve: glueCartridges,
        purchaseQty: glueCartridges,
        category: "Клей",
      });
    }

    // Шурупы для коробки
    const screwsPerDoor = 12; // ~12 точек крепления
    const screwPacks = Math.ceil(doorCount * screwsPerDoor / 50); // пачки 50 шт
    materials.push({
      name: "Шуруп 5×80 мм (пачка 50 шт) для крепления коробки",
      quantity: doorCount * screwsPerDoor / 50,
      unit: "пачек",
      withReserve: screwPacks,
      purchaseQty: screwPacks,
      category: "Крепёж",
    });

    // Дюбели
    const dubelsPerDoor = 6;
    const dubelsPacks = Math.ceil(doorCount * dubelsPerDoor / 20);
    materials.push({
      name: "Дюбель 8×80 мм (пачка 20 шт)",
      quantity: doorCount * dubelsPerDoor / 20,
      unit: "пачек",
      withReserve: dubelsPacks,
      purchaseQty: dubelsPacks,
      category: "Крепёж",
    });

    if (doorType === 3) {
      warnings.push("Входная дверь — монтажная пена должна быть непрерывным контуром для теплоизоляции; снаружи закройте гидроизоляционной лентой");
    }
    if (wallThicknessMm > 200 && !needDobor) {
      warnings.push("Проверьте, что ширина коробки соответствует толщине стены — возможно нужны доборы");
    }

    const scenarios = buildNativeScenarios({
      id: "doors-main",
      title: "Doors main",
      exactNeed: doorCount,
      unit: "шт",
      packageSizes: [1],
      packageLabelPrefix: "doors-piece",
    });

    return {
      materials,
      totals: {
        doorCount,
        totalFoamCans,
      } as Record<string, number>,
      warnings,
      scenarios,
    };
  },
  formulaDescription: `
**Расчёт установки дверей:**
- Пена: ~100 мл/м.п. периметра (баллон 750 мл)
- Доборы: если толщина стены > 70 мм (глубина стандартной коробки)
- Наличники: 2 вертикали + горизонталь × 2 стороны
  `,
  howToUse: [
    "Выберите количество и тип дверей",
    "Укажите толщину стены",
    "Выберите необходимость наличников",
    "Нажмите «Рассчитать»",
  ],
};
