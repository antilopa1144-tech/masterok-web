import { combineScenarioFactors, type FactorTable } from "./factors";
import { optimizePackaging } from "./packaging";
import { SCENARIOS, type ScenarioBundle } from "./scenarios";
import type {
  CeilingInsulationCanonicalSpec,
  CanonicalCalculatorResult,
  CanonicalMaterialResult,
} from "./canonical";
import { roundDisplay } from "./units";

interface CeilingInsulationInputs {
  area?: number;
  thickness?: number;
  insulationType?: number;
  layers?: number;
}

/* ─── constants ─── */

const PLATE_PACK_M2 = 6;
const ROLL_AREAS: Record<number, number> = { 50: 9, 100: 5 };
const EPPS_PLATE = 0.72;
const ECOWOOL_DENSITY = 35;
const ECOWOOL_BAG = 15;
const PLATE_RESERVE = 1.05;
const VAPOR_ROLL = 50;
const VAPOR_RESERVE = 1.15;
const TAPE_PER_AREA = 50;

/* ─── helpers ─── */

function getInputDefault(spec: CeilingInsulationCanonicalSpec, key: string, fallback: number): number {
  return spec.input_schema.find((field) => field.key === key)?.default_value ?? fallback;
}

function resolveArea(spec: CeilingInsulationCanonicalSpec, inputs: CeilingInsulationInputs): number {
  return Math.max(1, Math.min(500, inputs.area ?? getInputDefault(spec, "area", 40)));
}

function resolveThickness(spec: CeilingInsulationCanonicalSpec, inputs: CeilingInsulationInputs): number {
  const raw = Math.round(inputs.thickness ?? getInputDefault(spec, "thickness", 100));
  const allowed = [50, 100, 150, 200];
  return allowed.includes(raw) ? raw : 100;
}

function resolveInsulationType(spec: CeilingInsulationCanonicalSpec, inputs: CeilingInsulationInputs): number {
  return Math.max(0, Math.min(3, Math.round(inputs.insulationType ?? getInputDefault(spec, "insulationType", 0))));
}

function resolveLayers(spec: CeilingInsulationCanonicalSpec, inputs: CeilingInsulationInputs): number {
  const raw = Math.round(inputs.layers ?? getInputDefault(spec, "layers", 1));
  return raw === 2 ? 2 : 1;
}

/* ─── main ─── */

export function computeCanonicalCeilingInsulation(
  spec: CeilingInsulationCanonicalSpec,
  inputs: CeilingInsulationInputs,
  factorTable: FactorTable,
): CanonicalCalculatorResult {
  const area = resolveArea(spec, inputs);
  const thickness = resolveThickness(spec, inputs);
  const insulationType = resolveInsulationType(spec, inputs);
  const layers = resolveLayers(spec, inputs);

  const materials: CanonicalMaterialResult[] = [];
  let primaryQty = 0;
  let primaryUnit = "упаковок";
  let primaryLabel = "insulation-pack";

  /* ── mineral plates (type 0) ── */
  if (insulationType === 0) {
    const packs = Math.ceil(area * PLATE_RESERVE * layers / PLATE_PACK_M2);
    primaryQty = packs;
    primaryUnit = "упаковок";
    primaryLabel = "mineral-plate-pack";
    materials.push({
      name: "Минераловатные плиты",
      quantity: packs,
      unit: "упаковок",
      withReserve: packs,
      purchaseQty: packs,
      category: "Основное",
    });
  }

  /* ── mineral rolls (type 1) ── */
  if (insulationType === 1) {
    const rollArea = ROLL_AREAS[thickness] ?? ROLL_AREAS[100];
    const rolls = Math.ceil(area * PLATE_RESERVE * layers / rollArea);
    primaryQty = rolls;
    primaryUnit = "рулонов";
    primaryLabel = "mineral-roll";
    materials.push({
      name: "Минераловатные рулоны",
      quantity: rolls,
      unit: "рулонов",
      withReserve: rolls,
      purchaseQty: rolls,
      category: "Основное",
    });
  }

  /* ── EPPS (type 2) ── */
  if (insulationType === 2) {
    const plates = Math.ceil(area * PLATE_RESERVE * layers / EPPS_PLATE);
    primaryQty = plates;
    primaryUnit = "шт";
    primaryLabel = "epps-plate";
    materials.push({
      name: "ЭППС плиты",
      quantity: plates,
      unit: "шт",
      withReserve: plates,
      purchaseQty: plates,
      category: "Основное",
    });
  }

  /* ── ecowool (type 3) ── */
  if (insulationType === 3) {
    const kg = area * (thickness / 1000) * ECOWOOL_DENSITY * layers;
    const bags = Math.ceil(kg / ECOWOOL_BAG);
    primaryQty = bags;
    primaryUnit = "мешков";
    primaryLabel = "ecowool-bag";
    materials.push({
      name: "Эковата 15 кг",
      quantity: bags,
      unit: "мешков",
      withReserve: bags,
      purchaseQty: bags,
      category: "Основное",
    });
  }

  /* Vapor barrier (mineral types only: 0 and 1) */
  let vaporRolls = 0;
  if (insulationType === 0 || insulationType === 1) {
    vaporRolls = Math.ceil(area * VAPOR_RESERVE / VAPOR_ROLL);
    materials.push({
      name: "Пароизоляция 50 м²",
      quantity: vaporRolls,
      unit: "рулонов",
      withReserve: vaporRolls,
      purchaseQty: vaporRolls,
      category: "Изоляция",
    });
  }

  /* Tape */
  const tapeRolls = Math.ceil(area / TAPE_PER_AREA) * 10;
  materials.push({
    name: "Скотч соединительный",
    quantity: tapeRolls,
    unit: "м",
    withReserve: tapeRolls,
    purchaseQty: tapeRolls,
    category: "Расходные",
  });

  /* ─── scenarios ─── */
  const packageOptions = [{
    size: spec.packaging_rules.package_size,
    label: primaryLabel,
    unit: primaryUnit,
  }];

  const scenarios = SCENARIOS.reduce((acc, scenario) => {
    const { multiplier, keyFactors } = combineScenarioFactors(factorTable, spec.field_factors.enabled, scenario);
    const exactNeed = roundDisplay(primaryQty * multiplier, 6);
    const packaging = optimizePackaging(exactNeed, packageOptions);

    acc[scenario] = {
      exact_need: exactNeed,
      purchase_quantity: roundDisplay(packaging.purchaseQuantity, 6),
      leftover: roundDisplay(packaging.leftover, 6),
      assumptions: [
        `formula_version:${spec.formula_version}`,
        `insulationType:${insulationType}`,
        `thickness:${thickness}`,
        `layers:${layers}`,
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
  if (thickness < spec.warnings_rules.thin_insulation_threshold_mm) {
    warnings.push("Тонкий слой утеплителя — эффективность снижена");
  }
  if (area > spec.warnings_rules.large_area_threshold_m2) {
    warnings.push("Большая площадь — рекомендуется профессиональный монтаж");
  }


  const practicalNotes: string[] = [];
  practicalNotes.push("Утеплитель на потолке — пароизоляция снизу обязательна, иначе конденсат сгноит перекрытие");

  return {
    canonicalSpecId: spec.calculator_id,
    formulaVersion: spec.formula_version,
    materials,
    totals: {
      area: roundDisplay(area, 3),
      thickness,
      insulationType,
      layers,
      primaryQty,
      vaporRolls,
      tapeRolls,
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
