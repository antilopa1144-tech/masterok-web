import { combineScenarioFactors, type FactorTable } from "./factors";
import { optimizePackaging } from "./packaging";
import { SCENARIOS, type ScenarioBundle } from "./scenarios";
import type {
  CanonicalCalculatorResult,
  CanonicalMaterialResult,
  BalconyCanonicalSpec,
} from "./canonical";
import { roundDisplay } from "./units";
import { type AccuracyMode, DEFAULT_ACCURACY_MODE, applyAccuracyMode, getPrimaryMultiplier } from "./accuracy";
import { getInputDefault } from "./spec-helpers";

interface BalconyInputs {
  length?: number;
  width?: number;
  height?: number;
  finishType?: number;
  insulationType?: number;
  accuracyMode?: AccuracyMode;
}

const FINISH_LABELS: Record<number, string> = {
  0: "Вагонка",
  1: "ПВХ-панели",
  2: "Имитация бруса",
  3: "МДФ-панели",
};

const INSULATION_LABELS: Record<number, string> = {
  0: "Без утепления",
  1: "ПСБ (пенопласт)",
  2: "Пенофол",
  3: "ПСБ + пенофол",
};

function buildMaterials(
  spec: BalconyCanonicalSpec,
  panelCount: number,
  insPlates: number,
  battenRows: number,
  klaymerCount: number,
  finishType: number,
  insulationType: number,
  totalFinishArea: number,
  floorArea: number,
): CanonicalMaterialResult[] {
  const finishLabel = FINISH_LABELS[finishType] ?? "Вагонка";
  const materials: CanonicalMaterialResult[] = [
    {
      name: finishLabel,
      quantity: panelCount,
      unit: "шт",
      withReserve: panelCount,
      purchaseQty: panelCount,
      category: "Основное",
    },
    {
      name: "Обрешётка (брусок 20×40)",
      quantity: battenRows,
      unit: "шт",
      withReserve: battenRows,
      purchaseQty: battenRows,
      category: "Каркас",
    },
    {
      name: "Кляймеры",
      quantity: klaymerCount,
      unit: "шт",
      withReserve: klaymerCount,
      purchaseQty: klaymerCount,
      category: "Крепёж",
    },
  ];

  if (insulationType > 0) {
    const insulationLabel = INSULATION_LABELS[insulationType] ?? "Утеплитель";
    materials.push({
      name: insulationLabel,
      quantity: insPlates,
      unit: "шт",
      withReserve: insPlates,
      purchaseQty: insPlates,
      category: "Утепление",
    });
  }

  return materials;
}

export function computeCanonicalBalcony(
  spec: BalconyCanonicalSpec,
  inputs: BalconyInputs,
  factorTable: FactorTable,
): CanonicalCalculatorResult {
  const accuracyMode = inputs.accuracyMode ?? DEFAULT_ACCURACY_MODE;
  const accuracyMult = getPrimaryMultiplier("generic", accuracyMode);

  const length = Math.max(1, Math.min(10, inputs.length ?? getInputDefault(spec, "length", 3)));
  const width = Math.max(0.6, Math.min(3, inputs.width ?? getInputDefault(spec, "width", 1.2)));
  const height = Math.max(2, Math.min(3, inputs.height ?? getInputDefault(spec, "height", 2.5)));
  const finishType = Math.max(0, Math.min(3, Math.round(inputs.finishType ?? getInputDefault(spec, "finishType", 0))));
  const insulationType = Math.max(0, Math.min(3, Math.round(inputs.insulationType ?? getInputDefault(spec, "insulationType", 0))));

  const panelArea = spec.material_rules.panel_areas[String(finishType)] ?? 0.288;
  const floorArea = roundDisplay(length * width, 6);
  const wallArea = roundDisplay((2 * width + 2 * length) * height, 6);
  const ceilingArea = roundDisplay(length * width, 6);
  const totalFinishArea = roundDisplay(wallArea + ceilingArea, 6);

  const insPlates = insulationType > 0
    ? Math.ceil(totalFinishArea * spec.material_rules.insulation_reserve / spec.material_rules.insulation_plate)
    : 0;
  const panelCount = Math.ceil(totalFinishArea * spec.material_rules.finish_reserve / panelArea);
  const battenRows = Math.ceil(totalFinishArea / spec.material_rules.batten_pitch);
  const klaymerCount = Math.ceil(panelCount * spec.material_rules.klaymer_per_panel * spec.material_rules.klaymer_reserve);

  const baseExactNeedRaw = panelCount;
  const baseExactNeed = Math.ceil(baseExactNeedRaw * accuracyMult);

  const packageOptions = [{
    size: spec.packaging_rules.package_size,
    label: `balcony-panel-${spec.packaging_rules.package_size}`,
    unit: spec.packaging_rules.unit,
  }];

  const scenarios = SCENARIOS.reduce((acc, scenario) => {
    const { multiplier, keyFactors } = combineScenarioFactors(factorTable, spec.field_factors.enabled, scenario);
    const exactNeed = roundDisplay(baseExactNeed * multiplier, 6);
    const packaging = optimizePackaging(exactNeed, packageOptions);

    acc[scenario] = {
      exact_need: exactNeed,
      purchase_quantity: roundDisplay(packaging.purchaseQuantity, 6),
      leftover: roundDisplay(packaging.leftover, 6),
      assumptions: [
        `formula_version:${spec.formula_version}`,
        `finish:${finishType}`,
        `insulation:${insulationType}`,
        `packaging:${packaging.package.label}`,
      ],
      key_factors: {
        ...keyFactors,
        field_multiplier: roundDisplay(multiplier, 6),
      },
      buy_plan: {
        package_label: packaging.package.label,
        package_size: packaging.package.size,
        packages_count: packaging.packageCount,
        unit: packaging.package.unit,
      },
    };

    return acc;
  }, {} as ScenarioBundle);

  const recScenario = scenarios.REC;

  const warnings: string[] = [];
  if (floorArea > spec.warnings_rules.large_balcony_area_threshold_m2) {
    warnings.push("Большая площадь балкона — рекомендуется профессиональный расчёт нагрузки на плиту");
  }
  if (insulationType === spec.warnings_rules.uninsulated_warning_threshold) {
    warnings.push("Без утепления — на балконе будет значительный перепад температур");
  }


  const practicalNotes: string[] = [];
  practicalNotes.push("Утепление балкона без замены остекления на тёплое — деньги на ветер");

  return {
    canonicalSpecId: spec.calculator_id,
    formulaVersion: spec.formula_version,
    materials: buildMaterials(
      spec,
      panelCount,
      insPlates,
      battenRows,
      klaymerCount,
      finishType,
      insulationType,
      totalFinishArea,
      floorArea,
    ),
    totals: {
      length: roundDisplay(length, 3),
      width: roundDisplay(width, 3),
      height: roundDisplay(height, 3),
      finishType: finishType,
      insulationType: insulationType,
      floorArea: roundDisplay(floorArea, 3),
      wallArea: roundDisplay(wallArea, 3),
      ceilingArea: roundDisplay(ceilingArea, 3),
      totalFinishArea: roundDisplay(totalFinishArea, 3),
      panelArea: roundDisplay(panelArea, 6),
      panelCount: panelCount,
      insPlates: insPlates,
      battenRows: battenRows,
      klaymerCount: klaymerCount,
      minExactNeedPanels: scenarios.MIN.exact_need,
      recExactNeedPanels: recScenario.exact_need,
      maxExactNeedPanels: scenarios.MAX.exact_need,
      minPurchasePanels: scenarios.MIN.purchase_quantity,
      recPurchasePanels: recScenario.purchase_quantity,
      maxPurchasePanels: scenarios.MAX.purchase_quantity,
    },
    warnings,
    practicalNotes,
    scenarios,
    accuracyMode,
    accuracyExplanation: applyAccuracyMode(baseExactNeedRaw, "generic", accuracyMode).explanation,
  };
}
