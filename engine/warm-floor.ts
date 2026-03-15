import { combineScenarioFactors, type FactorTable } from "./factors";
import { optimizePackaging } from "./packaging";
import { SCENARIOS, type ScenarioBundle } from "./scenarios";
import type {
  WarmFloorCanonicalSpec,
  CanonicalCalculatorResult,
  CanonicalMaterialResult,
} from "./canonical";
import { roundDisplay } from "./units";

interface WarmFloorInputs {
  roomArea?: number;
  furnitureArea?: number;
  heatingType?: number;
  powerDensity?: number;
}

/* ─── constants ─── */

const MAT_AREA = 2.0;                    // m²
const CABLE_STEP_M = 0.15;
const CABLE_RESERVE = 1.05;
const PIPE_STEP_M = 0.15;
const PIPE_RESERVE = 1.05;
const SUBSTRATE_RESERVE = 1.1;
const SUBSTRATE_ROLL_M2 = 25;
const CORRUGATED_TUBE_M = 1;
const TILE_ADHESIVE_KG_PER_M2 = 5;
const TILE_ADHESIVE_BAG_KG = 25;
const EPS_SHEET_M2 = 0.72;               // 1200×600
const EPS_RESERVE = 1.1;
const SCREED_THICKNESS_M = 0.04;
const SCREED_DENSITY = 2000;              // kg/m³
const SCREED_BAG_KG = 50;
const MESH_RESERVE = 1.05;
const MOUNTING_TAPE_ROLL_M = 25;
const PIPE_INSULATION_RESERVE = 1.0;      // 1:1 with pipe
const MAX_CIRCUIT_M = 80;

/* ─── factor defaults ─── */

const WARM_FLOOR_FACTOR_TABLE: FactorTable = {
  surface_quality: { min: 1, rec: 1, max: 1 },
  geometry_complexity: { min: 0.98, rec: 1, max: 1.08 },
  installation_method: { min: 1, rec: 1, max: 1 },
  worker_skill: { min: 0.95, rec: 1, max: 1.1 },
  waste_factor: { min: 0.98, rec: 1, max: 1.08 },
  logistics_buffer: { min: 1, rec: 1, max: 1 },
  packaging_rounding: { min: 1, rec: 1, max: 1 },
};

/* ─── helpers ─── */

function getInputDefault(spec: WarmFloorCanonicalSpec, key: string, fallback: number): number {
  return spec.input_schema.find((field) => field.key === key)?.default_value ?? fallback;
}

/* ─── type 0: Mats ─── */

function buildMaterialsMats(
  heatingArea: number,
  mats: number,
  corrugatedTube: number,
  substrateRolls: number,
  adhesiveBags: number,
): CanonicalMaterialResult[] {
  return [
    {
      name: "Нагревательный мат",
      quantity: mats,
      unit: "шт",
      withReserve: mats,
      purchaseQty: mats,
      category: "Основное",
    },
    {
      name: "Терморегулятор",
      quantity: 1,
      unit: "шт",
      withReserve: 1,
      purchaseQty: 1,
      category: "Управление",
    },
    {
      name: "Гофротрубка для датчика",
      quantity: corrugatedTube,
      unit: "м",
      withReserve: corrugatedTube,
      purchaseQty: corrugatedTube,
      category: "Монтаж",
    },
    {
      name: "Подложка (рулоны)",
      quantity: substrateRolls,
      unit: "рулонов",
      withReserve: substrateRolls,
      purchaseQty: substrateRolls,
      category: "Подготовка",
    },
    {
      name: "Плиточный клей (мешки 25 кг)",
      quantity: roundDisplay(heatingArea * TILE_ADHESIVE_KG_PER_M2, 3),
      unit: "кг",
      withReserve: adhesiveBags * TILE_ADHESIVE_BAG_KG,
      purchaseQty: adhesiveBags,
      category: "Основное",
    },
  ];
}

/* ─── type 1: Cable in screed ─── */

function buildMaterialsCable(
  heatingArea: number,
  cableLength: number,
  mountingTapeRolls: number,
  epsSheets: number,
  screedBags: number,
): CanonicalMaterialResult[] {
  return [
    {
      name: "Нагревательный кабель",
      quantity: cableLength,
      unit: "м",
      withReserve: cableLength,
      purchaseQty: cableLength,
      category: "Основное",
    },
    {
      name: "Терморегулятор",
      quantity: 1,
      unit: "шт",
      withReserve: 1,
      purchaseQty: 1,
      category: "Управление",
    },
    {
      name: "Монтажная лента (рулоны)",
      quantity: mountingTapeRolls,
      unit: "рулонов",
      withReserve: mountingTapeRolls,
      purchaseQty: mountingTapeRolls,
      category: "Монтаж",
    },
    {
      name: "Утеплитель ЕПС (листы 1200×600)",
      quantity: epsSheets,
      unit: "листов",
      withReserve: epsSheets,
      purchaseQty: epsSheets,
      category: "Утепление",
    },
    {
      name: "Стяжка ЦПС (мешки 50 кг)",
      quantity: roundDisplay(heatingArea * SCREED_THICKNESS_M * SCREED_DENSITY, 3),
      unit: "кг",
      withReserve: screedBags * SCREED_BAG_KG,
      purchaseQty: screedBags,
      category: "Основное",
    },
  ];
}

/* ─── type 2: Water pipes ─── */

function buildMaterialsWaterPipes(
  heatingArea: number,
  pipeLength: number,
  circuits: number,
  pipeInsulation: number,
  meshArea: number,
): CanonicalMaterialResult[] {
  return [
    {
      name: "Труба для тёплого пола",
      quantity: pipeLength,
      unit: "м",
      withReserve: pipeLength,
      purchaseQty: pipeLength,
      category: "Основное",
    },
    {
      name: "Коллектор",
      quantity: 1,
      unit: "шт",
      withReserve: 1,
      purchaseQty: 1,
      category: "Управление",
    },
    {
      name: "Теплоизоляция трубы",
      quantity: pipeInsulation,
      unit: "м",
      withReserve: pipeInsulation,
      purchaseQty: pipeInsulation,
      category: "Утепление",
    },
    {
      name: "Армирующая сетка",
      quantity: roundDisplay(meshArea, 3),
      unit: "м²",
      withReserve: Math.ceil(meshArea),
      purchaseQty: Math.ceil(meshArea),
      category: "Армирование",
    },
  ];
}

/* ─── main ─── */

export function computeCanonicalWarmFloor(
  spec: WarmFloorCanonicalSpec,
  inputs: WarmFloorInputs,
  factorTable: FactorTable = WARM_FLOOR_FACTOR_TABLE,
): CanonicalCalculatorResult {
  const roomArea = Math.max(1, Math.min(100, inputs.roomArea ?? getInputDefault(spec, "roomArea", 10)));
  const furnitureArea = Math.max(0, Math.min(50, inputs.furnitureArea ?? getInputDefault(spec, "furnitureArea", 2)));
  const heatingType = Math.max(0, Math.min(2, Math.round(inputs.heatingType ?? getInputDefault(spec, "heatingType", 0))));
  const powerDensity = Math.max(100, Math.min(200, inputs.powerDensity ?? getInputDefault(spec, "powerDensity", 150)));

  const heatingArea = Math.max(0, roomArea - furnitureArea);
  const totalPowerW = heatingArea * powerDensity;
  const totalPowerKW = roundDisplay(totalPowerW / 1000, 3);

  /* ─── per-type calculations ─── */
  let basePrimary: number;
  let materials: CanonicalMaterialResult[];

  if (heatingType === 0) {
    // Mats
    const mats = Math.ceil(heatingArea / MAT_AREA);
    const thermostat = 1;
    const corrugatedTube = CORRUGATED_TUBE_M;
    const substrateRolls = Math.ceil(heatingArea * SUBSTRATE_RESERVE / SUBSTRATE_ROLL_M2);
    const adhesiveBags = Math.ceil(heatingArea * TILE_ADHESIVE_KG_PER_M2 / TILE_ADHESIVE_BAG_KG);

    basePrimary = mats;
    materials = buildMaterialsMats(heatingArea, mats, corrugatedTube, substrateRolls, adhesiveBags);
  } else if (heatingType === 1) {
    // Cable in screed
    const cableLength = Math.ceil(heatingArea / CABLE_STEP_M * CABLE_RESERVE);
    const mountingTapeRolls = Math.ceil(cableLength / MOUNTING_TAPE_ROLL_M);
    const thermostat = 1;
    const epsSheets = Math.ceil(heatingArea * EPS_RESERVE / EPS_SHEET_M2);
    const screedBags = Math.ceil(heatingArea * SCREED_THICKNESS_M * SCREED_DENSITY / SCREED_BAG_KG);

    basePrimary = cableLength;
    materials = buildMaterialsCable(heatingArea, cableLength, mountingTapeRolls, epsSheets, screedBags);
  } else {
    // Water pipes
    const pipeLength = Math.ceil(heatingArea / PIPE_STEP_M * PIPE_RESERVE);
    const circuits = Math.max(1, Math.ceil(pipeLength / MAX_CIRCUIT_M));
    const collector = 1;
    const pipeInsulation = pipeLength * PIPE_INSULATION_RESERVE;
    const meshArea = heatingArea * MESH_RESERVE;

    basePrimary = pipeLength;
    materials = buildMaterialsWaterPipes(heatingArea, pipeLength, circuits, pipeInsulation, meshArea);
  }

  /* ─── scenarios ─── */
  const packageSize = 1;
  const packageUnit = heatingType === 0 ? "шт" : "м";
  const packageLabel = heatingType === 0 ? "warm-floor-mat" : heatingType === 1 ? "warm-floor-cable-m" : "warm-floor-pipe-m";

  const packageOptions = [{ size: packageSize, label: packageLabel, unit: packageUnit }];

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
        `heatingType:${heatingType}`,
        `powerDensity:${powerDensity}`,
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

  /* ─── totals ─── */
  const recScenario = scenarios.REC;

  // Type-specific totals
  let mats = 0, cableLength = 0, mountingTapeRolls = 0, epsSheets = 0, screedBags = 0;
  let pipeLength = 0, circuits = 0, pipeInsulation = 0, meshArea = 0;
  let substrateRolls = 0, adhesiveBags = 0;

  if (heatingType === 0) {
    mats = Math.ceil(heatingArea / MAT_AREA);
    substrateRolls = Math.ceil(heatingArea * SUBSTRATE_RESERVE / SUBSTRATE_ROLL_M2);
    adhesiveBags = Math.ceil(heatingArea * TILE_ADHESIVE_KG_PER_M2 / TILE_ADHESIVE_BAG_KG);
  } else if (heatingType === 1) {
    cableLength = Math.ceil(heatingArea / CABLE_STEP_M * CABLE_RESERVE);
    mountingTapeRolls = Math.ceil(cableLength / MOUNTING_TAPE_ROLL_M);
    epsSheets = Math.ceil(heatingArea * EPS_RESERVE / EPS_SHEET_M2);
    screedBags = Math.ceil(heatingArea * SCREED_THICKNESS_M * SCREED_DENSITY / SCREED_BAG_KG);
  } else {
    pipeLength = Math.ceil(heatingArea / PIPE_STEP_M * PIPE_RESERVE);
    circuits = Math.max(1, Math.ceil(pipeLength / MAX_CIRCUIT_M));
    pipeInsulation = pipeLength * PIPE_INSULATION_RESERVE;
    meshArea = heatingArea * MESH_RESERVE;
  }

  /* ─── warnings ─── */
  const warnings: string[] = [];
  if (totalPowerKW > spec.warnings_rules.separate_breaker_kw_threshold) {
    warnings.push("Мощность более 3.5 кВт — требуется отдельный автомат");
  }
  if (roomArea > 0 && heatingArea / roomArea < spec.warnings_rules.ineffective_coverage_ratio) {
    warnings.push("Обогреваемая площадь менее 50% — неэффективное покрытие");
  }


  const practicalNotes: string[] = [];
  practicalNotes.push("Тёплый пол — не основное отопление, а дополнительный комфорт. Радиаторы всё равно нужны");

  return {
    canonicalSpecId: spec.calculator_id,
    formulaVersion: spec.formula_version,
    materials,
    totals: {
      roomArea: roundDisplay(roomArea, 3),
      furnitureArea: roundDisplay(furnitureArea, 3),
      heatingArea: roundDisplay(heatingArea, 3),
      heatingType,
      powerDensity,
      totalPowerW: roundDisplay(totalPowerW, 3),
      totalPowerKW,
      thermostat: 1,
      mats,
      cableLength,
      mountingTapeRolls,
      epsSheets,
      screedBags,
      pipeLength,
      circuits,
      pipeInsulation,
      meshArea: roundDisplay(meshArea, 3),
      substrateRolls,
      adhesiveBags,
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
