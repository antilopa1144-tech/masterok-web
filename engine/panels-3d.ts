import { combineScenarioFactors, type FactorTable } from "./factors";
import { optimizePackaging } from "./packaging";
import { SCENARIOS, type ScenarioBundle } from "./scenarios";
import { buildPrimerMaterial } from "./smart-packaging";
import type {
  Panels3dCanonicalSpec,
  CanonicalCalculatorResult,
  CanonicalMaterialResult,
} from "./canonical";
import { roundDisplay } from "./units";
import { type AccuracyMode, DEFAULT_ACCURACY_MODE, applyAccuracyMode, getPrimaryMultiplier } from "./accuracy";
import { getInputDefault } from "./spec-helpers";

/* ─── constants ─── */

const PANEL_RESERVE = 1.10;
const GLUE_KG_PER_M2 = 5.0;
const PRIMER_L_PER_M2 = 0.18;
const PUTTY_KG_PER_M2 = 1.0;
const PAINT_L_PER_M2 = 0.24;
const VARNISH_L_PER_M2 = 0.08;
const GLUE_BAG = 5;
const PRIMER_CAN = 5;
const PUTTY_BAG = 5;
const PAINT_CAN = 3;
const VARNISH_CAN = 1;

/* ─── inputs ─── */

interface Panels3dInputs {
  inputMode?: number;
  area?: number;
  length?: number;
  height?: number;
  panelSize?: number;
  paintable?: number;
  withVarnish?: number;
  accuracyMode?: AccuracyMode;
}

/* ─── helpers ─── */

/* ─── main ─── */

export function computeCanonicalPanels3d(
  spec: Panels3dCanonicalSpec,
  inputs: Panels3dInputs,
  factorTable: FactorTable,
): CanonicalCalculatorResult {
  const accuracyMode = inputs.accuracyMode ?? DEFAULT_ACCURACY_MODE;
  const accuracyMult = getPrimaryMultiplier("generic", accuracyMode);

  const inputMode = Math.max(0, Math.min(1, Math.round(inputs.inputMode ?? getInputDefault(spec, "inputMode", 0))));
  const areaInput = Math.max(1, Math.min(500, inputs.area ?? getInputDefault(spec, "area", 10)));
  const length = Math.max(1, Math.min(12, inputs.length ?? getInputDefault(spec, "length", 4)));
  const height = Math.max(2, Math.min(4, inputs.height ?? getInputDefault(spec, "height", 2.7)));
  const panelSize = Math.max(25, Math.min(100, inputs.panelSize ?? getInputDefault(spec, "panelSize", 50)));
  const paintable = Math.round(inputs.paintable ?? getInputDefault(spec, "paintable", 0)) === 1 ? 1 : 0;
  const withVarnish = Math.round(inputs.withVarnish ?? getInputDefault(spec, "withVarnish", 1)) === 1 ? 1 : 0;

  /* ─── area ─── */
  const area = inputMode === 1 ? roundDisplay(length * height, 3) : areaInput;

  /* ─── panels ─── */
  const panelArea = (panelSize / 100) * (panelSize / 100);
  const panels = Math.ceil(area / panelArea * PANEL_RESERVE);

  /* ─── glue ─── */
  const glueKg = area * GLUE_KG_PER_M2;
  const glueBags = Math.ceil(glueKg / GLUE_BAG);

  /* ─── primer ─── */
  const primerL = area * PRIMER_L_PER_M2;
  const primerCans = Math.ceil(primerL / PRIMER_CAN);

  /* ─── putty ─── */
  const puttyKg = area * PUTTY_KG_PER_M2;
  const puttyBags = Math.ceil(puttyKg / PUTTY_BAG);

  /* ─── paint (conditional) ─── */
  const paintL = paintable ? area * PAINT_L_PER_M2 : 0;
  const paintCans = paintable ? Math.ceil(paintL / PAINT_CAN) : 0;

  /* ─── varnish (conditional) ─── */
  const varnishL = withVarnish ? area * VARNISH_L_PER_M2 : 0;
  const varnishCans = withVarnish ? Math.ceil(varnishL / VARNISH_CAN) : 0;

  /* ─── molding ─── */
  const perimeter = inputMode === 1
    ? 2 * (length + height / 2.7 * length)
    : 4 * Math.sqrt(area);
  const moldingM = perimeter;

  /* ─── scenarios ─── */
  const panelsRaw = panels;
  const panelsAdj = Math.ceil(panels * accuracyMult);

  const packageOptions = [{
    size: 1,
    label: "3d-panel",
    unit: "шт",
  }];

  const scenarios = SCENARIOS.reduce((acc, scenario) => {
    const { multiplier, keyFactors } = combineScenarioFactors(factorTable, spec.field_factors.enabled, scenario);
    const exactNeed = roundDisplay(panelsAdj * multiplier, 6);
    const packaging = optimizePackaging(exactNeed, packageOptions);

    acc[scenario] = {
      exact_need: exactNeed,
      purchase_quantity: roundDisplay(packaging.purchaseQuantity, 6),
      leftover: roundDisplay(packaging.leftover, 6),
      assumptions: [
        `formula_version:${spec.formula_version}`,
        `inputMode:${inputMode}`,
        `panelSize:${panelSize}`,
        `paintable:${paintable}`,
        `withVarnish:${withVarnish}`,
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

  /* ─── warnings ─── */
  const warnings: string[] = [];
  if (area > 100) {
    warnings.push("Большая площадь — рассмотрите оптовую закупку панелей");
  }
  if (paintable && withVarnish) {
    warnings.push("Покраска и лакировка одновременно — убедитесь в совместимости составов");
  }

  /* ─── materials ─── */
  const materials: CanonicalMaterialResult[] = [
    {
      name: "3D-панели",
      quantity: roundDisplay(recScenario.exact_need, 6),
      unit: "шт",
      withReserve: Math.ceil(recScenario.exact_need),
      purchaseQty: Math.ceil(recScenario.exact_need),
      category: "Облицовка",
    },
    {
      name: `Клей для панелей (${GLUE_BAG} кг)`,
      quantity: glueBags,
      unit: "мешков",
      withReserve: glueBags,
      purchaseQty: glueBags,
      category: "Монтаж",
    },
    buildPrimerMaterial(primerL, { category: "Грунтовка" }),
    {
      name: `Шпаклёвка (${PUTTY_BAG} кг)`,
      quantity: puttyBags,
      unit: "мешков",
      withReserve: puttyBags,
      purchaseQty: puttyBags,
      category: "Отделка",
    },
  ];

  if (paintable) {
    materials.push({
      name: `Краска (${PAINT_CAN} л)`,
      quantity: paintCans,
      unit: "банок",
      withReserve: paintCans,
      purchaseQty: paintCans,
      category: "Отделка",
    });
  }

  materials.push({
    name: "Молдинги (п.м.)",
    quantity: roundDisplay(moldingM, 2),
    unit: "п.м.",
    withReserve: Math.ceil(moldingM),
    purchaseQty: Math.ceil(moldingM),
    category: "Профиль",
  });

  if (withVarnish) {
    materials.push({
      name: `Лак (${VARNISH_CAN} л)`,
      quantity: varnishCans,
      unit: "банок",
      withReserve: varnishCans,
      purchaseQty: varnishCans,
      category: "Отделка",
    });
  }


  const practicalNotes: string[] = [];
  practicalNotes.push("3D-панели клейте на ровную стену — неровности будут видны как на ладони");

  return {
    canonicalSpecId: spec.calculator_id,
    formulaVersion: spec.formula_version,
    materials,
    totals: {
      area,
      inputMode,
      panelSize,
      panelArea: roundDisplay(panelArea, 4),
      paintable,
      withVarnish,
      panels,
      glueKg: roundDisplay(glueKg, 3),
      glueBags,
      primerL: roundDisplay(primerL, 3),
      primerCans,
      puttyKg: roundDisplay(puttyKg, 3),
      puttyBags,
      paintL: roundDisplay(paintL, 3),
      paintCans,
      varnishL: roundDisplay(varnishL, 3),
      varnishCans,
      perimeter: roundDisplay(perimeter, 3),
      moldingM: roundDisplay(moldingM, 3),
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
    accuracyExplanation: applyAccuracyMode(panelsRaw, "generic", accuracyMode).explanation,
  };
}
