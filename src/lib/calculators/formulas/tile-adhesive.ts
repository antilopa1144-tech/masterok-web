import type { CalculatorDefinition } from "../types";
import { buildNativeScenarios } from "../scenario-native";

export const tileAdhesiveDef: CalculatorDefinition = {
  id: "mixes_tile_glue",
  slug: "klej-dlya-plitki",
  title: "Калькулятор плиточного клея",
  h1: "Калькулятор плиточного клея онлайн — расчёт расхода Ceresit, Knauf",
  description: "Рассчитайте количество плиточного клея по площади, размеру плитки и толщине нанесения. Ceresit CM, Knauf Флексклебер.",
  metaTitle: "Калькулятор плиточного клея | Расчёт Ceresit CM, Knauf — Мастерок",
  metaDescription: "Бесплатный калькулятор плиточного клея: рассчитайте мешки Ceresit CM 11, CM 17, Knauf Флексклебер по площади и размеру плитки.",
  category: "flooring",
  categorySlug: "poly",
  tags: ["плиточный клей", "Ceresit", "Knauf", "CM 11", "CM 17", "клей для плитки"],
  popularity: 70,
  complexity: 1,
  fields: [
    {
      key: "area",
      label: "Площадь укладки",
      type: "slider",
      unit: "м²",
      min: 1,
      max: 500,
      step: 1,
      defaultValue: 20,
    },
    {
      key: "tileSize",
      label: "Размер плитки",
      type: "select",
      defaultValue: 1,
      options: [
        { value: 0, label: "до 30×30 см (маленькая)" },
        { value: 1, label: "30×60 — 60×60 см (средняя)" },
        { value: 2, label: "60×120 см и более (крупноформатная)" },
      ],
    },
    {
      key: "layingType",
      label: "Место укладки",
      type: "select",
      defaultValue: 0,
      options: [
        { value: 0, label: "Пол (горизонтальная)" },
        { value: 1, label: "Стена (вертикальная)" },
        { value: 2, label: "Улица / тёплый пол (деформируемый клей)" },
      ],
    },
    {
      key: "baseType",
      label: "Основание",
      type: "select",
      defaultValue: 0,
      options: [
        { value: 0, label: "Стяжка, бетон" },
        { value: 1, label: "Гипсокартон, гипс" },
        { value: 2, label: "Старая плитка" },
      ],
    },
    {
      key: "bagWeight",
      label: "Фасовка мешка",
      type: "select",
      defaultValue: 25,
      options: [
        { value: 5, label: "5 кг" },
        { value: 25, label: "25 кг" },
      ],
    },
  ],
  calculate(inputs): import("../types").CalculatorResult {
    const area = Math.max(1, inputs.area ?? 20);
    const tileSize = Math.round(inputs.tileSize ?? 1);
    const layingType = Math.round(inputs.layingType ?? 0);
    const baseType = Math.round(inputs.baseType ?? 0);
    const bagWeight = inputs.bagWeight ?? 25;

    // Базовый расход кг/м²: для маленькой ~2.5, средней ~4–5, крупной ~6–8
    const baseConsumption: Record<number, number> = { 0: 3.0, 1: 5.0, 2: 7.5 };
    let kgPerSqm = baseConsumption[tileSize] ?? 5.0;

    // Стена: на 15% меньше (нанесение только на плитку)
    if (layingType === 1) kgPerSqm *= 0.85;
    // Улица/тёплый пол: двойное нанесение → +30%
    if (layingType === 2) kgPerSqm *= 1.3;
    // Старая плитка: требует выравнивания → +20%
    if (baseType === 2) kgPerSqm *= 1.2;

    const totalKg = area * kgPerSqm * 1.1; // +10% запас
    const bags = Math.ceil(totalKg / bagWeight);

    const warnings: string[] = [];
    if (layingType === 2 && tileSize < 1) {
      warnings.push("Для наружных работ и тёплого пола применяйте деформируемый клей (Ceresit CM 16, CM 17)");
    }
    if (baseType === 1 && layingType === 0) {
      warnings.push("На гипсокартонном полу укладка плитки не рекомендуется — гипс не выдержит нагрузки");
    }
    if (tileSize === 2) {
      warnings.push("Крупноформатная плитка: обязательно двойное нанесение клея (на плитку и на основание)");
    }

    const recommendations: Record<number, string> = {
      0: "Ceresit CM 9, CM 11 Plus",
      1: "Ceresit CM 16, CM 17",
      2: "Ceresit CM 16, Knauf Флексклебер",
    };

    // Грунтовка для основания
    const taPrimerLiters = area * 0.15 * 1.15; // 150 мл/м², запас 15%
    const taPrimerCans = Math.ceil(taPrimerLiters / 10); // канистра 10 л

    // Крестики для швов: (area / (размер плитки²)) × 4 стыка
    const tileSizesM: Record<number, number> = { 0: 0.3, 1: 0.6, 2: 1.2 }; // примерный размер стороны
    const tileSideM = tileSizesM[tileSize] ?? 0.6;
    const tilesCount = area / (tileSideM * tileSideM);
    const crossesCount = Math.ceil(tilesCount * 4 * 1.1); // 4 крестика на плитку, запас 10%
    const crossesPacks = Math.ceil(crossesCount / 200); // 1 упаковка = 200 шт

    const scenarios = buildNativeScenarios({
      id: "tile-adhesive-main",
      title: "Tile adhesive main",
      exactNeed: totalKg,
      unit: "кг",
      packageSizes: [bagWeight],
      packageLabelPrefix: "tile-adhesive-bag",
    });

    return {
      materials: [
        {
          name: `Клей плиточный (мешки ${bagWeight} кг)`,
          quantity: totalKg / bagWeight,
          unit: "мешков",
          withReserve: bags,
          purchaseQty: bags,
          category: "Основное",
        },
        {
          name: "Грунтовка для основания (канистра 10 л, ~150 мл/м²)",
          quantity: taPrimerLiters / 10,
          unit: "канистр",
          withReserve: taPrimerCans,
          purchaseQty: Math.max(1, taPrimerCans),
          category: "Подготовка",
        },
        {
          name: "Крестики для швов (упаковка 200 шт)",
          quantity: crossesCount / 200,
          unit: "упаковок",
          withReserve: crossesPacks,
          purchaseQty: Math.max(1, crossesPacks),
          category: "Крепёж",
        },
      ],
      totals: { area, kgPerSqm, totalKg } as Record<string, number>,
      warnings: [
        ...warnings,
        `Рекомендуемая марка: ${recommendations[layingType] ?? recommendations[0]}`,
      ],
      scenarios,
    };
  },
  formulaDescription: `
**Расход плиточного клея:**
- Малая плитка (≤30×30 см): ~3 кг/м²
- Средняя (30×60–60×60 см): ~5 кг/м²
- Крупноформатная (≥60×120 см): ~7.5 кг/м²

Вертикальная укладка: −15%
Улица/тёплый пол (двойное нанесение): +30%
Запас 10% на потери.
  `,
  howToUse: [
    "Введите площадь укладки",
    "Выберите размер плитки",
    "Укажите место укладки и тип основания",
    "Нажмите «Рассчитать» — получите мешки клея и рекомендации по марке",
  ],
};

