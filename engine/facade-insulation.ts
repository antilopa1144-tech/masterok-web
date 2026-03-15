import { combineScenarioFactors, type FactorTable } from "./factors";
import { optimizePackaging } from "./packaging";
import { SCENARIOS, type ScenarioBundle } from "./scenarios";
import type {
  FacadeInsulationCanonicalSpec,
  CanonicalCalculatorResult,
  CanonicalMaterialResult,
} from "./canonical";
import { roundDisplay } from "./units";

/* ─── constants ─── */

const PLATE_M2 = 0.72;
const PLATE_RESERVE = 1.05;

const GLUE_KG_PER_M2: Record<number, number> = {
  0: 4,  // mineral wool
  1: 5,  // EPPS
};

const GLUE_BAG = 25;  // kg

const DOWELS_PER_M2: Record<number, number> = {
  0: 6,  // mineral wool
  1: 4,  // EPPS
};

const DOWEL_RESERVE = 1.05;

const MESH_RESERVE = 1.15;
const MESH_ROLL = 50;  // m²

const ARMOR_KG_PER_M2 = 4;
const ARMOR_BAG = 25;  // kg

const PRIMER_L_PER_M2 = 0.25;
const PRIMER_CAN_L = 10;
const PRIMER_RESERVE = 1.1;

const DECOR_CONSUMPTION: Record<number, number> = {
  0: 3.5,  // korod (bark beetle)  kg/m²
  1: 4.5,  // shuba coat
  2: 2.5,  // thincoat
};

const DECOR_BAG = 25;  // kg

const STARTER_LENGTH = 2;  // m
const STARTER_RESERVE = 1.05;

/* ─── inputs ─── */

interface FacadeInsulationInputs {
  area?: number;
  thickness?: number;
  insulationType?: number;
  finishType?: number;
}

/* ─── helpers ─── */

function getInputDefault(spec: FacadeInsulationCanonicalSpec, key: string, fallback: number): number {
  return spec.input_schema.find((field) => field.key === key)?.default_value ?? fallback;
}

/* ─── main ─── */

export function computeCanonicalFacadeInsulation(
  spec: FacadeInsulationCanonicalSpec,
  inputs: FacadeInsulationInputs,
  factorTable: FactorTable,
): CanonicalCalculatorResult {
  const area = Math.max(10, Math.min(2000, inputs.area ?? getInputDefault(spec, "area", 100)));
  const thickness = Math.max(50, Math.min(200, Math.round(inputs.thickness ?? getInputDefault(spec, "thickness", 100))));
  const insulationType = Math.max(0, Math.min(1, Math.round(inputs.insulationType ?? getInputDefault(spec, "insulationType", 0))));
  const finishType = Math.max(0, Math.min(2, Math.round(inputs.finishType ?? getInputDefault(spec, "finishType", 0))));

  /* ─── formulas ─── */
  const plates = Math.ceil(area * PLATE_RESERVE / PLATE_M2);

  const glueRate = GLUE_KG_PER_M2[insulationType] ?? GLUE_KG_PER_M2[0];
  const glueBags = Math.ceil(area * glueRate / GLUE_BAG);

  const dowelsPerM2 = DOWELS_PER_M2[insulationType] ?? DOWELS_PER_M2[0];
  const dowels = Math.ceil(area * dowelsPerM2 * DOWEL_RESERVE);

  const meshRolls = Math.ceil(area * MESH_RESERVE / MESH_ROLL);

  const armorBags = Math.ceil(area * ARMOR_KG_PER_M2 / ARMOR_BAG);

  const primerCans = Math.ceil(area * PRIMER_L_PER_M2 * PRIMER_RESERVE / PRIMER_CAN_L);

  const decorConsumption = DECOR_CONSUMPTION[finishType] ?? DECOR_CONSUMPTION[0];
  const decorBags = Math.ceil(area * decorConsumption / DECOR_BAG);

  // Starter profile: perimeter ~ sqrt(area)*4
  const starterPcs = Math.ceil(Math.sqrt(area) * 4 * STARTER_RESERVE / STARTER_LENGTH);

  /* ─── scenarios ─── */
  const packageOptions = [{
    size: 1,
    label: "insulation-plate",
    unit: "шт",
  }];

  const scenarios = SCENARIOS.reduce((acc, scenario) => {
    const { multiplier, keyFactors } = combineScenarioFactors(factorTable, spec.field_factors.enabled, scenario);
    const exactNeed = roundDisplay(plates * multiplier, 6);
    const packaging = optimizePackaging(exactNeed, packageOptions);

    acc[scenario] = {
      exact_need: exactNeed,
      purchase_quantity: roundDisplay(packaging.purchaseQuantity, 6),
      leftover: roundDisplay(packaging.leftover, 6),
      assumptions: [
        `formula_version:${spec.formula_version}`,
        `insulationType:${insulationType}`,
        `finishType:${finishType}`,
        `thickness:${thickness}`,
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
  const insulationLabel = insulationType === 0 ? "Минеральная вата" : "ЭППС";
  const finishLabels: Record<number, string> = {
    0: "Декоративная штукатурка «короед»",
    1: "Декоративная штукатурка «шуба»",
    2: "Тонкослойная штукатурка",
  };

  const materials: CanonicalMaterialResult[] = [
    {
      name: `${insulationLabel} (плиты ${PLATE_M2} м²)`,
      quantity: roundDisplay(recScenario.exact_need, 6),
      unit: "шт",
      withReserve: Math.ceil(recScenario.exact_need),
      purchaseQty: Math.ceil(recScenario.exact_need),
      category: "Утепление",
    },
    {
      name: "Клей для утеплителя 25кг",
      quantity: glueBags,
      unit: "мешков",
      withReserve: glueBags,
      purchaseQty: glueBags,
      category: "Клей",
    },
    {
      name: "Тарельчатые дюбели",
      quantity: dowels,
      unit: "шт",
      withReserve: dowels,
      purchaseQty: dowels,
      category: "Крепёж",
    },
    {
      name: `Армирующая сетка (${MESH_ROLL} м²)`,
      quantity: meshRolls,
      unit: "рулонов",
      withReserve: meshRolls,
      purchaseQty: meshRolls,
      category: "Армирование",
    },
    {
      name: "Армирующая шпаклёвка 25кг",
      quantity: armorBags,
      unit: "мешков",
      withReserve: armorBags,
      purchaseQty: armorBags,
      category: "Армирование",
    },
    {
      name: `Грунтовка (канистра ${PRIMER_CAN_L} л)`,
      quantity: primerCans,
      unit: "канистр",
      withReserve: primerCans,
      purchaseQty: primerCans,
      category: "Грунтовка",
    },
    {
      name: `${finishLabels[finishType]} 25кг`,
      quantity: decorBags,
      unit: "мешков",
      withReserve: decorBags,
      purchaseQty: decorBags,
      category: "Отделка",
    },
    {
      name: `Стартовый профиль (${STARTER_LENGTH} м)`,
      quantity: starterPcs,
      unit: "шт",
      withReserve: starterPcs,
      purchaseQty: starterPcs,
      category: "Профиль",
    },
  ];

  /* ─── warnings ─── */
  const warnings: string[] = [];
  if (thickness >= 150) {
    warnings.push("Толстый утеплитель — рекомендуется двухслойная укладка");
  }
  if (insulationType === 1 && finishType !== 2) {
    warnings.push("ЭППС — обязательна обработка поверхности для адгезии штукатурки");
  }

  return {
    canonicalSpecId: spec.calculator_id,
    formulaVersion: spec.formula_version,
    materials,
    totals: {
      area: roundDisplay(area, 3),
      thickness,
      insulationType,
      finishType,
      plates,
      glueBags,
      dowels,
      meshRolls,
      armorBags,
      primerCans,
      decorBags,
      starterPcs,
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
