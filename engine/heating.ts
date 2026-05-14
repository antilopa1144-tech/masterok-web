import { combineScenarioFactors, type FactorTable } from "./factors";
import { optimizePackaging } from "./packaging";
import { SCENARIOS, type ScenarioBundle } from "./scenarios";
import type {
  HeatingCanonicalSpec,
  CanonicalCalculatorResult,
  CanonicalMaterialResult,
} from "./canonical";
import { roundDisplay } from "./units";
import { type AccuracyMode, DEFAULT_ACCURACY_MODE, applyAccuracyMode, getPrimaryMultiplier } from "./accuracy";
import { getInputDefault } from "./spec-helpers";

interface HeatingInputs {
  totalArea?: number;
  ceilingHeight?: number;
  climateZone?: number;
  buildingType?: number;
  radiatorType?: number;
  roomCount?: number;
  accuracyMode?: AccuracyMode;
}

/* ─── constants ─── */

const POWER_PER_M2_BASE = [80, 100, 130, 150];       // by climate zone, W/m²
const BUILDING_COEFF = [1.3, 1.0, 1.1, 1.4];          // by building type
const RADIATOR_POWER = [180, 200, 700, 700];           // W per section/unit by type
const PP_PIPE_STICK_M = 4;
const PIPE_RATE = 10;                                  // m per room
const PIPE_RESERVE = 1.15;
const FITTINGS_PER_ROOM = 6;
const FITTINGS_RESERVE = 1.1;
const BRACKETS_PER_ROOM = 3;
const BRACKETS_RESERVE = 1.05;

/* ─── factor defaults ─── */

const HEATING_FACTOR_TABLE: FactorTable = {
  surface_quality: { min: 1, rec: 1, max: 1 },
  geometry_complexity: { min: 0.95, rec: 1, max: 1.1 },
  installation_method: { min: 1, rec: 1, max: 1 },
  worker_skill: { min: 0.95, rec: 1, max: 1.1 },
  waste_factor: { min: 0.97, rec: 1, max: 1.05 },
  logistics_buffer: { min: 1, rec: 1, max: 1 },
  packaging_rounding: { min: 1, rec: 1, max: 1 },
};

/* ─── helpers ─── */

/* ─── main ─── */

export function computeCanonicalHeating(
  spec: HeatingCanonicalSpec,
  inputs: HeatingInputs,
  factorTable: FactorTable = HEATING_FACTOR_TABLE,
): CanonicalCalculatorResult {
  const accuracyMode = inputs.accuracyMode ?? DEFAULT_ACCURACY_MODE;
  const accuracyMult = getPrimaryMultiplier("generic", accuracyMode);

  const totalArea = Math.max(10, Math.min(500, inputs.totalArea ?? getInputDefault(spec, "totalArea", 80)));
  const ceilingHeight = Math.max(2.5, Math.min(3.5, inputs.ceilingHeight ?? getInputDefault(spec, "ceilingHeight", 2.7)));
  const climateZone = Math.max(0, Math.min(3, Math.round(inputs.climateZone ?? getInputDefault(spec, "climateZone", 1))));
  const buildingType = Math.max(0, Math.min(3, Math.round(inputs.buildingType ?? getInputDefault(spec, "buildingType", 1))));
  const radiatorType = Math.max(0, Math.min(3, Math.round(inputs.radiatorType ?? getInputDefault(spec, "radiatorType", 0))));
  const roomCount = Math.max(1, Math.min(20, Math.round(inputs.roomCount ?? getInputDefault(spec, "roomCount", 4))));

  /* ─── power calculation ─── */
  const heightM = ceilingHeight;
  const heightCoeff = heightM / 2.7;
  const totalPowerW = totalArea * POWER_PER_M2_BASE[climateZone] * BUILDING_COEFF[buildingType] * heightCoeff;
  const totalPowerKW = Math.round(totalPowerW / 100) / 10;

  /* ─── radiator calculation ─── */
  const wattPerUnit = RADIATOR_POWER[radiatorType];
  const totalUnits = Math.ceil(totalPowerW / wattPerUnit);

  /* ─── piping ─── */
  const pipeSticks = Math.ceil(roomCount * PIPE_RATE * PIPE_RESERVE / PP_PIPE_STICK_M);
  const fittings = Math.ceil(roomCount * FITTINGS_PER_ROOM * FITTINGS_RESERVE);
  const brackets = Math.ceil(roomCount * BRACKETS_PER_ROOM * BRACKETS_RESERVE);
  const thermoHeads = Math.ceil(roomCount * 1.05);
  const mayevskyValves = Math.ceil(roomCount * 1.1);

  /* ─── materials ─── */
  const radiatorLabel = radiatorType <= 1 ? "Радиаторы (секции)" : "Радиаторы (панели/приборы)";
  const materials: CanonicalMaterialResult[] = [
    {
      name: radiatorLabel,
      quantity: totalUnits,
      unit: "шт",
      withReserve: totalUnits,
      purchaseQty: totalUnits,
      category: "Отопление",
    },
    {
      name: "Труба ПП ø25 (палки по 4 м)",
      quantity: pipeSticks,
      unit: "шт",
      withReserve: pipeSticks,
      purchaseQty: pipeSticks,
      category: "Трубопровод",
    },
    {
      name: "Фитинги",
      quantity: fittings,
      unit: "шт",
      withReserve: fittings,
      purchaseQty: fittings,
      category: "Трубопровод",
    },
    {
      name: "Кронштейны",
      quantity: brackets,
      unit: "шт",
      withReserve: brackets,
      purchaseQty: brackets,
      category: "Монтаж",
    },
    {
      name: "Термоголовки",
      quantity: thermoHeads,
      unit: "шт",
      withReserve: thermoHeads,
      purchaseQty: thermoHeads,
      category: "Регулировка",
    },
    {
      name: "Краны Маевского",
      quantity: mayevskyValves,
      unit: "шт",
      withReserve: mayevskyValves,
      purchaseQty: mayevskyValves,
      category: "Арматура",
    },
  ];

  /* ─── scenarios ─── */
  const basePrimaryRaw = totalUnits;
  const basePrimary = Math.ceil(basePrimaryRaw * accuracyMult);
  const packageOptions = [{ size: 1, label: "radiator-unit", unit: "шт" }];

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
        `climateZone:${climateZone}`,
        `buildingType:${buildingType}`,
        `radiatorType:${radiatorType}`,
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
  if (totalPowerKW > spec.warnings_rules.gas_boiler_power_threshold_kw) {
    warnings.push("Мощность более 20 кВт — газовый котёл с запасом 15-20%");
  }
  if (buildingType >= 2 && climateZone >= 2) {
    warnings.push("Слабая изоляция + холодная зона — рекомендуется профессиональный теплотехнический расчёт");
  }


  const practicalNotes: string[] = [];
  if (totalPowerKW > 20) {
    practicalNotes.push(`Мощность ${totalPowerKW} кВт — газовый котёл с запасом 15-20%, не впритык`);
  }
  practicalNotes.push("Радиаторы ставьте под каждым окном — это отсекает холодный воздух от стекла");

  return {
    canonicalSpecId: spec.calculator_id,
    formulaVersion: spec.formula_version,
    materials,
    totals: {
      totalArea: roundDisplay(totalArea, 3),
      ceilingHeight: roundDisplay(ceilingHeight, 3),
      climateZone,
      buildingType,
      radiatorType,
      roomCount,
      heightCoeff: roundDisplay(heightCoeff, 4),
      totalPowerW: roundDisplay(totalPowerW, 1),
      totalPowerKW,
      wattPerUnit,
      totalUnits,
      pipeSticks,
      fittings,
      brackets,
      thermoHeads,
      mayevskyValves,
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
