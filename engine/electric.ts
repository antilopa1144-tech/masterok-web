import { combineScenarioFactors, type FactorTable } from "./factors";
import { optimizePackaging } from "./packaging";
import { SCENARIOS, type ScenarioBundle } from "./scenarios";
import type {
  ElectricCanonicalSpec,
  CanonicalCalculatorResult,
  CanonicalMaterialResult,
} from "./canonical";
import { roundDisplay } from "./units";

interface ElectricInputs {
  apartmentArea?: number;
  roomsCount?: number;
  ceilingHeight?: number;
  wiringType?: number;
  hasKitchen?: number;
  reserve?: number;
}

/* ─── constants ─── */

const CABLE_15_RATE = 1.1;             // m per m² for lighting 3×1.5
const CABLE_25_RATE = 1.6;             // m per m² for outlets 3×2.5
const CABLE_6_KITCHEN_FACTOR = 1.5;    // base multiplier for stove cable
const CABLE_6_RESERVE = 1.2;
const CONDUIT_RATIO = 0.8;            // ratio of conduit to total cable
const OUTLETS_PER_M2 = 0.6;
const OUTLETS_PER_ROOM = 2;           // additional
const SWITCHES_BASE = 2;              // additional beyond rooms
const CABLE_SPOOL_M = 50;
const SOCKET_BOX_RESERVE = 1.1;
const AC_GROUPS_DIVISOR = 2;

/* ─── factor defaults ─── */

const ELECTRIC_FACTOR_TABLE: FactorTable = {
  surface_quality: { min: 1, rec: 1, max: 1 },
  geometry_complexity: { min: 0.95, rec: 1, max: 1.1 },
  installation_method: { min: 0.95, rec: 1, max: 1.05 },
  worker_skill: { min: 0.95, rec: 1, max: 1.1 },
  waste_factor: { min: 0.97, rec: 1, max: 1.05 },
  logistics_buffer: { min: 1, rec: 1, max: 1 },
  packaging_rounding: { min: 1, rec: 1, max: 1 },
};

/* ─── helpers ─── */

function getInputDefault(spec: ElectricCanonicalSpec, key: string, fallback: number): number {
  return spec.input_schema.find((field) => field.key === key)?.default_value ?? fallback;
}

/* ─── main ─── */

export function computeCanonicalElectric(
  spec: ElectricCanonicalSpec,
  inputs: ElectricInputs,
  factorTable: FactorTable = ELECTRIC_FACTOR_TABLE,
): CanonicalCalculatorResult {
  const apartmentArea = Math.max(20, Math.min(500, inputs.apartmentArea ?? getInputDefault(spec, "apartmentArea", 60)));
  const roomsCount = Math.max(1, Math.min(10, Math.round(inputs.roomsCount ?? getInputDefault(spec, "roomsCount", 3))));
  const ceilingHeight = Math.max(2.4, Math.min(4.0, inputs.ceilingHeight ?? getInputDefault(spec, "ceilingHeight", 2.7)));
  const wiringType = Math.max(0, Math.min(1, Math.round(inputs.wiringType ?? getInputDefault(spec, "wiringType", 0))));
  const hasKitchen = Math.max(0, Math.min(1, Math.round(inputs.hasKitchen ?? getInputDefault(spec, "hasKitchen", 1))));
  const reserve = Math.max(5, Math.min(30, inputs.reserve ?? getInputDefault(spec, "reserve", 15)));

  /* ─── groups ─── */
  const lightingGroups = roomsCount + 1;
  const outletGroups = roomsCount + 2;
  const acGroups = Math.ceil(roomsCount / AC_GROUPS_DIVISOR);
  const breakersCount = lightingGroups + outletGroups + acGroups + (hasKitchen ? 1 : 0);
  const uzoCount = Math.ceil(outletGroups / 2) + (hasKitchen ? 1 : 0) + 1;

  /* ─── cable lengths ─── */
  const cable15length = (apartmentArea * CABLE_15_RATE + lightingGroups * ceilingHeight) * (1 + reserve / 100);
  const cable25length = (apartmentArea * CABLE_25_RATE + outletGroups * ceilingHeight * 1.5) * (1 + reserve / 100);
  const cable6length = hasKitchen ? (Math.sqrt(apartmentArea) * CABLE_6_KITCHEN_FACTOR + ceilingHeight) * CABLE_6_RESERVE : 0;
  const conduitLength = Math.ceil((cable15length + cable25length + cable6length) * CONDUIT_RATIO);

  /* ─── outlets & switches ─── */
  const outletsCount = Math.ceil(apartmentArea * OUTLETS_PER_M2) + roomsCount * OUTLETS_PER_ROOM;
  const switchesCount = roomsCount + SWITCHES_BASE;

  /* ─── packaging ─── */
  const cable15spools = Math.ceil(cable15length / CABLE_SPOOL_M);
  const cable25spools = Math.ceil(cable25length / CABLE_SPOOL_M);
  const conduitPacks = Math.ceil(conduitLength / CABLE_SPOOL_M);
  const socketBoxes = Math.ceil((outletsCount + switchesCount) * SOCKET_BOX_RESERVE);
  const gypsumKg = Math.ceil((outletsCount + switchesCount) / 5);

  /* ─── materials ─── */
  const materials: CanonicalMaterialResult[] = [
    {
      name: "Кабель ВВГнг 3×1.5",
      quantity: roundDisplay(cable15length, 1),
      unit: "м",
      withReserve: roundDisplay(cable15length, 1),
      purchaseQty: cable15spools * CABLE_SPOOL_M,
      category: "Кабель",
    },
    {
      name: "Кабель ВВГнг 3×2.5",
      quantity: roundDisplay(cable25length, 1),
      unit: "м",
      withReserve: roundDisplay(cable25length, 1),
      purchaseQty: cable25spools * CABLE_SPOOL_M,
      category: "Кабель",
    },
  ];

  if (hasKitchen && cable6length > 0) {
    materials.push({
      name: "Кабель ВВГнг 3×6",
      quantity: roundDisplay(cable6length, 1),
      unit: "м",
      withReserve: roundDisplay(cable6length, 1),
      purchaseQty: Math.ceil(cable6length),
      category: "Кабель",
    });
  }

  materials.push(
    {
      name: "Щиток (модулей)",
      quantity: breakersCount + uzoCount + 2,
      unit: "шт",
      withReserve: breakersCount + uzoCount + 2,
      purchaseQty: 1,
      category: "Щиток",
    },
    {
      name: "Автоматы",
      quantity: breakersCount,
      unit: "шт",
      withReserve: breakersCount,
      purchaseQty: breakersCount,
      category: "Защита",
    },
    {
      name: "УЗО/дифавтоматы",
      quantity: uzoCount,
      unit: "шт",
      withReserve: uzoCount,
      purchaseQty: uzoCount,
      category: "Защита",
    },
    {
      name: "Розетки",
      quantity: outletsCount,
      unit: "шт",
      withReserve: outletsCount,
      purchaseQty: outletsCount,
      category: "Установка",
    },
    {
      name: "Выключатели",
      quantity: switchesCount,
      unit: "шт",
      withReserve: switchesCount,
      purchaseQty: switchesCount,
      category: "Установка",
    },
    {
      name: "Подрозетники",
      quantity: socketBoxes,
      unit: "шт",
      withReserve: socketBoxes,
      purchaseQty: socketBoxes,
      category: "Установка",
    },
    {
      name: "Гофра/кабель-канал",
      quantity: conduitLength,
      unit: "м",
      withReserve: conduitLength,
      purchaseQty: conduitPacks * CABLE_SPOOL_M,
      category: "Монтаж",
    },
    {
      name: "Гипс/алебастр",
      quantity: gypsumKg,
      unit: "кг",
      withReserve: gypsumKg,
      purchaseQty: gypsumKg,
      category: "Монтаж",
    },
  );

  /* ─── scenarios ─── */
  const basePrimary = cable15spools + cable25spools;
  const packageOptions = [{ size: 1, label: "electric-cable-spool", unit: "бухт" }];

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
        `wiringType:${wiringType}`,
        `reserve:${reserve}`,
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
  if (apartmentArea > spec.warnings_rules.three_phase_area_threshold) {
    warnings.push("Площадь более 100 м² — рекомендуется ввод 380В (3 фазы)");
  }
  if (hasKitchen) {
    warnings.push("Кухня: кабель 3×6 мм², автомат 32А, УЗО 40А/30мА");
  }
  warnings.push("Все розетки в ванной и кухне — через УЗО 10-30 мА");

  return {
    canonicalSpecId: spec.calculator_id,
    formulaVersion: spec.formula_version,
    materials,
    totals: {
      apartmentArea: roundDisplay(apartmentArea, 3),
      roomsCount,
      ceilingHeight: roundDisplay(ceilingHeight, 3),
      wiringType,
      hasKitchen,
      reserve,
      lightingGroups,
      outletGroups,
      acGroups,
      breakersCount,
      uzoCount,
      cable15length: roundDisplay(cable15length, 1),
      cable25length: roundDisplay(cable25length, 1),
      cable6length: roundDisplay(cable6length, 1),
      conduitLength,
      outletsCount,
      switchesCount,
      cable15spools,
      cable25spools,
      conduitPacks,
      socketBoxes,
      gypsumKg,
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
