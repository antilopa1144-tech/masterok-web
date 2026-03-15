import { combineScenarioFactors, type FactorTable } from "./factors";
import { optimizePackaging } from "./packaging";
import { SCENARIOS, type ScenarioBundle } from "./scenarios";
import type {
  SlopesCanonicalSpec,
  CanonicalCalculatorResult,
  CanonicalMaterialResult,
} from "./canonical";
import { roundDisplay } from "./units";

/* ─── constants ─── */

const OPENING_DIMS: Record<number, [number, number, number]> = {
  0: [1200, 1400, 3], // window 1200×1400 3sides
  1: [900, 1200, 3],  // small window 900×1200 3sides
  2: [800, 2000, 2],  // door 800×2000 2sides
  3: [900, 2000, 3],  // balcony door 900×2000 3sides
};
const PANEL_M2 = 3.6;
const GKL_M2 = 3.0;
const PLASTER_KG_PER_M2 = 12;
const PUTTY_KG_PER_M2 = 1.2;
const PRIMER_L_PER_M2 = 0.15;
const CORNER_PROFILE_M = 3;
const F_PROFILE_M = 3;
const PANEL_RESERVE = 1.12;
const PLASTER_RESERVE = 1.1;
const PUTTY_RESERVE = 1.1;
const GKL_RESERVE = 1.12;
const PRIMER_RESERVE = 1.15;

/* ─── labels ─── */

const OPENING_TYPE_LABELS: Record<number, string> = {
  0: "Окно 1200×1400 (3 стороны)",
  1: "Окно 900×1200 (3 стороны)",
  2: "Дверь 800×2000 (2 стороны)",
  3: "Балконная дверь 900×2000 (3 стороны)",
};

const FINISH_TYPE_LABELS: Record<number, string> = {
  0: "Сэндвич-панели ПВХ",
  1: "ПВХ-панели",
  2: "Штукатурка",
  3: "ГКЛ",
};

/* ─── inputs ─── */

interface SlopesInputs {
  openingCount?: number;
  openingType?: number;
  slopeWidth?: number;
  finishType?: number;
}

/* ─── helpers ─── */

function getInputDefault(spec: SlopesCanonicalSpec, key: string, fallback: number): number {
  return spec.input_schema.find((field) => field.key === key)?.default_value ?? fallback;
}

/* ─── main ─── */

export function computeCanonicalSlopes(
  spec: SlopesCanonicalSpec,
  inputs: SlopesInputs,
  factorTable: FactorTable,
): CanonicalCalculatorResult {
  const openingCount = Math.max(1, Math.min(30, Math.round(inputs.openingCount ?? getInputDefault(spec, "openingCount", 5))));
  const openingType = Math.max(0, Math.min(3, Math.round(inputs.openingType ?? getInputDefault(spec, "openingType", 0))));
  const slopeWidth = Math.max(150, Math.min(500, Math.round(inputs.slopeWidth ?? getInputDefault(spec, "slopeWidth", 350))));
  const finishType = Math.max(0, Math.min(3, Math.round(inputs.finishType ?? getInputDefault(spec, "finishType", 0))));

  /* ─── opening geometry ─── */
  const [openW, openH, sides] = OPENING_DIMS[openingType] ?? OPENING_DIMS[0];

  // slopePerim: for 3-sided = top + 2*sides; for 2-sided = 2*sides only
  let slopePerim: number;
  if (sides === 3) {
    slopePerim = (2 * openH + openW) / 1000;
  } else {
    slopePerim = (2 * openH) / 1000;
  }
  const slopeArea = slopePerim * (slopeWidth / 1000);
  const totalArea = roundDisplay(slopeArea * openingCount, 4);
  const totalPerim = roundDisplay(slopePerim * openingCount, 4);

  /* ─── finish-type-specific materials ─── */
  let panelCount = 0;
  let fProfilePcs = 0;
  let foamCans = 0;
  let plasterBags = 0;
  let puttyBagsPlaster = 0;
  let cornerPcs = 0;
  let gklSheets = 0;
  let screwsGKL = 0;
  let puttyBagsGKL = 0;

  if (finishType === 0 || finishType === 1) {
    /* sandwich PVC / PVC panel */
    panelCount = Math.ceil(totalArea * PANEL_RESERVE / PANEL_M2);
    fProfilePcs = Math.ceil(totalPerim * 1.1 / F_PROFILE_M);
    foamCans = Math.ceil(totalPerim / 5);
  } else if (finishType === 2) {
    /* plaster */
    plasterBags = Math.ceil(totalArea * PLASTER_KG_PER_M2 * PLASTER_RESERVE / 25);
    puttyBagsPlaster = Math.ceil(totalArea * PUTTY_KG_PER_M2 * PUTTY_RESERVE / 25);
    cornerPcs = Math.ceil(totalPerim / CORNER_PROFILE_M);
  } else {
    /* GKL */
    gklSheets = Math.ceil(totalArea * GKL_RESERVE / GKL_M2);
    screwsGKL = Math.ceil(gklSheets * 20 * 1.05);
    puttyBagsGKL = Math.ceil(totalArea * PUTTY_KG_PER_M2 * PUTTY_RESERVE / 25);
  }

  /* ─── common materials ─── */
  const sealantTubes = Math.ceil(totalPerim / 5);
  const primerCans = Math.ceil(totalArea * PRIMER_L_PER_M2 * PRIMER_RESERVE / 10);

  /* ─── scenarios ─── */
  let basePrimary: number;
  let packageLabel: string;
  let packageUnit: string;

  if (finishType === 0 || finishType === 1) {
    basePrimary = panelCount;
    packageLabel = "sandwich-panel";
    packageUnit = "шт";
  } else if (finishType === 2) {
    basePrimary = plasterBags;
    packageLabel = "plaster-bag-25kg";
    packageUnit = "мешков";
  } else {
    basePrimary = gklSheets;
    packageLabel = "gkl-sheet";
    packageUnit = "листов";
  }

  const packageOptions = [{
    size: 1,
    label: packageLabel,
    unit: packageUnit,
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
        `openingType:${openingType}`,
        `finishType:${finishType}`,
        `slopeWidth:${slopeWidth}`,
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
  const materials: CanonicalMaterialResult[] = [];

  if (finishType === 0 || finishType === 1) {
    materials.push(
      {
        name: `${FINISH_TYPE_LABELS[finishType]}`,
        quantity: roundDisplay(recScenario.exact_need, 6),
        unit: "шт",
        withReserve: Math.ceil(recScenario.exact_need),
        purchaseQty: Math.ceil(recScenario.exact_need),
        category: "Отделка",
      },
      {
        name: `F-профиль (${F_PROFILE_M} м)`,
        quantity: fProfilePcs,
        unit: "шт",
        withReserve: fProfilePcs,
        purchaseQty: fProfilePcs,
        category: "Профиль",
      },
      {
        name: "Монтажная пена",
        quantity: foamCans,
        unit: "баллонов",
        withReserve: foamCans,
        purchaseQty: foamCans,
        category: "Монтаж",
      },
    );
  } else if (finishType === 2) {
    materials.push(
      {
        name: "Штукатурка (мешки 25 кг)",
        quantity: roundDisplay(recScenario.exact_need, 6),
        unit: "мешков",
        withReserve: Math.ceil(recScenario.exact_need),
        purchaseQty: Math.ceil(recScenario.exact_need),
        category: "Отделка",
      },
      {
        name: "Шпаклёвка (мешки 25 кг)",
        quantity: puttyBagsPlaster,
        unit: "мешков",
        withReserve: puttyBagsPlaster,
        purchaseQty: puttyBagsPlaster,
        category: "Отделка",
      },
      {
        name: "Уголок перфорированный",
        quantity: cornerPcs,
        unit: "шт",
        withReserve: cornerPcs,
        purchaseQty: cornerPcs,
        category: "Профиль",
      },
    );
  } else {
    materials.push(
      {
        name: "ГКЛ для откосов",
        quantity: roundDisplay(recScenario.exact_need, 6),
        unit: "листов",
        withReserve: Math.ceil(recScenario.exact_need),
        purchaseQty: Math.ceil(recScenario.exact_need),
        category: "Отделка",
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
        name: "Шпаклёвка (мешки 25 кг)",
        quantity: puttyBagsGKL,
        unit: "мешков",
        withReserve: puttyBagsGKL,
        purchaseQty: puttyBagsGKL,
        category: "Отделка",
      },
    );
  }

  materials.push(
    {
      name: "Герметик (тубы)",
      quantity: sealantTubes,
      unit: "шт",
      withReserve: sealantTubes,
      purchaseQty: sealantTubes,
      category: "Монтаж",
    },
    {
      name: "Грунтовка (канистра 10 л)",
      quantity: primerCans,
      unit: "канистр",
      withReserve: primerCans,
      purchaseQty: primerCans,
      category: "Грунтовка",
    },
  );

  /* ─── warnings ─── */
  const warnings: string[] = [];
  if (slopeWidth >= 400) {
    warnings.push("Широкие откосы — рекомендуется дополнительное утепление");
  }
  if (openingCount > 15) {
    warnings.push("Большое количество проёмов — рассмотрите оптовую закупку");
  }

  return {
    canonicalSpecId: spec.calculator_id,
    formulaVersion: spec.formula_version,
    materials,
    totals: {
      openingCount,
      openingType,
      slopeWidth,
      finishType,
      openW,
      openH,
      sides,
      slopePerim: roundDisplay(slopePerim, 4),
      slopeArea: roundDisplay(slopeArea, 4),
      totalArea,
      totalPerim,
      panelCount,
      fProfilePcs,
      foamCans,
      plasterBags,
      puttyBagsPlaster,
      cornerPcs,
      gklSheets,
      screwsGKL,
      puttyBagsGKL,
      sealantTubes,
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
