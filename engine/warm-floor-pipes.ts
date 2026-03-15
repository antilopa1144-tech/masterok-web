import { combineScenarioFactors, type FactorTable } from "./factors";
import { optimizePackaging } from "./packaging";
import { SCENARIOS, type ScenarioBundle } from "./scenarios";
import type {
  WarmFloorPipesCanonicalSpec,
  CanonicalCalculatorResult,
  CanonicalMaterialResult,
} from "./canonical";
import { roundDisplay } from "./units";

interface WarmFloorPipesInputs {
  inputMode?: number;
  length?: number;
  width?: number;
  area?: number;
  pipeStep?: number;
  pipeType?: number;
}

/* ─── constants ─── */

const FURNITURE_REDUCTION = 0.85;         // 15% subtracted for furniture
const COLLECTOR_ADDITION_M = 3;
const MAX_CIRCUIT_M = 80;
const PIPE_RESERVE = 1.05;
const PIPE_COIL_M = 200;
const EPPS_SHEET_M2 = 0.72;
const EPPS_RESERVE = 1.05;
const DAMPER_TAPE_ROLL_M = 25;
const DAMPER_RESERVE = 1.05;
const ANCHOR_STEP_M = 0.3;
const ANCHOR_RESERVE = 1.05;
const ANCHOR_PACK = 100;
const SCREED_THICKNESS_M = 0.05;
const SCREED_DENSITY = 1500;              // semi-dry
const SCREED_BAG_KG = 25;

/* ─── factor defaults ─── */

const WARM_FLOOR_PIPES_FACTOR_TABLE: FactorTable = {
  surface_quality: { min: 1, rec: 1, max: 1 },
  geometry_complexity: { min: 0.98, rec: 1, max: 1.08 },
  installation_method: { min: 1, rec: 1, max: 1 },
  worker_skill: { min: 0.95, rec: 1, max: 1.1 },
  waste_factor: { min: 0.98, rec: 1, max: 1.08 },
  logistics_buffer: { min: 1, rec: 1, max: 1 },
  packaging_rounding: { min: 1, rec: 1, max: 1 },
};

/* ─── pipe type labels ─── */

const PIPE_TYPE_LABELS: Record<number, string> = {
  0: "PEX-a",
  1: "PEX-b",
  2: "PE-RT",
  3: "Металлопластик",
};

/* ─── helpers ─── */

function getInputDefault(spec: WarmFloorPipesCanonicalSpec, key: string, fallback: number): number {
  return spec.input_schema.find((field) => field.key === key)?.default_value ?? fallback;
}

function resolveArea(spec: WarmFloorPipesCanonicalSpec, inputs: WarmFloorPipesInputs) {
  const inputMode = Math.round(inputs.inputMode ?? getInputDefault(spec, "inputMode", 0));
  if (inputMode === 0) {
    const length = Math.max(1, Math.min(30, inputs.length ?? getInputDefault(spec, "length", 5)));
    const width = Math.max(1, Math.min(30, inputs.width ?? getInputDefault(spec, "width", 4)));
    return {
      inputMode: 0,
      area: roundDisplay(length * width, 3),
      perimeter: roundDisplay(2 * (length + width), 3),
      length,
      width,
    };
  }

  const area = Math.max(1, Math.min(300, inputs.area ?? getInputDefault(spec, "area", 20)));
  return {
    inputMode: 1,
    area: roundDisplay(area, 3),
    perimeter: roundDisplay(Math.sqrt(area) * 4, 3),
    length: 0,
    width: 0,
  };
}

/* ─── main ─── */

export function computeCanonicalWarmFloorPipes(
  spec: WarmFloorPipesCanonicalSpec,
  inputs: WarmFloorPipesInputs,
  factorTable: FactorTable = WARM_FLOOR_PIPES_FACTOR_TABLE,
): CanonicalCalculatorResult {
  const work = resolveArea(spec, inputs);
  const area = work.area;
  const perimeter = work.perimeter;

  const pipeStep = Math.max(100, Math.min(300, inputs.pipeStep ?? getInputDefault(spec, "pipeStep", 200)));
  const pipeType = Math.max(0, Math.min(3, Math.round(inputs.pipeType ?? getInputDefault(spec, "pipeType", 0))));

  /* ─── core formulas ─── */
  const usefulArea = roundDisplay(area * FURNITURE_REDUCTION, 3);
  const pipeStepM = pipeStep / 1000;
  const pipeLength = roundDisplay(usefulArea / pipeStepM + COLLECTOR_ADDITION_M, 3);
  const circuits = Math.max(1, Math.ceil(pipeLength / MAX_CIRCUIT_M));
  const totalPipe = roundDisplay(pipeLength * PIPE_RESERVE, 3);
  const coils = Math.ceil(totalPipe / PIPE_COIL_M);

  /* ─── ancillary materials ─── */
  const eppsSheets = Math.ceil(area * EPPS_RESERVE / EPPS_SHEET_M2);
  const damperTapeRolls = Math.ceil(perimeter * DAMPER_RESERVE / DAMPER_TAPE_ROLL_M);
  const anchorTotal = Math.ceil(totalPipe / ANCHOR_STEP_M * ANCHOR_RESERVE);
  const anchorPacks = Math.ceil(anchorTotal / ANCHOR_PACK);
  const screedBags = Math.ceil(area * SCREED_THICKNESS_M * SCREED_DENSITY / SCREED_BAG_KG);

  /* ─── scenarios ─── */
  const basePrimary = totalPipe;
  const packageOptions = [{ size: PIPE_COIL_M, label: `pipe-coil-${PIPE_COIL_M}m`, unit: "м" }];

  const scenarios = SCENARIOS.reduce((acc, scenario) => {
    const { multiplier, keyFactors } = combineScenarioFactors(factorTable, spec.field_factors.enabled, scenario);
    const exactNeed = roundDisplay(basePrimary * multiplier, 6);
    const packaging = optimizePackaging(exactNeed, packageOptions);

    acc[scenario] = {
      exact_need: exactNeed,
      purchase_quantity: roundDisplay(packaging.purchaseQuantity, 6),
      leftover: roundDisplay(packaging.leftover, 6),
      assumptions: [
        `formula_version:${spec.formula_version}`,
        `pipeType:${pipeType}`,
        `pipeStep:${pipeStep}`,
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

  /* ─── materials list ─── */
  const materials: CanonicalMaterialResult[] = [
    {
      name: `Труба ${PIPE_TYPE_LABELS[pipeType] ?? "PEX-a"} (бухты ${PIPE_COIL_M} м)`,
      quantity: roundDisplay(totalPipe, 3),
      unit: "м",
      withReserve: coils * PIPE_COIL_M,
      purchaseQty: coils,
      category: "Основное",
    },
    {
      name: "Утеплитель ЭППС (листы 1200×600)",
      quantity: eppsSheets,
      unit: "листов",
      withReserve: eppsSheets,
      purchaseQty: eppsSheets,
      category: "Утепление",
    },
    {
      name: "Демпферная лента (рулоны)",
      quantity: damperTapeRolls,
      unit: "рулонов",
      withReserve: damperTapeRolls,
      purchaseQty: damperTapeRolls,
      category: "Подготовка",
    },
    {
      name: "Якорные клипсы (упаковки по 100 шт)",
      quantity: anchorTotal,
      unit: "шт",
      withReserve: anchorPacks * ANCHOR_PACK,
      purchaseQty: anchorPacks,
      category: "Крепёж",
    },
    {
      name: `Коллектор (${circuits} контуров)`,
      quantity: 1,
      unit: "шт",
      withReserve: 1,
      purchaseQty: 1,
      category: "Управление",
    },
    {
      name: "Стяжка полусухая (мешки 25 кг)",
      quantity: roundDisplay(area * SCREED_THICKNESS_M * SCREED_DENSITY, 3),
      unit: "кг",
      withReserve: screedBags * SCREED_BAG_KG,
      purchaseQty: screedBags,
      category: "Основное",
    },
  ];

  /* ─── warnings ─── */
  const warnings: string[] = [];
  if (pipeLength > spec.warnings_rules.multiple_circuits_pipe_threshold_m) {
    warnings.push("Длина трубы более 80 м — рекомендуется несколько контуров");
  }
  if (area > spec.warnings_rules.professional_heat_loss_area_threshold_m2) {
    warnings.push("Площадь более 40 м² — рекомендуется профессиональный расчёт теплопотерь");
  }


  const practicalNotes: string[] = [];
  if (pipeLength > 80) {
    practicalNotes.push(`Контур ${roundDisplay(pipeLength, 0)} м — разбейте на ${circuits} петель, иначе котёл не продавит теплоноситель`);
  }
  practicalNotes.push("Тёплый пол — не основное отопление, а дополнительный комфорт. Радиаторы всё равно нужны");

  return {
    canonicalSpecId: spec.calculator_id,
    formulaVersion: spec.formula_version,
    materials,
    totals: {
      inputMode: work.inputMode,
      area,
      perimeter,
      length: work.length,
      width: work.width,
      pipeStep,
      pipeType,
      usefulArea,
      pipeStepM: roundDisplay(pipeStepM, 4),
      pipeLength: roundDisplay(pipeLength, 3),
      circuits,
      totalPipe,
      coils,
      eppsSheets,
      damperTapeRolls,
      anchorTotal,
      anchorPacks,
      screedBags,
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
