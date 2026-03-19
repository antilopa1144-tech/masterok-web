import { combineScenarioFactors, type FactorTable } from "./factors";
import { optimizePackaging } from "./packaging";
import { SCENARIOS, type ScenarioBundle } from "./scenarios";
import type {
  DrywallCanonicalSpec,
  CanonicalCalculatorResult,
  CanonicalMaterialResult,
} from "./canonical";
import { roundDisplay } from "./units";
import { type AccuracyMode, DEFAULT_ACCURACY_MODE, applyAccuracyMode, getPrimaryMultiplier, getAccessoriesMultiplier } from "./accuracy";

interface DrywallInputs {
  workType?: number;
  length?: number;
  height?: number;
  layers?: number;
  sheetSize?: number;
  profileStep?: number;
  accuracyMode?: AccuracyMode;
}

const SHEET_SIZES: Record<number, { w: number; h: number; area: number }> = {
  0: { w: 1.2, h: 2.5, area: 3.0 },
  1: { w: 1.2, h: 3.0, area: 3.6 },
  2: { w: 0.6, h: 2.5, area: 1.5 },
};

const SHEET_RESERVE = 1.10;
const PROFILE_RESERVE = 1.05;
const SCREWS_TF_PER_M2 = 30;
const SCREWS_LB_PER_PROFILE = 4;
const DOWELS_STEP_M = 0.6;
const PUTTY_START_KG_PER_M2 = 0.8;
const PUTTY_FINISH_KG_PER_M2 = 1.0;
const PUTTY_RESERVE = 1.15;
const PUTTY_BAG_KG = 25;
const SERPYANKA_M_PER_SHEET = 2.5;
const SERPYANKA_RESERVE = 1.1;
const SERPYANKA_ROLL_M = 90;
const PRIMER_L_PER_M2 = 0.3;
const PRIMER_RESERVE = 1.15;
const PRIMER_CAN_L = 10;
const SANDPAPER_M2_PER_SHEET = 5;
const SANDPAPER_PACK = 10;
const PROFILE_LENGTH_M = 3;
const SEALING_TAPE_ROLL_M = 30;
const SCREWS_TF_PER_KG = 1000;  // 3.5×25 мм
const SCREWS_LB_PER_KG = 4000;  // 3.5×9.5 мм (клопы)

function getInputDefault(spec: DrywallCanonicalSpec, key: string, fallback: number): number {
  return spec.input_schema.find((field) => field.key === key)?.default_value ?? fallback;
}

function resolveWorkType(spec: DrywallCanonicalSpec, inputs: DrywallInputs): number {
  return Math.max(0, Math.min(2, Math.round(inputs.workType ?? getInputDefault(spec, "workType", 0))));
}

function resolveLength(spec: DrywallCanonicalSpec, inputs: DrywallInputs): number {
  return Math.max(0.5, Math.min(30, inputs.length ?? getInputDefault(spec, "length", 5)));
}

function resolveHeight(spec: DrywallCanonicalSpec, inputs: DrywallInputs): number {
  return Math.max(1.5, Math.min(5, inputs.height ?? getInputDefault(spec, "height", 2.7)));
}

function resolveLayers(spec: DrywallCanonicalSpec, inputs: DrywallInputs): number {
  const raw = Math.round(inputs.layers ?? getInputDefault(spec, "layers", 1));
  return raw === 2 ? 2 : 1;
}

function resolveSheetSize(spec: DrywallCanonicalSpec, inputs: DrywallInputs): number {
  return Math.max(0, Math.min(2, Math.round(inputs.sheetSize ?? getInputDefault(spec, "sheetSize", 0))));
}

function resolveProfileStep(spec: DrywallCanonicalSpec, inputs: DrywallInputs): number {
  const raw = inputs.profileStep ?? getInputDefault(spec, "profileStep", 0.6);
  return raw <= 0.4 ? 0.4 : 0.6;
}

function buildMaterials(
  sheetsNeeded: number,
  pnPieces: number,
  ppPieces: number,
  screwsTFkg: number,
  screwsLBkg: number,
  dowels: number,
  sealingTapeRolls: number,
  puttyStartBags: number,
  puttyFinishBags: number,
  serpyankaRolls: number,
  primerCans: number,
  sandpaperPacks: number,
): CanonicalMaterialResult[] {
  return [
    {
      name: "ГКЛ листы",
      quantity: sheetsNeeded,
      unit: "шт",
      withReserve: sheetsNeeded,
      purchaseQty: sheetsNeeded,
      category: "Основное",
    },
    {
      name: "Профиль ПН 27\u00d728 3м",
      quantity: pnPieces,
      unit: "шт",
      withReserve: pnPieces,
      purchaseQty: pnPieces,
      category: "Каркас",
    },
    {
      name: "Профиль ПП 60\u00d727 3м",
      quantity: ppPieces,
      unit: "шт",
      withReserve: ppPieces,
      purchaseQty: ppPieces,
      category: "Каркас",
    },
    {
      name: "Саморезы 3.5\u00d725 мм",
      quantity: screwsTFkg,
      unit: "кг",
      withReserve: screwsTFkg,
      purchaseQty: Math.ceil(screwsTFkg),
      category: "Крепёж",
    },
    {
      name: "Саморезы-клопы 3.5\u00d79.5 мм",
      quantity: screwsLBkg,
      unit: "кг",
      withReserve: screwsLBkg,
      purchaseQty: Math.ceil(screwsLBkg),
      category: "Крепёж",
    },
    {
      name: "Дюбели 6\u00d740",
      quantity: dowels,
      unit: "шт",
      withReserve: dowels,
      purchaseQty: dowels,
      category: "Крепёж",
    },
    {
      name: "Лента уплотнительная (рулон 30м)",
      quantity: sealingTapeRolls,
      unit: "рулон",
      withReserve: sealingTapeRolls,
      purchaseQty: sealingTapeRolls,
      category: "Изоляция",
    },
    {
      name: "Шпаклёвка стартовая 25кг",
      quantity: puttyStartBags,
      unit: "мешков",
      withReserve: puttyStartBags,
      purchaseQty: puttyStartBags,
      category: "Отделка",
    },
    {
      name: "Шпаклёвка финишная 25кг",
      quantity: puttyFinishBags,
      unit: "мешков",
      withReserve: puttyFinishBags,
      purchaseQty: puttyFinishBags,
      category: "Отделка",
    },
    {
      name: "Серпянка 90м",
      quantity: serpyankaRolls,
      unit: "рулонов",
      withReserve: serpyankaRolls,
      purchaseQty: serpyankaRolls,
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
    {
      name: "Наждачная бумага P180",
      quantity: sandpaperPacks,
      unit: "упаковок",
      withReserve: sandpaperPacks,
      purchaseQty: sandpaperPacks,
      category: "Отделка",
    },
  ];
}

export function computeCanonicalDrywall(
  spec: DrywallCanonicalSpec,
  inputs: DrywallInputs,
  factorTable: FactorTable,
): CanonicalCalculatorResult {
  const accuracyMode = inputs.accuracyMode ?? DEFAULT_ACCURACY_MODE;

  const workType = resolveWorkType(spec, inputs);
  const length = resolveLength(spec, inputs);
  const height = resolveHeight(spec, inputs);
  const layers = resolveLayers(spec, inputs);
  const sheetSize = resolveSheetSize(spec, inputs);
  const profileStep = resolveProfileStep(spec, inputs);

  const area = roundDisplay(length * height, 3);
  const sides = workType === 0 ? 2 : 1;
  const totalSheetArea = area * sides * layers;

  const gklArea = SHEET_SIZES[sheetSize]?.area ?? SHEET_SIZES[0].area;
  const baseSheetsNeededRaw = Math.ceil(totalSheetArea / gklArea * SHEET_RESERVE);
  const accuracyMult = getPrimaryMultiplier("drywall", accuracyMode);
  const baseSheetsNeeded = baseSheetsNeededRaw * accuracyMult;

  // Profile PN (perimeter)
  const pnPerimeter = 2 * (length + height);
  const pnLength = Math.ceil(pnPerimeter * PROFILE_RESERVE / PROFILE_LENGTH_M) * PROFILE_LENGTH_M;
  const pnPieces = pnLength / PROFILE_LENGTH_M;

  // Profile PP (studs)
  const ppCount = Math.ceil(length / profileStep) + 1;
  const ppLength = ppCount * height * PROFILE_RESERVE;
  const ppPieces = Math.ceil(ppLength / PROFILE_LENGTH_M);

  // Screws (in kg)
  const screwsTFpcs = Math.ceil(totalSheetArea * SCREWS_TF_PER_M2 * PROFILE_RESERVE);
  const screwsTFkg = Math.ceil(screwsTFpcs / SCREWS_TF_PER_KG * 10) / 10;
  const screwsLBpcs = Math.ceil(ppCount * SCREWS_LB_PER_PROFILE * PROFILE_RESERVE);
  const screwsLBkg = Math.ceil(screwsLBpcs / SCREWS_LB_PER_KG * 10) / 10;

  // Dowels
  const dowels = Math.ceil(pnPerimeter / DOWELS_STEP_M);

  // Sealing tape
  const sealingTapeRolls = Math.ceil(pnPerimeter / SEALING_TAPE_ROLL_M);

  // Putty
  const puttyStartBags = Math.ceil(totalSheetArea * PUTTY_START_KG_PER_M2 * PUTTY_RESERVE / PUTTY_BAG_KG);
  const puttyFinishBags = Math.ceil(totalSheetArea * PUTTY_FINISH_KG_PER_M2 * PUTTY_RESERVE / PUTTY_BAG_KG);

  // Serpyanka
  const serpyankaRolls = Math.ceil(baseSheetsNeeded * SERPYANKA_M_PER_SHEET * SERPYANKA_RESERVE / SERPYANKA_ROLL_M);

  // Primer
  const primerCans = Math.ceil(totalSheetArea * PRIMER_L_PER_M2 * PRIMER_RESERVE / PRIMER_CAN_L);

  // Sandpaper
  const sandpaperPacks = Math.ceil(Math.ceil(totalSheetArea / SANDPAPER_M2_PER_SHEET) / SANDPAPER_PACK);

  // Packaging for scenarios (sheet count is the main material)
  const packageOptions = [{
    size: spec.packaging_rules.package_size,
    label: `gkl-sheet-${spec.packaging_rules.package_size}`,
    unit: spec.packaging_rules.unit,
  }];

  const scenarios = SCENARIOS.reduce((acc, scenario) => {
    const { multiplier, keyFactors } = combineScenarioFactors(factorTable, spec.field_factors.enabled, scenario);
    const exactNeed = roundDisplay(baseSheetsNeeded * multiplier, 6);
    const packaging = optimizePackaging(exactNeed, packageOptions);

    acc[scenario] = {
      exact_need: exactNeed,
      purchase_quantity: roundDisplay(packaging.purchaseQuantity, 6),
      leftover: roundDisplay(packaging.leftover, 6),
      assumptions: [
        `formula_version:${spec.formula_version}`,
        `workType:${workType}`,
        `sheetSize:${sheetSize}`,
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

  const warnings: string[] = [];
  if (height > spec.warnings_rules.wide_profile_height_threshold) {
    warnings.push("Высота более 3.5 м — требуются профили шириной 100 мм");
  }
  if (layers === 2) {
    warnings.push("Второй слой ГКЛ монтируется со смещением 600 мм");
  }

  const practicalNotes: string[] = [];
  if (layers === 2) {
    practicalNotes.push("Два слоя ГКЛ — смещайте стыки минимум на 400 мм, иначе трещина по шву гарантирована");
  }
  if (height > 3.5) {
    practicalNotes.push(`Высота ${roundDisplay(height, 1)} м — ставьте профили CW-100, стандартные CW-75 будут гулять`);
  }
  practicalNotes.push("Между ГКЛ и полом оставляйте зазор 10 мм — при усадке дома лист не лопнет");

  return {
    canonicalSpecId: spec.calculator_id,
    formulaVersion: spec.formula_version,
    materials: buildMaterials(
      recScenario.exact_need,
      pnPieces,
      ppPieces,
      screwsTFkg,
      screwsLBkg,
      dowels,
      sealingTapeRolls,
      puttyStartBags,
      puttyFinishBags,
      serpyankaRolls,
      primerCans,
      sandpaperPacks,
    ),
    totals: {
      area: area,
      workType: workType,
      length: roundDisplay(length, 3),
      height: roundDisplay(height, 3),
      layers: layers,
      sheetSize: sheetSize,
      profileStep: profileStep,
      sides: sides,
      totalSheetArea: roundDisplay(totalSheetArea, 3),
      gklArea: gklArea,
      sheetsNeeded: roundDisplay(recScenario.exact_need, 3),
      pnPerimeter: roundDisplay(pnPerimeter, 3),
      pnPieces: pnPieces,
      ppCount: ppCount,
      ppPieces: ppPieces,
      screwsTF: screwsTFkg,
      screwsLB: screwsLBkg,
      dowels: dowels,
      sealingTapeRolls: sealingTapeRolls,
      puttyStartBags: puttyStartBags,
      puttyFinishBags: puttyFinishBags,
      serpyankaRolls: serpyankaRolls,
      primerCans: primerCans,
      sandpaperPacks: sandpaperPacks,
      minExactNeedSheets: scenarios.MIN.exact_need,
      recExactNeedSheets: recScenario.exact_need,
      maxExactNeedSheets: scenarios.MAX.exact_need,
      minPurchaseSheets: scenarios.MIN.purchase_quantity,
      recPurchaseSheets: recScenario.purchase_quantity,
      maxPurchaseSheets: scenarios.MAX.purchase_quantity,
    },
    warnings,
    practicalNotes,
    scenarios,
    accuracyMode,
    accuracyExplanation: applyAccuracyMode(baseSheetsNeededRaw, "drywall", accuracyMode).explanation,
  };
}
