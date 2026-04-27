import { combineScenarioFactors, type FactorTable } from "./factors";
import { optimizePackaging } from "./packaging";
import { SCENARIOS, type ScenarioBundle } from "./scenarios";
import type {
  GuttersCanonicalSpec,
  CanonicalCalculatorResult,
  CanonicalMaterialResult,
} from "./canonical";
import { roundDisplay } from "./units";
import { type AccuracyMode, DEFAULT_ACCURACY_MODE, applyAccuracyMode, getPrimaryMultiplier } from "./accuracy";

/* ─── constants ─── */

const GUTTER_RESERVE = 1.05;
const HOOK_STEP_M = 0.6;
const HOOK_RESERVE = 1.05;
const PIPE_CLAMP_STEP_M = 1.5;
const PIPE_CLAMP_RESERVE = 1.05;
const BUILDING_CORNERS = 8; // 4 corners × 2 elbows
const CONNECTOR_RESERVE = 1.05;
const SEALANT_CONNECTIONS_PER_TUBE = 20;
const SEALANT_TUBE_ML = 310;
const RECOMMENDED_FUNNEL_INTERVAL_M = 11;

/* ─── inputs ─── */

interface GuttersInputs {
  roofPerimeter?: number;
  roofHeight?: number;
  funnels?: number;
  gutterDia?: number;
  gutterLength?: number;
  /** Количество колен/отводов 45° (на изгибах трассы трубы). Если 0 и bendCount90=0
   *  — используется legacy формула (corners=8, knees=funnels). */
  bendCount45?: number;
  /** Количество колен/отводов 90° (типично — отвод от воронки). */
  bendCount90?: number;
  accuracyMode?: AccuracyMode;
}

/* ─── helpers ─── */

function getInputDefault(spec: GuttersCanonicalSpec, key: string, fallback: number): number {
  return spec.input_schema.find((field) => field.key === key)?.default_value ?? fallback;
}

/* ─── main ─── */

export function computeCanonicalGutters(
  spec: GuttersCanonicalSpec,
  inputs: GuttersInputs,
  factorTable: FactorTable,
): CanonicalCalculatorResult {
  const accuracyMode = inputs.accuracyMode ?? DEFAULT_ACCURACY_MODE;
  const accuracyMult = getPrimaryMultiplier("generic", accuracyMode);

  const roofPerimeter = Math.max(5, Math.min(200, inputs.roofPerimeter ?? getInputDefault(spec, "roofPerimeter", 40)));
  const roofHeight = Math.max(2, Math.min(15, inputs.roofHeight ?? getInputDefault(spec, "roofHeight", 5)));
  const funnels = Math.max(1, Math.min(20, Math.round(inputs.funnels ?? getInputDefault(spec, "funnels", 4))));
  const gutterDia = Math.max(75, Math.min(125, Math.round(inputs.gutterDia ?? getInputDefault(spec, "gutterDia", 90))));
  const gutterLength = Math.max(3, Math.min(4, Math.round(inputs.gutterLength ?? getInputDefault(spec, "gutterLength", 3))));
  const bendCount45 = Math.max(0, Math.min(20, Math.round(inputs.bendCount45 ?? getInputDefault(spec, "bendCount45", 0))));
  const bendCount90 = Math.max(0, Math.min(20, Math.round(inputs.bendCount90 ?? getInputDefault(spec, "bendCount90", 0))));
  const useLegacyBends = bendCount45 === 0 && bendCount90 === 0;

  /* ─── gutters ─── */
  const gutterPcs = Math.ceil(roofPerimeter / gutterLength * GUTTER_RESERVE);

  /* ─── pipes ─── */
  const pipePerFunnel = Math.ceil(roofHeight / gutterLength) + 1;
  const pipePcs = pipePerFunnel * funnels;

  /* ─── gutter joints ─── */
  const gutterJoints = Math.ceil(roofPerimeter / gutterLength) - 1;

  /* ─── hooks ─── */
  const gutterHooks = Math.ceil(roofPerimeter / HOOK_STEP_M * HOOK_RESERVE);

  /* ─── pipe clamps ─── */
  const pipeClamps = Math.ceil(roofHeight / PIPE_CLAMP_STEP_M * funnels * PIPE_CLAMP_RESERVE);

  /* ─── corners (legacy) и явные колена 45/90 ─── */
  const corners = useLegacyBends ? BUILDING_CORNERS : 0;
  const elbows45 = useLegacyBends ? 0 : bendCount45;
  const elbows90 = useLegacyBends ? 0 : bendCount90;

  /* ─── knee elbows (отводы от воронки к стене) ─── */
  const kneeElbows = funnels;

  /* ─── end caps ─── */
  const endCaps = funnels;

  /* ─── connectors ─── */
  const connectors = Math.ceil(gutterJoints * CONNECTOR_RESERVE);

  /* ─── sealant ─── */
  const sealantTubes = Math.ceil((gutterJoints + funnels * 2) / SEALANT_CONNECTIONS_PER_TUBE);

  /* ─── primary quantity for scenarios ─── */
  const primaryQuantityRaw = gutterPcs;
  const primaryQuantity = Math.ceil(primaryQuantityRaw * accuracyMult);
  const primaryUnit = "шт";
  const primaryLabel = `gutter-${gutterDia}mm-${gutterLength}m`;

  /* ─── scenarios ─── */
  const packageOptions = [{
    size: 1,
    label: primaryLabel,
    unit: primaryUnit,
  }];

  const scenarios = SCENARIOS.reduce((acc, scenario) => {
    const { multiplier, keyFactors } = combineScenarioFactors(factorTable, spec.field_factors.enabled, scenario);
    const exactNeed = roundDisplay(primaryQuantity * multiplier, 6);
    const packaging = optimizePackaging(exactNeed, packageOptions);

    acc[scenario] = {
      exact_need: exactNeed,
      purchase_quantity: roundDisplay(packaging.purchaseQuantity, 6),
      leftover: roundDisplay(packaging.leftover, 6),
      assumptions: [
        `formula_version:${spec.formula_version}`,
        `gutterDia:${gutterDia}`,
        `gutterLength:${gutterLength}`,
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

  /* ─── materials ─── */
  const materials: CanonicalMaterialResult[] = [
    {
      name: `Желоб водосточный (ø${gutterDia} мм, ${gutterLength} м)`,
      quantity: gutterPcs,
      unit: "шт",
      withReserve: gutterPcs,
      purchaseQty: gutterPcs,
      category: "Желоба",
    },
    {
      name: `Труба водосточная (ø${gutterDia} мм, ${gutterLength} м)`,
      quantity: pipePcs,
      unit: "шт",
      withReserve: pipePcs,
      purchaseQty: pipePcs,
      category: "Трубы",
    },
    {
      name: "Воронки водосборные",
      quantity: funnels,
      unit: "шт",
      withReserve: funnels,
      purchaseQty: funnels,
      category: "Воронки",
    },
    {
      name: "Соединители желобов",
      quantity: connectors,
      unit: "шт",
      withReserve: connectors,
      purchaseQty: connectors,
      category: "Соединители",
    },
    {
      name: "Колена водосточные",
      quantity: kneeElbows,
      unit: "шт",
      withReserve: kneeElbows,
      purchaseQty: kneeElbows,
      category: "Фасонные",
    },
    {
      name: "Заглушки желоба (пары)",
      quantity: endCaps,
      unit: "шт",
      withReserve: endCaps,
      purchaseQty: endCaps,
      category: "Заглушки",
    },
    {
      name: "Кронштейны желоба",
      quantity: gutterHooks,
      unit: "шт",
      withReserve: gutterHooks,
      purchaseQty: gutterHooks,
      category: "Крепёж",
    },
    {
      name: "Хомуты трубы",
      quantity: pipeClamps,
      unit: "шт",
      withReserve: pipeClamps,
      purchaseQty: pipeClamps,
      category: "Крепёж",
    },
    ...(corners > 0 ? [{
      name: "Угловые элементы",
      quantity: corners,
      unit: "шт",
      withReserve: corners,
      purchaseQty: corners,
      category: "Фасонные",
    } satisfies CanonicalMaterialResult] : []),
    ...(elbows45 > 0 ? [{
      name: "Колена/отводы 45°",
      quantity: elbows45,
      unit: "шт",
      withReserve: elbows45,
      purchaseQty: elbows45,
      category: "Фасонные",
    } satisfies CanonicalMaterialResult] : []),
    ...(elbows90 > 0 ? [{
      name: "Колена/отводы 90°",
      quantity: elbows90,
      unit: "шт",
      withReserve: elbows90,
      purchaseQty: elbows90,
      category: "Фасонные",
    } satisfies CanonicalMaterialResult] : []),
    {
      name: `Герметик (${SEALANT_TUBE_ML} мл)`,
      quantity: sealantTubes,
      unit: "тюбиков",
      withReserve: sealantTubes,
      purchaseQty: sealantTubes,
      category: "Герметизация",
    },
  ];

  /* ─── warnings ─── */
  const warnings: string[] = [];
  const recommendedFunnels = Math.ceil(roofPerimeter / RECOMMENDED_FUNNEL_INTERVAL_M);
  if (funnels < recommendedFunnels) {
    warnings.push(`Недостаточно воронок: рекомендуется минимум ${recommendedFunnels} шт. (1 на каждые ${RECOMMENDED_FUNNEL_INTERVAL_M} м периметра) для достаточного водоотведения`);
  }


  const practicalNotes: string[] = [];
  practicalNotes.push("Уклон желоба 3-5 мм на метр — иначе вода будет стоять и переливаться");

  return {
    canonicalSpecId: spec.calculator_id,
    formulaVersion: spec.formula_version,
    materials,
    totals: {
      roofPerimeter: roundDisplay(roofPerimeter, 3),
      roofHeight: roundDisplay(roofHeight, 3),
      funnels,
      gutterDia,
      gutterLength,
      gutterPcs,
      pipePcs,
      pipePerFunnel,
      gutterJoints,
      gutterHooks,
      pipeClamps,
      corners,
      elbows45,
      elbows90,
      bendCount45,
      bendCount90,
      kneeElbows,
      endCaps,
      connectors,
      sealantTubes,
      recommendedFunnels,
      minExactNeed: scenarios.MIN.exact_need,
      recExactNeed: scenarios.REC.exact_need,
      maxExactNeed: scenarios.MAX.exact_need,
      minPurchase: scenarios.MIN.purchase_quantity,
      recPurchase: scenarios.REC.purchase_quantity,
      maxPurchase: scenarios.MAX.purchase_quantity,
    },
    warnings,
    practicalNotes,
    scenarios,
    accuracyMode,
    accuracyExplanation: applyAccuracyMode(primaryQuantityRaw, "generic", accuracyMode).explanation,
  };
}
