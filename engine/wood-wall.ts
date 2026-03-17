import { combineScenarioFactors, type FactorTable } from "./factors";
import { optimizePackaging } from "./packaging";
import { SCENARIOS, type ScenarioBundle } from "./scenarios";
import type {
  WoodWallCanonicalSpec,
  CanonicalCalculatorResult,
  CanonicalMaterialResult,
} from "./canonical";
import { roundDisplay } from "./units";

/* ─── constants ─── */

const BOARD_RESERVE = 1.10;
const ANTISEPTIC_L_PER_M2 = 0.3;
const FINISH_L_PER_M2 = 0.1;
const FINISH_LAYERS = 2;
const PRIMER_L_PER_M2 = 0.1;
const FASTENERS_PER_BOARD = 9;
const FASTENERS_PER_KG = 600;  // 3.5×35 мм
const CLAMPS_PER_BOARD = 5;
const BATTEN_STEP = 0.55;
const PLINTH_RESERVE = 1.03;
const CORNER_RATIO = 0.25;
const CORNER_RESERVE = 1.05;

/* ─── inputs ─── */

interface WoodWallInputs {
  inputMode?: number;
  area?: number;
  length?: number;
  height?: number;
  boardWidth?: number;
  boardLength?: number;
  perimeter?: number;
}

/* ─── helpers ─── */

function getInputDefault(spec: WoodWallCanonicalSpec, key: string, fallback: number): number {
  return spec.input_schema.find((field) => field.key === key)?.default_value ?? fallback;
}

/* ─── main ─── */

export function computeCanonicalWoodWall(
  spec: WoodWallCanonicalSpec,
  inputs: WoodWallInputs,
  factorTable: FactorTable,
): CanonicalCalculatorResult {
  const inputMode = Math.max(0, Math.min(1, Math.round(inputs.inputMode ?? getInputDefault(spec, "inputMode", 0))));
  const areaInput = Math.max(1, Math.min(500, inputs.area ?? getInputDefault(spec, "area", 15)));
  const length = Math.max(1, Math.min(30, inputs.length ?? getInputDefault(spec, "length", 4)));
  const height = Math.max(2, Math.min(4, inputs.height ?? getInputDefault(spec, "height", 2.5)));
  const boardWidth = Math.max(5, Math.min(20, inputs.boardWidth ?? getInputDefault(spec, "boardWidth", 10)));
  const boardLength = Math.max(2, Math.min(6, inputs.boardLength ?? getInputDefault(spec, "boardLength", 3)));

  /* ─── area ─── */
  const area = inputMode === 1 ? roundDisplay(length * height, 3) : areaInput;

  /* ─── boards ─── */
  const boardArea = (boardWidth / 100) * boardLength;
  const boards = Math.ceil(area / boardArea * BOARD_RESERVE);

  /* ─── perimeter ─── */
  const perimeter = inputMode === 1 ? 2 * (length + length) : 4 * Math.sqrt(area);

  /* ─── battens ─── */
  const battensCount = Math.ceil((perimeter / 4) / BATTEN_STEP);
  const battensLen = battensCount * height;

  /* ─── plinth & corners ─── */
  const plinth = perimeter * PLINTH_RESERVE;
  const corners = perimeter * CORNER_RATIO * CORNER_RESERVE;
  const ceilingPlinth = perimeter * PLINTH_RESERVE;

  /* ─── coatings ─── */
  const antisepticL = area * ANTISEPTIC_L_PER_M2;
  const finishL = area * FINISH_L_PER_M2 * FINISH_LAYERS;
  const primerL = area * PRIMER_L_PER_M2;

  /* ─── fasteners ─── */
  const fastenersPcs = boards * FASTENERS_PER_BOARD;
  const fastenersKg = Math.ceil(fastenersPcs / FASTENERS_PER_KG * 10) / 10;
  const clamps = boards * CLAMPS_PER_BOARD;

  /* ─── scenarios ─── */
  const packageOptions = [{
    size: 1,
    label: "wood-board",
    unit: "шт",
  }];

  const scenarios = SCENARIOS.reduce((acc, scenario) => {
    const { multiplier, keyFactors } = combineScenarioFactors(factorTable, spec.field_factors.enabled, scenario);
    const exactNeed = roundDisplay(boards * multiplier, 6);
    const packaging = optimizePackaging(exactNeed, packageOptions);

    acc[scenario] = {
      exact_need: exactNeed,
      purchase_quantity: roundDisplay(packaging.purchaseQuantity, 6),
      leftover: roundDisplay(packaging.leftover, 6),
      assumptions: [
        `formula_version:${spec.formula_version}`,
        `inputMode:${inputMode}`,
        `boardWidth:${boardWidth}`,
        `boardLength:${boardLength}`,
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
  if (area > 50) {
    warnings.push("Большая площадь — дайте вагонке акклиматизироваться минимум 48 часов");
  }

  /* ─── materials ─── */
  const materials: CanonicalMaterialResult[] = [
    {
      name: "Доски (вагонка)",
      quantity: roundDisplay(recScenario.exact_need, 6),
      unit: "шт",
      withReserve: Math.ceil(recScenario.exact_need),
      purchaseQty: Math.ceil(recScenario.exact_need),
      category: "Облицовка",
    },
    {
      name: "Обрешётка (п.м.)",
      quantity: roundDisplay(battensLen, 2),
      unit: "п.м.",
      withReserve: Math.ceil(battensLen),
      purchaseQty: Math.ceil(battensLen),
      category: "Подсистема",
    },
    {
      name: "Плинтус напольный (п.м.)",
      quantity: roundDisplay(plinth, 2),
      unit: "п.м.",
      withReserve: Math.ceil(plinth),
      purchaseQty: Math.ceil(plinth),
      category: "Профиль",
    },
    {
      name: "Уголки (п.м.)",
      quantity: roundDisplay(corners, 2),
      unit: "п.м.",
      withReserve: Math.ceil(corners),
      purchaseQty: Math.ceil(corners),
      category: "Профиль",
    },
    {
      name: "Плинтус потолочный (п.м.)",
      quantity: roundDisplay(ceilingPlinth, 2),
      unit: "п.м.",
      withReserve: Math.ceil(ceilingPlinth),
      purchaseQty: Math.ceil(ceilingPlinth),
      category: "Профиль",
    },
    {
      name: "Антисептик (л)",
      quantity: roundDisplay(antisepticL, 2),
      unit: "л",
      withReserve: Math.ceil(antisepticL),
      purchaseQty: Math.ceil(antisepticL),
      category: "Покрытие",
    },
    {
      name: "Лак / финиш (л)",
      quantity: roundDisplay(finishL, 2),
      unit: "л",
      withReserve: Math.ceil(finishL),
      purchaseQty: Math.ceil(finishL),
      category: "Покрытие",
    },
    {
      name: "Грунтовка (л)",
      quantity: roundDisplay(primerL, 2),
      unit: "л",
      withReserve: Math.ceil(primerL),
      purchaseQty: Math.ceil(primerL),
      category: "Покрытие",
    },
    {
      name: "Крепёж (саморезы/гвозди)",
      quantity: fastenersKg,
      unit: "кг",
      withReserve: fastenersKg,
      purchaseQty: Math.ceil(fastenersKg),
      category: "Крепёж",
    },
    {
      name: "Кляймеры",
      quantity: clamps,
      unit: "шт",
      withReserve: clamps,
      purchaseQty: clamps,
      category: "Крепёж",
    },
  ];


  const practicalNotes: string[] = [];
  practicalNotes.push("Дерево обязательно обработайте антисептиком перед монтажом — потом не доберётесь");

  return {
    canonicalSpecId: spec.calculator_id,
    formulaVersion: spec.formula_version,
    materials,
    totals: {
      area,
      inputMode,
      boardWidth,
      boardLength,
      boardArea: roundDisplay(boardArea, 4),
      boards,
      perimeter: roundDisplay(perimeter, 3),
      battensCount,
      battensLen: roundDisplay(battensLen, 3),
      plinth: roundDisplay(plinth, 3),
      corners: roundDisplay(corners, 3),
      ceilingPlinth: roundDisplay(ceilingPlinth, 3),
      antisepticL: roundDisplay(antisepticL, 3),
      finishL: roundDisplay(finishL, 3),
      primerL: roundDisplay(primerL, 3),
      fasteners: fastenersKg,
      clamps,
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
