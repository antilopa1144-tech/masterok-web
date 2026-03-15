import { combineScenarioFactors, type FactorTable } from "./factors";
import { optimizePackaging } from "./packaging";
import { SCENARIOS, type ScenarioBundle } from "./scenarios";
import type {
  MdfPanelsCanonicalSpec,
  CanonicalCalculatorResult,
  CanonicalMaterialResult,
} from "./canonical";
import { roundDisplay } from "./units";

/* ─── constants ─── */

const PANEL_RESERVE = 1.10;
const PROFILE_RESERVE = 1.10;
const PROFILE_STEP = 0.5;
const STANDARD_PANEL_LENGTH = 2.7;
const CLIPS_PER_PANEL = 5;
const PLINTH_LENGTH = 2.7;
const PLINTH_EXTRA = 2.0;

/* ─── inputs ─── */

interface MdfPanelsInputs {
  inputMode?: number;
  area?: number;
  wallWidth?: number;
  wallHeight?: number;
  panelWidth?: number;
  panelType?: number;
  needProfile?: number;
  needPlinth?: number;
}

/* ─── helpers ─── */

function getInputDefault(spec: MdfPanelsCanonicalSpec, key: string, fallback: number): number {
  return spec.input_schema.find((field) => field.key === key)?.default_value ?? fallback;
}

/* ─── main ─── */

export function computeCanonicalMdfPanels(
  spec: MdfPanelsCanonicalSpec,
  inputs: MdfPanelsInputs,
  factorTable: FactorTable,
): CanonicalCalculatorResult {
  const inputMode = Math.max(0, Math.min(1, Math.round(inputs.inputMode ?? getInputDefault(spec, "inputMode", 0))));
  const areaInput = Math.max(1, Math.min(500, inputs.area ?? getInputDefault(spec, "area", 20)));
  const wallWidth = Math.max(0.5, Math.min(30, inputs.wallWidth ?? getInputDefault(spec, "wallWidth", 4)));
  const wallHeight = Math.max(0.5, Math.min(10, inputs.wallHeight ?? getInputDefault(spec, "wallHeight", 2.7)));
  const panelWidth = Math.max(0.1, Math.min(0.4, inputs.panelWidth ?? getInputDefault(spec, "panelWidth", 0.25)));
  const panelType = Math.max(0, Math.min(2, Math.round(inputs.panelType ?? getInputDefault(spec, "panelType", 0))));
  const needProfile = Math.round(inputs.needProfile ?? getInputDefault(spec, "needProfile", 1)) === 1 ? 1 : 0;
  const needPlinth = Math.round(inputs.needPlinth ?? getInputDefault(spec, "needPlinth", 1)) === 1 ? 1 : 0;

  /* ─── area ─── */
  const area = inputMode === 1 ? roundDisplay(wallWidth * wallHeight, 3) : areaInput;

  /* ─── panels ─── */
  const panelArea = panelWidth * STANDARD_PANEL_LENGTH;
  const panels = Math.ceil(area * PANEL_RESERVE / panelArea);

  /* ─── clips ─── */
  const clips = panels * CLIPS_PER_PANEL;

  /* ─── profile (conditional) ─── */
  const profileRows = needProfile ? Math.ceil(wallHeight / PROFILE_STEP) + 1 : 0;
  const profileLen = profileRows * wallWidth * PROFILE_RESERVE;

  /* ─── plinth (conditional) ─── */
  const plinthLen = needPlinth ? wallWidth * 2 + PLINTH_EXTRA : 0;
  const plinthPcs = Math.ceil(plinthLen / PLINTH_LENGTH);

  /* ─── scenarios ─── */
  const packageOptions = [{
    size: 1,
    label: "mdf-panel",
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
        `inputMode:${inputMode}`,
        `panelType:${panelType}`,
        `needProfile:${needProfile}`,
        `needPlinth:${needPlinth}`,
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
  if (panelType === 0) {
    warnings.push("Стандартные МДФ-панели не рекомендуются для влажных помещений");
  }

  /* ─── materials ─── */
  const materials: CanonicalMaterialResult[] = [
    {
      name: "МДФ-панели",
      quantity: roundDisplay(recScenario.exact_need, 6),
      unit: "шт",
      withReserve: Math.ceil(recScenario.exact_need),
      purchaseQty: Math.ceil(recScenario.exact_need),
      category: "Облицовка",
    },
    {
      name: "Кляймеры (клипсы)",
      quantity: clips,
      unit: "шт",
      withReserve: clips,
      purchaseQty: clips,
      category: "Крепёж",
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

  if (needPlinth) {
    materials.push({
      name: "Плинтус",
      quantity: plinthPcs,
      unit: "шт",
      withReserve: plinthPcs,
      purchaseQty: plinthPcs,
      category: "Профиль",
    });
  }

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
      needPlinth,
      panelArea: roundDisplay(panelArea, 4),
      panels,
      clips,
      profileRows,
      profileLen: roundDisplay(profileLen, 3),
      plinthLen: roundDisplay(plinthLen, 3),
      plinthPcs,
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
