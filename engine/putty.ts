import { computeEstimate, type EngineCalculatorConfig } from "./compute";
import type { FactorTable } from "./factors";
import type {
  CanonicalCalculatorResult,
  CanonicalMaterialResult,
  PuttyCanonicalSpec,
  PuttyComponentSpec,
  PuttyQualityProfile,
} from "./canonical";
import type { ScenarioBundle, ScenarioName } from "./scenarios";
import { roundDisplay } from "./units";

const SCENARIO_NAMES: ScenarioName[] = ["MIN", "REC", "MAX"];

interface PuttyInputs {
  inputMode?: number;
  length?: number;
  width?: number;
  height?: number;
  area?: number;
  surface?: number;
  puttyType?: number;
  bagWeight?: number;
  qualityClass?: number;
  layers?: number;
  startLayers?: number;
  finishLayers?: number;
}

interface ResolvedPuttyComponent {
  component: PuttyComponentSpec;
  consumptionPerLayer: number;
  layers: number;
}

function getInputDefault(spec: PuttyCanonicalSpec, key: string, fallback: number): number {
  return spec.input_schema.find((field) => field.key === key)?.default_value ?? fallback;
}

function resolveWorkArea(spec: PuttyCanonicalSpec, rawInputs: PuttyInputs): number {
  const inputMode = Math.round(rawInputs.inputMode ?? getInputDefault(spec, "inputMode", 0));

  if (inputMode === 0) {
    const length = Math.max(1, rawInputs.length ?? getInputDefault(spec, "length", 5));
    const width = Math.max(1, rawInputs.width ?? getInputDefault(spec, "width", 4));
    const height = Math.max(2, rawInputs.height ?? getInputDefault(spec, "height", 2.7));
    const ceilingArea = length * width;
    const wallsArea = 2 * (length + width) * height;
    const surfaceMode = Math.round(rawInputs.surface ?? getInputDefault(spec, "surface", 0));

    if (surfaceMode === 0) return wallsArea;
    if (surfaceMode === 1) return ceilingArea;
    return wallsArea + ceilingArea;
  }

  return Math.max(1, rawInputs.area ?? getInputDefault(spec, "area", 50));
}

function resolveBagWeight(spec: PuttyCanonicalSpec, rawBagWeight: number | undefined): number {
  const fallback = spec.packaging_rules.default_package_size;
  const requested = Math.max(1, rawBagWeight ?? fallback);
  if (spec.packaging_rules.allowed_package_sizes.includes(requested)) {
    return requested;
  }
  return fallback;
}

function resolveQualityProfile(spec: PuttyCanonicalSpec, rawQualityClass: number | undefined): PuttyQualityProfile {
  const qualityClass = Math.max(0, Math.min(3, Math.round(rawQualityClass ?? getInputDefault(spec, "qualityClass", 0))));
  return spec.quality_profiles.find((profile) => profile.id === qualityClass) ?? spec.quality_profiles[0];
}

function resolveComponentLayers(
  spec: PuttyCanonicalSpec,
  rawInputs: PuttyInputs,
  componentKey: PuttyComponentSpec["key"],
  fallbackLayers: number,
): number {
  const legacyLayers = Math.max(0, Math.round(rawInputs.layers ?? getInputDefault(spec, "layers", 0)));
  const overrideKey = componentKey === "start" ? "startLayers" : "finishLayers";
  const explicitLayers = Math.max(0, Math.round(rawInputs[overrideKey] ?? getInputDefault(spec, overrideKey, 0)));

  if (explicitLayers > 0) return explicitLayers;
  if (legacyLayers > 0) return legacyLayers;
  return fallbackLayers;
}

function resolveComponents(
  spec: PuttyCanonicalSpec,
  rawInputs: PuttyInputs,
  puttyType: number,
  qualityProfile: PuttyQualityProfile,
): ResolvedPuttyComponent[] {
  return spec.normative_formula.components
    .filter((component) => component.enabled_for_putty_types.includes(puttyType))
    .map((component) => {
      const profileComponent = qualityProfile.components[component.key];
      const fallbackLayers = profileComponent?.default_layers ?? component.thickness_mm;
      return {
        component,
        consumptionPerLayer: profileComponent?.consumption_kg_per_m2_layer ?? component.consumption_kg_per_m2_mm,
        layers: resolveComponentLayers(spec, rawInputs, component.key, fallbackLayers),
      };
    });
}

function toEngineConfig(
  spec: PuttyCanonicalSpec,
  resolved: ResolvedPuttyComponent,
  bagWeight: number,
): EngineCalculatorConfig {
  return {
    id: `${spec.calculator_id}-${resolved.component.key}`,
    title: `${spec.calculator_id}-${resolved.component.key}`,
    baseFormula: "putty_area_thickness",
    baseParams: {
      consumption_kg_per_m2_mm: resolved.consumptionPerLayer,
    },
    enabledFactors: spec.field_factors.enabled,
    packaging: {
      unit: spec.packaging_rules.unit,
      options: [{ size: bagWeight, label: `bag-${bagWeight}kg` }],
    },
  };
}

function mergeScenarioBundles(
  scenarioBundles: ScenarioBundle[],
  bagWeight: number,
  unit: string,
  formulaVersion: string,
  qualityProfileKey: string,
): ScenarioBundle {
  return Object.fromEntries(
    SCENARIO_NAMES.map((name) => {
      const exactNeed = roundDisplay(
        scenarioBundles.reduce((sum, scenario) => sum + scenario[name].exact_need, 0),
        3,
      );
      const purchaseQuantity = roundDisplay(
        scenarioBundles.reduce((sum, scenario) => sum + scenario[name].purchase_quantity, 0),
        3,
      );
      const leftover = roundDisplay(
        scenarioBundles.reduce((sum, scenario) => sum + scenario[name].leftover, 0),
        3,
      );
      const assumptions = Array.from(
        new Set([
          `formula_version:${formulaVersion}`,
          `quality_profile:${qualityProfileKey}`,
          ...scenarioBundles.flatMap((scenario) => scenario[name].assumptions),
        ]),
      );
      const keyFactors = scenarioBundles[0]?.[name].key_factors ?? {};

      return [
        name,
        {
          exact_need: exactNeed,
          purchase_quantity: purchaseQuantity,
          leftover,
          assumptions,
          key_factors: keyFactors,
          buy_plan: {
            package_label: `bag-${bagWeight}kg-total`,
            package_size: bagWeight,
            packages_count: Math.ceil(purchaseQuantity / bagWeight),
            unit,
          },
        },
      ];
    }),
  ) as ScenarioBundle;
}

function buildComponentMaterial(
  resolved: ResolvedPuttyComponent,
  bundle: ScenarioBundle,
  bagWeight: number,
): CanonicalMaterialResult {
  const rec = bundle.REC;
  return {
    name: `Шпаклёвка ${resolved.component.label.toLowerCase()} (мешки ${bagWeight} кг)`,
    quantity: roundDisplay(rec.exact_need / bagWeight, 3),
    unit: "мешков",
    withReserve: rec.buy_plan.packages_count,
    purchaseQty: rec.buy_plan.packages_count,
    category: resolved.component.category,
  };
}

function buildAuxiliaryMaterials(
  spec: PuttyCanonicalSpec,
  workArea: number,
  puttyType: number,
): CanonicalMaterialResult[] {
  const materials: CanonicalMaterialResult[] = [];
  const rules = spec.material_rules;

  if (puttyType === 1 || puttyType === 2) {
    const serpyankaMeters = workArea * rules.serpyanka_linear_m_per_m2 * rules.serpyanka_reserve_factor;
    const serpyankaRolls = Math.ceil(serpyankaMeters / rules.serpyanka_roll_length_m);
    materials.push({
      name: `Серпянка (лента армировочная 45 мм, рулон ${rules.serpyanka_roll_length_m} м)`,
      quantity: roundDisplay(workArea * rules.serpyanka_linear_m_per_m2, 3),
      unit: "м.п.",
      withReserve: Math.ceil(serpyankaMeters),
      purchaseQty: serpyankaRolls,
      category: "Армирование",
    });
  }

  const primerCoats =
    puttyType === 0
      ? rules.primer_coats.finish_only
      : puttyType === 1
        ? rules.primer_coats.with_start
        : rules.primer_coats.start_only;
  const primerLiters = workArea * rules.primer_l_per_m2_per_coat * primerCoats;
  const primerCans = Math.ceil(primerLiters / 10);
  materials.push({
    name: "Грунтовка глубокого проникновения (10 л)",
    quantity: roundDisplay(primerLiters / 10, 3),
    unit: "канистр",
    withReserve: primerCans,
    purchaseQty: primerCans,
    category: "Подготовка",
  });

  if (rules.sandpaper_enabled_for_putty_types.includes(puttyType)) {
    const sandpaperSheets = Math.ceil(workArea / rules.sandpaper_m2_per_sheet);
    const purchaseQty = Math.ceil(sandpaperSheets * rules.sandpaper_reserve_factor);
    materials.push({
      name: "Наждачная бумага P180-P240",
      quantity: sandpaperSheets,
      unit: "листов",
      withReserve: purchaseQty,
      purchaseQty,
      category: "Шлифовка",
    });
  }

  return materials;
}

function findResolvedComponentLayers(
  resolvedComponents: ResolvedPuttyComponent[],
  componentKey: PuttyComponentSpec["key"],
): number {
  return resolvedComponents.find((component) => component.component.key === componentKey)?.layers ?? 0;
}

export function computeCanonicalPutty(
  spec: PuttyCanonicalSpec,
  inputs: PuttyInputs,
  factorTable: FactorTable,
): CanonicalCalculatorResult {
  const workArea = resolveWorkArea(spec, inputs);
  const puttyType = Math.max(0, Math.min(2, Math.round(inputs.puttyType ?? getInputDefault(spec, "puttyType", 0))));
  const bagWeight = resolveBagWeight(spec, inputs.bagWeight);
  const qualityProfile = resolveQualityProfile(spec, inputs.qualityClass);
  const resolvedComponents = resolveComponents(spec, inputs, puttyType, qualityProfile);

  const scenarioBundles = resolvedComponents.map((resolved) =>
    computeEstimate(
      toEngineConfig(spec, resolved, bagWeight),
      {
        area_m2: workArea,
        thickness_mm: resolved.layers,
      },
      factorTable,
    ),
  );

  const materials = [
    ...resolvedComponents.map((resolved, index) => buildComponentMaterial(resolved, scenarioBundles[index], bagWeight)),
    ...buildAuxiliaryMaterials(spec, workArea, puttyType),
  ];

  const warnings: string[] = [];
  if (workArea > spec.warnings_rules.mechanized_area_threshold_m2) {
    warnings.push("Для больших площадей рекомендуется нанесение шпаклёвки механизированным методом");
  }

  const scenarios = mergeScenarioBundles(
    scenarioBundles,
    bagWeight,
    spec.packaging_rules.unit,
    spec.formula_version,
    qualityProfile.key,
  );


  const practicalNotes: string[] = [];
  practicalNotes.push("Между слоями шпаклёвки — грунтовка и полная просушка. Минимум 12 часов между слоями");

  return {
    canonicalSpecId: spec.calculator_id,
    formulaVersion: spec.formula_version,
    materials,
    totals: {
      wallArea: roundDisplay(workArea, 3),
      puttyType,
      bagWeight,
      qualityClass: qualityProfile.id,
      startLayers: findResolvedComponentLayers(resolvedComponents, "start"),
      finishLayers: findResolvedComponentLayers(resolvedComponents, "finish"),
      minExactNeedKg: scenarios.MIN.exact_need,
      recExactNeedKg: scenarios.REC.exact_need,
      maxExactNeedKg: scenarios.MAX.exact_need,
      minPurchaseKg: scenarios.MIN.purchase_quantity,
      recPurchaseKg: scenarios.REC.purchase_quantity,
      maxPurchaseKg: scenarios.MAX.purchase_quantity,
    },
    warnings,
    practicalNotes,
    scenarios,
  };
}
