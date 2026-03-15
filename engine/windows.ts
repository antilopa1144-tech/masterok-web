import { combineScenarioFactors, type FactorTable } from "./factors";
import { optimizePackaging } from "./packaging";
import { SCENARIOS, type ScenarioBundle } from "./scenarios";
import type {
  WindowsCanonicalSpec,
  CanonicalCalculatorResult,
  CanonicalMaterialResult,
} from "./canonical";
import { roundDisplay } from "./units";

/* ─── constants ─── */

const PSUL_ROLL_M = 5.6;
const IFLUL_ROLL_M = 8.5;
const PSUL_RESERVE = 1.1;
const ANCHOR_STEP = 0.7;
const FOAM_PER_PERIM = 0.333;
const FOAM_RESERVE = 1.1;
const WINDOWSILL_OVERHANG = 0.15;
const WINDOWSILL_ROLL = 6;
const SANDWICH_PANEL_M2 = 3.6;
const GKL_SHEET_M2 = 3.0;
const PLASTER_KG_PER_M2 = 10;
const PLASTER_BAG = 25;
const SLOPE_SANDWICH_RESERVE = 1.1;
const SLOPE_GKL_RESERVE = 1.12;
const ANCHOR_RESERVE = 1.05;
const SCREW_RESERVE = 1.05;
const F_PROFILE_LENGTH = 3;

/* ─── labels ─── */

const SLOPE_TYPE_LABELS: Record<number, string> = {
  0: "Сэндвич-панели ПВХ",
  1: "Штукатурка",
  2: "ГКЛ",
};

/* ─── inputs ─── */

interface WindowsInputs {
  windowCount?: number;
  windowWidth?: number;
  windowHeight?: number;
  wallThickness?: number;
  slopeType?: number;
}

/* ─── helpers ─── */

function getInputDefault(spec: WindowsCanonicalSpec, key: string, fallback: number): number {
  return spec.input_schema.find((field) => field.key === key)?.default_value ?? fallback;
}

/* ─── main ─── */

export function computeCanonicalWindows(
  spec: WindowsCanonicalSpec,
  inputs: WindowsInputs,
  factorTable: FactorTable,
): CanonicalCalculatorResult {
  const windowCount = Math.max(1, Math.min(20, Math.round(inputs.windowCount ?? getInputDefault(spec, "windowCount", 5))));
  const windowWidth = Math.max(600, Math.min(2100, Math.round(inputs.windowWidth ?? getInputDefault(spec, "windowWidth", 1200))));
  const windowHeight = Math.max(900, Math.min(2000, Math.round(inputs.windowHeight ?? getInputDefault(spec, "windowHeight", 1400))));
  const wallThickness = Math.max(200, Math.min(600, Math.round(inputs.wallThickness ?? getInputDefault(spec, "wallThickness", 500))));
  const slopeType = Math.max(0, Math.min(2, Math.round(inputs.slopeType ?? getInputDefault(spec, "slopeType", 0))));

  /* ─── geometry ─── */
  const perimM = 2 * (windowWidth + windowHeight) / 1000;

  /* ─── PSUL / IFLUL ─── */
  const psulRolls = Math.ceil(perimM * windowCount * PSUL_RESERVE / PSUL_ROLL_M);
  const iflulRolls = Math.ceil(perimM * windowCount * PSUL_RESERVE / IFLUL_ROLL_M);

  /* ─── foam ─── */
  const foamCans = Math.ceil(perimM / 3 * windowCount * FOAM_RESERVE);

  /* ─── anchors & screws ─── */
  const anchorsPerWindow = Math.ceil(perimM / ANCHOR_STEP);
  const totalAnchors = Math.ceil(anchorsPerWindow * windowCount * ANCHOR_RESERVE);
  const screws = Math.ceil(totalAnchors * 2 * SCREW_RESERVE);

  /* ─── windowsill ─── */
  const sillWidth = wallThickness / 1000 + WINDOWSILL_OVERHANG;
  const sillPcs = windowCount;

  /* ─── slopes ─── */
  const slopeSideArea = 2 * (windowHeight / 1000) * (wallThickness / 1000);
  const slopeTopArea = (windowWidth / 1000) * (wallThickness / 1000);
  const totalSlopeArea = (slopeSideArea + slopeTopArea) * windowCount;

  /* ─── slope materials by type ─── */
  let sandwichPcs = 0;
  let fProfilePcs = 0;
  let plasterBags = 0;
  let cornerPcs = 0;
  let gklSheets = 0;
  let screwsGKL = 0;
  let puttyBags = 0;

  if (slopeType === 0) {
    sandwichPcs = Math.ceil(totalSlopeArea * SLOPE_SANDWICH_RESERVE / SANDWICH_PANEL_M2);
    const fProfileLen = perimM * 0.75 * windowCount * PSUL_RESERVE;
    fProfilePcs = Math.ceil(fProfileLen / F_PROFILE_LENGTH);
  } else if (slopeType === 1) {
    plasterBags = Math.ceil(totalSlopeArea * PLASTER_KG_PER_M2 / PLASTER_BAG);
    cornerPcs = Math.ceil(perimM * 0.75 * windowCount * PSUL_RESERVE / 3);
  } else {
    gklSheets = Math.ceil(totalSlopeArea * SLOPE_GKL_RESERVE / GKL_SHEET_M2);
    screwsGKL = Math.ceil(gklSheets * 20 * SCREW_RESERVE);
    puttyBags = Math.ceil(totalSlopeArea * 1.2 / PLASTER_BAG);
  }

  /* ─── scenarios ─── */
  const basePrimary = foamCans;
  const packageOptions = [{
    size: 1,
    label: "foam-can",
    unit: "баллонов",
  }];

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
        `slopeType:${slopeType}`,
        `windowWidth:${windowWidth}`,
        `windowHeight:${windowHeight}`,
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
      name: `ПСУЛ (рулон ${PSUL_ROLL_M} м)`,
      quantity: psulRolls,
      unit: "рулонов",
      withReserve: psulRolls,
      purchaseQty: psulRolls,
      category: "Лента",
    },
    {
      name: `Внутренняя лента (рулон ${IFLUL_ROLL_M} м)`,
      quantity: iflulRolls,
      unit: "рулонов",
      withReserve: iflulRolls,
      purchaseQty: iflulRolls,
      category: "Лента",
    },
    {
      name: "Монтажная пена",
      quantity: roundDisplay(recScenario.exact_need, 6),
      unit: "баллонов",
      withReserve: Math.ceil(recScenario.exact_need),
      purchaseQty: Math.ceil(recScenario.exact_need),
      category: "Монтаж",
    },
    {
      name: "Анкерные пластины",
      quantity: totalAnchors,
      unit: "шт",
      withReserve: totalAnchors,
      purchaseQty: totalAnchors,
      category: "Крепёж",
    },
    {
      name: "Саморезы для анкеров",
      quantity: screws,
      unit: "шт",
      withReserve: screws,
      purchaseQty: screws,
      category: "Крепёж",
    },
    {
      name: `Подоконник (ширина ${roundDisplay(sillWidth * 1000, 0)} мм)`,
      quantity: sillPcs,
      unit: "шт",
      withReserve: sillPcs,
      purchaseQty: sillPcs,
      category: "Подоконники",
    },
  ];

  if (slopeType === 0) {
    materials.push(
      {
        name: `${SLOPE_TYPE_LABELS[0]}`,
        quantity: sandwichPcs,
        unit: "шт",
        withReserve: sandwichPcs,
        purchaseQty: sandwichPcs,
        category: "Откосы",
      },
      {
        name: `F-профиль (${F_PROFILE_LENGTH} м)`,
        quantity: fProfilePcs,
        unit: "шт",
        withReserve: fProfilePcs,
        purchaseQty: fProfilePcs,
        category: "Откосы",
      },
    );
  } else if (slopeType === 1) {
    materials.push(
      {
        name: `Штукатурка (мешки ${PLASTER_BAG} кг)`,
        quantity: plasterBags,
        unit: "мешков",
        withReserve: plasterBags,
        purchaseQty: plasterBags,
        category: "Откосы",
      },
      {
        name: "Уголок перфорированный",
        quantity: cornerPcs,
        unit: "шт",
        withReserve: cornerPcs,
        purchaseQty: cornerPcs,
        category: "Откосы",
      },
    );
  } else {
    materials.push(
      {
        name: "ГКЛ для откосов",
        quantity: gklSheets,
        unit: "листов",
        withReserve: gklSheets,
        purchaseQty: gklSheets,
        category: "Откосы",
      },
      {
        name: "Саморезы для ГКЛ",
        quantity: screwsGKL,
        unit: "шт",
        withReserve: screwsGKL,
        purchaseQty: screwsGKL,
        category: "Крепёж",
      },
      {
        name: `Шпаклёвка (мешки ${PLASTER_BAG} кг)`,
        quantity: puttyBags,
        unit: "мешков",
        withReserve: puttyBags,
        purchaseQty: puttyBags,
        category: "Откосы",
      },
    );
  }

  /* ─── warnings ─── */
  const warnings: string[] = [];
  if (windowWidth >= 1800) {
    warnings.push("Для широких окон рекомендуется усиленный монтаж");
  }
  if (wallThickness >= 500) {
    warnings.push("Толстые стены — проверьте глубину подоконника");
  }

  return {
    canonicalSpecId: spec.calculator_id,
    formulaVersion: spec.formula_version,
    materials,
    totals: {
      windowCount,
      windowWidth,
      windowHeight,
      wallThickness,
      slopeType,
      perimM: roundDisplay(perimM, 3),
      psulRolls,
      iflulRolls,
      foamCans,
      anchorsPerWindow,
      totalAnchors,
      screws,
      sillWidth: roundDisplay(sillWidth, 3),
      sillPcs,
      slopeSideArea: roundDisplay(slopeSideArea, 4),
      slopeTopArea: roundDisplay(slopeTopArea, 4),
      totalSlopeArea: roundDisplay(totalSlopeArea, 4),
      sandwichPcs,
      fProfilePcs,
      plasterBags,
      cornerPcs,
      gklSheets,
      screwsGKL,
      puttyBags,
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
