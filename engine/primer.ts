import { computeEstimate, type EngineCalculatorConfig, type AccuracyModeOption } from "./compute";
import type { FactorTable } from "./factors";
import type {
  CanonicalCalculatorResult,
  CanonicalMaterialResult,
  PrimerCanonicalSpec,
  PrimerSurfaceSpec,
  PrimerTypeSpec,
} from "./canonical";
import { roundDisplay } from "./units";
import {
  type AccuracyMode,
  DEFAULT_ACCURACY_MODE,
  applyAccuracyMode,
  getAccessoriesMultiplier,
} from "./accuracy";

interface PrimerInputs {
  inputMode?: number;
  area?: number;
  roomWidth?: number;
  roomLength?: number;
  roomHeight?: number;
  surfaceType?: number;
  primerType?: number;
  coats?: number;
  canSize?: number;
  accuracyMode?: AccuracyMode;
}

function getInputDefault(spec: PrimerCanonicalSpec, key: string, fallback: number): number {
  return spec.input_schema.find((field) => field.key === key)?.default_value ?? fallback;
}

function resolveWorkArea(spec: PrimerCanonicalSpec, rawInputs: PrimerInputs): number {
  const inputMode = Math.round(rawInputs.inputMode ?? getInputDefault(spec, "inputMode", 1));
  const hasRoomDimensions = rawInputs.roomWidth !== undefined && rawInputs.roomLength !== undefined && rawInputs.roomHeight !== undefined;

  if ((inputMode === 0 || (rawInputs.inputMode === undefined && hasRoomDimensions)) && hasRoomDimensions) {
    const roomWidth = Math.max(0.5, rawInputs.roomWidth ?? getInputDefault(spec, "roomWidth", 4));
    const roomLength = Math.max(0.5, rawInputs.roomLength ?? getInputDefault(spec, "roomLength", 5));
    const roomHeight = Math.max(2, rawInputs.roomHeight ?? getInputDefault(spec, "roomHeight", 2.7));
    return 2 * (roomWidth + roomLength) * roomHeight;
  }

  return Math.max(1, rawInputs.area ?? getInputDefault(spec, "area", 50));
}

function resolveCanSize(spec: PrimerCanonicalSpec, rawCanSize: number | undefined): number {
  const fallback = spec.packaging_rules.default_package_size;
  const requested = Math.max(1, rawCanSize ?? fallback);
  if (spec.packaging_rules.allowed_package_sizes.includes(requested)) {
    return requested;
  }
  return fallback;
}

function resolveSurface(spec: PrimerCanonicalSpec, rawSurfaceType: number | undefined): PrimerSurfaceSpec {
  const surfaceType = Math.max(0, Math.min(3, Math.round(rawSurfaceType ?? getInputDefault(spec, "surfaceType", 0))));
  return spec.normative_formula.surface_types.find((surface) => surface.id === surfaceType) ?? spec.normative_formula.surface_types[0];
}

function resolvePrimerType(spec: PrimerCanonicalSpec, rawPrimerType: number | undefined): PrimerTypeSpec {
  const primerType = Math.max(0, Math.min(2, Math.round(rawPrimerType ?? getInputDefault(spec, "primerType", 0))));
  return spec.normative_formula.primer_types.find((type) => type.id === primerType) ?? spec.normative_formula.primer_types[0];
}

function toEngineConfig(spec: PrimerCanonicalSpec, canSize: number, lPerSqm: number, coats: number): EngineCalculatorConfig {
  return {
    id: spec.calculator_id,
    title: spec.calculator_id,
    baseFormula: "coating_area_rate",
    baseParams: {
      consumption_kg_per_m2_mm: lPerSqm * coats,
    },
    enabledFactors: spec.field_factors.enabled,
    packaging: {
      unit: spec.packaging_rules.unit,
      options: [{ size: canSize, label: `primer-can-${canSize}${spec.packaging_rules.unit}` }],
    },
  };
}

function buildMaterials(
  primerType: PrimerTypeSpec,
  workArea: number,
  canSize: number,
  recExactNeed: number,
  recPurchaseQuantity: number,
  tools: PrimerCanonicalSpec["material_rules"],
): CanonicalMaterialResult[] {
  return [
    {
      name: `${primerType.label} (${canSize} л)`,
      quantity: roundDisplay(recExactNeed, 3),
      unit: "л",
      withReserve: roundDisplay(recPurchaseQuantity, 3),
      purchaseQty: roundDisplay(Math.ceil(recPurchaseQuantity / canSize) * canSize, 3),
      packageInfo: { count: Math.ceil(recPurchaseQuantity / canSize), size: canSize, packageUnit: "канистр" },
      category: "Основное",
    },
    {
      name: "Валик малярный 250 мм",
      quantity: Math.ceil(workArea / tools.roller_area_m2_per_piece),
      unit: "шт",
      withReserve: Math.ceil(workArea / tools.roller_area_m2_per_piece),
      purchaseQty: Math.ceil(workArea / tools.roller_area_m2_per_piece),
      category: "Инструмент",
    },
    {
      name: "Кисть для углов и примыканий",
      quantity: tools.brushes_count,
      unit: "шт",
      withReserve: tools.brushes_count,
      purchaseQty: tools.brushes_count,
      category: "Инструмент",
    },
    {
      name: "Кювета для грунтовки",
      quantity: tools.trays_count,
      unit: "шт",
      withReserve: tools.trays_count,
      purchaseQty: tools.trays_count,
      category: "Инструмент",
    },
  ];
}

export function computeCanonicalPrimer(
  spec: PrimerCanonicalSpec,
  inputs: PrimerInputs,
  factorTable: FactorTable,
): CanonicalCalculatorResult {
  const accuracyMode = inputs.accuracyMode ?? DEFAULT_ACCURACY_MODE;
  const workArea = resolveWorkArea(spec, inputs);
  const surface = resolveSurface(spec, inputs.surfaceType);
  const primerType = resolvePrimerType(spec, inputs.primerType);
  const coats = Math.max(1, Math.min(3, Math.round(inputs.coats ?? getInputDefault(spec, "coats", 1))));
  const canSize = resolveCanSize(spec, inputs.canSize);
  const lPerSqm = primerType.base_l_per_m2 * surface.multiplier;

  const accuracyOpt: AccuracyModeOption = { mode: accuracyMode, materialCategory: "primer" };
  const scenarios = computeEstimate(
    toEngineConfig(spec, canSize, lPerSqm, coats),
    {
      area_m2: workArea,
      thickness_mm: 1,
    },
    factorTable,
    accuracyOpt,
  );

  // Apply accessories multiplier to tools
  const accessoriesMult = getAccessoriesMultiplier("primer", accuracyMode);

  const warnings: string[] = [];
  if (spec.warnings_rules.absorbent_surface_ids.includes(surface.id) && primerType.id !== 0) {
    warnings.push("Для сильно впитывающих поверхностей рекомендуется грунтовка глубокого проникновения");
  }
  if (spec.warnings_rules.absorbent_surface_ids.includes(surface.id) && primerType.id === 1) {
    warnings.push("Бетон-контакт применяют в основном по гладким невпитывающим основаниям");
  }
  if (spec.warnings_rules.recommended_double_coat_surface_ids.includes(surface.id) && coats === 1) {
    warnings.push("Для впитывающих оснований обычно рекомендуют 2 слоя грунтовки");
  }

  const practicalNotes: string[] = [];
  practicalNotes.push("Грунтовка — не опция, а обязательный этап. Без неё шпаклёвка и краска отвалятся");

  // Build explanation
  const { explanation } = applyAccuracyMode(workArea * lPerSqm * coats, "primer", accuracyMode);

  // Apply accessories multiplier to tool quantities
  const rollerCount = Math.ceil((workArea / spec.material_rules.roller_area_m2_per_piece) * accessoriesMult);

  return {
    canonicalSpecId: spec.calculator_id,
    formulaVersion: spec.formula_version,
    materials: [
      {
        name: `${primerType.label} (${canSize} л)`,
        quantity: roundDisplay(scenarios.REC.exact_need, 3),
        unit: "л",
        withReserve: roundDisplay(scenarios.REC.purchase_quantity, 3),
        purchaseQty: roundDisplay(Math.ceil(scenarios.REC.purchase_quantity / canSize) * canSize, 3),
        packageInfo: { count: Math.ceil(scenarios.REC.purchase_quantity / canSize), size: canSize, packageUnit: "канистр" },
        category: "Основное",
      },
      {
        name: "Валик малярный 250 мм",
        quantity: rollerCount,
        unit: "шт",
        withReserve: rollerCount,
        purchaseQty: rollerCount,
        category: "Инструмент",
      },
      {
        name: "Кисть для углов и примыканий",
        quantity: spec.material_rules.brushes_count,
        unit: "шт",
        withReserve: spec.material_rules.brushes_count,
        purchaseQty: spec.material_rules.brushes_count,
        category: "Инструмент",
      },
      {
        name: "Кювета для грунтовки",
        quantity: spec.material_rules.trays_count,
        unit: "шт",
        withReserve: spec.material_rules.trays_count,
        purchaseQty: spec.material_rules.trays_count,
        category: "Инструмент",
      },
    ],
    totals: {
      area: roundDisplay(workArea, 3),
      inputMode: Math.round(inputs.inputMode ?? getInputDefault(spec, "inputMode", 1)),
      surfaceType: surface.id,
      primerType: primerType.id,
      coats,
      canSize,
      lPerSqm: roundDisplay(lPerSqm, 4),
      minExactNeedL: scenarios.MIN.exact_need,
      recExactNeedL: scenarios.REC.exact_need,
      maxExactNeedL: scenarios.MAX.exact_need,
      minPurchaseL: scenarios.MIN.purchase_quantity,
      recPurchaseL: scenarios.REC.purchase_quantity,
      maxPurchaseL: scenarios.MAX.purchase_quantity,
      dryingTimeHours: spec.material_rules.drying_time_hours_by_type[String(primerType.id)] ?? 4,
    },
    warnings,
    practicalNotes,
    scenarios,
    accuracyMode,
    accuracyExplanation: explanation,
  };
}
