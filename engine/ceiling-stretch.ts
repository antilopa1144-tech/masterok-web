import { combineScenarioFactors, type FactorTable } from "./factors";
import { optimizePackaging } from "./packaging";
import { SCENARIOS, type ScenarioBundle } from "./scenarios";
import type {
  CeilingStretchCanonicalSpec,
  CanonicalCalculatorResult,
  CanonicalMaterialResult,
} from "./canonical";
import { roundDisplay } from "./units";
import { type AccuracyMode, DEFAULT_ACCURACY_MODE, applyAccuracyMode, getPrimaryMultiplier } from "./accuracy";

interface CeilingStretchInputs {
  area?: number;
  corners?: number;
  fixtures?: number;
  type?: number;
  /** Количество ниш под потолком — каждая добавляет периметр для багета и углы. */
  nichesCount?: number;
  /** Дополнительный периметр короба (например, для скрытой подсветки), м. */
  boxPerimeterM?: number;
  accuracyMode?: AccuracyMode;
}

/* ─── constants ─── */

const BAGUET_RESERVE = 1.1;
const BAGUET_LENGTH = 2.5;
const INSERT_RESERVE = 1.1;
const MASKING_TAPE_ROLL = 50;

/* ─── helpers ─── */

function getInputDefault(spec: CeilingStretchCanonicalSpec, key: string, fallback: number): number {
  return spec.input_schema.find((field) => field.key === key)?.default_value ?? fallback;
}

function resolveArea(spec: CeilingStretchCanonicalSpec, inputs: CeilingStretchInputs): number {
  return Math.max(1, Math.min(500, inputs.area ?? getInputDefault(spec, "area", 20)));
}

function resolveCorners(spec: CeilingStretchCanonicalSpec, inputs: CeilingStretchInputs): number {
  return Math.max(3, Math.min(20, Math.round(inputs.corners ?? getInputDefault(spec, "corners", 4))));
}

function resolveFixtures(spec: CeilingStretchCanonicalSpec, inputs: CeilingStretchInputs): number {
  return Math.max(0, Math.min(50, Math.round(inputs.fixtures ?? getInputDefault(spec, "fixtures", 4))));
}

function resolveType(spec: CeilingStretchCanonicalSpec, inputs: CeilingStretchInputs): number {
  return Math.max(0, Math.min(2, Math.round(inputs.type ?? getInputDefault(spec, "type", 0))));
}

/* ─── main ─── */

export function computeCanonicalCeilingStretch(
  spec: CeilingStretchCanonicalSpec,
  inputs: CeilingStretchInputs,
  factorTable: FactorTable,
): CanonicalCalculatorResult {
  const accuracyMode = inputs.accuracyMode ?? DEFAULT_ACCURACY_MODE;
  const accuracyMult = getPrimaryMultiplier("generic", accuracyMode);

  const area = resolveArea(spec, inputs);
  const cornersBase = resolveCorners(spec, inputs);
  const fixtures = resolveFixtures(spec, inputs);
  const type = resolveType(spec, inputs);
  const nichesCount = Math.max(0, Math.min(10, Math.round(inputs.nichesCount ?? getInputDefault(spec, "nichesCount", 0))));
  const boxPerimeterM = Math.max(0, Math.min(50, inputs.boxPerimeterM ?? getInputDefault(spec, "boxPerimeterM", 0)));

  /* Perimeter estimate from area (square approximation) */
  const basePerim = Math.sqrt(area) * 4;
  // Дополнительный периметр от ниш и короба
  const nichePerimEach = (spec.material_rules as { niche_perimeter_m_each?: number }).niche_perimeter_m_each ?? 4;
  const nicheCornersEach = (spec.material_rules as { niche_corner_count_each?: number }).niche_corner_count_each ?? 4;
  const extraPerim = nichesCount * nichePerimEach + boxPerimeterM;
  const perim = basePerim + extraPerim;
  // Углы: базовые + по 4 на каждую нишу
  const corners = cornersBase + nichesCount * nicheCornersEach;

  /* Baguette profiles */
  const baguetLen = perim * BAGUET_RESERVE;
  const profilePcsRaw = Math.ceil(baguetLen / BAGUET_LENGTH);
  const profilePcs = Math.ceil(profilePcsRaw * accuracyMult);

  /* Decorative insert */
  const insertLen = perim * INSERT_RESERVE;

  /* Masking tape */
  const maskingTape = Math.ceil(perim * BAGUET_RESERVE / MASKING_TAPE_ROLL);

  /* ─── scenarios ─── */
  const packageOptions = [{
    size: spec.packaging_rules.package_size,
    label: `baguet-profile`,
    unit: spec.packaging_rules.unit,
  }];

  const scenarios = SCENARIOS.reduce((acc, scenario) => {
    const { multiplier, keyFactors } = combineScenarioFactors(factorTable, spec.field_factors.enabled, scenario);
    const exactNeed = roundDisplay(profilePcs * multiplier, 6);
    const packaging = optimizePackaging(exactNeed, packageOptions);

    acc[scenario] = {
      exact_need: exactNeed,
      purchase_quantity: roundDisplay(packaging.purchaseQuantity, 6),
      leftover: roundDisplay(packaging.leftover, 6),
      assumptions: [
        `formula_version:${spec.formula_version}`,
        `type:${type}`,
        `corners:${corners}`,
        `fixtures:${fixtures}`,
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

  const typeLabels: Record<number, string> = {
    0: "ПВХ глянец",
    1: "ПВХ матовый",
    2: "Полиэстер",
  };

  /* ─── materials ─── */
  const materials: CanonicalMaterialResult[] = [
    {
      name: "Багетный профиль 2.5м",
      quantity: roundDisplay(recScenario.exact_need, 6),
      unit: "шт",
      withReserve: Math.ceil(recScenario.exact_need),
      purchaseQty: Math.ceil(recScenario.exact_need),
      category: "Каркас",
    },
    {
      name: "Декоративная вставка",
      quantity: roundDisplay(insertLen, 3),
      unit: "м",
      withReserve: Math.ceil(insertLen),
      purchaseQty: Math.ceil(insertLen),
      category: "Отделка",
    },
    {
      name: "Маскировочная лента 50м",
      quantity: maskingTape,
      unit: "рулонов",
      withReserve: maskingTape,
      purchaseQty: maskingTape,
      category: "Отделка",
    },
    {
      name: "Обработка углов",
      quantity: corners,
      unit: "шт",
      withReserve: corners,
      purchaseQty: corners,
      category: "Монтаж",
    },
    {
      name: "Усилительные кольца для светильников",
      quantity: fixtures,
      unit: "шт",
      withReserve: fixtures,
      purchaseQty: fixtures,
      category: "Монтаж",
    },
  ];

  /* ─── warnings ─── */
  const warnings: string[] = [];
  if (area > spec.warnings_rules.large_area_threshold_m2) {
    warnings.push("Большая площадь — возможно потребуется разделительный профиль");
  }
  if (fixtures > spec.warnings_rules.many_fixtures_threshold) {
    warnings.push("Много светильников — рекомендуется усиленное крепление");
  }


  const practicalNotes: string[] = [];
  practicalNotes.push("Натяжной потолок опускает высоту на 3-5 см. Учитывайте при выборе люстры");

  return {
    canonicalSpecId: spec.calculator_id,
    formulaVersion: spec.formula_version,
    materials,
    totals: {
      area: roundDisplay(area, 3),
      type,
      corners,
      fixtures,
      nichesCount,
      boxPerimeterM: roundDisplay(boxPerimeterM, 3),
      basePerim: roundDisplay(basePerim, 3),
      extraPerim: roundDisplay(extraPerim, 3),
      perim: roundDisplay(perim, 3),
      baguetLen: roundDisplay(baguetLen, 3),
      profilePcs,
      insertLen: roundDisplay(insertLen, 3),
      maskingTape,
      minExactNeed: scenarios.MIN.exact_need,
      recExactNeed: recScenario.exact_need,
      maxExactNeed: scenarios.MAX.exact_need,
      minPurchase: scenarios.MIN.purchase_quantity,
      recPurchase: recScenario.purchase_quantity,
      maxPurchase: scenarios.MAX.purchase_quantity,
    },
    accuracyMode,
    accuracyExplanation: applyAccuracyMode(profilePcsRaw, "generic", accuracyMode).explanation,
    warnings,
    practicalNotes,
    scenarios,
  };
}
