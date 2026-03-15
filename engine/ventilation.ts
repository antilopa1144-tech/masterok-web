import { combineScenarioFactors, type FactorTable } from "./factors";
import { optimizePackaging } from "./packaging";
import { SCENARIOS, type ScenarioBundle } from "./scenarios";
import type {
  VentilationCanonicalSpec,
  CanonicalCalculatorResult,
  CanonicalMaterialResult,
} from "./canonical";
import { roundDisplay } from "./units";

/* ─── constants ─── */

const EXCHANGE_RATES = [1.5, 2.0, 3.0, 5.0]; // by building type, times/hour
const AIR_PER_PERSON = 30; // m³/h, SP 54.13330
const FAN_RESERVE = 1.2;
const AIRFLOW_ROUNDING = 50; // round to nearest 50
const MAIN_DUCT_LENGTH_COEFF = 2.5;
const MAIN_DUCT_RESERVE = 1.15;
const DUCT_SECTION_M = 3;
const FLEX_DUCT_COIL_M = 10;
const FITTINGS_PER_SECTION = 0.5;
const FITTINGS_RESERVE = 1.1;
const GRILLE_AREA_M2 = 15; // 1 grille per 15m²
const GRILLE_BASE = 1; // min grilles
const CLAMPS_PER_SECTION = 2;
const CLAMPS_RESERVE = 1.1;
const SILENCER_COUNT = 1; // for residential

/* ─── labels ─── */

const BUILDING_TYPE_LABELS: Record<number, string> = {
  0: "Квартира",
  1: "Частный дом",
  2: "Офис",
  3: "Производство",
};

const DUCT_TYPE_LABELS: Record<number, string> = {
  0: "Круглый ø100–160",
  1: "Прямоугольный 200×100",
  2: "Гибкий ø125",
};

/* ─── inputs ─── */

interface VentilationInputs {
  totalArea?: number;
  ceilingHeight?: number;
  buildingType?: number;
  peopleCount?: number;
  ductType?: number;
}

/* ─── helpers ─── */

function getInputDefault(spec: VentilationCanonicalSpec, key: string, fallback: number): number {
  return spec.input_schema.find((field) => field.key === key)?.default_value ?? fallback;
}

/* ─── main ─── */

export function computeCanonicalVentilation(
  spec: VentilationCanonicalSpec,
  inputs: VentilationInputs,
  factorTable: FactorTable,
): CanonicalCalculatorResult {
  const totalArea = Math.max(10, Math.min(1000, inputs.totalArea ?? getInputDefault(spec, "totalArea", 80)));
  const ceilingHeight = Math.max(2.5, Math.min(3.5, inputs.ceilingHeight ?? getInputDefault(spec, "ceilingHeight", 2.7)));
  const buildingType = Math.max(0, Math.min(3, Math.round(inputs.buildingType ?? getInputDefault(spec, "buildingType", 0))));
  const peopleCount = Math.max(1, Math.min(50, Math.round(inputs.peopleCount ?? getInputDefault(spec, "peopleCount", 3))));
  const ductType = Math.max(0, Math.min(2, Math.round(inputs.ductType ?? getInputDefault(spec, "ductType", 0))));

  /* ─── airflow calculation ─── */
  const volume = totalArea * ceilingHeight;
  const airByVolume = volume * EXCHANGE_RATES[buildingType];
  const airByPeople = peopleCount * AIR_PER_PERSON;
  const requiredAirflow = Math.max(airByVolume, airByPeople);
  const requiredAirflowRounded = Math.ceil(requiredAirflow / AIRFLOW_ROUNDING) * AIRFLOW_ROUNDING;

  /* ─── fan ─── */
  const fanCapacity = Math.ceil(requiredAirflowRounded * FAN_RESERVE / AIRFLOW_ROUNDING) * AIRFLOW_ROUNDING;
  const fanDiameter = fanCapacity <= 300 ? 100 : fanCapacity <= 500 ? 125 : fanCapacity <= 800 ? 150 : 200;

  /* ─── duct length ─── */
  const mainDuctLength = Math.sqrt(totalArea) * MAIN_DUCT_LENGTH_COEFF * MAIN_DUCT_RESERVE;

  /* ─── duct sections / coils ─── */
  let ductSections = 0;
  let ductCoils = 0;

  if (ductType <= 1) {
    ductSections = Math.ceil(mainDuctLength / DUCT_SECTION_M);
  } else {
    ductCoils = Math.ceil(mainDuctLength / FLEX_DUCT_COIL_M);
  }

  /* ─── fittings ─── */
  const fittingsBase = ductType <= 1 ? ductSections : ductCoils;
  const fittings = Math.ceil(fittingsBase * FITTINGS_PER_SECTION * FITTINGS_RESERVE);

  /* ─── grilles ─── */
  const grilles = Math.ceil(totalArea / GRILLE_AREA_M2) + GRILLE_BASE;

  /* ─── clamps ─── */
  const clampsBase = ductType <= 1 ? ductSections : ductCoils;
  const clamps = Math.ceil(clampsBase * CLAMPS_PER_SECTION * CLAMPS_RESERVE);

  /* ─── silencer ─── */
  const silencer = buildingType <= 1 ? SILENCER_COUNT : 0;

  /* ─── primary quantity for scenarios ─── */
  const primaryQuantity = ductType <= 1 ? ductSections : ductCoils;
  const primaryUnit = ductType <= 1 ? "секций" : "бухт";
  const primaryLabel = ductType <= 1
    ? `duct-section-${DUCT_SECTION_M}m`
    : `flex-duct-coil-${FLEX_DUCT_COIL_M}m`;

  /* ─── scenarios ─── */
  const packageOptions = [{
    size: 1,
    label: primaryLabel,
    unit: primaryUnit,
  }];

  const scenarios = SCENARIOS.reduce((acc, scenario) => {
    const { multiplier, keyFactors } = combineScenarioFactors(factorTable, spec.field_factors.enabled, scenario);
    const exactNeed = roundDisplay(primaryQuantity * multiplier, 6);
    const packaging = optimizePackaging(exactNeed, packageOptions);

    acc[scenario] = {
      exact_need: exactNeed,
      purchase_quantity: roundDisplay(packaging.purchaseQuantity, 6),
      leftover: roundDisplay(packaging.leftover, 6),
      assumptions: [
        `formula_version:${spec.formula_version}`,
        `buildingType:${buildingType}`,
        `ductType:${ductType}`,
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

  /* ─── materials ─── */
  const materials: CanonicalMaterialResult[] = [
    {
      name: `Вентилятор канальный (${fanCapacity} м³/ч, ø${fanDiameter} мм)`,
      quantity: 1,
      unit: "шт",
      withReserve: 1,
      purchaseQty: 1,
      category: "Оборудование",
    },
  ];

  if (ductType <= 1) {
    materials.push({
      name: `Воздуховод ${DUCT_TYPE_LABELS[ductType]} (${DUCT_SECTION_M} м)`,
      quantity: ductSections,
      unit: "секций",
      withReserve: ductSections,
      purchaseQty: ductSections,
      category: "Воздуховоды",
    });
  } else {
    materials.push({
      name: `Воздуховод ${DUCT_TYPE_LABELS[2]} (${FLEX_DUCT_COIL_M} м)`,
      quantity: ductCoils,
      unit: "бухт",
      withReserve: ductCoils,
      purchaseQty: ductCoils,
      category: "Воздуховоды",
    });
  }

  materials.push(
    {
      name: "Фасонные элементы (отводы, тройники)",
      quantity: fittings,
      unit: "шт",
      withReserve: fittings,
      purchaseQty: fittings,
      category: "Фасонные",
    },
    {
      name: "Вентиляционные решётки",
      quantity: grilles,
      unit: "шт",
      withReserve: grilles,
      purchaseQty: grilles,
      category: "Распределение",
    },
    {
      name: "Хомуты и кронштейны",
      quantity: clamps,
      unit: "шт",
      withReserve: clamps,
      purchaseQty: clamps,
      category: "Крепёж",
    },
  );

  if (silencer > 0) {
    materials.push({
      name: "Шумоглушитель",
      quantity: silencer,
      unit: "шт",
      withReserve: silencer,
      purchaseQty: silencer,
      category: "Оборудование",
    });
  }

  /* ─── warnings ─── */
  const warnings: string[] = [];
  if (requiredAirflow > 2000) {
    warnings.push("Требуемый воздухообмен превышает 2000 м³/ч — рекомендуется профессиональное проектирование");
  }
  if (buildingType === 0 && peopleCount > 6) {
    warnings.push("Для квартиры с числом жильцов более 6 рекомендуется приточно-вытяжная установка");
  }

  return {
    canonicalSpecId: spec.calculator_id,
    formulaVersion: spec.formula_version,
    materials,
    totals: {
      totalArea: roundDisplay(totalArea, 3),
      ceilingHeight: roundDisplay(ceilingHeight, 3),
      buildingType,
      peopleCount,
      ductType,
      volume: roundDisplay(volume, 3),
      airByVolume: roundDisplay(airByVolume, 3),
      airByPeople: roundDisplay(airByPeople, 3),
      requiredAirflow: roundDisplay(requiredAirflow, 3),
      requiredAirflowRounded,
      fanCapacity,
      fanDiameter,
      mainDuctLength: roundDisplay(mainDuctLength, 3),
      ductSections,
      ductCoils,
      fittings,
      grilles,
      clamps,
      silencer,
      minExactNeed: scenarios.MIN.exact_need,
      recExactNeed: scenarios.REC.exact_need,
      maxExactNeed: scenarios.MAX.exact_need,
      minPurchase: scenarios.MIN.purchase_quantity,
      recPurchase: scenarios.REC.purchase_quantity,
      maxPurchase: scenarios.MAX.purchase_quantity,
    },
    warnings,
    scenarios,
  };
}
