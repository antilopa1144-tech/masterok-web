import { combineScenarioFactors, type FactorTable } from "./factors";
import { SCENARIOS, type ScenarioBundle } from "./scenarios";
import type {
  CanonicalCalculatorResult,
  CanonicalMaterialResult,
  LinoleumCanonicalSpec,
} from "./canonical";
import { roundDisplay } from "./units";
import { type AccuracyMode, DEFAULT_ACCURACY_MODE, applyAccuracyMode, getPrimaryMultiplier, getAccessoriesMultiplier } from "./accuracy";

interface LinoleumInputs {
  inputMode?: number;
  length?: number;
  width?: number;
  area?: number;
  roomWidth?: number;
  perimeter?: number;
  rollWidth?: number;
  hasPattern?: number;
  patternRepeatCm?: number;
  needGlue?: number;
  needPlinth?: number;
  needTape?: number;
  accuracyMode?: AccuracyMode;
}

function getInputDefault(spec: LinoleumCanonicalSpec, key: string, fallback: number): number {
  return spec.input_schema.find((field) => field.key === key)?.default_value ?? fallback;
}

function estimatePerimeter(area: number) {
  if (area <= 0) return 0;
  return 4 * Math.sqrt(area);
}

function resolveGeometry(spec: LinoleumCanonicalSpec, inputs: LinoleumInputs) {
  const inputMode = Math.round(inputs.inputMode ?? getInputDefault(spec, "inputMode", 0));
  if (inputMode === 0) {
    const length = Math.max(1, inputs.length ?? getInputDefault(spec, "length", 5));
    const width = Math.max(1, inputs.width ?? getInputDefault(spec, "width", 4));
    return {
      inputMode: 0,
      area: roundDisplay(length * width, 3),
      roomLength: roundDisplay(length, 3),
      roomWidth: roundDisplay(width, 3),
      perimeter: roundDisplay(2 * (length + width), 3),
    };
  }

  const area = Math.max(1, inputs.area ?? getInputDefault(spec, "area", 20));
  const roomWidth = Math.max(1, inputs.roomWidth ?? getInputDefault(spec, "roomWidth", 4));
  const roomLength = area / roomWidth;
  const perimeter = Math.max(0, inputs.perimeter ?? 0) > 0 ? inputs.perimeter! : estimatePerimeter(area);
  return {
    inputMode: 1,
    area: roundDisplay(area, 3),
    roomLength: roundDisplay(roomLength, 3),
    roomWidth: roundDisplay(roomWidth, 3),
    perimeter: roundDisplay(perimeter, 3),
  };
}

function roundLinearMeters(value: number, step: number) {
  const safeStep = step > 0 ? step : 0.1;
  return Math.ceil(value / safeStep) * safeStep;
}

export function computeCanonicalLinoleum(
  spec: LinoleumCanonicalSpec,
  inputs: LinoleumInputs,
  factorTable: FactorTable,
): CanonicalCalculatorResult {
  const accuracyMode = inputs.accuracyMode ?? DEFAULT_ACCURACY_MODE;

  const geometry = resolveGeometry(spec, inputs);
  const rollWidth = Math.max(1.5, Math.min(spec.warnings_rules.max_single_roll_width_m, inputs.rollWidth ?? getInputDefault(spec, "rollWidth", 3)));
  const hasPattern = (inputs.hasPattern ?? getInputDefault(spec, "hasPattern", 0)) > 0;
  const patternRepeatM = Math.max(0, inputs.patternRepeatCm ?? getInputDefault(spec, "patternRepeatCm", 30)) / 100;
  const needGlue = (inputs.needGlue ?? getInputDefault(spec, "needGlue", 0)) > 0;
  const needPlinth = (inputs.needPlinth ?? getInputDefault(spec, "needPlinth", 1)) > 0;
  const needTape = (inputs.needTape ?? getInputDefault(spec, "needTape", 1)) > 0;

  const longerSide = Math.max(geometry.roomLength, geometry.roomWidth);
  const shorterSide = Math.min(geometry.roomLength, geometry.roomWidth);
  const stripsNeeded = Math.max(1, Math.ceil(shorterSide / rollWidth));
  const stripLengthBase = longerSide + spec.material_rules.trim_allowance_m;
  const totalLinearMRaw = hasPattern && stripsNeeded > 1
    ? stripLengthBase + (stripLengthBase + patternRepeatM) * (stripsNeeded - 1)
    : stripLengthBase * stripsNeeded;
  const accuracyMult = getPrimaryMultiplier("flooring", accuracyMode);
  const totalLinearM = totalLinearMRaw * accuracyMult;
  const linearMetersRounded = roundLinearMeters(totalLinearM, spec.packaging_rules.linear_meter_step_m);
  const totalCoverageArea = roundDisplay(linearMetersRounded * rollWidth, 6);
  const wastePercent = geometry.area > 0 ? roundDisplay(((totalCoverageArea - geometry.area) / geometry.area) * 100, 3) : 0;

  const scenarios = SCENARIOS.reduce((acc, scenario) => {
    const { multiplier, keyFactors } = combineScenarioFactors(factorTable, spec.field_factors.enabled, scenario);
    const exactNeed = roundDisplay(totalLinearM * multiplier, 6);
    const purchaseQuantity = roundLinearMeters(exactNeed, spec.packaging_rules.linear_meter_step_m);

    acc[scenario] = {
      exact_need: exactNeed,
      purchase_quantity: roundDisplay(purchaseQuantity, 6),
      leftover: roundDisplay(purchaseQuantity - exactNeed, 6),
      assumptions: [
        `formula_version:${spec.formula_version}`,
        `roll_width:${rollWidth}`,
        `pattern:${hasPattern ? "rapport" : "plain"}`,
      ],
      key_factors: {
        ...keyFactors,
        field_multiplier: roundDisplay(multiplier, 6),
      },
      buy_plan: {
        package_label: `linoleum-linear-${spec.packaging_rules.linear_meter_step_m}`,
        package_size: spec.packaging_rules.linear_meter_step_m,
        packages_count: Math.round(purchaseQuantity / spec.packaging_rules.linear_meter_step_m),
        unit: spec.packaging_rules.linear_meter_unit,
      },
    };

    return acc;
  }, {} as ScenarioBundle);

  const seamsLength = stripsNeeded > 1 ? roundDisplay((stripsNeeded - 1) * longerSide, 6) : 0;
  const coldWeldingTubes = seamsLength > 0 ? Math.max(1, Math.ceil(seamsLength / spec.packaging_rules.cold_welding_tube_linear_m)) : 0;
  const glueKg = needGlue ? roundDisplay(geometry.area * spec.material_rules.glue_kg_per_m2, 6) : 0;
  const glueBuckets = needGlue ? Math.max(1, Math.ceil(glueKg / spec.packaging_rules.glue_bucket_kg)) : 0;
  const primerLiters = roundDisplay(geometry.area * spec.material_rules.primer_liters_per_m2, 6);
  const primerCans = Math.max(1, Math.ceil(primerLiters / spec.packaging_rules.primer_can_liters));
  const plinthLength = needPlinth
    ? roundDisplay(Math.max(0, geometry.perimeter - spec.material_rules.default_door_opening_width_m) * (1 + spec.material_rules.plinth_reserve_percent / 100), 6)
    : 0;
  const plinthPieces = needPlinth ? Math.ceil(plinthLength / spec.packaging_rules.plinth_piece_length_m) : 0;
  const tapeLength = needTape ? roundDisplay(geometry.perimeter + longerSide * spec.material_rules.tape_extra_perimeter_run, 6) : 0;
  const warnings: string[] = [];
  if (stripsNeeded > 1) {
    warnings.push(`Укладка потребует ${stripsNeeded} полосы. Попробуйте рулон шире ${roundDisplay(shorterSide, 1)} м для укладки без стыка`);
  }
  if (wastePercent > spec.warnings_rules.high_waste_percent_threshold) {
    warnings.push(`Отходы составят ${roundDisplay(wastePercent, 1)}% — попробуйте рулон большей ширины`);
  }
  if (hasPattern && patternRepeatM > 0) {
    warnings.push("Раппорт рисунка увеличивает расход на подгонку полотен");
  }

  const recScenario = scenarios.REC;
  const materials: CanonicalMaterialResult[] = [
    {
      name: `Линолеум (${roundDisplay(rollWidth, 2)} м ширина)`,
      quantity: roundDisplay(recScenario.exact_need, 6),
      unit: spec.packaging_rules.linear_meter_unit,
      withReserve: recScenario.purchase_quantity,
      purchaseQty: Math.ceil(recScenario.purchase_quantity * 10) / 10,
      category: "Покрытие",
    },
    {
      name: `Грунтовка (${spec.packaging_rules.primer_can_liters} л)`,
      quantity: primerLiters,
      unit: "л",
      withReserve: primerCans * spec.packaging_rules.primer_can_liters,
      purchaseQty: primerCans * spec.packaging_rules.primer_can_liters,
      category: "Подготовка",
      packageInfo: { count: primerCans, size: spec.packaging_rules.primer_can_liters, packageUnit: "канистр" },
    },
  ];

  if (needGlue) {
    materials.push({
      name: `Клей для линолеума (${spec.packaging_rules.glue_bucket_kg} кг)`,
      quantity: glueKg,
      unit: "кг",
      withReserve: glueBuckets * spec.packaging_rules.glue_bucket_kg,
      purchaseQty: glueBuckets * spec.packaging_rules.glue_bucket_kg,
      category: "Клей",
      packageInfo: { count: glueBuckets, size: spec.packaging_rules.glue_bucket_kg, packageUnit: "вёдер" },
    });
  }
  if (needPlinth) {
    materials.push({
      name: `Плинтус ПВХ (${spec.packaging_rules.plinth_piece_length_m} м)`,
      quantity: roundDisplay(plinthLength / spec.packaging_rules.plinth_piece_length_m, 6),
      unit: "шт",
      withReserve: plinthPieces,
      purchaseQty: plinthPieces,
      category: "Плинтус",
    });
  }
  if (needTape) {
    materials.push({
      name: "Двусторонний скотч / клейкая фиксация",
      quantity: tapeLength,
      unit: "м",
      withReserve: tapeLength,
      purchaseQty: Math.ceil(tapeLength),
      category: "Крепление",
    });
  }
  if (coldWeldingTubes > 0) {
    materials.push({
      name: "Холодная сварка для швов",
      quantity: coldWeldingTubes,
      unit: "туб",
      withReserve: coldWeldingTubes,
      purchaseQty: coldWeldingTubes,
      category: "Швы",
    });
  }

  const practicalNotes: string[] = [];
  practicalNotes.push("Линолеум раскатайте и дайте отлежаться сутки перед подрезкой — он примет форму пола");

  return {
    canonicalSpecId: spec.calculator_id,
    formulaVersion: spec.formula_version,
    materials,
    totals: {
      area: geometry.area,
      inputMode: geometry.inputMode,
      roomWidth: geometry.roomWidth,
      roomLength: geometry.roomLength,
      perimeter: geometry.perimeter,
      rollWidth: roundDisplay(rollWidth, 3),
      hasPattern: hasPattern ? 1 : 0,
      patternRepeatCm: roundDisplay(patternRepeatM * 100, 3),
      stripsNeeded,
      stripLengthBase: roundDisplay(stripLengthBase, 6),
      linearMeters: roundDisplay(linearMetersRounded, 6),
      totalCoverageArea,
      wastePercent,
      needGlue: needGlue ? 1 : 0,
      needPlinth: needPlinth ? 1 : 0,
      needTape: needTape ? 1 : 0,
      seamsLength,
      coldWeldingTubes,
      glueNeededKg: glueKg,
      glueBuckets,
      primerNeededL: primerLiters,
      primerCans,
      plinthLength,
      plinthPieces,
      tapeLength,
      minExactNeedLinearM: scenarios.MIN.exact_need,
      recExactNeedLinearM: recScenario.exact_need,
      maxExactNeedLinearM: scenarios.MAX.exact_need,
      minPurchaseLinearM: scenarios.MIN.purchase_quantity,
      recPurchaseLinearM: recScenario.purchase_quantity,
      maxPurchaseLinearM: scenarios.MAX.purchase_quantity,
    },
    warnings,
    practicalNotes,
    scenarios,
    accuracyMode,
    accuracyExplanation: applyAccuracyMode(totalLinearMRaw, "flooring", accuracyMode).explanation,
  };
}
