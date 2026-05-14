import { combineScenarioFactors, type FactorTable } from "./factors";
import { optimizePackaging } from "./packaging";
import { SCENARIOS, type ScenarioBundle } from "./scenarios";
import type {
  SoundInsulationCanonicalSpec,
  CanonicalCalculatorResult,
  CanonicalMaterialResult,
} from "./canonical";
import { roundDisplay } from "./units";
import { type AccuracyMode, DEFAULT_ACCURACY_MODE, applyAccuracyMode, getPrimaryMultiplier } from "./accuracy";
import { getInputDefault } from "./spec-helpers";

interface SoundInsulationInputs {
  area?: number;
  surfaceType?: number;
  system?: number;
  accuracyMode?: AccuracyMode;
}

/* ─── constants ─── */

const ROCKWOOL_PLATE = 0.6;
const ROCKWOOL_RESERVE = 1.1;
const GKL_SHEET = 3;
const GKL_RESERVE_2LAYERS = 2;
const PP_SPACING = 0.6;
const PP_LENGTH = 3;
const VIBRO_PER_M2 = 2;
const VIBRO_RESERVE = 1.05;
const VIBRO_TAPE_ROLL = 30;
const ZIPS_PLATE = 0.72;
const ZIPS_RESERVE = 1.1;
const ZIPS_DUBELS_PER_PANEL = 6;
const ZIPS_DUBEL_RESERVE = 1.05;
const FLOAT_MAT_ROLL = 20;
const FLOAT_RESERVE = 1.1;
const DAMP_TAPE_ROLL = 25;
const SCREED_THICKNESS = 0.05;
const SCREED_DENSITY = 1800;
const SCREED_BAG = 50;
const SEALANT_PER_PERIM = 20;
const SEAL_TAPE_ROLL = 30;
const SEAL_TAPE_RESERVE = 1.1;

/* ─── helpers ─── */

function resolveArea(spec: SoundInsulationCanonicalSpec, inputs: SoundInsulationInputs): number {
  return Math.max(1, Math.min(500, inputs.area ?? getInputDefault(spec, "area", 30)));
}

function resolveSurfaceType(spec: SoundInsulationCanonicalSpec, inputs: SoundInsulationInputs): number {
  return Math.max(0, Math.min(2, Math.round(inputs.surfaceType ?? getInputDefault(spec, "surfaceType", 0))));
}

function resolveSystem(spec: SoundInsulationCanonicalSpec, inputs: SoundInsulationInputs): number {
  return Math.max(0, Math.min(3, Math.round(inputs.system ?? getInputDefault(spec, "system", 0))));
}

/* ─── main ─── */

export function computeCanonicalSoundInsulation(
  spec: SoundInsulationCanonicalSpec,
  inputs: SoundInsulationInputs,
  factorTable: FactorTable,
): CanonicalCalculatorResult {
  const accuracyMode = inputs.accuracyMode ?? DEFAULT_ACCURACY_MODE;
  const accuracyMult = getPrimaryMultiplier("generic", accuracyMode);

  const area = resolveArea(spec, inputs);
  const surfaceType = resolveSurfaceType(spec, inputs);
  const system = resolveSystem(spec, inputs);

  const perim = Math.sqrt(area) * 4;
  const materials: CanonicalMaterialResult[] = [];
  let primaryQty = 0;
  let primaryUnit = "шт";
  let primaryLabel = "sound-insulation";

  /* ── System 0: Basic GKL + Rockwool ── */
  if (system === 0) {
    const rockwoolPlates = Math.ceil(area * ROCKWOOL_RESERVE / ROCKWOOL_PLATE);
    const gklSheets = Math.ceil(area * ROCKWOOL_RESERVE * GKL_RESERVE_2LAYERS / GKL_SHEET);
    const ppPcs = Math.ceil((area / PP_SPACING) * PP_LENGTH * ROCKWOOL_RESERVE / PP_LENGTH);
    const vibro = Math.ceil(area * VIBRO_PER_M2 * VIBRO_RESERVE);
    const vibroTape = Math.ceil((area / PP_SPACING) * PP_LENGTH * ROCKWOOL_RESERVE / VIBRO_TAPE_ROLL);
    const screws = Math.ceil(gklSheets * 25 / 200);

    primaryQty = rockwoolPlates;
    primaryUnit = "шт";
    primaryLabel = "rockwool-plate";

    materials.push(
      { name: "Минераловатные плиты", quantity: rockwoolPlates, unit: "шт", withReserve: rockwoolPlates, purchaseQty: rockwoolPlates, category: "Основное" },
      { name: "ГКЛ листы", quantity: gklSheets, unit: "шт", withReserve: gklSheets, purchaseQty: gklSheets, category: "Основное" },
      { name: "Профиль ПП 3м", quantity: ppPcs, unit: "шт", withReserve: ppPcs, purchaseQty: ppPcs, category: "Каркас" },
      { name: "Виброподвесы", quantity: vibro, unit: "шт", withReserve: vibro, purchaseQty: vibro, category: "Крепёж" },
      { name: "Вибролента", quantity: vibroTape, unit: "рулонов", withReserve: vibroTape, purchaseQty: vibroTape, category: "Изоляция" },
      { name: "Саморезы (упаковки по 200)", quantity: screws, unit: "упаковок", withReserve: screws, purchaseQty: screws, category: "Крепёж" },
    );
  }

  /* ── System 1: ZIPS panels ── */
  if (system === 1) {
    const zipsPanels = Math.ceil(area * ZIPS_RESERVE / ZIPS_PLATE);
    const dubels = Math.ceil(zipsPanels * ZIPS_DUBELS_PER_PANEL * ZIPS_DUBEL_RESERVE);
    const gklOverlay = Math.ceil(area * ZIPS_RESERVE / GKL_SHEET);

    primaryQty = zipsPanels;
    primaryUnit = "шт";
    primaryLabel = "zips-panel";

    materials.push(
      { name: "ЗИПС панели", quantity: zipsPanels, unit: "шт", withReserve: zipsPanels, purchaseQty: zipsPanels, category: "Основное" },
      { name: "Дюбели для ЗИПС", quantity: dubels, unit: "шт", withReserve: dubels, purchaseQty: dubels, category: "Крепёж" },
      { name: "ГКЛ облицовка", quantity: gklOverlay, unit: "шт", withReserve: gklOverlay, purchaseQty: gklOverlay, category: "Основное" },
    );
  }

  /* ── System 2: Floating floor ── */
  if (system === 2) {
    const mats = Math.ceil(area * FLOAT_RESERVE / FLOAT_MAT_ROLL);
    const dampTape = Math.ceil(perim / DAMP_TAPE_ROLL);
    const screedBags = Math.ceil(area * SCREED_THICKNESS * SCREED_DENSITY / SCREED_BAG);

    primaryQty = mats;
    primaryUnit = "рулонов";
    primaryLabel = "float-mat";

    materials.push(
      { name: "Звукоизоляционные маты", quantity: mats, unit: "рулонов", withReserve: mats, purchaseQty: mats, category: "Основное" },
      { name: "Демпферная лента", quantity: dampTape, unit: "рулонов", withReserve: dampTape, purchaseQty: dampTape, category: "Изоляция" },
      { name: "Стяжка 50 кг", quantity: screedBags, unit: "мешков", withReserve: screedBags, purchaseQty: screedBags, category: "Основное" },
    );
  }

  /* ── System 3: Acoustic ceiling ── */
  if (system === 3) {
    const rockwoolPlates = Math.ceil(area * ROCKWOOL_RESERVE / ROCKWOOL_PLATE);
    const gklSheets = Math.ceil(area * ROCKWOOL_RESERVE * GKL_RESERVE_2LAYERS / GKL_SHEET);
    const vibro = Math.ceil(area * VIBRO_PER_M2 * VIBRO_RESERVE);

    primaryQty = rockwoolPlates;
    primaryUnit = "шт";
    primaryLabel = "acoustic-ceiling";

    materials.push(
      { name: "Минераловатные плиты", quantity: rockwoolPlates, unit: "шт", withReserve: rockwoolPlates, purchaseQty: rockwoolPlates, category: "Основное" },
      { name: "ГКЛ листы", quantity: gklSheets, unit: "шт", withReserve: gklSheets, purchaseQty: gklSheets, category: "Основное" },
      { name: "Виброподвесы", quantity: vibro, unit: "шт", withReserve: vibro, purchaseQty: vibro, category: "Крепёж" },
    );
  }

  /* ── Common: sealant + sealing tape (all systems) ── */
  const sealant = Math.ceil(perim * 2 / SEALANT_PER_PERIM);
  const sealTape = Math.ceil(perim * 2 * SEAL_TAPE_RESERVE / SEAL_TAPE_ROLL);

  materials.push(
    { name: "Герметик", quantity: sealant, unit: "тюбиков", withReserve: sealant, purchaseQty: sealant, category: "Герметизация" },
    { name: "Уплотнительная лента 30м", quantity: sealTape, unit: "рулонов", withReserve: sealTape, purchaseQty: sealTape, category: "Герметизация" },
  );

  /* ─── scenarios ─── */
  const primaryQtyRaw = primaryQty;
  primaryQty = Math.ceil(primaryQty * accuracyMult);

  const packageOptions = [{
    size: spec.packaging_rules.package_size,
    label: primaryLabel,
    unit: primaryUnit,
  }];

  const scenarios = SCENARIOS.reduce((acc, scenario) => {
    const { multiplier, keyFactors } = combineScenarioFactors(factorTable, spec.field_factors.enabled, scenario);
    const exactNeed = roundDisplay(primaryQty * multiplier, 6);
    const packaging = optimizePackaging(exactNeed, packageOptions);

    acc[scenario] = {
      exact_need: exactNeed,
      purchase_quantity: roundDisplay(packaging.purchaseQuantity, 6),
      leftover: roundDisplay(packaging.leftover, 6),
      assumptions: [
        `formula_version:${spec.formula_version}`,
        `surfaceType:${surfaceType}`,
        `system:${system}`,
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
  if (area > spec.warnings_rules.large_area_threshold_m2) {
    warnings.push("Большая площадь — рекомендуется профессиональный монтаж");
  }
  if (system === 1) {
    warnings.push("Система ЗИПС требует ровного основания");
  }


  const practicalNotes: string[] = [];
  practicalNotes.push("Звукоизоляция работает только когда нет щелей — даже маленькая щель убивает эффект");

  return {
    canonicalSpecId: spec.calculator_id,
    formulaVersion: spec.formula_version,
    materials,
    totals: {
      area: roundDisplay(area, 3),
      surfaceType,
      system,
      perim: roundDisplay(perim, 3),
      primaryQty,
      sealant,
      sealTape,
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
    accuracyExplanation: applyAccuracyMode(primaryQtyRaw, "generic", accuracyMode).explanation,
  };
}
