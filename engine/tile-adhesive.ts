import { combineScenarioFactors, type FactorTable } from "./factors";
import { optimizePackaging } from "./packaging";
import { SCENARIOS, type ScenarioBundle } from "./scenarios";
import type {
  TileAdhesiveCanonicalSpec,
  CanonicalCalculatorResult,
  CanonicalMaterialResult,
} from "./canonical";
import { roundDisplay } from "./units";

/* ─── constants ─── */

const BASE_CONSUMPTION: Record<number, number> = {
  0: 3.0,  // small ≤30cm  kg/m²
  1: 5.0,  // medium 30-60cm
  2: 7.5,  // large ≥60cm
};

const WALL_FACTOR = 0.85;
const STREET_FACTOR = 1.3;
const OLD_TILE_FACTOR = 1.2;
const ADHESIVE_RESERVE = 1.1;

const PRIMER_L_PER_M2 = 0.15;
const PRIMER_RESERVE = 1.15;
const PRIMER_CAN = 10; // L

const TILE_SIZES_FOR_CROSS: Record<number, number> = {
  0: 0.3,  // m
  1: 0.45,
  2: 0.6,
};

const CROSSES_PER_TILE = 4;
const CROSS_RESERVE = 1.1;
const CROSS_PACK = 200;

/* ─── inputs ─── */

interface TileAdhesiveInputs {
  area?: number;
  tileSize?: number;
  laying?: number;
  base?: number;
  bagWeight?: number;
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
  const area = Math.max(1, Math.min(500, inputs.area ?? getInputDefault(spec, "area", 20)));
  const tileSize = Math.max(0, Math.min(2, Math.round(inputs.tileSize ?? getInputDefault(spec, "tileSize", 0))));
  const laying = Math.max(0, Math.min(2, Math.round(inputs.laying ?? getInputDefault(spec, "laying", 0))));
  const base = Math.max(0, Math.min(2, Math.round(inputs.base ?? getInputDefault(spec, "base", 0))));
  const bagWeight = (inputs.bagWeight ?? getInputDefault(spec, "bagWeight", 25)) === 5 ? 5 : 25;

  /* ─── formulas ─── */
  let adjustedRate = BASE_CONSUMPTION[tileSize] ?? BASE_CONSUMPTION[0];
  if (laying === 1) adjustedRate *= WALL_FACTOR;
  if (laying === 2) adjustedRate *= STREET_FACTOR;
  if (base === 2) adjustedRate *= OLD_TILE_FACTOR;

  const totalKg = area * adjustedRate * ADHESIVE_RESERVE;
  const bags = Math.ceil(totalKg / bagWeight);

  // Primer
  const primer = Math.ceil(area * PRIMER_L_PER_M2 * PRIMER_RESERVE / PRIMER_CAN);

  // Crosses
  const tileSideM = TILE_SIZES_FOR_CROSS[tileSize] ?? TILE_SIZES_FOR_CROSS[0];
  const tilesPerM2 = 1 / (tileSideM * tileSideM);
  const crosses = Math.ceil(area * tilesPerM2 * CROSSES_PER_TILE * CROSS_RESERVE);
  const crossPacks = Math.ceil(crosses / CROSS_PACK);

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
    {
      name: `Грунтовка (канистра ${PRIMER_CAN} л)`,
      quantity: primer,
      unit: "канистр",
      withReserve: primer,
      purchaseQty: primer,
      category: "Грунтовка",
    },
    {
      name: `Крестики (упаковка ${CROSS_PACK} шт)`,
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
  };
}
