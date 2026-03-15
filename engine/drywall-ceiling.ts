import { combineScenarioFactors, type FactorTable } from "./factors";
import { optimizePackaging } from "./packaging";
import { SCENARIOS, type ScenarioBundle } from "./scenarios";
import type {
  DrywallCeilingCanonicalSpec,
  CanonicalCalculatorResult,
  CanonicalMaterialResult,
} from "./canonical";
import { roundDisplay } from "./units";

/* ─── constants ─── */

const SHEET_AREA = 3.0;
const SHEET_RESERVE = 1.10;
const PROFILE_RESERVE = 1.05;
const CROSS_STEP = 1.2;
const SUSPENSION_STEP = 0.7;
const SCREWS_PER_SHEET = 23;
const SCREWS_PER_KG = 1000;
const SCREW_RESERVE = 1.05;
const CLOP_PER_SUSP = 2;
const CLOP_PER_CRAB = 4;
const DOWEL_STEP = 0.5;
const SERPYANKA_COEFF = 1.2;
const SERPYANKA_RESERVE = 1.1;
const SERPYANKA_ROLL = 45;
const PUTTY_KG_PER_M = 0.25;
const PUTTY_BAG = 25;
const PRIMER_L_PER_M2 = 0.15;
const PRIMER_RESERVE = 1.15;
const PRIMER_CAN = 10;
const PROFILE_LENGTH = 3;

/* ─── inputs ─── */

interface DrywallCeilingInputs {
  inputMode?: number;
  length?: number;
  width?: number;
  area?: number;
  layers?: number;
  profileStep?: number;
}

/* ─── helpers ─── */

function getInputDefault(spec: DrywallCeilingCanonicalSpec, key: string, fallback: number): number {
  return spec.input_schema.find((field) => field.key === key)?.default_value ?? fallback;
}

/* ─── main ─── */

export function computeCanonicalDrywallCeiling(
  spec: DrywallCeilingCanonicalSpec,
  inputs: DrywallCeilingInputs,
  factorTable: FactorTable,
): CanonicalCalculatorResult {
  const inputMode = Math.max(0, Math.min(1, Math.round(inputs.inputMode ?? getInputDefault(spec, "inputMode", 0))));
  const length = Math.max(1, Math.min(20, inputs.length ?? getInputDefault(spec, "length", 5)));
  const width = Math.max(1, Math.min(20, inputs.width ?? getInputDefault(spec, "width", 4)));
  const areaInput = Math.max(1, Math.min(200, inputs.area ?? getInputDefault(spec, "area", 20)));
  const layersRaw = Math.round(inputs.layers ?? getInputDefault(spec, "layers", 1));
  const layers = layersRaw === 2 ? 2 : 1;
  const profileStepRaw = inputs.profileStep ?? getInputDefault(spec, "profileStep", 600);
  const profileStep = profileStepRaw <= 400 ? 400 : 600;

  /* ─── area ─── */
  const area = inputMode === 0 ? roundDisplay(length * width, 3) : areaInput;

  /* ─── sheets ─── */
  const sheets = Math.ceil(area * layers / SHEET_AREA * SHEET_RESERVE);

  /* ─── profiles ─── */
  const mainProfileRows = Math.ceil(width / (profileStep / 1000));
  const mainM = mainProfileRows * length;
  const crossRows = Math.ceil(length / CROSS_STEP);
  const crossM = crossRows * width;
  const totalProfileM = (mainM + crossM) * PROFILE_RESERVE;
  const ppPcs = Math.ceil(totalProfileM / PROFILE_LENGTH);

  const effectiveLength = inputMode === 0 ? length : Math.sqrt(area);
  const effectiveWidth = inputMode === 0 ? width : Math.sqrt(area);
  const pnM = 2 * (effectiveLength + effectiveWidth) * PROFILE_RESERVE;
  const pnPcs = Math.ceil(pnM / PROFILE_LENGTH);

  /* ─── suspensions & crabs ─── */
  const suspCount = mainProfileRows * Math.ceil(length / SUSPENSION_STEP);
  const crabCount = mainProfileRows * crossRows;

  /* ─── screws ─── */
  const screwsGKL = sheets * SCREWS_PER_SHEET;
  const screwsKg = Math.ceil(screwsGKL * SCREW_RESERVE / SCREWS_PER_KG * 10) / 10;

  /* ─── clop screws ─── */
  const clopCount = suspCount * CLOP_PER_SUSP + crabCount * CLOP_PER_CRAB;

  /* ─── dowels ─── */
  const dowelCount = suspCount * 2 + Math.ceil(pnM / DOWEL_STEP);

  /* ─── serpyanka ─── */
  const serpM = Math.ceil(area * SERPYANKA_COEFF * SERPYANKA_RESERVE);
  const serpRolls = Math.ceil(serpM / SERPYANKA_ROLL);

  /* ─── putty ─── */
  const puttyKg = Math.ceil(serpM * PUTTY_KG_PER_M);
  const puttyBags = Math.ceil(puttyKg / PUTTY_BAG);

  /* ─── primer ─── */
  const primerL = area * PRIMER_L_PER_M2;
  const primerCans = Math.ceil(primerL * PRIMER_RESERVE / PRIMER_CAN);

  /* ─── scenarios ─── */
  const packageOptions = [{
    size: spec.packaging_rules.package_size,
    label: `gkl-ceiling-${spec.packaging_rules.package_size}`,
    unit: spec.packaging_rules.unit,
  }];

  const scenarios = SCENARIOS.reduce((acc, scenario) => {
    const { multiplier, keyFactors } = combineScenarioFactors(factorTable, spec.field_factors.enabled, scenario);
    const exactNeed = roundDisplay(sheets * multiplier, 6);
    const packaging = optimizePackaging(exactNeed, packageOptions);

    acc[scenario] = {
      exact_need: exactNeed,
      purchase_quantity: roundDisplay(packaging.purchaseQuantity, 6),
      leftover: roundDisplay(packaging.leftover, 6),
      assumptions: [
        `formula_version:${spec.formula_version}`,
        `inputMode:${inputMode}`,
        `layers:${layers}`,
        `profileStep:${profileStep}`,
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
  if (layers === 2) {
    warnings.push("Второй слой ГКЛ монтируется со смещением 400 мм");
  }
  if (area > 50) {
    warnings.push("Площадь более 50 м² — предусмотрите деформационные швы");
  }

  /* ─── materials ─── */
  const materials: CanonicalMaterialResult[] = [
    {
      name: "ГКЛ листы",
      quantity: roundDisplay(recScenario.exact_need, 6),
      unit: "шт",
      withReserve: Math.ceil(recScenario.exact_need),
      purchaseQty: Math.ceil(recScenario.exact_need),
      category: "Основное",
    },
    {
      name: "Профиль ПП 60×27 3м",
      quantity: ppPcs,
      unit: "шт",
      withReserve: ppPcs,
      purchaseQty: ppPcs,
      category: "Каркас",
    },
    {
      name: "Профиль ПН 27×28 3м",
      quantity: pnPcs,
      unit: "шт",
      withReserve: pnPcs,
      purchaseQty: pnPcs,
      category: "Каркас",
    },
    {
      name: "Подвесы прямые",
      quantity: suspCount,
      unit: "шт",
      withReserve: suspCount,
      purchaseQty: suspCount,
      category: "Каркас",
    },
    {
      name: "Крабы (соединители)",
      quantity: crabCount,
      unit: "шт",
      withReserve: crabCount,
      purchaseQty: crabCount,
      category: "Каркас",
    },
    {
      name: "Саморезы 3.5×25 (кг)",
      quantity: screwsKg,
      unit: "кг",
      withReserve: screwsKg,
      purchaseQty: Math.ceil(screwsKg),
      category: "Крепёж",
    },
    {
      name: "Саморезы-клопы",
      quantity: clopCount,
      unit: "шт",
      withReserve: clopCount,
      purchaseQty: clopCount,
      category: "Крепёж",
    },
    {
      name: "Дюбели",
      quantity: dowelCount,
      unit: "шт",
      withReserve: dowelCount,
      purchaseQty: dowelCount,
      category: "Крепёж",
    },
    {
      name: "Серпянка 45м",
      quantity: serpRolls,
      unit: "рулонов",
      withReserve: serpRolls,
      purchaseQty: serpRolls,
      category: "Отделка",
    },
    {
      name: "Шпаклёвка Knauf Fugen 25кг",
      quantity: puttyBags,
      unit: "мешков",
      withReserve: puttyBags,
      purchaseQty: puttyBags,
      category: "Отделка",
    },
    {
      name: "Грунтовка 10л",
      quantity: primerCans,
      unit: "канистр",
      withReserve: primerCans,
      purchaseQty: primerCans,
      category: "Отделка",
    },
  ];

  return {
    canonicalSpecId: spec.calculator_id,
    formulaVersion: spec.formula_version,
    materials,
    totals: {
      area,
      inputMode,
      length: inputMode === 0 ? roundDisplay(length, 3) : 0,
      width: inputMode === 0 ? roundDisplay(width, 3) : 0,
      layers,
      profileStep,
      sheets,
      mainProfileRows,
      mainM: roundDisplay(mainM, 3),
      crossRows,
      crossM: roundDisplay(crossM, 3),
      totalProfileM: roundDisplay(totalProfileM, 3),
      ppPcs,
      pnM: roundDisplay(pnM, 3),
      pnPcs,
      suspCount,
      crabCount,
      screwsGKL,
      screwsKg,
      clopCount,
      dowelCount,
      serpM,
      serpRolls,
      puttyKg,
      puttyBags,
      primerL: roundDisplay(primerL, 3),
      primerCans,
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
