import type { CalculatorDefinition } from "../types";
import { buildNativeScenarios } from "../scenario-native";

export const tileGroutDef: CalculatorDefinition = {
  id: "floors_tile_grout",
  slug: "zatirka",
  title: "Калькулятор затирки для плитки",
  h1: "Калькулятор затирки для плитки онлайн — расчёт расхода",
  description: "Рассчитайте количество затирки (фуги) для плитки с учётом ширины и глубины шва. Ceresit, Mapei, Litokol.",
  metaTitle: "Калькулятор затирки для плитки | Расчёт Ceresit, Mapei — Мастерок",
  metaDescription: "Бесплатный калькулятор затирки: рассчитайте кг затирки Ceresit CE 33, Mapei Keracolor, Litokol Starlike по размеру плитки и ширине шва.",
  category: "flooring",
  categorySlug: "poly",
  tags: ["затирка", "фуга", "Ceresit", "Mapei", "Litokol", "шов плитки"],
  popularity: 65,
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
      key: "tileWidth",
      label: "Ширина плитки",
      type: "slider",
      unit: "мм",
      min: 50,
      max: 1200,
      step: 10,
      defaultValue: 300,
    },
    {
      key: "tileHeight",
      label: "Высота плитки",
      type: "slider",
      unit: "мм",
      min: 50,
      max: 1200,
      step: 10,
      defaultValue: 300,
    },
    {
      key: "tileThickness",
      label: "Толщина плитки",
      type: "slider",
      unit: "мм",
      min: 6,
      max: 25,
      step: 1,
      defaultValue: 8,
    },
    {
      key: "jointWidth",
      label: "Ширина шва",
      type: "slider",
      unit: "мм",
      min: 1,
      max: 20,
      step: 0.5,
      defaultValue: 3,
      hint: "Стандарт 2–3 мм, крупная плитка 3–5 мм",
    },
    {
      key: "groutType",
      label: "Тип затирки",
      type: "select",
      defaultValue: 0,
      options: [
        { value: 0, label: "Цементная (Ceresit CE 33, Mapei Keracolor)" },
        { value: 1, label: "Эпоксидная (Litokol Starlike, Mapei Kerapoxy)" },
        { value: 2, label: "Полиуретановая (готовая паста)" },
      ],
    },
    {
      key: "bagSize",
      label: "Упаковка",
      type: "select",
      defaultValue: 2,
      options: [
        { value: 1, label: "1 кг" },
        { value: 2, label: "2 кг" },
        { value: 5, label: "5 кг" },
      ],
    },
  ],
  calculate(inputs): import("../types").CalculatorResult {
    const area = Math.max(1, inputs.area ?? 20);
    const tileW = Math.max(50, inputs.tileWidth ?? 300); // мм
    const tileH = Math.max(50, inputs.tileHeight ?? 300); // мм
    const tileT = Math.max(6, inputs.tileThickness ?? 8); // мм
    const jointW = Math.max(1, inputs.jointWidth ?? 3); // мм
    const groutType = Math.round(inputs.groutType ?? 0);
    const bagSize = inputs.bagSize ?? 2;

    // Длина швов на 1 м²: 1/W + 1/H (м/м²)
    const jointLengthPerSqm = 1000 / Math.max(50, tileW) + 1000 / Math.max(50, tileH); // пм/м²

    // Объём швов: jointLength × jointW × tileT (все в мм → переводим в л)
    const jointVolumeLPerSqm = jointLengthPerSqm * (jointW / 1000) * (tileT / 1000) * 1000; // л/м²

    // Плотность по типу: цемент ~1600, эпокси ~1400, полиуретан ~1200 кг/м³
    const density: Record<number, number> = { 0: 1600, 1: 1400, 2: 1200 };
    const rho = density[groutType] ?? 1600;

    const kgPerSqm = jointVolumeLPerSqm * (rho / 1000); // кг/м²
    const totalKg = area * kgPerSqm * 1.1; // +10% запас
    const bags = Math.ceil(totalKg / bagSize);

    const warnings: string[] = [];
    if (groutType === 1) {
      warnings.push("Эпоксидная затирка требует смешивания компонентов A+B — работайте небольшими порциями (25–30 минут жизнеспособность)");
    }
    if (jointW < 2 && groutType === 1) {
      warnings.push("Эпоксидная затирка не рекомендуется для швов < 2 мм");
    }
    if (tileW > 600 || tileH > 600) {
      warnings.push("Крупноформатная плитка: рекомендуется шов от 3 мм для компенсации тепловых расширений");
    }

    const groutNames = ["Затирка цементная", "Затирка эпоксидная", "Затирка полиуретановая"];

    const scenarios = buildNativeScenarios({
      id: "tile-grout-main",
      title: "Tile grout main",
      exactNeed: totalKg,
      unit: "кг",
      packageSizes: [bagSize],
      packageLabelPrefix: "tile-grout-pack",
    });

    return {
      materials: [
        {
          name: `${groutNames[groutType] ?? groutNames[0]} (уп. ${bagSize} кг)`,
          quantity: totalKg / bagSize,
          unit: "уп.",
          withReserve: bags,
          purchaseQty: bags,
          category: "Основное",
        },
      ],
      totals: { area, kgPerSqm, totalKg } as Record<string, number>,
      warnings,
      scenarios,
    };
  },
  formulaDescription: `
**Расчёт затирки по длине швов:**
Длина швов/м² = 1000/Ширина_плитки + 1000/Высота_плитки (пм/м²)
Объём шва = Длина × Ширина_шва × Толщина_плитки
Расход = Объём × Плотность (кг/м³)

Плотность:
- Цементная: ~1600 кг/м³
- Эпоксидная: ~1400 кг/м³
- Полиуретановая: ~1200 кг/м³
  `,
  howToUse: [
    "Введите площадь укладки плитки",
    "Укажите размер и толщину плитки",
    "Задайте ширину шва (обычно 2–3 мм)",
    "Выберите тип затирки",
    "Нажмите «Рассчитать» — получите количество упаковок",
  ],
};

