import { combineScenarioFactors, type FactorTable } from "./factors";
import { optimizePackaging } from "./packaging";
import { SCENARIOS, type ScenarioBundle } from "./scenarios";
import type {
  BasementCanonicalSpec,
  CanonicalCalculatorResult,
  CanonicalMaterialResult,
} from "./canonical";
import { roundDisplay } from "./units";
import { type AccuracyMode, DEFAULT_ACCURACY_MODE, applyAccuracyMode, getPrimaryMultiplier } from "./accuracy";

/* ─── constants ─── */

const FLOOR_REBAR_KG_PER_M2 = 22;
const WALL_REBAR_KG_PER_M2 = 18;
const WIRE_RATIO = 0.01;
const FORMWORK_SHEET_M2 = 2.88;
const FORMWORK_RESERVE = 1.15;
const GEOTEXTILE_ROLL = 50;
const DRAINAGE_MEMBRANE_ROLL = 20;
const MASTIC_KG_PER_M2 = 1.5;
const MASTIC_LAYERS = 2;
const ROLL_RESERVE = 1.15;
const ROLL_M2 = 10;
const PEN_KG_PER_M2 = 0.4;
const PEN_RESERVE = 1.1;
const VENT_PER_AREA = 10;
const MIN_VENTS = 4;
const GRAVEL_LAYER = 0.15;
const SAND_LAYER = 0.1;
const EPPS_PLATE = 0.72;
const EPPS_RESERVE = 1.05;

/* ─── labels ─── */

const WATERPROOF_LABELS: Record<number, string> = {
  0: "Обмазочная (мастика)",
  1: "Рулонная (наплавляемая)",
  2: "Проникающая",
};

/* ─── inputs ─── */

interface BasementInputs {
  length?: number;
  width?: number;
  depth?: number;
  wallThickness?: number;
  floorThickness?: number;
  waterproofType?: number;
  accuracyMode?: AccuracyMode;
}

/* ─── helpers ─── */

function getInputDefault(spec: BasementCanonicalSpec, key: string, fallback: number): number {
  return spec.input_schema.find((field) => field.key === key)?.default_value ?? fallback;
}

/* ─── main ─── */

export function computeCanonicalBasement(
  spec: BasementCanonicalSpec,
  inputs: BasementInputs,
  factorTable: FactorTable,
): CanonicalCalculatorResult {
  const accuracyMode = inputs.accuracyMode ?? DEFAULT_ACCURACY_MODE;
  const accuracyMult = getPrimaryMultiplier("generic", accuracyMode);

  const length = Math.max(3, Math.min(30, inputs.length ?? getInputDefault(spec, "length", 8)));
  const width = Math.max(3, Math.min(20, inputs.width ?? getInputDefault(spec, "width", 6)));
  const depth = Math.max(1.5, Math.min(4, inputs.depth ?? getInputDefault(spec, "depth", 2.5)));
  const wallThickness = Math.max(150, Math.min(300, inputs.wallThickness ?? getInputDefault(spec, "wallThickness", 200)));
  const floorThickness = Math.max(100, Math.min(200, inputs.floorThickness ?? getInputDefault(spec, "floorThickness", 150)));
  const waterproofType = Math.max(0, Math.min(2, Math.round(inputs.waterproofType ?? getInputDefault(spec, "waterproofType", 0))));

  /* ─── geometry ─── */
  const floorArea = length * width;
  const wallPerim = 2 * (length + width);
  const wallArea = wallPerim * depth;
  const floorVol = floorArea * (floorThickness / 1000);
  const wallVol = wallArea * (wallThickness / 1000);

  /* ─── concrete ─── */
  const floorConcrete = Math.ceil(floorVol * 1.05 * 10) / 10;
  const wallConcrete = Math.ceil(wallVol * 1.03 * 10) / 10;

  /* ─── rebar ─── */
  const floorRebar = roundDisplay(floorArea * FLOOR_REBAR_KG_PER_M2, 2);
  const wallRebar = roundDisplay(wallArea * WALL_REBAR_KG_PER_M2, 2);
  const wire = Math.ceil((floorRebar + wallRebar) * WIRE_RATIO);

  /* ─── formwork ─── */
  const formwork = Math.ceil(wallArea * 2 * FORMWORK_RESERVE / FORMWORK_SHEET_M2);

  /* ─── ventilation ─── */
  const ventCount = Math.max(MIN_VENTS, Math.ceil(floorArea / VENT_PER_AREA));

  /* ─── waterproofing ─── */
  const totalWpArea = wallArea + floorArea;
  let masticKg = 0;
  let rollCount = 0;
  let penKg = 0;

  if (waterproofType === 0) {
    masticKg = roundDisplay(totalWpArea * MASTIC_LAYERS * MASTIC_KG_PER_M2, 2);
  } else if (waterproofType === 1) {
    const rollArea = totalWpArea * ROLL_RESERVE;
    rollCount = Math.ceil(rollArea / ROLL_M2 * 2);
  } else {
    penKg = roundDisplay(totalWpArea * PEN_KG_PER_M2 * PEN_RESERVE, 2);
  }

  /* ─── scenarios ─── */
  const totalConcrete = roundDisplay(floorConcrete + wallConcrete, 3);
  const basePrimaryRaw = totalConcrete;
  const basePrimary = roundDisplay(basePrimaryRaw * accuracyMult, 3);
  const packageOptions = [{
    size: 1,
    label: "concrete-m3",
    unit: "м³",
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
        `waterproofType:${waterproofType}`,
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
      name: `Бетон на пол (${floorThickness} мм)`,
      quantity: floorConcrete,
      unit: "м³",
      withReserve: floorConcrete,
      purchaseQty: Math.ceil(floorConcrete * 10) / 10,
      category: "Бетон",
    },
    {
      name: `Бетон на стены (${wallThickness} мм)`,
      quantity: wallConcrete,
      unit: "м³",
      withReserve: wallConcrete,
      purchaseQty: Math.ceil(wallConcrete * 10) / 10,
      category: "Бетон",
    },
    {
      name: "Арматура на пол",
      quantity: floorRebar,
      unit: "кг",
      withReserve: floorRebar,
      purchaseQty: Math.ceil(floorRebar),
      category: "Армирование",
    },
    {
      name: "Арматура на стены",
      quantity: wallRebar,
      unit: "кг",
      withReserve: wallRebar,
      purchaseQty: Math.ceil(wallRebar),
      category: "Армирование",
    },
    {
      name: "Вязальная проволока",
      quantity: wire,
      unit: "кг",
      withReserve: wire,
      purchaseQty: wire,
      category: "Армирование",
    },
    {
      name: `Опалубка (${FORMWORK_SHEET_M2} м²/лист)`,
      quantity: formwork,
      unit: "листов",
      withReserve: formwork,
      purchaseQty: formwork,
      category: "Опалубка",
    },
    {
      name: "Продухи (вент. отверстия)",
      quantity: ventCount,
      unit: "шт",
      withReserve: ventCount,
      purchaseQty: ventCount,
      category: "Вентиляция",
    },
  ];

  /* ─── waterproofing materials ─── */
  if (waterproofType === 0) {
    materials.push({
      name: `${WATERPROOF_LABELS[0]}`,
      quantity: masticKg,
      unit: "кг",
      withReserve: masticKg,
      purchaseQty: Math.ceil(masticKg),
      category: "Гидроизоляция",
    });
  } else if (waterproofType === 1) {
    materials.push({
      name: `${WATERPROOF_LABELS[1]} (${ROLL_M2} м²/рулон)`,
      quantity: rollCount,
      unit: "рулонов",
      withReserve: rollCount,
      purchaseQty: rollCount,
      category: "Гидроизоляция",
    });
  } else {
    materials.push({
      name: `${WATERPROOF_LABELS[2]}`,
      quantity: penKg,
      unit: "кг",
      withReserve: penKg,
      purchaseQty: Math.ceil(penKg),
      category: "Гидроизоляция",
    });
  }

  /* ─── warnings ─── */
  const warnings: string[] = [];
  if (depth > 3) {
    warnings.push("Глубина подвала более 3 м — требуется проект и расчёт несущей способности");
  }
  if (wallThickness < 200) {
    warnings.push("Толщина стен менее 200 мм — допустима только для неглубоких погребов");
  }

  const practicalNotes: string[] = [];
  if (depth > 3) {
    practicalNotes.push(`Глубина ${roundDisplay(depth, 1)} м — на таких глубинах обязательна профессиональная геология и проект`);
  }
  practicalNotes.push("Гидроизоляция подвала — это не экономия. Лучше переплатить сейчас, чем вычерпывать воду потом");

  return {
    canonicalSpecId: spec.calculator_id,
    formulaVersion: spec.formula_version,
    materials,
    totals: {
      length: roundDisplay(length, 3),
      width: roundDisplay(width, 3),
      depth: roundDisplay(depth, 3),
      wallThickness,
      floorThickness,
      waterproofType,
      floorArea: roundDisplay(floorArea, 3),
      wallPerim: roundDisplay(wallPerim, 3),
      wallArea: roundDisplay(wallArea, 3),
      floorVol: roundDisplay(floorVol, 4),
      wallVol: roundDisplay(wallVol, 4),
      floorConcrete,
      wallConcrete,
      totalConcrete,
      floorRebar,
      wallRebar,
      wire,
      formwork,
      ventCount,
      masticKg,
      rollCount,
      penKg,
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
