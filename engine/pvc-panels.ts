import { combineScenarioFactors, type FactorTable } from "./factors";
import { optimizePackaging } from "./packaging";
import { SCENARIOS, type ScenarioBundle } from "./scenarios";
import type {
  PvcPanelsCanonicalSpec,
  CanonicalCalculatorResult,
  CanonicalMaterialResult,
} from "./canonical";
import { roundDisplay } from "./units";
import { type AccuracyMode, DEFAULT_ACCURACY_MODE, applyAccuracyMode, getPrimaryMultiplier } from "./accuracy";
import { getInputDefault } from "./spec-helpers";

/* ─── constants ─── */

const PANEL_RESERVE = 1.10;
const PROFILE_RESERVE = 1.10;
const PROFILE_STEP = 0.4;
const PANEL_LENGTHS: Record<number, number> = { 0: 2.7, 1: 3.0, 2: 2.7 };
const CORNER_PROFILE_LENGTH = 3.0;
const STANDARD_CORNERS = 4;

/* ─── inputs ─── */

interface PvcPanelsInputs {
  inputMode?: number;
  area?: number;
  wallWidth?: number;
  wallHeight?: number;
  panelWidth?: number;
  panelType?: number;
  needProfile?: number;
  needCorners?: number;
  accuracyMode?: AccuracyMode;
}

/* ─── helpers ─── */

/* ─── main ─── */

export function computeCanonicalPvcPanels(
  spec: PvcPanelsCanonicalSpec,
  inputs: PvcPanelsInputs,
  factorTable: FactorTable,
): CanonicalCalculatorResult {
  const accuracyMode = inputs.accuracyMode ?? DEFAULT_ACCURACY_MODE;
  const accuracyMult = getPrimaryMultiplier("generic", accuracyMode);

  const inputMode = Math.max(0, Math.min(1, Math.round(inputs.inputMode ?? getInputDefault(spec, "inputMode", 0))));
  const areaInput = Math.max(1, Math.min(500, inputs.area ?? getInputDefault(spec, "area", 15)));
  const wallWidth = Math.max(0.5, Math.min(30, inputs.wallWidth ?? getInputDefault(spec, "wallWidth", 3)));
  const wallHeight = Math.max(0.5, Math.min(10, inputs.wallHeight ?? getInputDefault(spec, "wallHeight", 2.5)));
  const panelWidth = Math.max(0.1, Math.min(0.5, inputs.panelWidth ?? getInputDefault(spec, "panelWidth", 0.25)));
  const panelType = Math.max(0, Math.min(2, Math.round(inputs.panelType ?? getInputDefault(spec, "panelType", 0))));
  const needProfile = Math.round(inputs.needProfile ?? getInputDefault(spec, "needProfile", 1)) === 1 ? 1 : 0;
  const needCorners = Math.round(inputs.needCorners ?? getInputDefault(spec, "needCorners", 1)) === 1 ? 1 : 0;

  /* ─── area ─── */
  const area = inputMode === 1 ? roundDisplay(wallWidth * wallHeight, 3) : areaInput;

  /* ─── panels ─── */
  const panelLength = PANEL_LENGTHS[panelType] ?? PANEL_LENGTHS[0];
  const panelArea = panelWidth * panelLength;
  const panels = Math.ceil(area * PANEL_RESERVE / panelArea);

  /* ─── profile (conditional) ─── */
  const profileRows = needProfile ? Math.ceil(wallHeight / PROFILE_STEP) + 1 : 0;
  const profileLen = profileRows * wallWidth * PROFILE_RESERVE;

  /* ─── corner profile (conditional) ─── */
  const cornerPcs = needCorners ? Math.ceil(wallHeight * STANDARD_CORNERS / CORNER_PROFILE_LENGTH) : 0;

  /* ─── start profile ─── */
  const startProfile = wallWidth * 1.05;

  /* ─── plinth ─── */
  const plinthLen = wallWidth * 2;

  /* ─── scenarios ─── */
  const panelsRaw = panels;
  const panelsAdj = Math.ceil(panels * accuracyMult);

  const packageOptions = [{
    size: 1,
    label: "pvc-panel",
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
        `panelType:${panelType}`,
        `needProfile:${needProfile}`,
        `needCorners:${needCorners}`,
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
  if (panelType === 2) {
    warnings.push("Для ванной комнаты используйте влагостойкие ПВХ-панели");
  }

  /* ─── materials ─── */
  const materials: CanonicalMaterialResult[] = [
    {
      name: "ПВХ-панели",
      quantity: roundDisplay(recScenario.exact_need, 6),
      unit: "шт",
      withReserve: Math.ceil(recScenario.exact_need),
      purchaseQty: Math.ceil(recScenario.exact_need),
      category: "Облицовка",
    },
  ];

  if (needProfile) {
    materials.push({
      name: "Профиль обрешётки (п.м.)",
      quantity: roundDisplay(profileLen, 2),
      unit: "п.м.",
      withReserve: Math.ceil(profileLen),
      purchaseQty: Math.ceil(profileLen),
      category: "Подсистема",
    });
  }

  if (needCorners) {
    materials.push({
      name: "Угловой профиль",
      quantity: cornerPcs,
      unit: "шт",
      withReserve: cornerPcs,
      purchaseQty: cornerPcs,
      category: "Профиль",
    });
  }

  materials.push(
    {
      name: "Стартовый профиль (п.м.)",
      quantity: roundDisplay(startProfile, 2),
      unit: "п.м.",
      withReserve: Math.ceil(startProfile),
      purchaseQty: Math.ceil(startProfile),
      category: "Профиль",
    },
    {
      name: "Плинтус (п.м.)",
      quantity: roundDisplay(plinthLen, 2),
      unit: "п.м.",
      withReserve: Math.ceil(plinthLen),
      purchaseQty: Math.ceil(plinthLen),
      category: "Профиль",
    },
  );


  const practicalNotes: string[] = [];
  practicalNotes.push("ПВХ панели — оставляйте зазор 5 мм по периметру для температурного расширения");

  return {
    canonicalSpecId: spec.calculator_id,
    formulaVersion: spec.formula_version,
    materials,
    totals: {
      area,
      inputMode,
      wallWidth: roundDisplay(wallWidth, 3),
      wallHeight: roundDisplay(wallHeight, 3),
      panelWidth: roundDisplay(panelWidth, 3),
      panelType,
      needProfile,
      needCorners,
      panelLength,
      panelArea: roundDisplay(panelArea, 4),
      panels,
      profileRows,
      profileLen: roundDisplay(profileLen, 3),
      cornerPcs,
      startProfile: roundDisplay(startProfile, 3),
      plinthLen: roundDisplay(plinthLen, 3),
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
