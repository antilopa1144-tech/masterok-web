import { combineScenarioFactors, type FactorTable } from "./factors";
import { optimizePackaging } from "./packaging";
import { SCENARIOS, type ScenarioBundle } from "./scenarios";
import type {
  TileGroutCanonicalSpec,
  CanonicalCalculatorResult,
  CanonicalMaterialResult,
} from "./canonical";
import { roundDisplay } from "./units";
import { type AccuracyMode, DEFAULT_ACCURACY_MODE, applyAccuracyMode, getPrimaryMultiplier, getAccessoriesMultiplier } from "./accuracy";

/* ─── fallback constants (used only if spec doesn't provide values) ─── */

const DEFAULT_GROUT_DENSITY: Record<number, number> = {
  0: 1600, // cement, kg/m³
  1: 1400, // epoxy
  2: 1200, // polyurethane
};

const DEFAULT_GROUT_RESERVE = 1.1;

/* ─── inputs ─── */

interface TileGroutInputs {
  area?: number;
  tileWidth?: number;
  tileHeight?: number;
  tileThickness?: number;
  groutDepth?: number;
  jointWidth?: number;
  groutType?: number;
  bagSize?: number;
  accuracyMode?: AccuracyMode;
}

/* ─── helpers ─── */

function getInputDefault(spec: TileGroutCanonicalSpec, key: string, fallback: number): number {
  return spec.input_schema.find((field) => field.key === key)?.default_value ?? fallback;
}

/**
 * Resolve grout depth (how deep the joint is filled).
 * This is NOT the same as tile thickness — joints are typically filled
 * to 2/3 of tile thickness. Auto-resolve matches tile.ts logic.
 */
function resolveGroutDepth(tileWidthMm: number, tileHeightMm: number, requestedDepth: number | undefined): number {
  if (requestedDepth && requestedDepth > 0) return requestedDepth;
  const avgSizeCm = ((tileWidthMm + tileHeightMm) / 2) / 10;
  if (avgSizeCm < 15) return 4;
  if (avgSizeCm < 40) return 6;
  if (avgSizeCm <= 60) return 8;
  return 10;
}

/* ─── main ─── */

export function computeCanonicalTileGrout(
  spec: TileGroutCanonicalSpec,
  inputs: TileGroutInputs,
  factorTable: FactorTable,
): CanonicalCalculatorResult {
  const accuracyMode = inputs.accuracyMode ?? DEFAULT_ACCURACY_MODE;

  const area = Math.max(1, Math.min(500, inputs.area ?? getInputDefault(spec, "area", 20)));
  const tileWidth = Math.max(50, Math.min(1200, Math.round(inputs.tileWidth ?? getInputDefault(spec, "tileWidth", 300))));
  const tileHeight = Math.max(50, Math.min(1200, Math.round(inputs.tileHeight ?? getInputDefault(spec, "tileHeight", 300))));
  const tileThickness = Math.max(6, Math.min(25, Math.round(inputs.tileThickness ?? getInputDefault(spec, "tileThickness", 8))));
  const groutDepth = resolveGroutDepth(tileWidth, tileHeight, inputs.groutDepth);
  const jointWidth = Math.max(1, Math.min(20, Math.round(inputs.jointWidth ?? getInputDefault(spec, "jointWidth", 3))));
  const groutType = Math.max(0, Math.min(2, Math.round(inputs.groutType ?? getInputDefault(spec, "groutType", 0))));
  const bagSize = [1, 2, 5].includes(inputs.bagSize ?? getInputDefault(spec, "bagSize", 2))
    ? (inputs.bagSize ?? getInputDefault(spec, "bagSize", 2))
    : 2;

  /* ─── formulas ─── */
  // Joint length per m² (mm -> tiles per 1000mm)
  const jointLenPerM2 = (1000 / tileWidth) + (1000 / tileHeight);

  // Joint volume per m² in liters (use groutDepth, not tileThickness — joints are not filled to full tile depth)
  const jointVolPerM2 = jointLenPerM2 * (jointWidth / 1000) * (groutDepth / 1000) * 1000;

  // Density in kg/L — prefer spec values, fallback to hardcoded
  const specDensity = spec.material_rules?.grout_density;
  const densityKgM3 = specDensity ? (specDensity[String(groutType)] ?? specDensity["0"] ?? DEFAULT_GROUT_DENSITY[0]) : (DEFAULT_GROUT_DENSITY[groutType] ?? DEFAULT_GROUT_DENSITY[0]);
  const density = densityKgM3 / 1000;
  const groutReserve = spec.material_rules?.grout_reserve ?? DEFAULT_GROUT_RESERVE;

  const kgPerM2 = jointVolPerM2 * density;
  const totalKgRaw = area * kgPerM2 * groutReserve;
  const accuracyMult = getPrimaryMultiplier("grout", accuracyMode);
  const totalKg = totalKgRaw * accuracyMult;
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
      withReserve: roundDisplay(recScenario.purchase_quantity, 6),
      purchaseQty: Math.ceil(recScenario.purchase_quantity / bagSize) * bagSize,
      category: "Основное",
      packageInfo: { count: Math.ceil(recScenario.purchase_quantity / bagSize), size: bagSize, packageUnit: "мешков" },
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


  const practicalNotes: string[] = [];
  if (jointWidth > 5) {
    practicalNotes.push(`Широкий шов ${jointWidth} мм — используйте затирку с песком, обычная будет трескаться`);
  }
  practicalNotes.push("Затирайте диагональными движениями, а не вдоль шва — так не вымоете затирку");

  return {
    canonicalSpecId: spec.calculator_id,
    formulaVersion: spec.formula_version,
    materials,
    totals: {
      area: roundDisplay(area, 3),
      tileWidth,
      tileHeight,
      tileThickness,
      groutDepth,
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
    practicalNotes,
    scenarios,
    accuracyMode,
    accuracyExplanation: applyAccuracyMode(totalKgRaw, "grout", accuracyMode).explanation,
  };
}
