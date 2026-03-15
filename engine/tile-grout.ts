import { combineScenarioFactors, type FactorTable } from "./factors";
import { optimizePackaging } from "./packaging";
import { SCENARIOS, type ScenarioBundle } from "./scenarios";
import type {
  TileGroutCanonicalSpec,
  CanonicalCalculatorResult,
  CanonicalMaterialResult,
} from "./canonical";
import { roundDisplay } from "./units";

/* ─── constants ─── */

const GROUT_DENSITY: Record<number, number> = {
  0: 1600, // cement, kg/m³
  1: 1400, // epoxy
  2: 1200, // polyurethane
};

const GROUT_RESERVE = 1.1;

/* ─── inputs ─── */

interface TileGroutInputs {
  area?: number;
  tileWidth?: number;
  tileHeight?: number;
  tileThickness?: number;
  jointWidth?: number;
  groutType?: number;
  bagSize?: number;
}

/* ─── helpers ─── */

function getInputDefault(spec: TileGroutCanonicalSpec, key: string, fallback: number): number {
  return spec.input_schema.find((field) => field.key === key)?.default_value ?? fallback;
}

/* ─── main ─── */

export function computeCanonicalTileGrout(
  spec: TileGroutCanonicalSpec,
  inputs: TileGroutInputs,
  factorTable: FactorTable,
): CanonicalCalculatorResult {
  const area = Math.max(1, Math.min(500, inputs.area ?? getInputDefault(spec, "area", 20)));
  const tileWidth = Math.max(50, Math.min(1200, Math.round(inputs.tileWidth ?? getInputDefault(spec, "tileWidth", 300))));
  const tileHeight = Math.max(50, Math.min(1200, Math.round(inputs.tileHeight ?? getInputDefault(spec, "tileHeight", 300))));
  const tileThickness = Math.max(6, Math.min(25, Math.round(inputs.tileThickness ?? getInputDefault(spec, "tileThickness", 8))));
  const jointWidth = Math.max(1, Math.min(20, Math.round(inputs.jointWidth ?? getInputDefault(spec, "jointWidth", 3))));
  const groutType = Math.max(0, Math.min(2, Math.round(inputs.groutType ?? getInputDefault(spec, "groutType", 0))));
  const bagSize = [1, 2, 5].includes(inputs.bagSize ?? getInputDefault(spec, "bagSize", 2))
    ? (inputs.bagSize ?? getInputDefault(spec, "bagSize", 2))
    : 2;

  /* ─── formulas ─── */
  // Joint length per m² (mm -> tiles per 1000mm)
  const jointLenPerM2 = (1000 / tileWidth) + (1000 / tileHeight);

  // Joint volume per m² in liters
  const jointVolPerM2 = jointLenPerM2 * (jointWidth / 1000) * (tileThickness / 1000) * 1000;

  // Density in kg/L
  const density = (GROUT_DENSITY[groutType] ?? GROUT_DENSITY[0]) / 1000;

  const kgPerM2 = jointVolPerM2 * density;
  const totalKg = area * kgPerM2 * GROUT_RESERVE;
  const bags = Math.ceil(totalKg / bagSize);

  /* ─── scenarios ─── */
  const packageOptions = [{
    size: bagSize,
    label: `grout-bag-${bagSize}kg`,
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
        `groutType:${groutType}`,
        `bagSize:${bagSize}`,
        `tileWidth:${tileWidth}`,
        `tileHeight:${tileHeight}`,
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
  const groutTypeLabels: Record<number, string> = {
    0: "Затирка цементная",
    1: "Затирка эпоксидная",
    2: "Затирка полиуретановая",
  };

  const materials: CanonicalMaterialResult[] = [
    {
      name: `${groutTypeLabels[groutType]} ${bagSize}кг`,
      quantity: roundDisplay(recScenario.exact_need, 6),
      unit: "кг",
      withReserve: Math.ceil(recScenario.exact_need),
      purchaseQty: Math.ceil(recScenario.purchase_quantity / bagSize),
      category: "Основное",
    },
  ];

  /* ─── warnings ─── */
  const warnings: string[] = [];
  if (groutType === 1) {
    warnings.push("Эпоксидная затирка требует быстрого нанесения — готовьте небольшими порциями");
  }
  if (jointWidth >= 10) {
    warnings.push("Широкие швы — рекомендуется крупнозернистая затирка");
  }

  return {
    canonicalSpecId: spec.calculator_id,
    formulaVersion: spec.formula_version,
    materials,
    totals: {
      area: roundDisplay(area, 3),
      tileWidth,
      tileHeight,
      tileThickness,
      jointWidth,
      groutType,
      bagSize,
      jointLenPerM2: roundDisplay(jointLenPerM2, 6),
      jointVolPerM2: roundDisplay(jointVolPerM2, 6),
      density: roundDisplay(density, 3),
      kgPerM2: roundDisplay(kgPerM2, 6),
      totalKg: roundDisplay(totalKg, 3),
      bags,
      minExactNeed: scenarios.MIN.exact_need,
      recExactNeed: recScenario.exact_need,
      maxExactNeed: scenarios.MAX.exact_need,
      minPurchase: scenarios.MIN.purchase_quantity,
      recPurchase: recScenario.purchase_quantity,
      maxPurchase: scenarios.MAX.purchase_quantity,
    },
    warnings,
    scenarios,
  };
}
