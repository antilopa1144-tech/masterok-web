import { combineScenarioFactors, type FactorTable } from "./factors";
import { optimizePackaging } from "./packaging";
import { SCENARIOS, type ScenarioBundle } from "./scenarios";
import type {
  CanonicalCalculatorResult,
  CanonicalMaterialResult,
  RebarCanonicalSpec,
} from "./canonical";
import { roundDisplay } from "./units";
import { type AccuracyMode, DEFAULT_ACCURACY_MODE, applyAccuracyMode, getPrimaryMultiplier } from "./accuracy";
import { getInputDefault } from "./spec-helpers";

interface RebarInputs {
  structureType?: number;
  length?: number;
  width?: number;
  height?: number;
  mainDiameter?: number;
  gridStep?: number;
  accuracyMode?: AccuracyMode;
}

// GOST 5781-82 weight table (kg per linear meter)
const WEIGHT_PER_METER: Record<number, number> = {
  6: 0.222,
  8: 0.395,
  10: 0.617,
  12: 0.888,
  14: 1.21,
  16: 1.58,
};

const STANDARD_ROD_LENGTH = 11.7; // m
const WIRE_LENGTH_PER_INTERSECTION = 0.3; // m
const WIRE_KG_PER_M = 0.006; // Ø1.2mm binding wire
const REBAR_OVERLAP_FACTOR = 1.12; // 12% for 40-diameter overlaps

const ALLOWED_DIAMETERS = [6, 8, 10, 12, 14, 16];
const ALLOWED_GRID_STEPS = [100, 150, 200, 250, 300];

const STRUCTURE_TYPE_LABELS: Record<number, string> = {
  0: "Плита (двойная сетка)",
  1: "Ленточный фундамент",
  2: "Армопояс",
  3: "Плита перекрытия",
};

function clampToNearest(value: number, allowed: number[], fallback: number): number {
  if (allowed.includes(value)) return value;
  // Find the closest allowed value
  let closest = fallback;
  let minDist = Infinity;
  for (const v of allowed) {
    const dist = Math.abs(v - value);
    if (dist < minDist) {
      minDist = dist;
      closest = v;
    }
  }
  return closest;
}

interface RebarCalcResult {
  mainRebarLength: number;
  tieRebarLength: number;
  intersections: number;
  fixators: number;
  secondaryDiameter: number;
  barsAlongLength: number;
  barsAlongWidth: number;
  verticalTieCount: number;
  stirrupCount: number;
}

function computeSlabRebar(
  length: number,
  width: number,
  height: number,
  gridStepM: number,
  mainDiameter: number,
): RebarCalcResult {
  const barsAlongLength = Math.ceil(width / gridStepM) + 1;
  const barsAlongWidth = Math.ceil(length / gridStepM) + 1;
  const mainRebarLength = 2 * (barsAlongLength * length + barsAlongWidth * width) * 1.05;
  const verticalTieCount = Math.ceil(length / 0.6) * Math.ceil(width / 0.6);
  const verticalTieLength = (height + 0.2) * verticalTieCount;
  const secondaryDiameter = Math.max(6, mainDiameter - 4);
  const intersections = barsAlongLength * barsAlongWidth * 2 + verticalTieCount * 2;
  const fixators = Math.ceil(length * width * 5);

  return {
    mainRebarLength,
    tieRebarLength: verticalTieLength,
    intersections,
    fixators,
    secondaryDiameter: secondaryDiameter === mainDiameter - 4 ? secondaryDiameter : 6,
    barsAlongLength,
    barsAlongWidth,
    verticalTieCount,
    stirrupCount: 0,
  };
}

function computeStripFoundationRebar(
  length: number,
  width: number,
  height: number,
): RebarCalcResult {
  const perimeter = 2 * (length + width);
  const mainRebarLength = perimeter * 4 * REBAR_OVERLAP_FACTOR;
  const stirrupCount = Math.ceil(perimeter / 0.4);
  const sectionPerimeter = 2 * (0.3 + height - 0.1);
  const tieRebarLength = stirrupCount * Math.max(0.8, sectionPerimeter);
  const stirrupDiameter = 8;
  const intersections = stirrupCount * 4;

  return {
    mainRebarLength,
    tieRebarLength,
    intersections,
    fixators: 0,
    secondaryDiameter: stirrupDiameter,
    barsAlongLength: 0,
    barsAlongWidth: 0,
    verticalTieCount: 0,
    stirrupCount,
  };
}

function computeArmorBeltRebar(
  length: number,
  width: number,
): RebarCalcResult {
  const perimeter = 2 * (length + width);
  const mainRebarLength = perimeter * 4 * REBAR_OVERLAP_FACTOR;
  const beltHeight = 0.25;
  const beltWidth = 0.30;
  const stirrupCount = Math.ceil(perimeter / 0.4);
  const tieRebarLength = stirrupCount * 2 * (beltWidth + beltHeight - 0.1);
  const stirrupDiameter = 6;

  return {
    mainRebarLength,
    tieRebarLength,
    intersections: stirrupCount * 4,
    fixators: 0,
    secondaryDiameter: stirrupDiameter,
    barsAlongLength: 0,
    barsAlongWidth: 0,
    verticalTieCount: 0,
    stirrupCount,
  };
}

function computeFloorSlabRebar(
  length: number,
  width: number,
  gridStepM: number,
): RebarCalcResult {
  const barsAlongLength = Math.ceil(width / gridStepM) + 1;
  const barsAlongWidth = Math.ceil(length / gridStepM) + 1;
  const mainRebarLength = (barsAlongLength * length + barsAlongWidth * width) * 1.05;
  const secondaryStep = gridStepM * 2;
  const secBarsL = Math.ceil(width / secondaryStep) + 1;
  const secBarsW = Math.ceil(length / secondaryStep) + 1;
  const secondaryLength = (secBarsL * length + secBarsW * width) * 1.05;
  const intersections = barsAlongLength * barsAlongWidth;

  return {
    mainRebarLength,
    tieRebarLength: secondaryLength,
    intersections,
    fixators: 0,
    secondaryDiameter: 6,
    barsAlongLength,
    barsAlongWidth,
    verticalTieCount: 0,
    stirrupCount: 0,
  };
}

function buildMaterials(
  mainDiameter: number,
  secondaryDiameter: number,
  mainRebarLength: number,
  mainRebarKg: number,
  mainRods: number,
  tieRebarLength: number,
  tieRebarKg: number,
  wireKg: number,
  fixators: number,
  structureType: number,
): CanonicalMaterialResult[] {
  const secondaryLabel = structureType <= 1
    ? `Арматура для хомутов Ø${secondaryDiameter} А500С`
    : structureType === 2
      ? `Арматура для хомутов Ø${secondaryDiameter} А500С`
      : `Арматура вторичная Ø${secondaryDiameter} А240`;

  const materials: CanonicalMaterialResult[] = [
    {
      name: `Арматура основная Ø${mainDiameter} А500С`,
      quantity: roundDisplay(mainRebarLength, 1),
      unit: "м.п.",
      withReserve: roundDisplay(mainRods * STANDARD_ROD_LENGTH, 1),
      purchaseQty: roundDisplay(mainRods * STANDARD_ROD_LENGTH, 1),
      packageInfo: { count: mainRods, size: STANDARD_ROD_LENGTH, packageUnit: "прутков" },
      category: "Арматура",
    },
    {
      name: secondaryLabel,
      quantity: roundDisplay(tieRebarLength, 1),
      unit: "м.п.",
      withReserve: roundDisplay(Math.ceil(tieRebarLength / STANDARD_ROD_LENGTH) * STANDARD_ROD_LENGTH, 1),
      purchaseQty: roundDisplay(Math.ceil(tieRebarLength / STANDARD_ROD_LENGTH) * STANDARD_ROD_LENGTH, 1),
      packageInfo: { count: Math.ceil(tieRebarLength / STANDARD_ROD_LENGTH), size: STANDARD_ROD_LENGTH, packageUnit: "прутков" },
      category: "Арматура",
    },
    {
      name: "Проволока вязальная Ø1.2",
      quantity: roundDisplay(wireKg, 2),
      unit: "кг",
      withReserve: roundDisplay(wireKg, 2),
      purchaseQty: Math.ceil(wireKg),
      category: "Расходные материалы",
    },
  ];

  if (fixators > 0) {
    materials.push({
      name: "Фиксаторы пластиковые",
      quantity: fixators,
      unit: "шт",
      withReserve: fixators,
      purchaseQty: fixators,
      category: "Расходные материалы",
    });
  }

  return materials;
}

export function computeCanonicalRebar(
  spec: RebarCanonicalSpec,
  inputs: RebarInputs,
  factorTable: FactorTable,
): CanonicalCalculatorResult {
  const accuracyMode = inputs.accuracyMode ?? DEFAULT_ACCURACY_MODE;
  const accuracyMult = getPrimaryMultiplier("generic", accuracyMode);

  const structureType = Math.max(0, Math.min(3, Math.round(inputs.structureType ?? getInputDefault(spec, "structureType", 0))));
  const length = Math.max(1, Math.min(50, inputs.length ?? getInputDefault(spec, "length", 10)));
  const width = Math.max(1, Math.min(50, inputs.width ?? getInputDefault(spec, "width", 8)));
  const height = Math.max(0.1, Math.min(1.5, inputs.height ?? getInputDefault(spec, "height", 0.3)));
  const mainDiameter = clampToNearest(
    Math.round(inputs.mainDiameter ?? getInputDefault(spec, "mainDiameter", 12)),
    ALLOWED_DIAMETERS,
    12,
  );
  const gridStep = clampToNearest(
    Math.round(inputs.gridStep ?? getInputDefault(spec, "gridStep", 200)),
    ALLOWED_GRID_STEPS,
    200,
  );

  const gridStepM = gridStep / 1000;

  let calc: RebarCalcResult;

  switch (structureType) {
    case 0:
      calc = computeSlabRebar(length, width, height, gridStepM, mainDiameter);
      break;
    case 1:
      calc = computeStripFoundationRebar(length, width, height);
      break;
    case 2:
      calc = computeArmorBeltRebar(length, width);
      break;
    case 3:
      calc = computeFloorSlabRebar(length, width, gridStepM);
      break;
    default:
      calc = computeSlabRebar(length, width, height, gridStepM, mainDiameter);
  }

  const wireLength = calc.intersections * WIRE_LENGTH_PER_INTERSECTION;
  const wireKg = wireLength * WIRE_KG_PER_M;
  const mainKgPerMeter = WEIGHT_PER_METER[mainDiameter] ?? WEIGHT_PER_METER[12];
  const mainRebarKgRaw = calc.mainRebarLength * mainKgPerMeter;
  const mainRebarLengthAdjusted = roundDisplay(calc.mainRebarLength * accuracyMult, 6);
  const mainRebarKg = roundDisplay(mainRebarLengthAdjusted * mainKgPerMeter, 6);
  const mainRods = Math.ceil(mainRebarLengthAdjusted / STANDARD_ROD_LENGTH);
  const tieRebarKg = calc.tieRebarLength * (WEIGHT_PER_METER[calc.secondaryDiameter] ?? WEIGHT_PER_METER[6]);

  // Package options for main rebar (standard 11.7 m rods). Scenarios stay in linear meters,
  // while buy_plan exposes the number of rods to purchase.
  const packageOptions = [{
    size: STANDARD_ROD_LENGTH,
    label: `rebar-rod-${STANDARD_ROD_LENGTH}m`,
    unit: "м.п.",
  }];

  const scenarios = SCENARIOS.reduce((acc, scenario) => {
    const { multiplier, keyFactors } = combineScenarioFactors(factorTable, spec.field_factors.enabled, scenario);
    const exactNeed = roundDisplay(mainRebarLengthAdjusted * multiplier, 6);
    const packaging = optimizePackaging(exactNeed, packageOptions);

    acc[scenario] = {
      exact_need: exactNeed,
      purchase_quantity: roundDisplay(packaging.purchaseQuantity, 6),
      leftover: roundDisplay(packaging.leftover, 6),
      assumptions: [
        `formula_version:${spec.formula_version}`,
        `structureType:${structureType}`,
        `mainDiameter:${mainDiameter}`,
        `gridStep:${gridStep}`,
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

  const warnings: string[] = [];
  if (structureType === 0 && height < 0.15) {
    warnings.push("Толщина плиты менее 150 мм — слишком тонкая для двойной сетки армирования");
  }
  if (mainDiameter < 10 && structureType <= 1) {
    warnings.push("Для фундаментов рекомендуется арматура диаметром не менее 10 мм");
  }
  if (gridStep > 250) {
    warnings.push("Шаг сетки более 250 мм снижает несущую способность конструкции");
  }

  const recScenario = scenarios.REC;


  const practicalNotes: string[] = [];
  practicalNotes.push("Арматуру вяжите проволокой, не сваривайте — сварка ослабляет прутки");

  return {
    canonicalSpecId: spec.calculator_id,
    formulaVersion: spec.formula_version,
    materials: buildMaterials(
      mainDiameter,
      calc.secondaryDiameter,
      mainRebarLengthAdjusted,
      mainRebarKg,
      mainRods,
      calc.tieRebarLength,
      tieRebarKg,
      wireKg,
      calc.fixators,
      structureType,
    ),
    totals: {
      structureType,
      length: roundDisplay(length, 3),
      width: roundDisplay(width, 3),
      height: roundDisplay(height, 3),
      mainDiameter,
      gridStep,
      gridStepM: roundDisplay(gridStepM, 4),
      mainRebarLength: roundDisplay(mainRebarLengthAdjusted, 1),
      mainRebarKg: roundDisplay(mainRebarKg, 1),
      mainRods,
      tieRebarLength: roundDisplay(calc.tieRebarLength, 1),
      tieRebarKg: roundDisplay(tieRebarKg, 1),
      secondaryDiameter: calc.secondaryDiameter,
      intersections: calc.intersections,
      wireLength: roundDisplay(wireLength, 1),
      wireKg: roundDisplay(wireKg, 2),
      fixators: calc.fixators,
      barsAlongLength: calc.barsAlongLength,
      barsAlongWidth: calc.barsAlongWidth,
      verticalTieCount: calc.verticalTieCount,
      stirrupCount: calc.stirrupCount,
      minExactNeedM: scenarios.MIN.exact_need,
      recExactNeedM: recScenario.exact_need,
      maxExactNeedM: scenarios.MAX.exact_need,
      minPurchaseM: scenarios.MIN.purchase_quantity,
      recPurchaseM: recScenario.purchase_quantity,
      maxPurchaseM: scenarios.MAX.purchase_quantity,
      minPurchaseRods: scenarios.MIN.buy_plan.packages_count,
      recPurchaseRods: recScenario.buy_plan.packages_count,
      maxPurchaseRods: scenarios.MAX.buy_plan.packages_count,
      minExactNeedKg: roundDisplay(scenarios.MIN.exact_need * mainKgPerMeter, 3),
      recExactNeedKg: roundDisplay(recScenario.exact_need * mainKgPerMeter, 3),
      maxExactNeedKg: roundDisplay(scenarios.MAX.exact_need * mainKgPerMeter, 3),
    },
    warnings,
    practicalNotes,
    scenarios,
    accuracyMode,
    accuracyExplanation: applyAccuracyMode(mainRebarKgRaw, "generic", accuracyMode).explanation,
  };
}
