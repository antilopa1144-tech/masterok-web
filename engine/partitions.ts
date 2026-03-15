import { combineScenarioFactors, type FactorTable } from "./factors";
import { optimizePackaging } from "./packaging";
import { SCENARIOS, type ScenarioBundle } from "./scenarios";
import type {
  PartitionsCanonicalSpec,
  CanonicalCalculatorResult,
  CanonicalMaterialResult,
} from "./canonical";
import { roundDisplay } from "./units";

/* ─── constants ─── */

const BLOCK_DIMS: Record<number, [number, number]> = {
  0: [625, 250],  // gasocrete D500
  1: [625, 250],  // foam D600
  2: [667, 500],  // gypsum PGP
};

const GLUE_RATE: Record<number, number> = {
  0: 1.5,  // kg/m²
  1: 1.5,
  2: 0,
};

const GYPSUM_MILK_RATE = 0.8; // kg/m²
const GYPSUM_BAG = 20;        // kg
const GLUE_BAG = 25;          // kg
const BLOCK_RESERVE = 1.05;
const MESH_INTERVAL = 0.75;   // m (every 3 rows)
const MESH_RESERVE = 1.05;
const MESH_ROLL = 50;         // m
const FOAM_PER_PERIM = 5;     // m per bottle
const FOAM_CAN = 750;         // ml
const PRIMER_L_PER_M2 = 0.15;
const PRIMER_RESERVE = 1.15;
const PRIMER_CAN = 10;        // L
const SEAL_TAPE_RESERVE = 1.1;

/* ─── inputs ─── */

interface PartitionsInputs {
  length?: number;
  height?: number;
  thickness?: number;
  blockType?: number;
}

/* ─── helpers ─── */

function getInputDefault(spec: PartitionsCanonicalSpec, key: string, fallback: number): number {
  return spec.input_schema.find((field) => field.key === key)?.default_value ?? fallback;
}

/* ─── main ─── */

export function computeCanonicalPartitions(
  spec: PartitionsCanonicalSpec,
  inputs: PartitionsInputs,
  factorTable: FactorTable,
): CanonicalCalculatorResult {
  const length = Math.max(1, Math.min(50, inputs.length ?? getInputDefault(spec, "length", 5)));
  const height = Math.max(2, Math.min(4, inputs.height ?? getInputDefault(spec, "height", 2.7)));
  const thickness = Math.max(75, Math.min(200, Math.round(inputs.thickness ?? getInputDefault(spec, "thickness", 100))));
  const blockType = Math.max(0, Math.min(2, Math.round(inputs.blockType ?? getInputDefault(spec, "blockType", 0))));

  /* ─── formulas ─── */
  const wallArea = length * height;
  const dims = BLOCK_DIMS[blockType] ?? BLOCK_DIMS[0];
  const blockArea = (dims[0] / 1000) * (dims[1] / 1000);
  const blocks = Math.ceil(wallArea / blockArea * BLOCK_RESERVE);

  // Glue / gypsum adhesive
  const glueBags = blockType !== 2
    ? Math.ceil(wallArea * GLUE_RATE[blockType] / GLUE_BAG)
    : 0;
  const gypsumBags = blockType === 2
    ? Math.ceil(wallArea * GYPSUM_MILK_RATE / GYPSUM_BAG)
    : 0;

  // Reinforcing mesh
  const armRows = Math.ceil(height / MESH_INTERVAL);
  const meshLen = length * armRows * MESH_RESERVE;
  const meshRolls = Math.ceil(meshLen / MESH_ROLL);

  // Foam
  const foamBottles = Math.ceil((length + height * 2) / FOAM_PER_PERIM);

  // Primer (both sides)
  const primer = Math.ceil(wallArea * 2 * PRIMER_L_PER_M2 * PRIMER_RESERVE / PRIMER_CAN);

  // Sealing tape
  const sealTape = Math.ceil((length * 2 + height * 2) * SEAL_TAPE_RESERVE);

  /* ─── scenarios ─── */
  const packageOptions = [{
    size: 1,
    label: "partition-block",
    unit: "шт",
  }];

  const scenarios = SCENARIOS.reduce((acc, scenario) => {
    const { multiplier, keyFactors } = combineScenarioFactors(factorTable, spec.field_factors.enabled, scenario);
    const exactNeed = roundDisplay(blocks * multiplier, 6);
    const packaging = optimizePackaging(exactNeed, packageOptions);

    acc[scenario] = {
      exact_need: exactNeed,
      purchase_quantity: roundDisplay(packaging.purchaseQuantity, 6),
      leftover: roundDisplay(packaging.leftover, 6),
      assumptions: [
        `formula_version:${spec.formula_version}`,
        `blockType:${blockType}`,
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
  const materials: CanonicalMaterialResult[] = [
    {
      name: "Блоки перегородочные",
      quantity: roundDisplay(recScenario.exact_need, 6),
      unit: "шт",
      withReserve: Math.ceil(recScenario.exact_need),
      purchaseQty: Math.ceil(recScenario.exact_need),
      category: "Основное",
    },
  ];

  if (glueBags > 0) {
    materials.push({
      name: "Клей для блоков 25кг",
      quantity: glueBags,
      unit: "мешков",
      withReserve: glueBags,
      purchaseQty: glueBags,
      category: "Кладка",
    });
  }

  if (gypsumBags > 0) {
    materials.push({
      name: "Гипсовое молочко 20кг",
      quantity: gypsumBags,
      unit: "мешков",
      withReserve: gypsumBags,
      purchaseQty: gypsumBags,
      category: "Кладка",
    });
  }

  materials.push(
    {
      name: `Армирующая сетка (рулон ${MESH_ROLL} м)`,
      quantity: meshRolls,
      unit: "рулонов",
      withReserve: meshRolls,
      purchaseQty: meshRolls,
      category: "Армирование",
    },
    {
      name: "Монтажная пена 750мл",
      quantity: foamBottles,
      unit: "шт",
      withReserve: foamBottles,
      purchaseQty: foamBottles,
      category: "Монтаж",
    },
    {
      name: `Грунтовка (канистра ${PRIMER_CAN} л)`,
      quantity: primer,
      unit: "канистр",
      withReserve: primer,
      purchaseQty: primer,
      category: "Грунтовка",
    },
    {
      name: "Уплотнительная лента",
      quantity: sealTape,
      unit: "м",
      withReserve: sealTape,
      purchaseQty: sealTape,
      category: "Монтаж",
    },
  );

  /* ─── warnings ─── */
  const warnings: string[] = [];
  if (height > 3.5) {
    warnings.push("Высота перегородки более 3.5 м — рекомендуется усиленное армирование");
  }
  if (blockType === 2 && thickness > 100) {
    warnings.push("Гипсовые ПГП толще 100 мм — проверьте наличие нужного размера");
  }

  return {
    canonicalSpecId: spec.calculator_id,
    formulaVersion: spec.formula_version,
    materials,
    totals: {
      length: roundDisplay(length, 3),
      height: roundDisplay(height, 3),
      thickness,
      blockType,
      wallArea: roundDisplay(wallArea, 3),
      blockArea: roundDisplay(blockArea, 6),
      blocks,
      glueBags,
      gypsumBags,
      armRows,
      meshLen: roundDisplay(meshLen, 3),
      meshRolls,
      foamBottles,
      primer,
      sealTape,
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
