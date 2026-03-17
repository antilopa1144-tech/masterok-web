import { combineScenarioFactors, type FactorTable } from "./factors";
import { optimizePackaging } from "./packaging";
import { SCENARIOS, type ScenarioBundle } from "./scenarios";
import type {
  TerraceCanonicalSpec,
  CanonicalCalculatorResult,
  CanonicalMaterialResult,
} from "./canonical";
import { roundDisplay } from "./units";

/* ─── constants ─── */

const BOARD_WIDTHS: Record<number, number> = { 0: 150, 1: 120, 2: 90, 3: 120 };
const BOARD_GAPS: Record<number, number> = { 0: 5, 1: 5, 2: 5, 3: 0 };
const LAG_LENGTH = 3;
const TREATMENT_L_PER_M2 = 0.15;
const TREATMENT_LAYERS: Record<number, number> = { 0: 0, 1: 2, 2: 2 };
const GEOTEXTILE_ROLL = 50;
const BOARD_RESERVE = 1.1;
const LAG_RESERVE = 1.05;
const SCREWS_PER_KG = 600;  // 3.5×35 мм (террасные)

/* ─── labels ─── */

const BOARD_TYPE_LABELS: Record<number, string> = {
  0: "ДПК 150 мм",
  1: "Лиственница 120 мм",
  2: "Сосна 90 мм",
  3: "Планкен 120 мм",
};

const TREATMENT_LABELS: Record<number, string> = {
  0: "Без обработки",
  1: "Масло",
  2: "Антисептик",
};

/* ─── inputs ─── */

interface TerraceInputs {
  length?: number;
  width?: number;
  boardType?: number;
  boardLength?: number;
  lagStep?: number;
  withTreatment?: number;
}

/* ─── helpers ─── */

function getInputDefault(spec: TerraceCanonicalSpec, key: string, fallback: number): number {
  return spec.input_schema.find((field) => field.key === key)?.default_value ?? fallback;
}

/* ─── main ─── */

export function computeCanonicalTerrace(
  spec: TerraceCanonicalSpec,
  inputs: TerraceInputs,
  factorTable: FactorTable,
): CanonicalCalculatorResult {
  const length = Math.max(1, Math.min(30, inputs.length ?? getInputDefault(spec, "length", 5)));
  const width = Math.max(1, Math.min(15, inputs.width ?? getInputDefault(spec, "width", 3)));
  const boardType = Math.max(0, Math.min(3, Math.round(inputs.boardType ?? getInputDefault(spec, "boardType", 0))));
  const boardLength = Math.max(2000, Math.min(6000, inputs.boardLength ?? getInputDefault(spec, "boardLength", 3000)));
  const lagStep = Math.max(300, Math.min(600, inputs.lagStep ?? getInputDefault(spec, "lagStep", 400)));
  const withTreatment = Math.max(0, Math.min(2, Math.round(inputs.withTreatment ?? getInputDefault(spec, "withTreatment", 0))));

  /* ─── geometry ─── */
  const area = length * width;
  const boardWidth = BOARD_WIDTHS[boardType] ?? 150;
  const gap = BOARD_GAPS[boardType] ?? 5;
  const boardPitch = (boardWidth + gap) / 1000;
  const rowCount = Math.ceil(width / boardPitch);
  const boardsPerRow = Math.ceil(length / (boardLength / 1000));
  const totalBoards = Math.ceil(rowCount * boardsPerRow * BOARD_RESERVE);

  /* ─── lags ─── */
  const lagRowCount = Math.ceil(length / (lagStep / 1000)) + 1;
  const lagTotalLen = lagRowCount * width * LAG_RESERVE;
  const lagPcs = Math.ceil(lagTotalLen / LAG_LENGTH);

  /* ─── fasteners ─── */
  const klaymerCount = lagRowCount * rowCount;
  const screwPcs = Math.ceil(lagRowCount * rowCount * (boardType === 3 ? 2 : 1.2));
  const screwKg = Math.ceil(screwPcs / SCREWS_PER_KG * 10) / 10;

  /* ─── treatment ─── */
  const treatmentLayers = TREATMENT_LAYERS[withTreatment] ?? 0;
  const treatmentL = roundDisplay(area * treatmentLayers * TREATMENT_L_PER_M2 * 1.1, 2);

  /* ─── geotextile ─── */
  const geotextileRolls = Math.ceil(area * 1.05 / GEOTEXTILE_ROLL);

  /* ─── scenarios ─── */
  const basePrimary = totalBoards;
  const packageOptions = [{
    size: 1,
    label: "terrace-board",
    unit: "шт",
  }];

  const scenarios = SCENARIOS.reduce((acc, scenario) => {
    const { multiplier, keyFactors } = combineScenarioFactors(factorTable, spec.field_factors.enabled, scenario);
    const exactNeed = roundDisplay(basePrimary * multiplier, 6);
    const packaging = optimizePackaging(exactNeed, packageOptions);

    acc[scenario] = {
      exact_need: exactNeed,
      purchase_quantity: roundDisplay(packaging.purchaseQuantity, 6),
      leftover: roundDisplay(packaging.leftover, 6),
      assumptions: [
        `formula_version:${spec.formula_version}`,
        `boardType:${boardType}`,
        `lagStep:${lagStep}`,
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

  /* ─── materials ─── */
  const materials: CanonicalMaterialResult[] = [
    {
      name: `${BOARD_TYPE_LABELS[boardType]} (${boardLength} мм)`,
      quantity: roundDisplay(recScenario.exact_need, 6),
      unit: "шт",
      withReserve: Math.ceil(recScenario.exact_need),
      purchaseQty: Math.ceil(recScenario.exact_need),
      category: "Доска",
    },
    {
      name: `Лаги 50×50 мм (${LAG_LENGTH} м)`,
      quantity: lagPcs,
      unit: "шт",
      withReserve: lagPcs,
      purchaseQty: lagPcs,
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
    {
      name: "Саморезы",
      quantity: screwKg,
      unit: "кг",
      withReserve: screwKg,
      purchaseQty: Math.ceil(screwKg),
      category: "Крепёж",
    },
    {
      name: `Геотекстиль (${GEOTEXTILE_ROLL} м²)`,
      quantity: geotextileRolls,
      unit: "рулонов",
      withReserve: geotextileRolls,
      purchaseQty: geotextileRolls,
      category: "Подготовка",
    },
  ];

  if (treatmentLayers > 0) {
    materials.push({
      name: `${TREATMENT_LABELS[withTreatment]} для дерева`,
      quantity: treatmentL,
      unit: "л",
      withReserve: treatmentL,
      purchaseQty: Math.ceil(treatmentL),
      category: "Защита",
    });
  }

  /* ─── warnings ─── */
  const warnings: string[] = [];
  if (boardType !== 0 && withTreatment === 0) {
    warnings.push("Деревянная доска без обработки подвержена гниению — рекомендуется масло или антисептик");
  }
  if (area > 50) {
    warnings.push("Для террас большой площади рекомендуется профессиональный монтаж");
  }


  const practicalNotes: string[] = [];
  practicalNotes.push("Лаги террасы не должны лежать на земле — поднимите на столбики или регулируемые опоры");

  return {
    canonicalSpecId: spec.calculator_id,
    formulaVersion: spec.formula_version,
    materials,
    totals: {
      length: roundDisplay(length, 3),
      width: roundDisplay(width, 3),
      area: roundDisplay(area, 3),
      boardType,
      boardLength,
      lagStep,
      withTreatment,
      boardWidth,
      gap,
      boardPitch: roundDisplay(boardPitch, 4),
      rowCount,
      boardsPerRow,
      totalBoards,
      lagRowCount,
      lagTotalLen: roundDisplay(lagTotalLen, 3),
      lagPcs,
      klaymerCount,
      screwCount: screwKg,
      treatmentL,
      geotextileRolls,
      minExactNeed: scenarios.MIN.exact_need,
      recExactNeed: recScenario.exact_need,
      maxExactNeed: scenarios.MAX.exact_need,
      minPurchase: scenarios.MIN.purchase_quantity,
      recPurchase: recScenario.purchase_quantity,
      maxPurchase: scenarios.MAX.purchase_quantity,
    },
    warnings,
    practicalNotes,
    scenarios,
  };
}
