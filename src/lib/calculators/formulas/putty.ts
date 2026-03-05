import type { CalculatorDefinition, CalculatorScenarios } from "../types";
import { computeEstimate, type EngineCalculatorConfig } from "../../../../engine/compute";
import type { ScenarioBundle } from "../../../../engine/scenarios";
import type { FieldFactorName } from "../../../../engine/factors";
import factorTables from "../../../../configs/factor-tables.json";
import puttyEngineConfig from "../../../../configs/calculators/putty-shpaklevka.json";

interface PuttyEngineSourceConfig {
  enabledFactors: FieldFactorName[];
  formulas: {
    finish: {
      consumption_kg_per_m2_mm: number;
      thickness_mm: number;
    };
    start: {
      consumption_kg_per_m2_mm: number;
      thickness_mm: number;
    };
  };
  packaging: {
    unit: string;
    defaultBagKg: number;
  };
}

const engineSource = puttyEngineConfig as PuttyEngineSourceConfig;

function resolveWorkArea(inputs: Record<string, number>): number {
  const inputMode = Math.round(inputs.inputMode ?? 0);

  if (inputMode === 0) {
    const l = Math.max(1, inputs.length ?? 5);
    const w = Math.max(1, inputs.width ?? 4);
    const h = Math.max(2, inputs.height ?? 2.7);
    const ceilArea = l * w;
    const wallsArea = 2 * (l + w) * h;
    const surfaceMode = Math.round(inputs.surface ?? 0);

    if (surfaceMode === 0) return wallsArea;
    if (surfaceMode === 1) return ceilArea;
    return wallsArea + ceilArea;
  }

  return Math.max(1, inputs.area ?? 50);
}

function toEngineConfig(
  id: string,
  title: string,
  consumptionKgPerM2Mm: number,
  bagWeightKg: number,
): EngineCalculatorConfig {
  return {
    id,
    title,
    baseFormula: "putty_area_thickness",
    baseParams: {
      consumption_kg_per_m2_mm: consumptionKgPerM2Mm,
    },
    enabledFactors: engineSource.enabledFactors,
    packaging: {
      unit: engineSource.packaging.unit,
      options: [{ size: bagWeightKg, label: `bag-${bagWeightKg}kg` }],
    },
  };
}

function mergeScenarios(
  scenarioList: ScenarioBundle[],
  bagWeightKg: number,
  bagUnit: string,
): CalculatorScenarios {
  const names: Array<"MIN" | "REC" | "MAX"> = ["MIN", "REC", "MAX"];

  return Object.fromEntries(
    names.map((name) => {
      const exactNeed = scenarioList.reduce((sum, scenario) => sum + scenario[name].exact_need, 0);
      const purchaseQuantity = scenarioList.reduce((sum, scenario) => sum + scenario[name].purchase_quantity, 0);
      const leftover = scenarioList.reduce((sum, scenario) => sum + scenario[name].leftover, 0);

      const assumptions = Array.from(
        new Set(scenarioList.flatMap((scenario) => scenario[name].assumptions)),
      );

      const baseFactors = scenarioList[0]?.[name].key_factors ?? {};

      return [
        name,
        {
          exact_need: exactNeed,
          purchase_quantity: purchaseQuantity,
          leftover,
          assumptions,
          key_factors: baseFactors,
          buy_plan: {
            package_label: `bag-${bagWeightKg}kg-total`,
            package_size: bagWeightKg,
            packages_count: Math.ceil(purchaseQuantity / bagWeightKg),
            unit: bagUnit,
          },
        },
      ];
    }),
  ) as CalculatorScenarios;
}

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
    const wallArea = resolveWorkArea(inputs);
    const puttyType = Math.max(0, Math.min(2, Math.round(inputs.puttyType ?? 0)));
    const bagWeight = Math.max(1, inputs.bagWeight ?? engineSource.packaging.defaultBagKg);

    const warnings: string[] = [];
    const materials: import("../types").MaterialResult[] = [];
    const scenarioParts: ScenarioBundle[] = [];

    if (puttyType === 0 || puttyType === 1) {
      const finishConfig = toEngineConfig(
        "putty-finish",
        "Putty finish",
        engineSource.formulas.finish.consumption_kg_per_m2_mm,
        bagWeight,
      );

      const finishScenario = computeEstimate(
        finishConfig,
        {
          area_m2: wallArea,
          thickness_mm: engineSource.formulas.finish.thickness_mm,
        },
        factorTables.factors,
      );

      scenarioParts.push(finishScenario);

      materials.push({
        name: `Шпаклёвка финишная (мешки ${bagWeight} кг)`,
        quantity: finishScenario.REC.exact_need / bagWeight,
        unit: "мешков",
        withReserve: finishScenario.REC.buy_plan.packages_count,
        purchaseQty: finishScenario.REC.buy_plan.packages_count,
        category: "Финишная",
      });
    }

    if (puttyType === 1 || puttyType === 2) {
      const startConfig = toEngineConfig(
        "putty-start",
        "Putty start",
        engineSource.formulas.start.consumption_kg_per_m2_mm,
        bagWeight,
      );

      const startScenario = computeEstimate(
        startConfig,
        {
          area_m2: wallArea,
          thickness_mm: engineSource.formulas.start.thickness_mm,
        },
        factorTables.factors,
      );

      scenarioParts.push(startScenario);

      materials.push({
        name: `Шпаклёвка стартовая (мешки ${bagWeight} кг)`,
        quantity: startScenario.REC.exact_need / bagWeight,
        unit: "мешков",
        withReserve: startScenario.REC.buy_plan.packages_count,
        purchaseQty: startScenario.REC.buy_plan.packages_count,
        category: "Стартовая",
      });
    }

    if (puttyType >= 1) {
      const serpyankaMeters = wallArea * 1.2 * 1.1;
      const serpyankaRolls = Math.ceil(serpyankaMeters / 45);
      materials.push({
        name: "Серпянка (лента армировочная 45 мм, рулон 45 м)",
        quantity: wallArea * 1.2,
        unit: "м.п.",
        withReserve: Math.ceil(serpyankaMeters),
        purchaseQty: serpyankaRolls,
        category: "Армирование",
      });
    }

    const coats = puttyType === 1 ? 2 : 1;
    const primerLiters = wallArea * 0.15 * coats;
    const primerCans = Math.ceil(primerLiters / 10);
    materials.push({
      name: "Грунтовка глубокого проникновения (10 л)",
      quantity: primerLiters / 10,
      unit: "канистр",
      withReserve: primerCans,
      purchaseQty: primerCans,
      category: "Подготовка",
    });

    if (puttyType === 0 || puttyType === 1) {
      const sandpaperSheets = Math.ceil(wallArea / 5);
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

    const scenarios = mergeScenarios(scenarioParts, bagWeight, engineSource.packaging.unit);

    return {
      materials,
      totals: {
        wallArea,
        puttyType,
        minExactNeedKg: scenarios.MIN.exact_need,
        recExactNeedKg: scenarios.REC.exact_need,
        maxExactNeedKg: scenarios.MAX.exact_need,
        minPurchaseKg: scenarios.MIN.purchase_quantity,
        recPurchaseKg: scenarios.REC.purchase_quantity,
        maxPurchaseKg: scenarios.MAX.purchase_quantity,
      },
      warnings,
      scenarios,
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

