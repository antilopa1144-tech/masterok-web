import { combineScenarioFactors, type FactorTable } from "./factors";
import { optimizePackaging } from "./packaging";
import { SCENARIOS, type ScenarioBundle } from "./scenarios";
import type {
  BrickworkCanonicalSpec,
  CanonicalCalculatorResult,
  CanonicalMaterialResult,
} from "./canonical";
import { roundDisplay } from "./units";
import { type AccuracyMode, DEFAULT_ACCURACY_MODE, applyAccuracyMode, getPrimaryMultiplier } from "./accuracy";
import { getInputDefault } from "./spec-helpers";

/* ─── constants ─── */

const BRICKS_PER_SQM: Record<number, Record<number, number>> = {
  0: { 0: 51, 1: 102, 2: 153, 3: 204 },
  1: { 0: 39, 1: 78, 2: 117, 3: 156 },
  2: { 0: 26, 1: 52, 2: 78, 3: 104 },
};

const MORTAR_PER_M3: Record<number, number> = { 0: 0.221, 1: 0.195, 2: 0.166 };

const WALL_THICKNESS_MM: Record<number, number> = { 0: 120, 1: 250, 2: 380, 3: 510 };

const BRICK_HEIGHTS: Record<number, number> = { 0: 65, 1: 88, 2: 138 };

const BRICKS_PER_PALLET: Record<number, number> = { 0: 480, 1: 352, 2: 176 };

const BLOCK_RESERVE = 1.05;
const MORTAR_DENSITY = 1700; // kg/m³
const MORTAR_BAG_KG = 50;

/* ─── labels ─── */

const BRICK_FORMAT_LABELS: Record<number, string> = {
  0: "Кирпич одинарный (65 мм)",
  1: "Кирпич полуторный (88 мм)",
  2: "Кирпич двойной (138 мм)",
};

/* ─── inputs ─── */

interface BrickworkInputs {
  inputMode?: number;
  wallLength?: number;
  wallHeight?: number;
  area?: number;
  openingsArea?: number;
  brickFormat?: number;
  wallThickness?: number;
  mortarJoint?: number;
  accuracyMode?: AccuracyMode;
}

/* ─── helpers ─── */

function resolveArea(
  spec: BrickworkCanonicalSpec,
  inputs: BrickworkInputs,
): { inputMode: number; wallArea: number; wallLength: number; wallHeight: number } {
  const inputMode = Math.round(inputs.inputMode ?? getInputDefault(spec, "inputMode", 0));
  if (inputMode === 0) {
    const wallLength = Math.max(1, Math.min(100, inputs.wallLength ?? getInputDefault(spec, "wallLength", 10)));
    const wallHeight = Math.max(1, Math.min(5, inputs.wallHeight ?? getInputDefault(spec, "wallHeight", 2.7)));
    return { inputMode: 0, wallArea: roundDisplay(wallLength * wallHeight, 3), wallLength, wallHeight };
  }
  const area = Math.max(1, Math.min(500, inputs.area ?? getInputDefault(spec, "area", 27)));
  const wallLength = inputs.wallLength ?? getInputDefault(spec, "wallLength", 10);
  const wallHeight = inputs.wallHeight ?? getInputDefault(spec, "wallHeight", 2.7);
  return { inputMode: 1, wallArea: roundDisplay(area, 3), wallLength, wallHeight };
}

/* ─── main ─── */

export function computeCanonicalBrickwork(
  spec: BrickworkCanonicalSpec,
  inputs: BrickworkInputs,
  factorTable: FactorTable,
): CanonicalCalculatorResult {
  const accuracyMode = inputs.accuracyMode ?? DEFAULT_ACCURACY_MODE;
  const accuracyMult = getPrimaryMultiplier("generic", accuracyMode);

  const areaInfo = resolveArea(spec, inputs);
  const openingsArea = Math.max(0, Math.min(50, inputs.openingsArea ?? getInputDefault(spec, "openingsArea", 5)));
  const brickFormat = Math.max(0, Math.min(2, Math.round(inputs.brickFormat ?? getInputDefault(spec, "brickFormat", 0))));
  const wallThicknessIdx = Math.max(0, Math.min(3, Math.round(inputs.wallThickness ?? getInputDefault(spec, "wallThickness", 1))));
  const mortarJoint = Math.max(8, Math.min(15, inputs.mortarJoint ?? getInputDefault(spec, "mortarJoint", 10)));

  /* ─── area ─── */
  const wallArea = areaInfo.wallArea;
  const netArea = Math.max(0, wallArea - openingsArea);

  /* ─── bricks ─── */
  const baseBricks = BRICKS_PER_SQM[brickFormat]?.[wallThicknessIdx] ?? 102;
  const jointCoeff = mortarJoint === 10 ? 1.0 : (10 / mortarJoint) * 0.97 + 0.03;
  const bricksPerSqm = baseBricks * jointCoeff;
  const totalBricks = netArea * bricksPerSqm;
  const bricksWithReserve = Math.ceil(totalBricks * BLOCK_RESERVE * accuracyMult);

  /* ─── mortar ─── */
  const wallThicknessMm = WALL_THICKNESS_MM[wallThicknessIdx] ?? 250;
  const wallVolume = roundDisplay(netArea * (wallThicknessMm / 1000), 6);
  const mortarCoeff = MORTAR_PER_M3[brickFormat] ?? 0.221;
  const mortarM3 = roundDisplay(wallVolume * mortarCoeff, 6);
  const mortarKg = roundDisplay(mortarM3 * MORTAR_DENSITY, 3);
  const mortarBags = Math.ceil(mortarKg / MORTAR_BAG_KG);

  /* ─── mesh ─── */
  const brickH = BRICK_HEIGHTS[brickFormat] ?? 65;
  const rowHeight = (brickH + mortarJoint) / 1000;
  const wallHeight = areaInfo.wallHeight;
  const totalRows = Math.ceil(wallHeight / rowHeight);
  const meshRows = Math.floor(totalRows / 5);
  const meshArea = roundDisplay(areaInfo.wallLength * (wallThicknessMm / 1000) * meshRows, 3);

  /* ─── lintels ─── */
  const openingsCount = Math.ceil(openingsArea / 2);
  const lintelsPerOpening = wallThicknessIdx >= 1 ? 2 : 1;
  const totalLintels = openingsCount * lintelsPerOpening;

  /* ─── pallets ─── */
  const pallets = Math.ceil(bricksWithReserve / (BRICKS_PER_PALLET[brickFormat] ?? 480));

  /* ─── scenarios ─── */
  const packageOptions = [{
    size: 1,
    label: `brickwork-piece`,
    unit: "шт",
  }];

  const scenarios = SCENARIOS.reduce((acc, scenario) => {
    const { multiplier, keyFactors } = combineScenarioFactors(factorTable, spec.field_factors.enabled, scenario);
    const exactNeed = roundDisplay(bricksWithReserve * multiplier, 6);
    const packaging = optimizePackaging(exactNeed, packageOptions);

    acc[scenario] = {
      exact_need: exactNeed,
      purchase_quantity: roundDisplay(packaging.purchaseQuantity, 6),
      leftover: roundDisplay(packaging.leftover, 6),
      assumptions: [
        `formula_version:${spec.formula_version}`,
        `brickFormat:${brickFormat}`,
        `wallThickness:${wallThicknessIdx}`,
        `mortarJoint:${mortarJoint}`,
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
      name: BRICK_FORMAT_LABELS[brickFormat] ?? "Кирпич",
      quantity: roundDisplay(totalBricks, 3),
      unit: "шт",
      withReserve: bricksWithReserve,
      purchaseQty: Math.ceil(recScenario.exact_need),
      category: "Основное",
    },
    {
      name: "Поддоны кирпича",
      quantity: pallets,
      unit: "шт",
      withReserve: pallets,
      purchaseQty: pallets,
      category: "Основное",
    },
    {
      name: `Раствор кладочный (${MORTAR_BAG_KG} кг)`,
      quantity: mortarBags,
      unit: "мешков",
      withReserve: mortarBags,
      purchaseQty: mortarBags,
      category: "Раствор",
    },
    {
      name: "Кладочная сетка",
      quantity: roundDisplay(meshArea, 3),
      unit: "м²",
      withReserve: Math.ceil(meshArea),
      purchaseQty: Math.ceil(meshArea),
      category: "Армирование",
    },
    {
      name: "Перемычки (ЖБ)",
      quantity: totalLintels,
      unit: "шт",
      withReserve: totalLintels,
      purchaseQty: totalLintels,
      category: "Проёмы",
    },
  ];

  /* ─── warnings ─── */
  const warnings: string[] = [];
  if (wallThicknessIdx === 0) {
    warnings.push("Толщина стены в 0.5 кирпича (120 мм) — только для ненесущих перегородок");
  }
  if (wallThicknessIdx >= 2 && wallHeight > 3) {
    warnings.push("При толщине стены 1.5+ кирпича и высоте более 3 м необходим армопояс");
  }
  if (brickFormat === 2 && wallThicknessIdx === 0) {
    warnings.push("Двойной кирпич в полкирпича (120 мм) — нестандартное решение, проверьте проект");
  }

  const practicalNotes: string[] = [];
  if (wallThicknessIdx >= 2 && wallHeight > 3) {
    practicalNotes.push(`Стена в ${wallThicknessIdx === 2 ? "1.5" : "2"} кирпича высотой ${roundDisplay(wallHeight, 1)} м — армопояс по верху обязателен`);
  }
  if (mortarBags > 50) {
    practicalNotes.push(`Раствора ${mortarBags} мешков — замешивайте порциями, не давайте схватываться в корыте`);
  }
  practicalNotes.push("Кладку начинайте с углов, проверяйте горизонт каждые 3-4 ряда");

  return {
    canonicalSpecId: spec.calculator_id,
    formulaVersion: spec.formula_version,
    materials,
    totals: {
      inputMode: areaInfo.inputMode,
      wallLength: roundDisplay(areaInfo.wallLength, 3),
      wallHeight: roundDisplay(wallHeight, 3),
      wallArea: roundDisplay(wallArea, 3),
      openingsArea: roundDisplay(openingsArea, 3),
      netArea: roundDisplay(netArea, 3),
      brickFormat,
      wallThicknessIdx,
      wallThicknessMm,
      mortarJoint,
      baseBricks,
      jointCoeff: roundDisplay(jointCoeff, 6),
      bricksPerSqm: roundDisplay(bricksPerSqm, 3),
      totalBricks: roundDisplay(totalBricks, 3),
      bricksWithReserve,
      wallVolume,
      mortarCoeff,
      mortarM3,
      mortarKg,
      mortarBags,
      brickH,
      rowHeight: roundDisplay(rowHeight, 4),
      totalRows,
      meshRows,
      meshArea,
      openingsCount,
      lintelsPerOpening,
      totalLintels,
      pallets,
      minExactNeedBricks: scenarios.MIN.exact_need,
      recExactNeedBricks: recScenario.exact_need,
      maxExactNeedBricks: scenarios.MAX.exact_need,
      minPurchaseBricks: scenarios.MIN.purchase_quantity,
      recPurchaseBricks: recScenario.purchase_quantity,
      maxPurchaseBricks: scenarios.MAX.purchase_quantity,
    },
    accuracyMode,
    accuracyExplanation: applyAccuracyMode(Math.ceil(totalBricks * BLOCK_RESERVE), "generic", accuracyMode).explanation,
    warnings,
    practicalNotes,
    scenarios,
  };
}
