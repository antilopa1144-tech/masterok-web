import type { CalculatorDefinition } from "../types";
import { buildNativeScenarios } from "../scenario-native";

export const soundInsulationDef: CalculatorDefinition = {
  id: "insulation_sound",
  slug: "zvukoizolyaciya",
  title: "Калькулятор звукоизоляции",
  h1: "Калькулятор звукоизоляции стен и пола — расчёт материалов",
  description: "Рассчитайте количество звукоизоляционных материалов (ЗИПС, Rockwool Акустик, виброизол) для стен, пола или потолка.",
  metaTitle: "Калькулятор звукоизоляции | Стены, пол, потолок — Мастерок",
  metaDescription: "Бесплатный калькулятор звукоизоляции: ЗИПС панели, Rockwool Акустик, виброизол, гипсокартон — расчёт для стен, пола и потолка.",
  category: "interior",
  categorySlug: "otdelka",
  tags: ["звукоизоляция", "шумоизоляция", "ЗИПС", "Rockwool Акустик", "виброизол"],
  popularity: 58,
  complexity: 2,
  fields: [
    {
      key: "area",
      label: "Площадь обрабатываемой поверхности",
      type: "slider",
      unit: "м²",
      min: 1,
      max: 500,
      step: 1,
      defaultValue: 25,
    },
    {
      key: "surface",
      label: "Тип поверхности",
      type: "select",
      defaultValue: 0,
      options: [
        { value: 0, label: "Стена (между соседями)" },
        { value: 1, label: "Пол (от соседей снизу)" },
        { value: 2, label: "Потолок (от соседей сверху)" },
      ],
    },
    {
      key: "systemType",
      label: "Система звукоизоляции",
      type: "select",
      defaultValue: 0,
      options: [
        { value: 0, label: "Базовая (ГКШП + акустическая вата)" },
        { value: 1, label: "ЗИПС панели (каркасная система)" },
        { value: 2, label: "Плавающий пол (стяжка на виброизоле)" },
        { value: 3, label: "Акустический подвесной потолок" },
      ],
    },
  ],
  calculate(inputs): import("../types").CalculatorResult {
    const area = Math.max(1, inputs.area ?? 25);
    const surface = Math.round(inputs.surface ?? 0);
    const systemType = Math.round(inputs.systemType ?? 0);

    const warnings: string[] = [];
    const materials = [];

    const areaWithReserve = area * 1.1;

    if (systemType === 0) {
      // Базовая система: ГКЛ + Rockwool Акустик Баттс
      // Акустическая вата (плиты 600×1000×50 мм = 0.6 м²)
      const woolPlates = Math.ceil(areaWithReserve / 0.6);
      materials.push({
        name: "Rockwool Акустик Баттс 50 мм (плита 600×1000 мм, 0.6 м²)",
        quantity: areaWithReserve / 0.6,
        unit: "плит",
        withReserve: woolPlates,
        purchaseQty: woolPlates,
        category: "Изоляция",
      });

      // Два слоя ГКШП 12.5 мм (гипсокартон шумопоглощающий)
      const gklSheets = Math.ceil(areaWithReserve * 2 / 3); // лист 3 м²
      materials.push({
        name: "ГКЛ 12.5 мм (лист 1200×2500 мм, 2 слоя)",
        quantity: areaWithReserve * 2 / 3,
        unit: "листов",
        withReserve: gklSheets,
        purchaseQty: gklSheets,
        category: "ГКЛ",
      });

      // Профиль ПП 60×27 через каждые 600 мм
      const profileLengthM = (area / 0.6) * 3 * 1.1; // рядов × длина × запас
      const profilePcs = Math.ceil(profileLengthM / 3);
      materials.push({
        name: "Профиль ПП 60×27 мм, 3 м (стойки каркаса)",
        quantity: profileLengthM / 3,
        unit: "шт",
        withReserve: profilePcs,
        purchaseQty: profilePcs,
        category: "Профиль",
      });

      // Виброподвесы для стен (каркас не должен касаться стены)
      const vibroCount = Math.ceil(area * 2 * 1.05); // 2 шт/м²
      materials.push({
        name: "Виброподвес прямой (шумоизолирующий)",
        quantity: area * 2,
        unit: "шт",
        withReserve: vibroCount,
        purchaseQty: vibroCount,
        category: "Виброзащита",
      });

      // Звукоизоляционная лента под профили
      const vibrotapeLength = Math.ceil(profileLengthM * 1.1);
      materials.push({
        name: "Лента виброакустическая самоклеящаяся (рулон 30 м)",
        quantity: profileLengthM / 30,
        unit: "рулонов",
        withReserve: Math.ceil(profileLengthM / 30),
        purchaseQty: Math.ceil(profileLengthM / 30),
        category: "Виброзащита",
      });

      // Саморезы
      const screwsPacks = Math.ceil(gklSheets * 25 / 200);
      materials.push({
        name: "Саморез ТН 3.5×25 мм (пачка 200 шт)",
        quantity: gklSheets * 25 / 200,
        unit: "пачек",
        withReserve: screwsPacks,
        purchaseQty: screwsPacks,
        category: "Крепёж",
      });

    } else if (systemType === 1) {
      // ЗИПС панели (готовые сэндвич-системы)
      const zipsPanelArea = 0.6 * 1.2; // 0.72 м² (600×1200 мм)
      const zipsPanels = Math.ceil(areaWithReserve / zipsPanelArea);
      materials.push({
        name: "ЗИПС панель (600×1200 мм, ~60 дБ)",
        quantity: areaWithReserve / zipsPanelArea,
        unit: "шт",
        withReserve: zipsPanels,
        purchaseQty: zipsPanels,
        category: "ЗИПС",
      });

      // Дюбели для ЗИПС
      const zipsDubels = Math.ceil(zipsPanels * 6 * 1.05);
      materials.push({
        name: "Дюбель-гвоздь 6×40 мм для крепления ЗИПС",
        quantity: zipsPanels * 6,
        unit: "шт",
        withReserve: zipsDubels,
        purchaseQty: zipsDubels,
        category: "Крепёж",
      });

      // ГКЛ поверх ЗИПС (финишный слой)
      const gklSheets = Math.ceil(areaWithReserve / 3);
      materials.push({
        name: "ГКЛ 12.5 мм поверх ЗИПС (лист 1200×2500 мм)",
        quantity: areaWithReserve / 3,
        unit: "листов",
        withReserve: gklSheets,
        purchaseQty: gklSheets,
        category: "ГКЛ",
      });

    } else if (systemType === 2) {
      // Плавающий пол
      const vibrorolls = Math.ceil(areaWithReserve / 20); // рулон 20 м²
      materials.push({
        name: "Виброизол (звукоизоляционный мат) рулон 20 м²",
        quantity: areaWithReserve / 20,
        unit: "рулонов",
        withReserve: vibrorolls,
        purchaseQty: vibrorolls,
        category: "Виброзащита",
      });

      // Демпферная лента по периметру
      const perimeterEst = Math.sqrt(area) * 4;
      const demfLength = Math.ceil(perimeterEst * 1.1);
      materials.push({
        name: "Демпферная лента 100×10 мм (рулон 25 м)",
        quantity: perimeterEst / 25,
        unit: "рулонов",
        withReserve: Math.ceil(perimeterEst / 25),
        purchaseQty: Math.ceil(perimeterEst / 25),
        category: "Виброзащита",
      });

      // Стяжка
      const screedKg = area * 0.05 * 1800; // 50 мм × 1800 кг/м³
      const screedBags = Math.ceil(screedKg / 50);
      materials.push({
        name: "ЦПС или наливной пол (мешок 50 кг, стяжка 50 мм)",
        quantity: screedKg / 50,
        unit: "мешков",
        withReserve: screedBags,
        purchaseQty: screedBags,
        category: "Стяжка",
      });

      warnings.push("Стяжка плавающего пола не должна касаться стен — демпферная лента обязательна по всему периметру");

    } else {
      // Акустический подвесной потолок
      const woolPlates = Math.ceil(areaWithReserve / 0.6);
      materials.push({
        name: "Rockwool Акустик Баттс 100 мм (плита 600×1000 мм)",
        quantity: areaWithReserve / 0.6,
        unit: "плит",
        withReserve: woolPlates,
        purchaseQty: woolPlates,
        category: "Изоляция",
      });

      const vibroSuspCount = Math.ceil(area * 1.5 * 1.05); // 1.5 шт/м²
      materials.push({
        name: "Виброподвес для потолка (антивибрационный)",
        quantity: area * 1.5,
        unit: "шт",
        withReserve: vibroSuspCount,
        purchaseQty: vibroSuspCount,
        category: "Виброзащита",
      });

      const gklSheets2 = Math.ceil(areaWithReserve * 2 / 3);
      materials.push({
        name: "ГКЛ 12.5 мм (лист 1200×2500 мм, 2 слоя)",
        quantity: areaWithReserve * 2 / 3,
        unit: "листов",
        withReserve: gklSheets2,
        purchaseQty: gklSheets2,
        category: "ГКЛ",
      });
    }

    // Герметик акриловый для заделки швов: 1 туба на 20 м.п.
    const perimeterEst2 = Math.sqrt(area) * 4;
    // Длина швов: по периметру + по стыкам листов ≈ периметр × 2
    const jointLength = perimeterEst2 * 2;
    const sealantTubes = Math.ceil(jointLength / 20);
    materials.push({
      name: "Герметик акриловый звукоизоляционный (310 мл, туба)",
      quantity: jointLength / 20,
      unit: "шт",
      withReserve: sealantTubes,
      purchaseQty: sealantTubes,
      category: "Герметик",
    });

    // Уплотнительная лента (по периметру стены × 2 — верх и низ / боковые примыкания)
    const sealTapeLength = perimeterEst2 * 2;
    const sealTapeWithReserve = Math.ceil(sealTapeLength * 1.1);
    const sealTapeRolls = Math.ceil(sealTapeWithReserve / 30); // рулон 30 м
    materials.push({
      name: "Уплотнительная лента самоклеящаяся (рулон 30 м)",
      quantity: sealTapeLength,
      unit: "м.п.",
      withReserve: sealTapeWithReserve,
      purchaseQty: sealTapeRolls,
      category: "Примыкания",
    });

    if (systemType <= 1 && surface === 0) {
      warnings.push("Звукоизоляция стены уменьшит площадь комнаты — учитывайте толщину системы (от 70 до 150 мм)");
    }
    warnings.push("Для эффективной звукоизоляции все зазоры и стыки должны быть тщательно заделаны акустическим герметиком");

    const scenarios = buildNativeScenarios({
      id: "sound-insulation-main",
      title: "Sound insulation main",
      exactNeed: areaWithReserve,
      unit: "м²",
      packageSizes: [1],
      packageLabelPrefix: "sound-insulation-m2",
    });

    return {
      materials,
      totals: { area } as Record<string, number>,
      warnings,
      scenarios,
    };
  },
  formulaDescription: `
**Расчёт звукоизоляции (базовая система):**
- Акустическая вата: площадь × 1.10 / 0.6 м² (плита)
- ГКЛ 2 слоя: площадь × 2 × 1.10 / 3 м² (лист)
- Виброподвесы: ~2 шт/м²
  `,
  howToUse: [
    "Введите площадь поверхности",
    "Выберите тип поверхности и систему изоляции",
    "Нажмите «Рассчитать»",
  ],
};
