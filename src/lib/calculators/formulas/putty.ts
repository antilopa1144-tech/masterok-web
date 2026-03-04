import type { CalculatorDefinition } from "../types";

export const puttyDef: CalculatorDefinition = {
  id: "mixes_putty",
  slug: "shpaklevka",
  title: "Калькулятор шпаклёвки",
  h1: "Калькулятор шпаклёвки онлайн — расчёт расхода на стены и потолок",
  description: "Рассчитайте количество шпаклёвки (стартовой и финишной) для стен и потолка. Knauf, Волма, Ceresit.",
  metaTitle: "Калькулятор шпаклёвки | Расчёт расхода Knauf Fugen, Волма — Мастерок",
  metaDescription: "Бесплатный калькулятор шпаклёвки: рассчитайте мешки стартовой и финишной шпаклёвки Knauf, Волма, Ceresit по площади и толщине слоя.",
  category: "interior",
  categorySlug: "otdelka",
  tags: ["шпаклёвка", "Knauf", "Волма", "финишная шпаклёвка", "стартовая шпаклёвка"],
  popularity: 72,
  complexity: 1,
  fields: [
    {
      key: "inputMode",
      label: "Способ ввода",
      type: "radio",
      defaultValue: 0,
      options: [
        { value: 0, label: "По размерам помещения" },
        { value: 1, label: "По площади" },
      ],
    },
    {
      key: "length",
      label: "Длина помещения",
      type: "slider",
      unit: "м",
      min: 1,
      max: 50,
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
      max: 50,
      step: 0.5,
      defaultValue: 4,
      group: "bySize",
    },
    {
      key: "height",
      label: "Высота потолков",
      type: "slider",
      unit: "м",
      min: 2,
      max: 5,
      step: 0.1,
      defaultValue: 2.7,
      group: "bySize",
    },
    {
      key: "area",
      label: "Площадь поверхности",
      type: "slider",
      unit: "м²",
      min: 1,
      max: 500,
      step: 1,
      defaultValue: 50,
      group: "byArea",
    },
    {
      key: "surface",
      label: "Поверхность",
      type: "select",
      defaultValue: 0,
      options: [
        { value: 0, label: "Стены" },
        { value: 1, label: "Потолок" },
        { value: 2, label: "Стены + потолок" },
      ],
    },
    {
      key: "puttyType",
      label: "Тип шпаклёвки",
      type: "select",
      defaultValue: 0,
      options: [
        { value: 0, label: "Только финишная (1–2 мм)" },
        { value: 1, label: "Стартовая + финишная" },
        { value: 2, label: "Только стартовая (3–5 мм)" },
      ],
    },
    {
      key: "bagWeight",
      label: "Фасовка мешка",
      type: "select",
      defaultValue: 20,
      options: [
        { value: 5, label: "5 кг (ведро)" },
        { value: 20, label: "20 кг" },
        { value: 25, label: "25 кг" },
      ],
    },
  ],
  calculate(inputs): import("../types").CalculatorResult {
    const inputMode = Math.round(inputs.inputMode ?? 0);
    let wallArea: number;

    if (inputMode === 0) {
      const l = Math.max(1, inputs.length ?? 5);
      const w = Math.max(1, inputs.width ?? 4);
      const h = Math.max(2, inputs.height ?? 2.7);
      const ceilArea = l * w;
      const wallsArea = 2 * (l + w) * h;
      const surfaceMode = Math.round(inputs.surface ?? 0);
      if (surfaceMode === 0) wallArea = wallsArea;
      else if (surfaceMode === 1) wallArea = ceilArea;
      else wallArea = wallsArea + ceilArea;
    } else {
      wallArea = Math.max(1, inputs.area ?? 50);
    }

    const puttyType = Math.round(inputs.puttyType ?? 0);
    const bagWeight = inputs.bagWeight ?? 20;

    const warnings: string[] = [];
    const materials = [];

    if (puttyType === 0 || puttyType === 1) {
      // Финишная: 1.0–1.2 кг/м² (слой 1–2 мм)
      const finishKgPerSqm = 1.1;
      const finishKg = wallArea * finishKgPerSqm * 1.1;
      const finishBags = Math.ceil(finishKg / bagWeight);
      materials.push({
        name: `Шпаклёвка финишная (мешки ${bagWeight} кг)`,
        quantity: finishKg / bagWeight,
        unit: "мешков",
        withReserve: finishBags,
        purchaseQty: finishBags,
        category: "Финишная",
      });
    }

    if (puttyType === 1 || puttyType === 2) {
      // Стартовая: ~0.8–1.0 кг/м²/мм × 3 мм среднего слоя = ~2.7 кг/м²
      const startKgPerSqm = 2.7;
      const startKg = wallArea * startKgPerSqm * 1.1;
      const startBags = Math.ceil(startKg / bagWeight);
      materials.push({
        name: `Шпаклёвка стартовая (мешки ${bagWeight} кг)`,
        quantity: startKg / bagWeight,
        unit: "мешков",
        withReserve: startBags,
        purchaseQty: startBags,
        category: "Стартовая",
      });
    }

    // Серпянка при стартовой: ~1.2 м.п. на 1 м² стен (стыки листов ГКЛ, углы, трещины)
    // Рулон серпянки 45 мм × 45 м или 90 м
    if (puttyType >= 1) {
      const serpyankaMeters = wallArea * 1.2 * 1.1; // 1.2 м.п./м² + 10% запас
      const serpyankaRolls = Math.ceil(serpyankaMeters / 45); // рулон 45 м
      materials.push({
        name: "Серпянка (лента армировочная 45 мм, рулон 45 м)",
        quantity: wallArea * 1.2,
        unit: "м.п.",
        withReserve: Math.ceil(serpyankaMeters),
        purchaseQty: serpyankaRolls,
        category: "Армирование",
      });
    }

    // Грунтовка глубокого проникновения — обязательна перед каждым слоем
    const coats = puttyType === 1 ? 2 : 1; // стартовая + финишная = 2 слоя грунтовки
    const primerLiters = wallArea * 0.15 * coats; // 150 мл/м² на слой
    const primerCans = Math.ceil(primerLiters / 10); // канистры 10 л
    materials.push({
      name: "Грунтовка глубокого проникновения (10 л)",
      quantity: primerLiters / 10,
      unit: "канистр",
      withReserve: primerCans,
      purchaseQty: primerCans,
      category: "Подготовка",
    });

    // Наждачная бумага для шлифовки
    if (puttyType === 0 || puttyType === 1) {
      // Финишная → шлифуем P180–P240
      const sandpaperSheets = Math.ceil(wallArea / 5); // 1 лист на ~5 м²
      materials.push({
        name: "Наждачная бумага P180–P240",
        quantity: sandpaperSheets,
        unit: "листов",
        withReserve: Math.ceil(sandpaperSheets * 1.1),
        purchaseQty: Math.ceil(sandpaperSheets * 1.1),
        category: "Шлифовка",
      });
    }

    if (wallArea > 100) {
      warnings.push("Для больших площадей рекомендуется нанесение шпаклёвки механизированным методом");
    }

    return {
      materials,
      totals: { wallArea, puttyType } as Record<string, number>,
      warnings,
    };
  },
  formulaDescription: `
**Нормы расхода шпаклёвки:**
- Финишная (слой 1–2 мм): 1.0–1.2 кг/м²
- Стартовая (слой 3–5 мм): 1.2–1.5 кг/м²

Запас 10% на потери.
Серпянка: наклеивается на стыки и углы.
  `,
  howToUse: [
    "Введите размеры помещения или площадь",
    "Выберите, что шпаклюете (стены или потолок)",
    "Выберите тип шпаклёвки",
    "Нажмите «Рассчитать» — получите количество мешков",
  ],
};
