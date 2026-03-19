import { combineScenarioFactors, type FactorTable } from "./factors";
import { optimizePackaging } from "./packaging";
import { SCENARIOS, type ScenarioBundle } from "./scenarios";
import type {
  CanonicalCalculatorResult,
  CanonicalMaterialResult,
  LaminateCanonicalSpec,
  LaminateLayoutProfileSpec,
} from "./canonical";
import { roundDisplay } from "./units";
import { type AccuracyMode, DEFAULT_ACCURACY_MODE, applyAccuracyMode, getPrimaryMultiplier, getAccessoriesMultiplier } from "./accuracy";

interface LaminateInputs {
  inputMode?: number;
  length?: number;
  width?: number;
  area?: number;
  perimeter?: number;
  packArea?: number;
  layoutProfileId?: number;
  reservePercent?: number;
  hasUnderlayment?: number;
  underlaymentRollArea?: number;
  doorThresholds?: number;
  underlayType?: number;
  laminateClass?: number;
  laminateThickness?: number;
  accuracyMode?: AccuracyMode;
}

function getInputDefault(spec: LaminateCanonicalSpec, key: string, fallback: number): number {
  return spec.input_schema.find((field) => field.key === key)?.default_value ?? fallback;
}

function estimatePerimeter(area: number): number {
  if (area <= 0) return 0;
  return 4 * Math.sqrt(area);
}

function resolveArea(spec: LaminateCanonicalSpec, inputs: LaminateInputs) {
  const inputMode = Math.round(inputs.inputMode ?? getInputDefault(spec, "inputMode", 1));
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

function resolveLayoutProfile(spec: LaminateCanonicalSpec, inputs: LaminateInputs): LaminateLayoutProfileSpec {
  const profileId = Math.max(1, Math.min(8, Math.round(inputs.layoutProfileId ?? getInputDefault(spec, "layoutProfileId", 7))));
  return spec.normative_formula.layout_profiles.find((profile) => profile.id === profileId) ?? spec.normative_formula.layout_profiles[0];
}

function buildMaterials(
  spec: LaminateCanonicalSpec,
  recExactNeedArea: number,
  recPurchaseArea: number,
  packArea: number,
  packsNeeded: number,
  hasUnderlayment: boolean,
  underlaymentArea: number,
  underlaymentRolls: number,
  plinthLength: number,
  plinthPieces: number,
  innerCorners: number,
  connectors: number,
  wedges: number,
  vaporBarrierArea: number,
  doorThresholds: number,
): CanonicalMaterialResult[] {
  const materials: CanonicalMaterialResult[] = [
    {
      name: `Ламинат (${roundDisplay(packArea, 3)} м² в упаковке)`,
      quantity: roundDisplay(recExactNeedArea / packArea, 6),
      unit: "упак.",
      withReserve: packsNeeded,
      purchaseQty: packsNeeded,
      category: "Напольное покрытие",
    },
    {
      name: `Плинтус напольный (${spec.packaging_rules.plinth_piece_length_m} м)`,
      quantity: roundDisplay(plinthLength / spec.packaging_rules.plinth_piece_length_m, 6),
      unit: "шт",
      withReserve: plinthPieces,
      purchaseQty: plinthPieces,
      category: "Плинтус",
    },
    {
      name: "Внутренние углы для плинтуса",
      quantity: innerCorners,
      unit: "шт",
      withReserve: innerCorners,
      purchaseQty: innerCorners,
      category: "Плинтус",
    },
    {
      name: "Соединители для плинтуса",
      quantity: connectors,
      unit: "шт",
      withReserve: connectors,
      purchaseQty: connectors,
      category: "Плинтус",
    },
    {
      name: "Клинья распорные",
      quantity: wedges,
      unit: "шт",
      withReserve: wedges,
      purchaseQty: wedges,
      category: "Монтаж",
    },
    {
      name: "Пароизоляционная плёнка",
      quantity: roundDisplay(vaporBarrierArea, 6),
      unit: "м²",
      withReserve: roundDisplay(vaporBarrierArea, 6),
      purchaseQty: Math.ceil(vaporBarrierArea),
      category: "Подготовка",
    },
    {
      name: "Порожек стыковочный",
      quantity: doorThresholds,
      unit: "шт",
      withReserve: doorThresholds,
      purchaseQty: doorThresholds,
      category: "Плинтус",
    },
  ];

  if (hasUnderlayment) {
    materials.splice(1, 0, {
      name: "Подложка под ламинат",
      quantity: roundDisplay(underlaymentArea / spec.packaging_rules.underlayment_roll_area_m2, 6),
      unit: "рулонов",
      withReserve: underlaymentRolls,
      purchaseQty: underlaymentRolls,
      category: "Подложка",
    });
    materials.push({
      name: "Скотч для стыков подложки",
      quantity: 1,
      unit: "рулон",
      withReserve: 1,
      purchaseQty: 1,
      category: "Подложка",
    });
  }

  return materials;
}

export function computeCanonicalLaminate(
  spec: LaminateCanonicalSpec,
  inputs: LaminateInputs,
  factorTable: FactorTable,
): CanonicalCalculatorResult {
  const accuracyMode = inputs.accuracyMode ?? DEFAULT_ACCURACY_MODE;

  const geometry = resolveArea(spec, inputs);
  const packArea = Math.max(0.5, Math.min(5, inputs.packArea ?? getInputDefault(spec, "packArea", 2.397)));
  const layoutProfile = resolveLayoutProfile(spec, inputs);
  const reservePercent = Math.max(0, Math.min(25, inputs.reservePercent ?? getInputDefault(spec, "reservePercent", spec.material_rules.reserve_percent_default)));
  const smallRoomAdjustment = geometry.area < spec.material_rules.small_room_threshold_m2
    ? (spec.material_rules.small_room_threshold_m2 - geometry.area) * spec.material_rules.small_room_waste_per_m2_percent
    : 0;
  const effectiveWastePercent = Math.max(layoutProfile.waste_percent + smallRoomAdjustment, reservePercent);
  const baseExactNeedAreaRaw = roundDisplay(geometry.area * (1 + effectiveWastePercent / 100), 6);
  const accuracyMult = getPrimaryMultiplier("flooring", accuracyMode);
  const baseExactNeedArea = roundDisplay(baseExactNeedAreaRaw * accuracyMult, 6);
  const packageOptions = [{
    size: packArea,
    label: `laminate-pack-${roundDisplay(packArea, 3)}`,
    unit: spec.packaging_rules.laminate_pack_area_unit,
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

  const hasUnderlayment = (inputs.hasUnderlayment ?? getInputDefault(spec, "hasUnderlayment", 1)) > 0;
  const underlaymentRollArea = Math.max(5, Math.min(20, inputs.underlaymentRollArea ?? getInputDefault(spec, "underlaymentRollArea", spec.packaging_rules.underlayment_roll_area_m2)));
  const underlaymentArea = hasUnderlayment ? roundDisplay(geometry.area * (1 + spec.material_rules.underlayment_overlap_percent / 100), 6) : 0;
  const underlaymentRolls = hasUnderlayment ? Math.ceil(underlaymentArea / underlaymentRollArea) : 0;
  const doorThresholds = Math.max(0, Math.round(inputs.doorThresholds ?? getInputDefault(spec, "doorThresholds", 1)));
  const plinthLengthRaw = Math.max(0, geometry.perimeter - doorThresholds * spec.material_rules.default_door_opening_width_m);
  const plinthPieces = Math.ceil(plinthLengthRaw / spec.packaging_rules.plinth_piece_length_m);
  const plinthLength = roundDisplay(plinthPieces * spec.packaging_rules.plinth_piece_length_m, 6);
  const innerCorners = spec.material_rules.rectangle_inner_corners;
  const plinthConnectors = Math.max(0, plinthPieces - innerCorners);
  const wedges = Math.ceil(geometry.perimeter / spec.material_rules.wedge_spacing_m);
  const vaporBarrierArea = roundDisplay(geometry.area * (1 + spec.material_rules.vapor_barrier_overlap_percent / 100), 6);

  const warnings: string[] = [];
  if (geometry.area < spec.warnings_rules.small_area_warning_threshold_m2) {
    warnings.push("Маленькая площадь: процент отходов может быть выше из-за коротких обрезков");
  }
  if (spec.warnings_rules.diagonal_warning_profile_ids.includes(layoutProfile.id)) {
    warnings.push("Диагональная укладка требует более высокого запаса и аккуратной раскладки");
  }
  if (spec.warnings_rules.herringbone_warning_profile_ids.includes(layoutProfile.id)) {
    warnings.push("Укладка ёлочкой требует идеально ровного основания и высокой квалификации");
  }
  if (spec.warnings_rules.half_shift_warning_profile_ids.includes(layoutProfile.id)) {
    warnings.push("Смещение досок на 1/2 увеличивает количество коротких обрезков");
  }

  const recScenario = scenarios.REC;

  const practicalNotes: string[] = [];
  practicalNotes.push("Ламинат должен акклиматизироваться в комнате минимум 48 часов перед укладкой");
  if (layoutProfile.id === 4) {
    practicalNotes.push("Диагональная укладка добавит 15% отходов — не экономьте на запасе");
  }

  return {
    canonicalSpecId: spec.calculator_id,
    formulaVersion: spec.formula_version,
    materials: buildMaterials(
      spec,
      recScenario.exact_need,
      recScenario.purchase_quantity,
      packArea,
      recScenario.buy_plan.packages_count,
      hasUnderlayment,
      underlaymentArea,
      underlaymentRolls,
      plinthLength,
      plinthPieces,
      innerCorners,
      plinthConnectors,
      wedges,
      vaporBarrierArea,
      doorThresholds,
    ),
    totals: {
      area: geometry.area,
      perimeter: geometry.perimeter,
      inputMode: geometry.inputMode,
      packArea: roundDisplay(packArea, 6),
      layoutProfileId: layoutProfile.id,
      reservePercent: roundDisplay(reservePercent, 3),
      smallRoomAdjustment: roundDisplay(smallRoomAdjustment, 3),
      wastePercent: roundDisplay(effectiveWastePercent, 3),
      baseExactNeedArea: baseExactNeedArea,
      packsNeeded: recScenario.buy_plan.packages_count,
      underlayArea: underlaymentArea,
      underlaymentRolls: underlaymentRolls,
      plinthLength: plinthLength,
      plinthPieces: plinthPieces,
      innerCorners: innerCorners,
      plinthConnectors: plinthConnectors,
      wedgesNeeded: wedges,
      vaporBarrierArea: vaporBarrierArea,
      doorThresholds: doorThresholds,
      underlayType: Math.max(2, Math.min(5, Math.round(inputs.underlayType ?? getInputDefault(spec, "underlayType", 3)))),
      laminateClass: Math.max(31, Math.min(34, Math.round(inputs.laminateClass ?? getInputDefault(spec, "laminateClass", 32)))),
      laminateThickness: Math.max(6, Math.min(14, Math.round(inputs.laminateThickness ?? getInputDefault(spec, "laminateThickness", 8)))),
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
