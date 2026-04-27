import { combineScenarioFactors, type FactorTable } from "./factors";
import { optimizePackaging } from "./packaging";
import { SCENARIOS, type ScenarioBundle } from "./scenarios";
import type {
  CanonicalCalculatorResult,
  CanonicalMaterialResult,
  ParquetCanonicalSpec,
  ParquetLayoutProfileSpec,
} from "./canonical";
import { roundDisplay } from "./units";
import { type AccuracyMode, DEFAULT_ACCURACY_MODE, applyAccuracyMode, getPrimaryMultiplier, getAccessoriesMultiplier } from "./accuracy";

interface ParquetInputs {
  inputMode?: number;
  length?: number;
  width?: number;
  area?: number;
  perimeter?: number;
  packArea?: number;
  layoutProfileId?: number;
  reservePercent?: number;
  needUnderlayment?: number;
  needPlinth?: number;
  needGlue?: number;
  underlaymentRollArea?: number;
  doorThresholds?: number;
  accuracyMode?: AccuracyMode;
}

function getInputDefault(spec: ParquetCanonicalSpec, key: string, fallback: number): number {
  return spec.input_schema.find((field) => field.key === key)?.default_value ?? fallback;
}

function estimatePerimeter(area: number) {
  if (area <= 0) return 0;
  return 4 * Math.sqrt(area);
}

function resolveGeometry(spec: ParquetCanonicalSpec, inputs: ParquetInputs) {
  const inputMode = Math.round(inputs.inputMode ?? getInputDefault(spec, "inputMode", 0));
  if (inputMode === 0) {
    const length = Math.max(1, inputs.length ?? getInputDefault(spec, "length", 5));
    const width = Math.max(1, inputs.width ?? getInputDefault(spec, "width", 4));
    return {
      inputMode: 0,
      area: roundDisplay(length * width, 3),
      perimeter: roundDisplay(2 * (length + width), 3),
    };
  }

  const area = Math.max(1, inputs.area ?? getInputDefault(spec, "area", 20));
  const perimeter = Math.max(0, inputs.perimeter ?? 0) > 0 ? inputs.perimeter! : estimatePerimeter(area);
  return {
    inputMode: 1,
    area: roundDisplay(area, 3),
    perimeter: roundDisplay(perimeter, 3),
  };
}

function resolveLayout(spec: ParquetCanonicalSpec, inputs: ParquetInputs): ParquetLayoutProfileSpec {
  const profileId = Math.max(1, Math.min(3, Math.round(inputs.layoutProfileId ?? getInputDefault(spec, "layoutProfileId", 1))));
  return spec.normative_formula.layout_profiles.find((profile) => profile.id === profileId) ?? spec.normative_formula.layout_profiles[0];
}

export function computeCanonicalParquet(
  spec: ParquetCanonicalSpec,
  inputs: ParquetInputs,
  factorTable: FactorTable,
): CanonicalCalculatorResult {
  const accuracyMode = inputs.accuracyMode ?? DEFAULT_ACCURACY_MODE;

  const geometry = resolveGeometry(spec, inputs);
  const packArea = Math.max(0.5, Math.min(4, inputs.packArea ?? getInputDefault(spec, "packArea", 1.892)));
  const layoutProfile = resolveLayout(spec, inputs);
  const reservePercent = Math.max(0, Math.min(20, inputs.reservePercent ?? getInputDefault(spec, "reservePercent", spec.material_rules.reserve_percent_default)));
  const effectiveWastePercent = Math.max(layoutProfile.waste_percent, reservePercent);
  const baseExactNeedAreaRaw = roundDisplay(geometry.area * (1 + effectiveWastePercent / 100), 6);
  const accuracyMult = getPrimaryMultiplier("flooring", accuracyMode);
  const baseExactNeedArea = roundDisplay(baseExactNeedAreaRaw * accuracyMult, 6);
  const packageOptions = [{
    size: packArea,
    label: `parquet-pack-${roundDisplay(packArea, 3)}`,
    unit: spec.packaging_rules.parquet_pack_area_unit,
  }];

  const scenarios = SCENARIOS.reduce((acc, scenario) => {
    const { multiplier, keyFactors } = combineScenarioFactors(factorTable, spec.field_factors.enabled, scenario);
    const exactNeed = roundDisplay(baseExactNeedArea * multiplier, 6);
    const packaging = optimizePackaging(exactNeed, packageOptions);

    acc[scenario] = {
      exact_need: exactNeed,
      purchase_quantity: roundDisplay(packaging.purchaseQuantity, 6),
      leftover: roundDisplay(packaging.leftover, 6),
      assumptions: [
        `formula_version:${spec.formula_version}`,
        `layout:${layoutProfile.key}`,
        `packaging:${packaging.package.label}`,
      ],
      key_factors: {
        ...keyFactors,
        field_multiplier: roundDisplay(multiplier, 6),
        reserve_percent: roundDisplay(reservePercent, 3),
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

  const needUnderlayment = (inputs.needUnderlayment ?? getInputDefault(spec, "needUnderlayment", 1)) > 0;
  const needPlinth = (inputs.needPlinth ?? getInputDefault(spec, "needPlinth", 1)) > 0;
  const needGlue = (inputs.needGlue ?? getInputDefault(spec, "needGlue", 0)) > 0;
  const underlaymentRollArea = Math.max(5, Math.min(20, inputs.underlaymentRollArea ?? getInputDefault(spec, "underlaymentRollArea", 10)));
  const underlaymentArea = needUnderlayment ? roundDisplay(geometry.area * (1 + spec.material_rules.underlayment_overlap_percent / 100), 6) : 0;
  const underlaymentRolls = needUnderlayment ? Math.ceil(underlaymentArea / underlaymentRollArea) : 0;
  const doorThresholds = Math.max(0, Math.round(inputs.doorThresholds ?? getInputDefault(spec, "doorThresholds", 1)));
  const plinthLengthRaw = needPlinth ? Math.max(0, geometry.perimeter - doorThresholds * spec.material_rules.default_door_opening_width_m) * (1 + spec.material_rules.plinth_reserve_percent / 100) : 0;
  const plinthPieces = needPlinth ? Math.ceil(plinthLengthRaw / spec.packaging_rules.plinth_piece_length_m) : 0;
  const plinthLength = needPlinth ? roundDisplay(plinthPieces * spec.packaging_rules.plinth_piece_length_m, 6) : 0;
  const wedges = needPlinth ? Math.ceil(geometry.perimeter / spec.material_rules.wedge_spacing_m) : 0;
  const glueKg = needGlue ? roundDisplay(geometry.area * spec.material_rules.glue_kg_per_m2, 6) : 0;
  const glueBuckets = needGlue ? Math.ceil(glueKg / spec.packaging_rules.glue_bucket_kg) : 0;
  const recScenario = scenarios.REC;

  const warnings: string[] = [];
  if (geometry.area < spec.warnings_rules.small_area_warning_threshold_m2) {
    warnings.push("Маленькая площадь — отходы будут выше расчётного процента");
  }
  if (spec.warnings_rules.diagonal_warning_profile_ids.includes(layoutProfile.id)) {
    warnings.push("Диагональная укладка требует точной раскладки и увеличивает отходы");
  }
  if (spec.warnings_rules.herringbone_warning_profile_ids.includes(layoutProfile.id)) {
    warnings.push("Укладка ёлочкой требует профессионального инструмента и опыта");
  }

  /* ─── expansion joint (для больших комнат) ─── */
  const expansionJointThresholdM2 = (spec.material_rules as { expansion_joint_threshold_m2?: number }).expansion_joint_threshold_m2 ?? 50;
  const expansionJointPieceLengthM = (spec.material_rules as { expansion_joint_piece_length_m?: number }).expansion_joint_piece_length_m ?? 1.0;
  const needsExpansionJoint = geometry.area > expansionJointThresholdM2;
  const expansionJointLengthM = needsExpansionJoint ? Math.sqrt(geometry.area) : 0;
  const expansionJointPieces = needsExpansionJoint ? Math.ceil(expansionJointLengthM / expansionJointPieceLengthM) : 0;
  if (needsExpansionJoint) {
    warnings.push(
      `Площадь ${geometry.area} м² больше ${expansionJointThresholdM2} м² — требуется компенсационный шов с профилем (СП 71.13330).`,
    );
  }

  const materials: CanonicalMaterialResult[] = [
    {
      name: `Паркетная доска (${roundDisplay(packArea, 3)} м² в упаковке)`,
      quantity: roundDisplay(recScenario.exact_need / packArea, 6),
      unit: "упак.",
      withReserve: recScenario.buy_plan.packages_count,
      purchaseQty: recScenario.buy_plan.packages_count,
      category: "Покрытие",
    },
    {
      name: "Порожек стыковочный",
      quantity: doorThresholds,
      unit: "шт",
      withReserve: doorThresholds,
      purchaseQty: doorThresholds,
      category: "Доборные",
    },
  ];

  if (needUnderlayment) {
    materials.push({
      name: `Подложка (${roundDisplay(underlaymentRollArea, 1)} м²)`,
      quantity: roundDisplay(underlaymentArea / underlaymentRollArea, 6),
      unit: "рулонов",
      withReserve: underlaymentRolls,
      purchaseQty: underlaymentRolls,
      category: "Подложка",
    });
    materials.push({
      name: "Скотч для подложки",
      quantity: 1,
      unit: "рулон",
      withReserve: 1,
      purchaseQty: 1,
      category: "Подложка",
    });
  }

  if (needPlinth) {
    materials.push({
      name: `Плинтус напольный (${spec.packaging_rules.plinth_piece_length_m} м)`,
      quantity: roundDisplay(plinthLength / spec.packaging_rules.plinth_piece_length_m, 6),
      unit: "шт",
      withReserve: plinthPieces,
      purchaseQty: plinthPieces,
      category: "Плинтус",
    });
    materials.push({
      name: "Клинья распорные",
      quantity: wedges,
      unit: "шт",
      withReserve: wedges,
      purchaseQty: Math.ceil(wedges / 10) * 10,
      category: "Монтаж",
    });
  }

  if (needGlue) {
    materials.push({
      name: `Клей для паркета (${spec.packaging_rules.glue_bucket_kg} кг)`,
      quantity: glueKg,
      unit: "кг",
      withReserve: glueBuckets * spec.packaging_rules.glue_bucket_kg,
      purchaseQty: glueBuckets * spec.packaging_rules.glue_bucket_kg,
      packageInfo: { count: glueBuckets, size: spec.packaging_rules.glue_bucket_kg, packageUnit: "вёдер" },
      category: "Клей",
    });
  }

  if (expansionJointPieces > 0) {
    materials.push({
      name: `Профиль компенсационный (${expansionJointPieceLengthM} м)`,
      quantity: expansionJointPieces,
      unit: "шт",
      withReserve: expansionJointPieces,
      purchaseQty: expansionJointPieces,
      category: "Монтаж",
    });
  }

  const practicalNotes: string[] = [];
  practicalNotes.push("Паркет — живой материал, оставляйте зазор 10-15 мм у стен для температурного расширения");

  return {
    canonicalSpecId: spec.calculator_id,
    formulaVersion: spec.formula_version,
    materials,
    totals: {
      area: geometry.area,
      perimeter: geometry.perimeter,
      inputMode: geometry.inputMode,
      packArea: roundDisplay(packArea, 6),
      layoutProfileId: layoutProfile.id,
      reservePercent: roundDisplay(reservePercent, 3),
      wastePercent: roundDisplay(effectiveWastePercent, 3),
      baseExactNeedArea: baseExactNeedArea,
      packsNeeded: recScenario.buy_plan.packages_count,
      needUnderlayment: needUnderlayment ? 1 : 0,
      needPlinth: needPlinth ? 1 : 0,
      needGlue: needGlue ? 1 : 0,
      expansionJointPieces,
      expansionJointLengthM: roundDisplay(expansionJointLengthM, 3),
      underlayArea: underlaymentArea,
      underlaymentRolls: underlaymentRolls,
      plinthLength: plinthLength,
      plinthPieces: plinthPieces,
      wedgesNeeded: wedges,
      glueNeededKg: glueKg,
      glueBuckets: glueBuckets,
      doorThresholds: doorThresholds,
      minExactNeedArea: scenarios.MIN.exact_need,
      recExactNeedArea: recScenario.exact_need,
      maxExactNeedArea: scenarios.MAX.exact_need,
      minPurchaseArea: scenarios.MIN.purchase_quantity,
      recPurchaseArea: recScenario.purchase_quantity,
      maxPurchaseArea: scenarios.MAX.purchase_quantity,
    },
    warnings,
    practicalNotes,
    scenarios,
    accuracyMode,
    accuracyExplanation: applyAccuracyMode(baseExactNeedAreaRaw, "flooring", accuracyMode).explanation,
  };
}

