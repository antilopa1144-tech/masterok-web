import { combineScenarioFactors, type FactorTable } from "./factors";
import { optimizePackaging } from "./packaging";
import { SCENARIOS, type ScenarioBundle } from "./scenarios";
import type {
  InsulationCanonicalSpec,
  CanonicalCalculatorResult,
  CanonicalMaterialResult,
} from "./canonical";
import { roundDisplay } from "./units";

interface InsulationInputs {
  area?: number;
  insulationType?: number;
  thickness?: number;
  plateSize?: number;
  reserve?: number;
}

/* ─── constants ─── */

const PLATE_AREAS: Record<number, number> = { 0: 0.72, 1: 0.50, 2: 2.00 };
const PLATE_LABELS: Record<number, string> = { 0: "1200×600", 1: "1000×500", 2: "2000×1000" };
const PLATE_RESERVE = 1.05;

const DOWELS_PER_SQM: Record<number, number> = { 0: 7, 1: 5, 2: 6, 3: 0 };
const DOWEL_RESERVE = 1.05;

const MEMBRANE_RESERVE = 1.15;
const ALU_TAPE_M2_PER_M2 = 2;
const ALU_TAPE_ROLL_M = 50;

const GLUE_KG_PER_M2 = 2.5;
const GLUE_BAG_KG = 25;

const PRIMER_L_PER_M2 = 0.15;
const PRIMER_RESERVE = 1.15;
const PRIMER_CAN_L = 10;

const ECOWOOL_DENSITY = 35;
const ECOWOOL_WASTE = 1.10;
const ECOWOOL_BAG_KG = 15;

/* ─── labels ─── */

const INSULATION_TYPE_LABELS: Record<number, string> = {
  0: "Минеральная вата",
  1: "ЭППС / пеноплекс",
  2: "ЕПС / пенопласт",
  3: "Эковата",
};

/* ─── helpers ─── */

function getInputDefault(spec: InsulationCanonicalSpec, key: string, fallback: number): number {
  return spec.input_schema.find((field) => field.key === key)?.default_value ?? fallback;
}

function resolveInsulationType(spec: InsulationCanonicalSpec, inputs: InsulationInputs): number {
  return Math.max(0, Math.min(3, Math.round(inputs.insulationType ?? getInputDefault(spec, "insulationType", 0))));
}

function resolvePlateSize(spec: InsulationCanonicalSpec, inputs: InsulationInputs): number {
  return Math.max(0, Math.min(2, Math.round(inputs.plateSize ?? getInputDefault(spec, "plateSize", 0))));
}

/* ─── main ─── */

export function computeCanonicalInsulation(
  spec: InsulationCanonicalSpec,
  inputs: InsulationInputs,
  factorTable: FactorTable,
): CanonicalCalculatorResult {
  const area = Math.max(1, Math.min(500, inputs.area ?? getInputDefault(spec, "area", 40)));
  const insulationType = resolveInsulationType(spec, inputs);
  const thickness = Math.max(50, Math.min(200, inputs.thickness ?? getInputDefault(spec, "thickness", 100)));
  const plateSize = resolvePlateSize(spec, inputs);
  const reserve = Math.max(0, Math.min(15, inputs.reserve ?? getInputDefault(spec, "reserve", 5)));

  const areaWithReserve = area * (1 + reserve / 100);
  const plateArea = PLATE_AREAS[plateSize] ?? 0.72;

  /* ── plate-based types (0, 1, 2) ── */
  let platesNeeded = 0;
  let dowelsNeeded = 0;
  let membraneArea = 0;
  let aluTapeRolls = 0;
  let glueKg = 0;
  let glueBags = 0;

  if (insulationType <= 2) {
    platesNeeded = Math.ceil(areaWithReserve / plateArea);
    dowelsNeeded = Math.ceil(area * (DOWELS_PER_SQM[insulationType] ?? 0) * DOWEL_RESERVE);
  }

  if (insulationType === 0) {
    membraneArea = Math.ceil(area * MEMBRANE_RESERVE);
    aluTapeRolls = Math.ceil((area * ALU_TAPE_M2_PER_M2) / ALU_TAPE_ROLL_M);
  }

  if (insulationType === 1 || insulationType === 2) {
    glueKg = area * GLUE_KG_PER_M2;
    glueBags = Math.ceil(glueKg / GLUE_BAG_KG);
  }

  /* ── primer (all types) ── */
  const primerCans = Math.ceil(area * PRIMER_L_PER_M2 * PRIMER_RESERVE / PRIMER_CAN_L);

  /* ── ecowool (type 3) ── */
  let ecowoolVolume = 0;
  let ecowoolKg = 0;
  let ecowoolBags = 0;

  if (insulationType === 3) {
    ecowoolVolume = area * (thickness / 1000);
    ecowoolKg = Math.ceil(ecowoolVolume * ECOWOOL_DENSITY * ECOWOOL_WASTE);
    ecowoolBags = Math.ceil(ecowoolKg / ECOWOOL_BAG_KG);
  }

  /* ── scenarios (plates are the primary packaging unit for types 0-2) ── */
  const basePrimary = insulationType <= 2 ? platesNeeded : ecowoolBags;
  const packageSize = 1;
  const packageUnit = insulationType <= 2 ? "шт" : "мешков";
  const packageLabel = insulationType <= 2
    ? `insulation-plate-${PLATE_LABELS[plateSize]}`
    : "ecowool-bag-15kg";

  const packageOptions = [{
    size: packageSize,
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
        `insulationType:${insulationType}`,
        `plateSize:${plateSize}`,
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

  /* ── build materials list ── */
  const materials: CanonicalMaterialResult[] = [];

  if (insulationType <= 2) {
    materials.push({
      name: `${INSULATION_TYPE_LABELS[insulationType]} (${PLATE_LABELS[plateSize]} мм)`,
      quantity: roundDisplay(recScenario.exact_need, 6),
      unit: "шт",
      withReserve: Math.ceil(recScenario.exact_need),
      purchaseQty: Math.ceil(recScenario.exact_need),
      category: "Основное",
    });

    materials.push({
      name: "Дюбели тарельчатые",
      quantity: dowelsNeeded,
      unit: "шт",
      withReserve: dowelsNeeded,
      purchaseQty: dowelsNeeded,
      category: "Крепёж",
    });
  }

  if (insulationType === 0) {
    materials.push({
      name: "Пароизоляционная мембрана",
      quantity: membraneArea,
      unit: "м²",
      withReserve: membraneArea,
      purchaseQty: membraneArea,
      category: "Изоляция",
    });

    materials.push({
      name: "Алюминиевая лента (скотч)",
      quantity: aluTapeRolls,
      unit: "рулонов",
      withReserve: aluTapeRolls,
      purchaseQty: aluTapeRolls,
      category: "Изоляция",
    });
  }

  if (insulationType === 1 || insulationType === 2) {
    materials.push({
      name: `Клей для ${insulationType === 1 ? "ЭППС" : "ЕПС"} (${GLUE_BAG_KG} кг)`,
      quantity: roundDisplay(glueKg, 3),
      unit: "кг",
      withReserve: glueBags * GLUE_BAG_KG,
      purchaseQty: glueBags * GLUE_BAG_KG,
      packageInfo: { count: glueBags, size: GLUE_BAG_KG, packageUnit: "мешков" },
      category: "Клей",
    });
  }

  if (insulationType === 3) {
    materials.push({
      name: `Эковата (${ECOWOOL_BAG_KG} кг)`,
      quantity: ecowoolKg,
      unit: "кг",
      withReserve: ecowoolBags * ECOWOOL_BAG_KG,
      purchaseQty: ecowoolBags * ECOWOOL_BAG_KG,
      packageInfo: { count: ecowoolBags, size: ECOWOOL_BAG_KG, packageUnit: "мешков" },
      category: "Основное",
    });
  }

  materials.push({
    name: `Грунтовка (${PRIMER_CAN_L} л)`,
    quantity: roundDisplay(area * PRIMER_L_PER_M2 * PRIMER_RESERVE, 3),
    unit: "л",
    withReserve: primerCans * PRIMER_CAN_L,
    purchaseQty: primerCans * PRIMER_CAN_L,
    packageInfo: { count: primerCans, size: PRIMER_CAN_L, packageUnit: "канистр" },
    category: "Подготовка",
  });

  /* ── warnings ── */
  const warnings: string[] = [];
  if (thickness < spec.warnings_rules.thin_thickness_threshold_mm) {
    warnings.push("Толщина менее 50 мм — недостаточно для наружных стен");
  }
  if (insulationType === 3 && thickness > spec.warnings_rules.ecowool_settle_threshold_mm) {
    warnings.push("Эковата при толщине более 150 мм оседает — рекомендуется укладка в 2 слоя");
  }
  if (area > spec.warnings_rules.professional_area_threshold_m2) {
    warnings.push("При площади более 100 м² рекомендуется профессиональный монтаж");
  }


  const practicalNotes: string[] = [];
  if (thickness < 100) {
    practicalNotes.push(`Утеплитель ${thickness} мм — для средней полосы России минимум 100-150 мм`);
  }
  practicalNotes.push("Стыки плит утеплителя не должны совпадать с стыками предыдущего слоя — укладывайте вразбежку");

  return {
    canonicalSpecId: spec.calculator_id,
    formulaVersion: spec.formula_version,
    materials,
    totals: {
      area: roundDisplay(area, 3),
      insulationType,
      thickness: roundDisplay(thickness, 3),
      plateSize,
      reserve,
      areaWithReserve: roundDisplay(areaWithReserve, 3),
      plateArea,
      platesNeeded: insulationType <= 2 ? platesNeeded : 0,
      dowelsNeeded: insulationType <= 2 ? dowelsNeeded : 0,
      membraneArea: insulationType === 0 ? membraneArea : 0,
      aluTapeRolls: insulationType === 0 ? aluTapeRolls : 0,
      glueKg: insulationType === 1 || insulationType === 2 ? roundDisplay(glueKg, 3) : 0,
      glueBags: insulationType === 1 || insulationType === 2 ? glueBags : 0,
      primerCans,
      ecowoolVolume: insulationType === 3 ? roundDisplay(ecowoolVolume, 6) : 0,
      ecowoolKg: insulationType === 3 ? ecowoolKg : 0,
      ecowoolBags: insulationType === 3 ? ecowoolBags : 0,
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
