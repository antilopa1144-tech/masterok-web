import { combineScenarioFactors, type FactorTable } from "./factors";
import { optimizePackaging } from "./packaging";
import { SCENARIOS, type ScenarioBundle } from "./scenarios";
import type {
  CeilingRailCanonicalSpec,
  CanonicalCalculatorResult,
  CanonicalMaterialResult,
} from "./canonical";
import { roundDisplay } from "./units";

interface CeilingRailInputs {
  area?: number;
  railWidth?: number;
  railLength?: number;
  roomLength?: number;
}

/* ─── constants ─── */

const RAIL_RESERVE = 1.1;
const T_PROFILE_SPACING = 1.0;
const T_PROFILE_LENGTH = 3;
const T_RESERVE = 1.05;
const HANGER_SPACING = 1.2;
const SCREWS_PER_HANGER = 4;
const SCREWS_PER_RAIL = 2;
const SCREWS_PER_KG = 1000;  // 3.5×25 мм

/* ─── helpers ─── */

function getInputDefault(spec: CeilingRailCanonicalSpec, key: string, fallback: number): number {
  return spec.input_schema.find((field) => field.key === key)?.default_value ?? fallback;
}

function resolveArea(spec: CeilingRailCanonicalSpec, inputs: CeilingRailInputs): number {
  return Math.max(1, Math.min(200, inputs.area ?? getInputDefault(spec, "area", 20)));
}

function resolveRailWidth(spec: CeilingRailCanonicalSpec, inputs: CeilingRailInputs): number {
  const raw = Math.round(inputs.railWidth ?? getInputDefault(spec, "railWidth", 100));
  const allowed = [100, 150, 200];
  return allowed.includes(raw) ? raw : 100;
}

function resolveRailLength(spec: CeilingRailCanonicalSpec, inputs: CeilingRailInputs): number {
  const raw = inputs.railLength ?? getInputDefault(spec, "railLength", 3.0);
  const allowed = [3.0, 3.6, 4.0];
  const closest = allowed.reduce((prev, curr) =>
    Math.abs(curr - raw) < Math.abs(prev - raw) ? curr : prev
  );
  return closest;
}

function resolveRoomLength(spec: CeilingRailCanonicalSpec, inputs: CeilingRailInputs): number {
  return Math.max(1, Math.min(30, inputs.roomLength ?? getInputDefault(spec, "roomLength", 5)));
}

/* ─── main ─── */

export function computeCanonicalCeilingRail(
  spec: CeilingRailCanonicalSpec,
  inputs: CeilingRailInputs,
  factorTable: FactorTable,
): CanonicalCalculatorResult {
  const area = resolveArea(spec, inputs);
  const railWidth = resolveRailWidth(spec, inputs);
  const railLength = resolveRailLength(spec, inputs);
  const roomLength = resolveRoomLength(spec, inputs);

  const roomWidth = area / roomLength;

  /* Rails */
  const railRows = Math.ceil(roomWidth / (railWidth / 1000));
  const totalRailLen = railRows * roomLength * RAIL_RESERVE;
  const railPcs = Math.ceil(totalRailLen / railLength);

  /* T-profile guides */
  const guideCount = Math.ceil(roomLength / T_PROFILE_SPACING) + 1;
  const guideTotal = guideCount * roomWidth * T_RESERVE;
  const guidePcs = Math.ceil(guideTotal / T_PROFILE_LENGTH);

  /* Hangers */
  const hangers = Math.ceil((roomWidth / HANGER_SPACING) + 1) * guideCount;

  /* Screws & dubels */
  const screwsPcs = hangers * SCREWS_PER_HANGER + railPcs * SCREWS_PER_RAIL;
  const screwsKg = Math.ceil(screwsPcs / SCREWS_PER_KG * 10) / 10;
  const dubels = hangers;

  /* ─── scenarios ─── */
  const packageOptions = [{
    size: spec.packaging_rules.package_size,
    label: `rail-${railWidth}mm`,
    unit: spec.packaging_rules.unit,
  }];

  const scenarios = SCENARIOS.reduce((acc, scenario) => {
    const { multiplier, keyFactors } = combineScenarioFactors(factorTable, spec.field_factors.enabled, scenario);
    const exactNeed = roundDisplay(railPcs * multiplier, 6);
    const packaging = optimizePackaging(exactNeed, packageOptions);

    acc[scenario] = {
      exact_need: exactNeed,
      purchase_quantity: roundDisplay(packaging.purchaseQuantity, 6),
      leftover: roundDisplay(packaging.leftover, 6),
      assumptions: [
        `formula_version:${spec.formula_version}`,
        `railWidth:${railWidth}`,
        `railLength:${railLength}`,
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
      name: `Рейка ${railWidth} мм × ${railLength} м`,
      quantity: roundDisplay(recScenario.exact_need, 6),
      unit: "шт",
      withReserve: Math.ceil(recScenario.exact_need),
      purchaseQty: Math.ceil(recScenario.exact_need),
      category: "Основное",
    },
    {
      name: "Т-профиль (стрингер) 3м",
      quantity: guidePcs,
      unit: "шт",
      withReserve: guidePcs,
      purchaseQty: guidePcs,
      category: "Каркас",
    },
    {
      name: "Подвес",
      quantity: hangers,
      unit: "шт",
      withReserve: hangers,
      purchaseQty: hangers,
      category: "Крепёж",
    },
    {
      name: "Саморезы",
      quantity: screwsKg,
      unit: "кг",
      withReserve: screwsKg,
      purchaseQty: Math.ceil(screwsKg),
      category: "Крепёж",
    },
    {
      name: "Дюбели",
      quantity: dubels,
      unit: "шт",
      withReserve: dubels,
      purchaseQty: dubels,
      category: "Крепёж",
    },
  ];

  /* ─── warnings ─── */
  const warnings: string[] = [];
  if (area > spec.warnings_rules.large_area_threshold_m2) {
    warnings.push("Большая площадь — рекомендуется профессиональный монтаж");
  }


  const practicalNotes: string[] = [];
  practicalNotes.push("Рейки монтируйте перпендикулярно окну — так свет скроет стыки");

  return {
    canonicalSpecId: spec.calculator_id,
    formulaVersion: spec.formula_version,
    materials,
    totals: {
      area: roundDisplay(area, 3),
      railWidth,
      railLength,
      roomLength: roundDisplay(roomLength, 3),
      roomWidth: roundDisplay(roomWidth, 3),
      railRows,
      totalRailLen: roundDisplay(totalRailLen, 3),
      railPcs,
      guideCount,
      guidePcs,
      hangers,
      screws: screwsKg,
      dubels,
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
