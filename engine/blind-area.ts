import { combineScenarioFactors, type FactorTable } from "./factors";
import { optimizePackaging } from "./packaging";
import { SCENARIOS, type ScenarioBundle } from "./scenarios";
import type {
  BlindAreaCanonicalSpec,
  CanonicalCalculatorResult,
  CanonicalMaterialResult,
} from "./canonical";
import { roundDisplay } from "./units";

/* ─── constants ─── */

const CONCRETE_RESERVE = 1.05;
const MESH_RESERVE = 1.1;
const DAMPER_RESERVE = 1.05;
const GRAVEL_LAYER = 0.15;
const SAND_LAYER = 0.1;
const TILE_RESERVE = 1.08;
const TILE_MIX_KG_PER_M2 = 6;
const BORDER_LENGTH = 0.5;
const MEMBRANE_RESERVE = 1.15;
const GEOTEXTILE_ROLL = 50;
const EPPS_PLATE = 0.72;
const EPPS_RESERVE = 1.05;

/* ─── labels ─── */

const MATERIAL_TYPE_LABELS: Record<number, string> = {
  0: "Бетон",
  1: "Тротуарная плитка",
  2: "Мягкая мембрана",
};

/* ─── inputs ─── */

interface BlindAreaInputs {
  perimeter?: number;
  width?: number;
  thickness?: number;
  materialType?: number;
  withInsulation?: number;
}

/* ─── helpers ─── */

function getInputDefault(spec: BlindAreaCanonicalSpec, key: string, fallback: number): number {
  return spec.input_schema.find((field) => field.key === key)?.default_value ?? fallback;
}

/* ─── main ─── */

export function computeCanonicalBlindArea(
  spec: BlindAreaCanonicalSpec,
  inputs: BlindAreaInputs,
  factorTable: FactorTable,
): CanonicalCalculatorResult {
  const perimeter = Math.max(10, Math.min(200, inputs.perimeter ?? getInputDefault(spec, "perimeter", 40)));
  const width = Math.max(0.6, Math.min(1.5, inputs.width ?? getInputDefault(spec, "width", 1.0)));
  const thickness = Math.max(70, Math.min(150, inputs.thickness ?? getInputDefault(spec, "thickness", 100)));
  const materialType = Math.max(0, Math.min(2, Math.round(inputs.materialType ?? getInputDefault(spec, "materialType", 0))));
  const withInsulation = Math.max(0, Math.min(100, inputs.withInsulation ?? getInputDefault(spec, "withInsulation", 0)));

  /* ─── base geometry ─── */
  const area = perimeter * width;

  /* ─── type-specific ─── */
  let concreteM3 = 0;
  let meshPcs = 0;
  let damperM = 0;
  let tileM2 = 0;
  let mixBags = 0;
  let borderPcs = 0;
  let membraneM2 = 0;
  let decorGravelM3 = 0;

  if (materialType === 0) {
    /* concrete */
    concreteM3 = Math.ceil(area * (thickness / 1000) * CONCRETE_RESERVE * 10) / 10;
    meshPcs = thickness >= 100 ? Math.ceil(area * MESH_RESERVE) : 0;
    damperM = roundDisplay(perimeter * DAMPER_RESERVE, 2);
  } else if (materialType === 1) {
    /* tile */
    tileM2 = Math.ceil(area * TILE_RESERVE);
    mixBags = Math.ceil(area * TILE_MIX_KG_PER_M2 / 50);
    borderPcs = Math.ceil(perimeter / BORDER_LENGTH);
  } else {
    /* soft membrane */
    membraneM2 = Math.ceil(area * MEMBRANE_RESERVE);
    decorGravelM3 = roundDisplay(area * 0.1, 3);
  }

  /* ─── common layers ─── */
  const gravel = roundDisplay(area * GRAVEL_LAYER, 3);
  const sand = roundDisplay(area * SAND_LAYER, 3);
  const geotextileRolls = Math.ceil(area * 1.15 / GEOTEXTILE_ROLL);
  const eppsPlates = withInsulation > 0 ? Math.ceil(area * EPPS_RESERVE / EPPS_PLATE) : 0;

  /* ─── scenarios ─── */
  const basePrimary = materialType === 0 ? concreteM3 : materialType === 1 ? tileM2 : membraneM2;
  const packageUnit = materialType === 0 ? "м³" : "м²";
  const packageLabel = materialType === 0
    ? "concrete-m3"
    : materialType === 1
      ? "tile-m2"
      : "membrane-m2";

  const packageOptions = [{
    size: 1,
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
        `materialType:${materialType}`,
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
  const materials: CanonicalMaterialResult[] = [];

  if (materialType === 0) {
    materials.push(
      {
        name: `Бетон (${thickness} мм)`,
        quantity: roundDisplay(recScenario.exact_need, 6),
        unit: "м³",
        withReserve: concreteM3,
        purchaseQty: Math.ceil(concreteM3 * 10) / 10,
        category: "Бетон",
      },
    );
    if (meshPcs > 0) {
      materials.push({
        name: "Армосетка",
        quantity: meshPcs,
        unit: "шт",
        withReserve: meshPcs,
        purchaseQty: meshPcs,
        category: "Армирование",
      });
    }
    materials.push({
      name: "Демпферная лента",
      quantity: damperM,
      unit: "м",
      withReserve: damperM,
      purchaseQty: Math.ceil(damperM),
      category: "Расходные",
    });
  } else if (materialType === 1) {
    materials.push(
      {
        name: "Тротуарная плитка",
        quantity: roundDisplay(recScenario.exact_need, 6),
        unit: "м²",
        withReserve: tileM2,
        purchaseQty: tileM2,
        category: "Покрытие",
      },
      {
        name: "Смесь для укладки (50 кг)",
        quantity: mixBags,
        unit: "мешков",
        withReserve: mixBags,
        purchaseQty: mixBags,
        category: "Смеси",
      },
      {
        name: "Бордюр (0.5 м)",
        quantity: borderPcs,
        unit: "шт",
        withReserve: borderPcs,
        purchaseQty: borderPcs,
        category: "Покрытие",
      },
    );
  } else {
    materials.push(
      {
        name: "Профилированная мембрана",
        quantity: roundDisplay(recScenario.exact_need, 6),
        unit: "м²",
        withReserve: membraneM2,
        purchaseQty: membraneM2,
        category: "Покрытие",
      },
      {
        name: "Декоративный щебень",
        quantity: decorGravelM3,
        unit: "м³",
        withReserve: decorGravelM3,
        purchaseQty: Math.ceil(decorGravelM3 * 10) / 10,
        category: "Покрытие",
      },
    );
  }

  /* ─── common materials ─── */
  materials.push(
    {
      name: "Щебень (подушка)",
      quantity: gravel,
      unit: "м³",
      withReserve: gravel,
      purchaseQty: Math.ceil(gravel * 10) / 10,
      category: "Подготовка",
    },
    {
      name: "Песок (подушка)",
      quantity: sand,
      unit: "м³",
      withReserve: sand,
      purchaseQty: Math.ceil(sand * 10) / 10,
      category: "Подготовка",
    },
    {
      name: `Геотекстиль (${GEOTEXTILE_ROLL} м²)`,
      quantity: geotextileRolls,
      unit: "рулонов",
      withReserve: geotextileRolls,
      purchaseQty: geotextileRolls,
      category: "Подготовка",
    },
  );

  if (eppsPlates > 0) {
    materials.push({
      name: `ЭППС утеплитель (${withInsulation} мм)`,
      quantity: eppsPlates,
      unit: "шт",
      withReserve: eppsPlates,
      purchaseQty: eppsPlates,
      category: "Утепление",
    });
  }

  /* ─── warnings ─── */
  const warnings: string[] = [];
  if (width < 0.8) {
    warnings.push("Ширина отмостки менее 0.8 м — может не обеспечить достаточной защиты фундамента");
  }
  if (materialType === 0 && thickness < 100) {
    warnings.push("Толщина бетона менее 100 мм — рекомендуется армосетка при увеличении толщины");
  }

  return {
    canonicalSpecId: spec.calculator_id,
    formulaVersion: spec.formula_version,
    materials,
    totals: {
      perimeter: roundDisplay(perimeter, 3),
      width: roundDisplay(width, 3),
      area: roundDisplay(area, 3),
      thickness,
      materialType,
      withInsulation,
      concreteM3,
      meshPcs,
      damperM,
      tileM2,
      mixBags,
      borderPcs,
      membraneM2,
      decorGravelM3,
      gravel,
      sand,
      geotextileRolls,
      eppsPlates,
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
