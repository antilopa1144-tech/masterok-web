import type { CalculatorDefinition } from "../types";
import { buildNativeScenarios } from "../scenario-native";

// Кирпичей на 1 м² стены с учётом шва 10 мм (по ГОСТ)
// [0.5 кирпича, 1 кирпич, 1.5 кирпича, 2 кирпича]
const BRICKS_PER_SQM: Record<number, [number, number, number, number]> = {
  0: [51, 102, 153, 204],  // одинарный 250×120×65
  1: [39, 78, 117, 156],   // полуторный 250×120×88
  2: [26, 52, 78, 104],    // двойной 250×120×138
};

// Расход раствора м³ на 1 м³ кладки
const MORTAR_PER_M3: Record<number, number> = {
  0: 0.221, // одинарный
  1: 0.195, // полуторный
  2: 0.166, // двойной
};

// Толщина стены в мм
const WALL_THICKNESS_MM: Record<number, number> = {
  0: 120, // в полкирпича
  1: 250, // в кирпич
  2: 380, // в 1.5 кирпича
  3: 510, // в 2 кирпича
};

const BRICK_HEIGHTS: Record<number, number> = {
  0: 65,  // одинарный
  1: 88,  // полуторный
  2: 138, // двойной
};

export const brickworkDef: CalculatorDefinition = {
  id: "brickwork",
  slug: "kladka-kirpicha",
  title: "Калькулятор кладки кирпича",
  h1: "Калькулятор кладки кирпича онлайн — расчёт кирпича и раствора",
  description: "Рассчитайте количество кирпича, раствора и кладочной сетки для стен. Нормы по ГОСТ 530-2012.",
  metaTitle: "Калькулятор кладки кирпича | Расчёт кирпича и раствора — Мастерок",
  metaDescription: "Бесплатный калькулятор кладки кирпича: рассчитайте количество рядового кирпича, раствора и кладочной сетки. Одинарный, полуторный, двойной. По ГОСТ 530-2012.",
  category: "walls",
  categorySlug: "steny",
  tags: ["кирпич", "кладка", "раствор", "кирпичная стена", "рядовой кирпич", "кладочная сетка"],
  popularity: 80,
  complexity: 2,
  fields: [
    {
      key: "inputMode",
      label: "Способ ввода",
      type: "radio",
      defaultValue: 0,
      options: [
        { value: 0, label: "По размерам стены" },
        { value: 1, label: "По площади" },
      ],
    },
    {
      key: "wallLength",
      label: "Длина стены (периметр)",
      type: "slider",
      unit: "м",
      min: 1,
      max: 100,
      step: 0.5,
      defaultValue: 10,
      group: "bySize",
    },
    {
      key: "wallHeight",
      label: "Высота стены",
      type: "slider",
      unit: "м",
      min: 1,
      max: 5,
      step: 0.1,
      defaultValue: 2.7,
      group: "bySize",
    },
    {
      key: "area",
      label: "Площадь стен",
      type: "slider",
      unit: "м²",
      min: 1,
      max: 500,
      step: 1,
      defaultValue: 27,
      group: "byArea",
    },
    {
      key: "openingsArea",
      label: "Площадь проёмов (окна, двери)",
      type: "slider",
      unit: "м²",
      min: 0,
      max: 50,
      step: 0.5,
      defaultValue: 5,
    },
    {
      key: "brickFormat",
      label: "Формат кирпича",
      type: "select",
      defaultValue: 0,
      options: [
        { value: 0, label: "Одинарный (250×120×65 мм)" },
        { value: 1, label: "Полуторный (250×120×88 мм)" },
        { value: 2, label: "Двойной (250×120×138 мм)" },
      ],
    },
    {
      key: "wallThickness",
      label: "Толщина стены",
      type: "select",
      defaultValue: 1,
      options: [
        { value: 0, label: "В полкирпича (120 мм) — перегородки" },
        { value: 1, label: "В кирпич (250 мм) — несущие стены" },
        { value: 2, label: "В 1.5 кирпича (380 мм) — наружные стены" },
        { value: 3, label: "В 2 кирпича (510 мм) — наружные стены" },
      ],
    },
    {
      key: "mortarJoint",
      label: "Толщина растворного шва",
      type: "slider",
      unit: "мм",
      min: 8,
      max: 15,
      step: 1,
      defaultValue: 10,
    },
  ],
  calculate(inputs) {
    const inputMode = Math.round(inputs.inputMode ?? 0);
    let wallArea: number;
    let wallLength: number;
    let wallHeight: number;

    if (inputMode === 0) {
      wallLength = Math.max(1, inputs.wallLength ?? 10);
      wallHeight = Math.max(1, inputs.wallHeight ?? 2.7);
      wallArea = wallLength * wallHeight;
    } else {
      wallArea = Math.max(1, inputs.area ?? 27);
      wallHeight = 2.7;
      wallLength = wallArea / wallHeight;
    }

    const openings = Math.max(0, inputs.openingsArea ?? 5);
    const netArea = Math.max(0.5, wallArea - openings);

    const brickFormat = Math.round(inputs.brickFormat ?? 0);
    const wallThicknessIdx = Math.round(inputs.wallThickness ?? 1);
    const mortarJoint = Math.max(8, Math.min(15, inputs.mortarJoint ?? 10));

    // Кирпичей на 1 м² (базовое значение при шве 10 мм)
    const baseBricks = (BRICKS_PER_SQM[brickFormat] ?? BRICKS_PER_SQM[0])[wallThicknessIdx] ?? 102;

    // Корректировка по толщине шва (если отличается от 10 мм)
    const jointCoeff = mortarJoint === 10 ? 1.0 : (10 / mortarJoint) * 0.97 + 0.03;
    const bricksPerSqm = baseBricks * jointCoeff;

    const totalBricks = netArea * bricksPerSqm;
    const bricksWithReserve = Math.ceil(totalBricks * 1.05); // +5% на бой

    // Раствор
    const wallThicknessMm = WALL_THICKNESS_MM[wallThicknessIdx] ?? 250;
    const wallVolume = netArea * (wallThicknessMm / 1000);
    const mortarCoeff = MORTAR_PER_M3[brickFormat] ?? 0.221;
    const mortarM3 = wallVolume * mortarCoeff;
    // 1 м³ раствора ≈ 1700 кг, мешки ЦПС 50 кг (1:3 пропорция)
    const mortarKg = mortarM3 * 1700;
    const mortarBags = Math.ceil(mortarKg / 50);

    // Кладочная сетка: каждые 5 рядов
    const brickH = BRICK_HEIGHTS[brickFormat] ?? 65;
    const rowHeight = (brickH + mortarJoint) / 1000; // м
    const totalRows = Math.ceil(wallHeight / rowHeight);
    const meshRows = Math.floor(totalRows / 5);
    const meshArea = wallLength * (wallThicknessMm / 1000) * meshRows;
    const meshCards = Math.ceil(meshArea / 0.5); // карты 0.5×2 м = 1 м²... берём м²

    // Перемычки ж/б для проёмов
    const openingsCount = Math.max(0, Math.round(openings / 2));
    const lintelsPerOpening = wallThicknessIdx >= 1 ? 2 : 1;

    // Кирпич на поддоне
    const bricksPerPallet: Record<number, number> = { 0: 480, 1: 352, 2: 176 };
    const pallets = Math.ceil(bricksWithReserve / (bricksPerPallet[brickFormat] ?? 480));

    const materials: Array<{
      name: string; quantity: number; unit: string;
      withReserve: number; purchaseQty: number; category: string;
    }> = [
      {
        name: `Кирпич рядовой ${brickFormat === 0 ? "одинарный" : brickFormat === 1 ? "полуторный" : "двойной"}`,
        quantity: totalBricks,
        unit: "шт",
        withReserve: bricksWithReserve,
        purchaseQty: bricksWithReserve,
        category: "Кирпич",
      },
      {
        name: `Поддоны кирпича (${bricksPerPallet[brickFormat] ?? 480} шт)`,
        quantity: pallets,
        unit: "шт",
        withReserve: pallets,
        purchaseQty: pallets,
        category: "Кирпич",
      },
      {
        name: "Кладочный раствор (ЦПС, мешки 50 кг)",
        quantity: mortarKg,
        unit: "мешков",
        withReserve: mortarBags,
        purchaseQty: mortarBags,
        category: "Раствор",
      },
    ];

    if (meshRows > 0) {
      materials.push({
        name: "Кладочная сетка 50×50×3 мм",
        quantity: meshArea,
        unit: "м²",
        withReserve: Math.ceil(meshArea * 1.1),
        purchaseQty: Math.ceil(meshArea * 1.1),
        category: "Армирование",
      });
    }

    if (openingsCount > 0) {
      materials.push({
        name: "Перемычка ж/б (брусковая, 2 м)",
        quantity: openingsCount * lintelsPerOpening,
        unit: "шт",
        withReserve: openingsCount * lintelsPerOpening,
        purchaseQty: openingsCount * lintelsPerOpening,
        category: "Перемычки",
      });
    }

    const warnings: string[] = [];
    if (wallThicknessIdx === 0) {
      warnings.push("Стена в полкирпича — только ненесущие перегородки. Для несущих стен минимум в кирпич (250 мм)");
    }
    if (wallThicknessIdx >= 2 && wallHeight > 3) {
      warnings.push("При высоте стен > 3 м и толщине 1.5+ кирпича рекомендуется армопояс по верхнему ряду");
    }
    if (brickFormat === 2 && wallThicknessIdx === 0) {
      warnings.push("Двойной кирпич в полкирпича — нестандартное решение. Проверьте расчёт на устойчивость");
    }

    const scenarios = buildNativeScenarios({
      id: "brickwork-main",
      title: "Brickwork main",
      exactNeed: totalBricks * 1.05,
      unit: "шт",
      packageSizes: [1],
      packageLabelPrefix: "brickwork-piece",
    });

    return {
      materials,
      totals: {
        wallArea,
        netArea,
        totalBricks: bricksWithReserve,
        wallVolume,
        mortarM3,
        pallets,
      } as Record<string, number>,
      warnings,
      scenarios,
    };
  },
  formulaDescription: `
**Расход кирпича на 1 м² стены (шов 10 мм, ГОСТ 530-2012):**

| Формат | 0.5 кирп. | 1 кирп. | 1.5 кирп. | 2 кирп. |
|--------|-----------|---------|-----------|---------|
| Одинарный | 51 | 102 | 153 | 204 |
| Полуторный | 39 | 78 | 117 | 156 |
| Двойной | 26 | 52 | 78 | 104 |

**Расход раствора:** 0.17–0.22 м³ на 1 м³ кладки (зависит от формата кирпича).
  `,
  howToUse: [
    "Введите размеры стен или общую площадь",
    "Укажите площадь проёмов (окна, двери)",
    "Выберите формат кирпича и толщину стены",
    "Нажмите «Рассчитать» — получите кирпич, раствор и сетку",
  ],
};
