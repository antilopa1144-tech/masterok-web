import { combineScenarioFactors, type FactorTable } from "./factors";
import { optimizePackaging } from "./packaging";
import { SCENARIOS, type ScenarioBundle } from "./scenarios";
import type {
  BrickCanonicalSpec,
  CanonicalCalculatorResult,
  CanonicalMaterialResult,
} from "./canonical";
import { roundDisplay } from "./units";
import { type AccuracyMode, DEFAULT_ACCURACY_MODE, applyAccuracyMode, getPrimaryMultiplier } from "./accuracy";
import { getInputDefault } from "./spec-helpers";
import { evaluateCompanionMaterials } from "./companion-materials";

interface BrickInputs {
  inputMode?: number;
  wallWidth?: number;
  wallHeight?: number;
  area?: number;
  brickType?: number;
  wallThickness?: number;
  workingConditions?: number;
  wasteMode?: number;
  mortarAdditive?: number;
  accuracyMode?: AccuracyMode;
}

function resolveArea(
  spec: BrickCanonicalSpec,
  inputs: BrickInputs,
): { inputMode: number; area: number; wallWidth: number; wallHeight: number } {
  const inputMode = Math.round(inputs.inputMode ?? getInputDefault(spec, "inputMode", 0));
  if (inputMode === 0) {
    const wallWidth = Math.max(0.5, inputs.wallWidth ?? getInputDefault(spec, "wallWidth", 5));
    const wallHeight = Math.max(0.5, inputs.wallHeight ?? getInputDefault(spec, "wallHeight", 3));
    return { inputMode: 0, area: roundDisplay(wallWidth * wallHeight, 3), wallWidth, wallHeight };
  }
  const area = Math.max(1, inputs.area ?? getInputDefault(spec, "area", 15));
  const wallHeight = inputs.wallHeight ?? getInputDefault(spec, "wallHeight", 3);
  // Estimate wallWidth from area/height when not explicitly provided
  const wallWidth = inputs.wallWidth ?? (wallHeight > 0 ? area / wallHeight : getInputDefault(spec, "wallWidth", 5));
  return { inputMode: 1, area: roundDisplay(area, 3), wallWidth, wallHeight };
}

function resolveBrickType(spec: BrickCanonicalSpec, inputs: BrickInputs): number {
  return Math.max(0, Math.min(2, Math.round(inputs.brickType ?? getInputDefault(spec, "brickType", 0))));
}

function resolveWallThickness(spec: BrickCanonicalSpec, inputs: BrickInputs): number {
  return Math.max(0, Math.min(3, Math.round(inputs.wallThickness ?? getInputDefault(spec, "wallThickness", 1))));
}

function resolveWorkingConditions(spec: BrickCanonicalSpec, inputs: BrickInputs): number {
  return Math.max(1, Math.min(4, Math.round(inputs.workingConditions ?? getInputDefault(spec, "workingConditions", 1))));
}

function resolveWasteMode(spec: BrickCanonicalSpec, inputs: BrickInputs): number {
  return Math.max(0, Math.min(2, Math.round(inputs.wasteMode ?? getInputDefault(spec, "wasteMode", 0))));
}

const BRICK_TYPE_LABELS: Record<number, string> = {
  0: "Кирпич одинарный (65 мм)",
  1: "Кирпич полуторный (88 мм)",
  2: "Кирпич двойной (138 мм)",
};

function buildMaterials(
  spec: BrickCanonicalSpec,
  brickType: number,
  wallThickness: number,
  bricksNeeded: number,
  cementBags: number,
  sandM3: number,
  meshArea: number,
  flexibleTies: number,
): CanonicalMaterialResult[] {
  const materials: CanonicalMaterialResult[] = [
    {
      name: BRICK_TYPE_LABELS[brickType] ?? "Кирпич",
      quantity: roundDisplay(bricksNeeded, 6),
      unit: "шт",
      withReserve: Math.ceil(bricksNeeded),
      purchaseQty: Math.ceil(bricksNeeded),
      category: "Основное",
    },
    {
      name: `Цемент М400 (${spec.material_rules.cement_bag_kg} кг)`,
      quantity: cementBags,
      unit: "мешков",
      withReserve: cementBags,
      purchaseQty: cementBags,
      category: "Раствор",
    },
    {
      name: "Песок строительный",
      quantity: roundDisplay(sandM3, 3),
      unit: "м³",
      withReserve: roundDisplay(Math.ceil(sandM3 * 10) / 10, 3),
      purchaseQty: Math.ceil(sandM3),
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
  ];

  if (wallThickness >= spec.material_rules.flexible_ties_wall_thickness_threshold) {
    materials.push({
      name: "Гибкие связи",
      quantity: flexibleTies,
      unit: "шт",
      withReserve: flexibleTies,
      purchaseQty: flexibleTies,
      category: "Крепёж",
    });
  }

  return materials;
}

export function computeCanonicalBrick(
  spec: BrickCanonicalSpec,
  inputs: BrickInputs,
  factorTable: FactorTable,
): CanonicalCalculatorResult {
  const accuracyMode = inputs.accuracyMode ?? DEFAULT_ACCURACY_MODE;
  const accuracyMult = getPrimaryMultiplier("generic", accuracyMode);

  const areaInfo = resolveArea(spec, inputs);
  const brickType = resolveBrickType(spec, inputs);
  const wallThickness = resolveWallThickness(spec, inputs);
  const workingConditions = resolveWorkingConditions(spec, inputs);
  const wasteMode = resolveWasteMode(spec, inputs);

  const bricksPerSqm = spec.normative_formula.bricks_per_sqm[String(brickType)]?.[String(wallThickness)] ?? 102;
  const mortarPerSqm = spec.normative_formula.mortar_per_sqm[String(brickType)]?.[String(wallThickness)] ?? 0.023;
  const brickHeightMm = spec.normative_formula.brick_height_mm[String(brickType)] ?? 65;
  const conditionsMultiplier = spec.normative_formula.conditions_multiplier[String(workingConditions)] ?? 1.0;
  const wasteCoeff = spec.normative_formula.waste_coeffs[String(wasteMode)] ?? 1.05;

  const area = areaInfo.area;
  const baseBricksNeeded = area * bricksPerSqm * wasteCoeff * accuracyMult;

  const mortarVolume = roundDisplay(area * mortarPerSqm * spec.material_rules.mortar_loss_factor * conditionsMultiplier, 6);
  const cementKg = roundDisplay(mortarVolume * spec.material_rules.cement_kg_per_m3, 3);
  const cementBags = cementKg > 0 ? Math.ceil(cementKg / spec.material_rules.cement_bag_kg) : 0;
  const sandM3 = roundDisplay(mortarVolume * spec.material_rules.sand_m3_per_m3_mortar, 3);

  const wallHeight = areaInfo.wallHeight;
  const totalRows = Math.ceil(wallHeight * 1000 / (brickHeightMm + spec.material_rules.mesh_joint_mm));
  const meshInterval = wallThickness === 0 ? 3 : 5;
  const meshLayers = Math.ceil(totalRows / meshInterval);
  const meshArea = roundDisplay(Math.ceil(meshLayers * areaInfo.wallWidth * spec.material_rules.mesh_overlap_factor * 10) / 10, 3);

  const plasticizerL = roundDisplay(Math.ceil(mortarVolume * spec.material_rules.plasticizer_l_per_m3 * 10) / 10, 3);

  const flexibleTies = wallThickness >= spec.material_rules.flexible_ties_wall_thickness_threshold
    ? Math.ceil(area * spec.material_rules.flexible_ties_per_m2)
    : 0;

  const packageOptions = [{
    size: spec.packaging_rules.package_size,
    label: `brick-piece-${spec.packaging_rules.package_size}`,
    unit: spec.packaging_rules.unit,
  }];

  const scenarios = SCENARIOS.reduce((acc, scenario) => {
    const { multiplier, keyFactors } = combineScenarioFactors(factorTable, spec.field_factors.enabled, scenario);
    const exactNeed = roundDisplay(baseBricksNeeded * multiplier, 6);
    const packaging = optimizePackaging(exactNeed, packageOptions);

    acc[scenario] = {
      exact_need: exactNeed,
      purchase_quantity: roundDisplay(packaging.purchaseQuantity, 6),
      leftover: roundDisplay(packaging.leftover, 6),
      assumptions: [
        `formula_version:${spec.formula_version}`,
        `brickType:${brickType}`,
        `wallThickness:${wallThickness}`,
        `wasteMode:${wasteMode}`,
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

  const mortarAdditive = Math.max(0, Math.min(1, Math.round(inputs.mortarAdditive ?? getInputDefault(spec, "mortarAdditive", 0))));

  // footprintArea — площадь пятна стены сверху (для рубероида на фундаменте).
  // Принимаем толщину стены × длину как приближение.
  const wallThicknessM = (spec.normative_formula.wall_thickness_mm[String(wallThickness)] ?? 250) / 1000;
  const footprintArea = roundDisplay(areaInfo.wallWidth * wallThicknessM, 6);
  const perimeter = roundDisplay(areaInfo.wallWidth * 2 + wallThicknessM * 2, 6);

  const warnings: string[] = [];
  if (wallThickness === spec.warnings_rules.non_load_bearing_wall_thickness) {
    warnings.push("Толщина стены в 0.5 кирпича (120 мм) — только для ненесущих перегородок");
  }
  if (cementBags >= spec.warnings_rules.manual_mix_grade_threshold) {
    warnings.push("Большой объём раствора — ручное замешивание будет затруднено, рекомендуется бетономешалка");
  }

  const practicalNotes: string[] = [];
  if (wallThickness === 0) {
    practicalNotes.push("Полкирпича (120 мм) — только перегородки, для несущей стены минимум 250 мм");
  }
  if (recScenario.exact_need > 5000) {
    practicalNotes.push(`При объёме ${Math.round(recScenario.exact_need)} кирпичей заказывайте с 7-10% запасом — бой при разгрузке неизбежен`);
  }
  practicalNotes.push("Кладку начинайте с углов, проверяйте горизонт каждые 3-4 ряда");

  const baseMaterials = buildMaterials(
    spec,
    brickType,
    wallThickness,
    recScenario.exact_need,
    cementBags,
    sandM3,
    meshArea,
    flexibleTies,
  );

  const companionInputs = {
    mortarAdditive,
    brickType,
    wallThickness,
  };
  const companionTotals = {
    mortarVolume,
    perimeter,
    footprintArea,
    area,
  };
  const companions = spec.companion_materials
    ? evaluateCompanionMaterials(spec.companion_materials, {
        inputs: companionInputs,
        totals: companionTotals,
      })
    : [];

  return {
    canonicalSpecId: spec.calculator_id,
    formulaVersion: spec.formula_version,
    materials: [...baseMaterials, ...companions],
    totals: {
      area: area,
      inputMode: areaInfo.inputMode,
      wallWidth: roundDisplay(areaInfo.wallWidth, 3),
      wallHeight: roundDisplay(areaInfo.wallHeight, 3),
      brickType: brickType,
      wallThickness: wallThickness,
      wallThicknessMm: spec.normative_formula.wall_thickness_mm[String(wallThickness)] ?? 250,
      workingConditions: workingConditions,
      wasteMode: wasteMode,
      wasteCoeff: wasteCoeff,
      bricksPerSqm: bricksPerSqm,
      mortarPerSqm: mortarPerSqm,
      conditionsMultiplier: conditionsMultiplier,
      bricksNeeded: roundDisplay(recScenario.exact_need, 3),
      mortarVolume: mortarVolume,
      cementKg: cementKg,
      cementBags: cementBags,
      sandM3: sandM3,
      totalRows: totalRows,
      meshInterval: meshInterval,
      meshLayers: meshLayers,
      meshArea: meshArea,
      plasticizerL: plasticizerL,
      mortarAdditive,
      flexibleTies: flexibleTies,
      footprintArea,
      perimeter,
      minExactNeedBricks: scenarios.MIN.exact_need,
      recExactNeedBricks: recScenario.exact_need,
      maxExactNeedBricks: scenarios.MAX.exact_need,
      minPurchaseBricks: scenarios.MIN.purchase_quantity,
      recPurchaseBricks: recScenario.purchase_quantity,
      maxPurchaseBricks: scenarios.MAX.purchase_quantity,
    },
    accuracyMode,
    accuracyExplanation: applyAccuracyMode(area * bricksPerSqm * wasteCoeff, "generic", accuracyMode).explanation,
    warnings,
    practicalNotes,
    scenarios,
  };
}
