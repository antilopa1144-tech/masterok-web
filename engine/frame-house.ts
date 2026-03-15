import { combineScenarioFactors, type FactorTable } from "./factors";
import { optimizePackaging } from "./packaging";
import { SCENARIOS, type ScenarioBundle } from "./scenarios";
import type {
  FrameHouseCanonicalSpec,
  CanonicalCalculatorResult,
  CanonicalMaterialResult,
} from "./canonical";
import { roundDisplay } from "./units";

/* ─── constants ─── */

const OUTER_SHEET_AREA: Record<number, number> = { 0: 3.125, 1: 3.125, 2: 3.84 };
const INNER_SHEET_AREA: Record<number, number> = { 0: 3.125, 1: 3.0, 2: 1.0 };
const INSULATION_THICKNESS: Record<number, number> = { 0: 0.15, 1: 0.2, 2: 0.15 };
const PLATE_AREA = 0.72;
const PACK_SIZE = 8;
const VAPOR_ROLL = 75;
const WIND_ROLL = 75;
const MEMBRANE_RESERVE = 1.15;
const OUTER_RESERVE = 1.08;
const INNER_RESERVE = 1.10;
const SCREWS_PER_SHEET = 28;
const NAILS_PER_STUD = 20;
const SCREW_PER_KG = 600;
const NAIL_PER_KG = 200;
const STUD_RESERVE = 1.05;
const STRAPPING_RESERVE = 1.05;
const PLATE_RESERVE = 1.05;

/* ─── labels ─── */

const INSULATION_TYPE_LABELS: Record<number, string> = {
  0: "Минеральная вата 150 мм",
  1: "Минеральная вата 200 мм",
  2: "Пенополистирол 150 мм",
};

const OUTER_SHEATHING_LABELS: Record<number, string> = {
  0: "OSB-9 мм",
  1: "OSB-12 мм",
  2: "ЦСП-12 мм",
};

const INNER_SHEATHING_LABELS: Record<number, string> = {
  0: "OSB-9 мм",
  1: "ГКЛ",
  2: "Вагонка",
};

/* ─── inputs ─── */

interface FrameHouseInputs {
  wallLength?: number;
  wallHeight?: number;
  openingsArea?: number;
  studStep?: number;
  insulationType?: number;
  outerSheathing?: number;
  innerSheathing?: number;
}

/* ─── helpers ─── */

function getInputDefault(spec: FrameHouseCanonicalSpec, key: string, fallback: number): number {
  return spec.input_schema.find((field) => field.key === key)?.default_value ?? fallback;
}

/* ─── main ─── */

export function computeCanonicalFrameHouse(
  spec: FrameHouseCanonicalSpec,
  inputs: FrameHouseInputs,
  factorTable: FactorTable,
): CanonicalCalculatorResult {
  const wallLength = Math.max(1, Math.min(100, inputs.wallLength ?? getInputDefault(spec, "wallLength", 30)));
  const wallHeight = Math.max(2, Math.min(4, inputs.wallHeight ?? getInputDefault(spec, "wallHeight", 2.7)));
  const openingsArea = Math.max(0, Math.min(50, inputs.openingsArea ?? getInputDefault(spec, "openingsArea", 10)));
  const studStep = Math.max(400, Math.min(600, Math.round(inputs.studStep ?? getInputDefault(spec, "studStep", 600))));
  const insulationType = Math.max(0, Math.min(2, Math.round(inputs.insulationType ?? getInputDefault(spec, "insulationType", 0))));
  const outerSheathing = Math.max(0, Math.min(2, Math.round(inputs.outerSheathing ?? getInputDefault(spec, "outerSheathing", 0))));
  const innerSheathing = Math.max(0, Math.min(2, Math.round(inputs.innerSheathing ?? getInputDefault(spec, "innerSheathing", 0))));

  /* ─── geometry ─── */
  const wallArea = Math.max(0, wallLength * wallHeight - openingsArea);
  const studs = Math.ceil(wallLength / (studStep / 1000)) + 1;
  const studMeters = studs * wallHeight * STUD_RESERVE;
  const studBoards = Math.ceil(studMeters / 6);
  const strappingM = wallLength * 2 * STRAPPING_RESERVE;
  const strappingBoards = Math.ceil(strappingM / 6);

  /* ─── sheathing ─── */
  const outerSheetArea = OUTER_SHEET_AREA[outerSheathing] ?? 3.125;
  const innerSheetArea = INNER_SHEET_AREA[innerSheathing] ?? 3.125;
  const outerSheets = Math.ceil(wallArea / outerSheetArea * OUTER_RESERVE);
  const innerSheets = Math.ceil(wallArea * INNER_RESERVE / innerSheetArea);

  /* ─── insulation ─── */
  const thickness = INSULATION_THICKNESS[insulationType] ?? 0.15;
  const insulVol = roundDisplay(wallArea * thickness, 3);
  const layerCount = Math.ceil(thickness / 0.05);
  const platesPerLayer = Math.ceil(wallArea / PLATE_AREA * PLATE_RESERVE);
  const totalPlates = platesPerLayer * layerCount;
  const packs = Math.ceil(totalPlates / PACK_SIZE);

  /* ─── membranes ─── */
  const vaporRolls = Math.ceil(wallArea * MEMBRANE_RESERVE / VAPOR_ROLL);
  const windRolls = Math.ceil(wallArea * MEMBRANE_RESERVE / WIND_ROLL);
  const tapeRolls = (vaporRolls + windRolls) * 2;

  /* ─── fasteners ─── */
  const screwsKg = Math.ceil((outerSheets + innerSheets) * SCREWS_PER_SHEET * STUD_RESERVE / SCREW_PER_KG * 10) / 10;
  const nailsKg = Math.ceil(studs * NAILS_PER_STUD * STUD_RESERVE / NAIL_PER_KG * 10) / 10;

  /* ─── scenarios ─── */
  const basePrimary = totalPlates;
  const packageOptions = [{
    size: PACK_SIZE,
    label: "insulation-pack-8",
    unit: "уп",
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
        `insulationType:${insulationType}`,
        `studStep:${studStep}`,
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
      name: `Стойки каркаса (шаг ${studStep} мм)`,
      quantity: studs,
      unit: "шт",
      withReserve: studBoards,
      purchaseQty: studBoards,
      category: "Каркас",
    },
    {
      name: "Обвязка (доски 6 м)",
      quantity: roundDisplay(strappingM, 2),
      unit: "м",
      withReserve: strappingBoards,
      purchaseQty: strappingBoards,
      category: "Каркас",
    },
    {
      name: `Наружная обшивка — ${OUTER_SHEATHING_LABELS[outerSheathing]}`,
      quantity: outerSheets,
      unit: "листов",
      withReserve: outerSheets,
      purchaseQty: outerSheets,
      category: "Обшивка",
    },
    {
      name: `Внутренняя обшивка — ${INNER_SHEATHING_LABELS[innerSheathing]}`,
      quantity: innerSheets,
      unit: innerSheathing === 2 ? "шт" : "листов",
      withReserve: innerSheets,
      purchaseQty: innerSheets,
      category: "Обшивка",
    },
    {
      name: `Утеплитель — ${INSULATION_TYPE_LABELS[insulationType]}`,
      quantity: roundDisplay(recScenario.exact_need, 6),
      unit: "плит",
      withReserve: Math.ceil(recScenario.exact_need),
      purchaseQty: packs,
      category: "Утепление",
    },
    {
      name: `Утеплитель (упаковки по ${PACK_SIZE} шт)`,
      quantity: packs,
      unit: "уп",
      withReserve: packs,
      purchaseQty: packs,
      category: "Утепление",
    },
    {
      name: "Пароизоляция (рулон 75 м²)",
      quantity: vaporRolls,
      unit: "рулонов",
      withReserve: vaporRolls,
      purchaseQty: vaporRolls,
      category: "Мембраны",
    },
    {
      name: "Ветрозащита (рулон 75 м²)",
      quantity: windRolls,
      unit: "рулонов",
      withReserve: windRolls,
      purchaseQty: windRolls,
      category: "Мембраны",
    },
    {
      name: "Скотч для мембран",
      quantity: tapeRolls,
      unit: "рулонов",
      withReserve: tapeRolls,
      purchaseQty: tapeRolls,
      category: "Мембраны",
    },
    {
      name: "Саморезы",
      quantity: screwsKg,
      unit: "кг",
      withReserve: screwsKg,
      purchaseQty: Math.ceil(screwsKg),
      category: "Крепёж",
    },
    {
      name: "Гвозди",
      quantity: nailsKg,
      unit: "кг",
      withReserve: nailsKg,
      purchaseQty: Math.ceil(nailsKg),
      category: "Крепёж",
    },
  ];

  /* ─── warnings ─── */
  const warnings: string[] = [];
  if (wallArea > 200) {
    warnings.push("Большая площадь стен — рассмотрите усиление каркаса");
  }
  if (insulationType === 2 && wallHeight > 3) {
    warnings.push("Для высоких стен рекомендуется минеральная вата вместо ПСБ");
  }

  return {
    canonicalSpecId: spec.calculator_id,
    formulaVersion: spec.formula_version,
    materials,
    totals: {
      wallLength: roundDisplay(wallLength, 3),
      wallHeight: roundDisplay(wallHeight, 3),
      openingsArea: roundDisplay(openingsArea, 3),
      studStep,
      insulationType,
      outerSheathing,
      innerSheathing,
      wallArea: roundDisplay(wallArea, 3),
      studs,
      studMeters: roundDisplay(studMeters, 3),
      studBoards,
      strappingM: roundDisplay(strappingM, 3),
      strappingBoards,
      outerSheets,
      innerSheets,
      insulVol,
      layerCount,
      platesPerLayer,
      totalPlates,
      packs,
      vaporRolls,
      windRolls,
      tapeRolls,
      screwsKg,
      nailsKg,
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
