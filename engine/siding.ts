import { combineScenarioFactors, type FactorTable } from "./factors";
import { optimizePackaging } from "./packaging";
import { SCENARIOS, type ScenarioBundle } from "./scenarios";
import type {
  SidingCanonicalSpec,
  CanonicalCalculatorResult,
  CanonicalMaterialResult,
} from "./canonical";
import { roundDisplay } from "./units";

/* ─── constants ─── */

const PANEL_AREAS: Record<number, number> = {
  0: 0.732,  // vinyl
  1: 0.9,    // metal
  2: 0.63,   // fibrocement
};

const PANEL_RESERVE = 1.10;
const STARTER_LENGTH = 3.66;
const J_PROFILE_LENGTH = 3.66;
const CORNER_LENGTH = 3.0;
const FINISH_LENGTH = 3.66;
const SCREWS_PER_M2 = 12;
const SCREW_RESERVE = 1.05;
const BATTEN_STEP = 0.5;
const BATTEN_RESERVE = 1.05;
const MEMBRANE_ROLL = 75;
const MEMBRANE_RESERVE = 1.15;
const SEALANT_PER_PERIM = 15;
const STARTER_RESERVE = 1.05;
const J_RESERVE = 1.10;
const CORNER_RESERVE = 1.05;

/* ─── labels ─── */

const SIDING_TYPE_LABELS: Record<number, string> = {
  0: "Виниловый сайдинг (0.732 м²)",
  1: "Металлический сайдинг (0.9 м²)",
  2: "Фиброцементный сайдинг (0.63 м²)",
};

/* ─── inputs ─── */

interface SidingInputs {
  facadeArea?: number;
  openingsArea?: number;
  perimeter?: number;
  height?: number;
  sidingType?: number;
  exteriorCorners?: number;
}

/* ─── helpers ─── */

function getInputDefault(spec: SidingCanonicalSpec, key: string, fallback: number): number {
  return spec.input_schema.find((field) => field.key === key)?.default_value ?? fallback;
}

/* ─── main ─── */

export function computeCanonicalSiding(
  spec: SidingCanonicalSpec,
  inputs: SidingInputs,
  factorTable: FactorTable,
): CanonicalCalculatorResult {
  const facadeArea = Math.max(10, Math.min(1000, Math.round(inputs.facadeArea ?? getInputDefault(spec, "facadeArea", 100))));
  const openingsArea = Math.max(0, Math.min(100, Math.round(inputs.openingsArea ?? getInputDefault(spec, "openingsArea", 10))));
  const perimeter = Math.max(10, Math.min(200, Math.round(inputs.perimeter ?? getInputDefault(spec, "perimeter", 40))));
  const height = Math.max(2, Math.min(15, Math.round(inputs.height ?? getInputDefault(spec, "height", 5))));
  const sidingType = Math.max(0, Math.min(2, Math.round(inputs.sidingType ?? getInputDefault(spec, "sidingType", 0))));
  const exteriorCorners = Math.max(0, Math.min(20, Math.round(inputs.exteriorCorners ?? getInputDefault(spec, "exteriorCorners", 4))));

  /* ─── panel area ─── */
  const panelArea = PANEL_AREAS[sidingType] ?? PANEL_AREAS[0];

  /* ─── formulas ─── */
  const netArea = facadeArea - openingsArea;
  const panels = Math.ceil(netArea / panelArea * PANEL_RESERVE);
  const starter = Math.ceil((perimeter + Math.sqrt(openingsArea) * 4) / STARTER_LENGTH);
  const jProfile = Math.ceil((Math.sqrt(openingsArea) * 4 * 2 + perimeter) * J_RESERVE / J_PROFILE_LENGTH);
  const corners = Math.ceil(height * exteriorCorners * CORNER_RESERVE / CORNER_LENGTH);
  const finish = Math.ceil(perimeter * STARTER_RESERVE / FINISH_LENGTH);
  const screws = Math.ceil(netArea * SCREWS_PER_M2 * SCREW_RESERVE);
  const battens = Math.ceil(netArea / BATTEN_STEP * BATTEN_RESERVE);
  const membrane = Math.ceil(netArea * MEMBRANE_RESERVE / MEMBRANE_ROLL);
  const sealant = Math.ceil(Math.sqrt(netArea) * 4 / SEALANT_PER_PERIM);

  /* ─── scenarios ─── */
  const packageOptions = [{
    size: 1,
    label: "siding-panel",
    unit: "шт",
  }];

  const scenarios = SCENARIOS.reduce((acc, scenario) => {
    const { multiplier, keyFactors } = combineScenarioFactors(factorTable, spec.field_factors.enabled, scenario);
    const exactNeed = roundDisplay(panels * multiplier, 6);
    const packaging = optimizePackaging(exactNeed, packageOptions);

    acc[scenario] = {
      exact_need: exactNeed,
      purchase_quantity: roundDisplay(packaging.purchaseQuantity, 6),
      leftover: roundDisplay(packaging.leftover, 6),
      assumptions: [
        `formula_version:${spec.formula_version}`,
        `sidingType:${sidingType}`,
        `exteriorCorners:${exteriorCorners}`,
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
      name: SIDING_TYPE_LABELS[sidingType],
      quantity: roundDisplay(recScenario.exact_need, 6),
      unit: "шт",
      withReserve: Math.ceil(recScenario.exact_need),
      purchaseQty: Math.ceil(recScenario.exact_need),
      category: "Облицовка",
    },
    {
      name: `Стартовая планка (${STARTER_LENGTH} м)`,
      quantity: starter,
      unit: "шт",
      withReserve: starter,
      purchaseQty: starter,
      category: "Профиль",
    },
    {
      name: `J-профиль (${J_PROFILE_LENGTH} м)`,
      quantity: jProfile,
      unit: "шт",
      withReserve: jProfile,
      purchaseQty: jProfile,
      category: "Профиль",
    },
    {
      name: `Наружный угол (${CORNER_LENGTH} м)`,
      quantity: corners,
      unit: "шт",
      withReserve: corners,
      purchaseQty: corners,
      category: "Профиль",
    },
    {
      name: `Финишная планка (${FINISH_LENGTH} м)`,
      quantity: finish,
      unit: "шт",
      withReserve: finish,
      purchaseQty: finish,
      category: "Профиль",
    },
    {
      name: "Саморезы",
      quantity: screws,
      unit: "шт",
      withReserve: screws,
      purchaseQty: screws,
      category: "Крепёж",
    },
    {
      name: "Обрешётка (м.п.)",
      quantity: battens,
      unit: "м.п.",
      withReserve: battens,
      purchaseQty: battens,
      category: "Подсистема",
    },
    {
      name: `Мембрана (${MEMBRANE_ROLL} м²)`,
      quantity: membrane,
      unit: "рулонов",
      withReserve: membrane,
      purchaseQty: membrane,
      category: "Изоляция",
    },
    {
      name: "Герметик (тубы)",
      quantity: sealant,
      unit: "шт",
      withReserve: sealant,
      purchaseQty: sealant,
      category: "Монтаж",
    },
  ];

  /* ─── warnings ─── */
  const warnings: string[] = [];
  if (netArea > 300) {
    warnings.push("Большая площадь — рассмотрите оптовую закупку сайдинга");
  }
  if (openingsArea > facadeArea * 0.3) {
    warnings.push("Большая площадь проёмов — проверьте количество доборных элементов");
  }


  const practicalNotes: string[] = [];
  practicalNotes.push("Сайдинг не прибивайте плотно — оставляйте зазор в крепёжном отверстии для расширения");

  return {
    canonicalSpecId: spec.calculator_id,
    formulaVersion: spec.formula_version,
    materials,
    totals: {
      facadeArea,
      openingsArea,
      perimeter,
      height,
      sidingType,
      exteriorCorners,
      panelArea,
      netArea,
      panels,
      starter,
      jProfile,
      corners,
      finish,
      screws,
      battens,
      membrane,
      sealant,
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
