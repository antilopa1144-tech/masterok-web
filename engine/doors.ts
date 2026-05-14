import { combineScenarioFactors, type FactorTable } from "./factors";
import { optimizePackaging } from "./packaging";
import { SCENARIOS, type ScenarioBundle } from "./scenarios";
import type {
  DoorsCanonicalSpec,
  CanonicalCalculatorResult,
  CanonicalMaterialResult,
} from "./canonical";
import { roundDisplay } from "./units";
import { type AccuracyMode, DEFAULT_ACCURACY_MODE, applyAccuracyMode, getPrimaryMultiplier } from "./accuracy";
import { getInputDefault } from "./spec-helpers";

/* ─── constants ─── */

const DOOR_DIMS: Record<number, [number, number]> = {
  0: [700, 2000],
  1: [800, 2000],
  2: [900, 2000],
  3: [860, 2050],
  4: [700, 2100],
};
const BOX_DEPTH = 70;
const FOAM_ML_PER_M = 100;
const FOAM_CAN_ML = 750;
const SCREWS_PER_DOOR = 12;
const SCREWS_PER_KG = 600;  // 4×40 мм (монтажные)
const DUBELS_PER_DOOR = 6;
const GLUE_CARTRIDGE_PER_DOOR = 0.5;
const DOBOR_STANDARD_H = 2200;
const NALICHNIK_STANDARD_H = 2200;
const FOAM_RESERVE = 1.1;
const DUBEL_PACK = 20;

/* ─── labels ─── */

const DOOR_TYPE_LABELS: Record<number, string> = {
  0: "700×2000 мм",
  1: "800×2000 мм",
  2: "900×2000 мм",
  3: "860×2050 мм",
  4: "700×2100 мм",
};

/* ─── inputs ─── */

interface DoorsInputs {
  doorCount?: number;
  doorType?: number;
  wallThickness?: number;
  withNalichnik?: number;
  accuracyMode?: AccuracyMode;
}

/* ─── helpers ─── */

/* ─── main ─── */

export function computeCanonicalDoors(
  spec: DoorsCanonicalSpec,
  inputs: DoorsInputs,
  factorTable: FactorTable,
): CanonicalCalculatorResult {
  const accuracyMode = inputs.accuracyMode ?? DEFAULT_ACCURACY_MODE;
  const accuracyMult = getPrimaryMultiplier("generic", accuracyMode);

  const doorCount = Math.max(1, Math.min(20, Math.round(inputs.doorCount ?? getInputDefault(spec, "doorCount", 3))));
  const doorType = Math.max(0, Math.min(4, Math.round(inputs.doorType ?? getInputDefault(spec, "doorType", 0))));
  const wallThickness = Math.max(80, Math.min(380, Math.round(inputs.wallThickness ?? getInputDefault(spec, "wallThickness", 120))));
  const withNalichnik = Math.max(0, Math.min(1, Math.round(inputs.withNalichnik ?? getInputDefault(spec, "withNalichnik", 1))));

  /* ─── door dimensions ─── */
  const [doorW, doorH] = DOOR_DIMS[doorType] ?? DOOR_DIMS[0];
  const perimM = 2 * (doorW + doorH) / 1000;

  /* ─── foam ─── */
  const foamPerDoor = perimM * FOAM_ML_PER_M / 1000; // liters per door
  const foamCans = Math.ceil(doorCount * foamPerDoor * FOAM_RESERVE / (FOAM_CAN_ML / 1000));

  /* ─── dobor ─── */
  const needDobor = wallThickness > BOX_DEPTH;
  const doborWidth = needDobor ? wallThickness - BOX_DEPTH : 0;
  let doborPcs = 0;
  if (needDobor) {
    const doborLenPerDoor = (2 * doorH + doorW) / 1000 * 1.05;
    doborPcs = Math.ceil(doborLenPerDoor / (DOBOR_STANDARD_H / 1000)) * doorCount;
  }

  /* ─── nalichnik ─── */
  let nalichnikPcs = 0;
  if (withNalichnik === 1) {
    const nalichnikLenPerDoor = (2 * doorH + doorW) / 1000 * 1.05;
    nalichnikPcs = Math.ceil(nalichnikLenPerDoor / (NALICHNIK_STANDARD_H / 1000)) * doorCount * 2;
  }

  /* ─── glue ─── */
  const glueCarts = Math.ceil(doorCount * GLUE_CARTRIDGE_PER_DOOR);

  /* ─── fasteners ─── */
  const screwsPcs = doorCount * SCREWS_PER_DOOR;
  const screwsKg = Math.ceil(screwsPcs / SCREWS_PER_KG * 10) / 10;
  const dubelPacks = Math.ceil(doorCount * DUBELS_PER_DOOR / DUBEL_PACK);

  /* ─── scenarios ─── */
  const basePrimaryRaw = foamCans;
  const basePrimary = Math.ceil(basePrimaryRaw * accuracyMult);
  const packageOptions = [{
    size: 1,
    label: "foam-can-750ml",
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
        `doorType:${doorType}`,
        `wallThickness:${wallThickness}`,
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
      name: `Монтажная пена (750 мл)`,
      quantity: roundDisplay(recScenario.exact_need, 6),
      unit: "баллонов",
      withReserve: Math.ceil(recScenario.exact_need),
      purchaseQty: Math.ceil(recScenario.exact_need),
      category: "Монтаж",
    },
    {
      name: "Саморезы монтажные",
      quantity: screwsKg,
      unit: "кг",
      withReserve: screwsKg,
      purchaseQty: Math.ceil(screwsKg),
      category: "Крепёж",
    },
    {
      name: `Дюбели (упаковка ${DUBEL_PACK} шт)`,
      quantity: doorCount * DUBELS_PER_DOOR,
      unit: "шт",
      withReserve: dubelPacks * DUBEL_PACK,
      purchaseQty: dubelPacks * DUBEL_PACK,
      packageInfo: { count: dubelPacks, size: DUBEL_PACK, packageUnit: "упаковок" },
      category: "Крепёж",
    },
    {
      name: "Клей-герметик (картриджи)",
      quantity: glueCarts,
      unit: "шт",
      withReserve: glueCarts,
      purchaseQty: glueCarts,
      category: "Монтаж",
    },
  ];

  if (needDobor) {
    materials.push({
      name: `Доборы (ширина ${doborWidth} мм)`,
      quantity: doborPcs,
      unit: "шт",
      withReserve: doborPcs,
      purchaseQty: doborPcs,
      category: "Комплектация",
    });
  }

  if (withNalichnik === 1) {
    materials.push({
      name: "Наличники",
      quantity: nalichnikPcs,
      unit: "шт",
      withReserve: nalichnikPcs,
      purchaseQty: nalichnikPcs,
      category: "Комплектация",
    });
  }

  /* ─── warnings ─── */
  const warnings: string[] = [];
  if (wallThickness >= 200) {
    warnings.push("При толстых стенах проверьте ширину доборов в магазине");
  }
  if (doorCount > 10) {
    warnings.push("Большое количество дверей — рассмотрите оптовую закупку");
  }


  const practicalNotes: string[] = [];
  if (wallThickness > 200) {
    practicalNotes.push(`Стена ${wallThickness} мм — понадобятся доборы. Измерьте толщину до покупки коробки`);
  }
  practicalNotes.push("Пена вокруг коробки — непрерывным контуром, без пропусков. Иначе будет дуть");

  return {
    canonicalSpecId: spec.calculator_id,
    formulaVersion: spec.formula_version,
    materials,
    totals: {
      doorCount,
      doorType,
      wallThickness,
      withNalichnik,
      doorW,
      doorH,
      perimM: roundDisplay(perimM, 3),
      foamPerDoor: roundDisplay(foamPerDoor, 4),
      foamCans,
      needDobor: needDobor ? 1 : 0,
      doborWidth,
      doborPcs,
      nalichnikPcs,
      glueCarts,
      screwsKg,
      dubelPacks,
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
    accuracyExplanation: applyAccuracyMode(basePrimaryRaw, "generic", accuracyMode).explanation,
  };
}
