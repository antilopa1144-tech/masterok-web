import { combineScenarioFactors, type FactorTable } from "./factors";
import { optimizePackaging } from "./packaging";
import { SCENARIOS, type ScenarioBundle } from "./scenarios";
import { buildPrimerMaterial } from "./smart-packaging";
import type {
  TileAdhesiveCanonicalSpec,
  CanonicalCalculatorResult,
  CanonicalMaterialResult,
} from "./canonical";
import { roundDisplay } from "./units";
import { type AccuracyMode, DEFAULT_ACCURACY_MODE, applyAccuracyMode, getPrimaryMultiplier, getAccessoriesMultiplier } from "./accuracy";

/* ─── defaults (fallback if spec.material_rules is missing a field) ─── */

const TA_DEFAULTS = {
  base_consumption: { "0": 3.0, "1": 5.0, "2": 7.5 } as Record<string, number>,
  wall_factor: 0.85,
  street_factor: 1.3,
  old_tile_factor: 1.2,
  adhesive_reserve: 1.1,
  primer_l_per_m2: 0.15,
  primer_reserve: 1.15,
  primer_can: 10,
  tile_sizes_for_cross: { "0": 0.3, "1": 0.45, "2": 0.6 } as Record<string, number>,
  crosses_per_tile: 4,
  cross_reserve: 1.1,
  cross_pack: 200,
};

function taMr<T>(spec: TileAdhesiveCanonicalSpec, key: string, fallback: T): T {
  const rules = spec.material_rules as unknown as Record<string, unknown>;
  return (rules?.[key] as T) ?? fallback;
}

/* ─── inputs ─── */

interface TileAdhesiveInputs {
  area?: number;
  tileSize?: number;
  laying?: number;
  base?: number;
  bagWeight?: number;
  accuracyMode?: AccuracyMode;
}

/* ─── helpers ─── */

function getInputDefault(spec: TileAdhesiveCanonicalSpec, key: string, fallback: number): number {
  return spec.input_schema.find((field) => field.key === key)?.default_value ?? fallback;
}

/* ─── main ─── */

export function computeCanonicalTileAdhesive(
  spec: TileAdhesiveCanonicalSpec,
  inputs: TileAdhesiveInputs,
  factorTable: FactorTable,
): CanonicalCalculatorResult {
  const accuracyMode = inputs.accuracyMode ?? DEFAULT_ACCURACY_MODE;

  const area = Math.max(1, Math.min(500, inputs.area ?? getInputDefault(spec, "area", 20)));
  const tileSize = Math.max(0, Math.min(2, Math.round(inputs.tileSize ?? getInputDefault(spec, "tileSize", 0))));
  const laying = Math.max(0, Math.min(2, Math.round(inputs.laying ?? getInputDefault(spec, "laying", 0))));
  const base = Math.max(0, Math.min(2, Math.round(inputs.base ?? getInputDefault(spec, "base", 0))));
  const bagWeight = (inputs.bagWeight ?? getInputDefault(spec, "bagWeight", 25)) === 5 ? 5 : 25;

  /* ─── read material rules from spec with fallbacks ─── */
  const baseConsumption = taMr(spec, "base_consumption", TA_DEFAULTS.base_consumption);
  const wallFactor = taMr(spec, "wall_factor", TA_DEFAULTS.wall_factor);
  const streetFactor = taMr(spec, "street_factor", TA_DEFAULTS.street_factor);
  const oldTileFactor = taMr(spec, "old_tile_factor", TA_DEFAULTS.old_tile_factor);
  const adhesiveReserve = taMr(spec, "adhesive_reserve", TA_DEFAULTS.adhesive_reserve);
  const primerLPerM2 = taMr(spec, "primer_l_per_m2", TA_DEFAULTS.primer_l_per_m2);
  const primerReserve = taMr(spec, "primer_reserve", TA_DEFAULTS.primer_reserve);
  const primerCan = taMr(spec, "primer_can", TA_DEFAULTS.primer_can);
  const tileSizesForCross = taMr(spec, "tile_sizes_for_cross", TA_DEFAULTS.tile_sizes_for_cross);
  const crossesPerTile = taMr(spec, "crosses_per_tile", TA_DEFAULTS.crosses_per_tile);
  const crossReserve = taMr(spec, "cross_reserve", TA_DEFAULTS.cross_reserve);
  const crossPack = taMr(spec, "cross_pack", TA_DEFAULTS.cross_pack);

  /* ─── formulas ─── */
  let adjustedRate = baseConsumption[String(tileSize)] ?? baseConsumption["0"];
  if (laying === 1) adjustedRate *= wallFactor;
  if (laying === 2) adjustedRate *= streetFactor;
  if (base === 2) adjustedRate *= oldTileFactor;

  const totalKgRaw = area * adjustedRate * adhesiveReserve;
  const accuracyMult = getPrimaryMultiplier("tile_adhesive", accuracyMode);
  const totalKg = totalKgRaw * accuracyMult;
  const bags = Math.ceil(totalKg / bagWeight);

  // Primer
  const primer = Math.ceil(area * primerLPerM2 * primerReserve / primerCan);

  // Crosses
  const tileSideM = tileSizesForCross[String(tileSize)] ?? tileSizesForCross["0"];
  const tilesPerM2 = 1 / (tileSideM * tileSideM);
  const crosses = Math.ceil(area * tilesPerM2 * crossesPerTile * crossReserve);
  const crossPacks = Math.ceil(crosses / crossPack);

  /* ─── scenarios ─── */
  const packageOptions = [{
    size: bagWeight,
    label: `adhesive-bag-${bagWeight}kg`,
    unit: "мешков",
  }];

  const scenarios = SCENARIOS.reduce((acc, scenario) => {
    const { multiplier, keyFactors } = combineScenarioFactors(factorTable, spec.field_factors.enabled, scenario);
    const exactNeed = roundDisplay(totalKg * multiplier, 6);
    const packaging = optimizePackaging(exactNeed, packageOptions);

    acc[scenario] = {
      exact_need: exactNeed,
      purchase_quantity: roundDisplay(packaging.purchaseQuantity, 6),
      leftover: roundDisplay(packaging.leftover, 6),
      assumptions: [
        `formula_version:${spec.formula_version}`,
        `tileSize:${tileSize}`,
        `laying:${laying}`,
        `base:${base}`,
        `bagWeight:${bagWeight}`,
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
      name: `Плиточный клей ${bagWeight}кг`,
      quantity: roundDisplay(recScenario.exact_need, 6),
      unit: "кг",
      withReserve: roundDisplay(recScenario.purchase_quantity, 6),
      purchaseQty: Math.ceil(recScenario.purchase_quantity / bagWeight) * bagWeight,
      category: "Основное",
      packageInfo: { count: Math.ceil(recScenario.purchase_quantity / bagWeight), size: bagWeight, packageUnit: "мешков" },
    },
    { ...buildPrimerMaterial(area * primerLPerM2, { reserveFactor: primerReserve }), category: "Грунтовка" },
    {
      name: `Крестики (упаковка ${crossPack} шт)`,
      quantity: crossPacks,
      unit: "упаковок",
      withReserve: crossPacks,
      purchaseQty: crossPacks,
      category: "Расходники",
    },
  ];

  /* ─── warnings ─── */
  const warnings: string[] = [];
  if (tileSize === 2) {
    warnings.push("Крупноформатная плитка — рекомендуется гребёнка 12 мм");
  }
  if (base === 2) {
    warnings.push("Укладка на старую плитку — обязателен контактный грунт");
  }

  const practicalNotes: string[] = [];
  if (tileSize === 2) {
    practicalNotes.push("Крупная плитка — используйте гребёнку 10-12 мм и клей класса С2");
  }
  practicalNotes.push("Не замешивайте больше клея, чем уложите за 30 минут — он теряет адгезию");

  return {
    canonicalSpecId: spec.calculator_id,
    formulaVersion: spec.formula_version,
    materials,
    totals: {
      area: roundDisplay(area, 3),
      tileSize,
      laying,
      base,
      bagWeight,
      adjustedRate: roundDisplay(adjustedRate, 3),
      totalKg: roundDisplay(totalKg, 3),
      bags,
      primer,
      tilesPerM2: roundDisplay(tilesPerM2, 3),
      crosses,
      crossPacks,
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
    accuracyMode,
    accuracyExplanation: applyAccuracyMode(totalKgRaw, "tile_adhesive", accuracyMode).explanation,
  };
}
