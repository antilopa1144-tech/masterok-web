import { combineScenarioFactors, type FactorTable } from "./factors";
import { optimizePackaging } from "./packaging";
import { SCENARIOS, type ScenarioBundle } from "./scenarios";
import type {
  WallPanelsCanonicalSpec,
  CanonicalCalculatorResult,
  CanonicalMaterialResult,
} from "./canonical";
import { roundDisplay } from "./units";

/* ─── constants ─── */

const PANEL_AREAS: Record<number, number> = {
  0: 0.75,  // PVC
  1: 0.494, // MDF
  2: 0.25,  // 3D
  3: 0.3,   // wood
  4: 0.5,   // stone
};

const PANEL_RESERVE = 1.1;
const GLUE_COVERAGE = 4; // m²/bottle
const PRIMER_L_PER_M2 = 0.15;
const PRIMER_RESERVE = 1.15;
const PRIMER_CAN = 10;
const BATTEN_SPACING: Record<number, number> = {
  0: 0.5,
  1: 0.5,
  2: 0.4,
  3: 0.4,
  4: 0.4,
};
const BATTEN_LENGTH = 3;
const BATTEN_RESERVE = 1.05;
const DUBEL_STEP = 0.5;
const KLAYMER_PER_M2 = 5;
const MOLDING_LENGTH = 3;
const MOLDING_RESERVE = 1.05;
const SEALANT_PER_PERIM = 10;

/* ─── labels ─── */

const PANEL_TYPE_LABELS: Record<number, string> = {
  0: "ПВХ-панели (0.75 м²)",
  1: "МДФ-панели (0.494 м²)",
  2: "3D-панели (0.25 м²)",
  3: "Деревянные панели (0.3 м²)",
  4: "Каменный шпон (0.5 м²)",
};

const MOUNT_METHOD_LABELS: Record<number, string> = {
  0: "На клей",
  1: "На обрешётку",
};

/* ─── inputs ─── */

interface WallPanelsInputs {
  area?: number;
  panelType?: number;
  mountMethod?: number;
  height?: number;
}

/* ─── helpers ─── */

function getInputDefault(spec: WallPanelsCanonicalSpec, key: string, fallback: number): number {
  return spec.input_schema.find((field) => field.key === key)?.default_value ?? fallback;
}

/* ─── main ─── */

export function computeCanonicalWallPanels(
  spec: WallPanelsCanonicalSpec,
  inputs: WallPanelsInputs,
  factorTable: FactorTable,
): CanonicalCalculatorResult {
  const area = Math.max(1, Math.min(200, Math.round(inputs.area ?? getInputDefault(spec, "area", 20))));
  const panelType = Math.max(0, Math.min(4, Math.round(inputs.panelType ?? getInputDefault(spec, "panelType", 0))));
  const mountMethod = Math.max(0, Math.min(1, Math.round(inputs.mountMethod ?? getInputDefault(spec, "mountMethod", 0))));
  const height = Math.max(2, Math.min(4, inputs.height ?? getInputDefault(spec, "height", 2.7)));

  /* ─── panel area ─── */
  const panelArea = PANEL_AREAS[panelType] ?? PANEL_AREAS[0];
  const battenSpacing = BATTEN_SPACING[panelType] ?? BATTEN_SPACING[0];

  /* ─── common formulas ─── */
  const panels = Math.ceil(area * PANEL_RESERVE / panelArea);
  const perim = Math.sqrt(area) * 4;

  /* ─── mount-specific ─── */
  let glueBottles = 0;
  let primer = 0;
  let battenRows = 0;
  let wallLength = 0;
  let battenM = 0;
  let battenPcs = 0;
  let dubels = 0;
  let klaimers = 0;

  if (mountMethod === 0) {
    /* glue */
    glueBottles = Math.ceil(area / GLUE_COVERAGE);
    primer = Math.ceil(area * PRIMER_L_PER_M2 * PRIMER_RESERVE / PRIMER_CAN);
  } else {
    /* batten frame */
    battenRows = Math.ceil(height / battenSpacing) + 1;
    wallLength = area / height;
    battenM = battenRows * wallLength * BATTEN_RESERVE;
    battenPcs = Math.ceil(battenM / BATTEN_LENGTH);
    dubels = Math.ceil(battenM / DUBEL_STEP);
    klaimers = Math.ceil(area * KLAYMER_PER_M2);
  }

  /* ─── all methods ─── */
  const molding = Math.ceil(perim * MOLDING_RESERVE / MOLDING_LENGTH);
  const sealant = Math.ceil(perim / SEALANT_PER_PERIM);

  /* ─── scenarios ─── */
  const packageOptions = [{
    size: 1,
    label: "wall-panel",
    unit: "шт",
  }];

  const scenarios = SCENARIOS.reduce((acc, scenario) => {
    const { multiplier, keyFactors } = combineScenarioFactors(factorTable, spec.field_factors.enabled, scenario);
    const exactNeed = roundDisplay(panels * multiplier, 6);
    const packaging = optimizePackaging(exactNeed, packageOptions);

    acc[scenario] = {
      exact_need: exactNeed,
      purchase_quantity: roundDisplay(packaging.purchaseQuantity, 6),
      leftover: roundDisplay(packaging.leftover, 6),
      assumptions: [
        `formula_version:${spec.formula_version}`,
        `panelType:${panelType}`,
        `mountMethod:${mountMethod}`,
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
      name: PANEL_TYPE_LABELS[panelType],
      quantity: roundDisplay(recScenario.exact_need, 6),
      unit: "шт",
      withReserve: Math.ceil(recScenario.exact_need),
      purchaseQty: Math.ceil(recScenario.exact_need),
      category: "Облицовка",
    },
  ];

  if (mountMethod === 0) {
    materials.push(
      {
        name: "Монтажный клей (флаконы)",
        quantity: glueBottles,
        unit: "шт",
        withReserve: glueBottles,
        purchaseQty: glueBottles,
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
    );
  } else {
    materials.push(
      {
        name: `Обрешётка (бруски ${BATTEN_LENGTH} м)`,
        quantity: battenPcs,
        unit: "шт",
        withReserve: battenPcs,
        purchaseQty: battenPcs,
        category: "Подсистема",
      },
      {
        name: "Дюбели для обрешётки",
        quantity: dubels,
        unit: "шт",
        withReserve: dubels,
        purchaseQty: dubels,
        category: "Крепёж",
      },
      {
        name: "Кляймеры",
        quantity: klaimers,
        unit: "шт",
        withReserve: klaimers,
        purchaseQty: klaimers,
        category: "Крепёж",
      },
    );
  }

  materials.push(
    {
      name: `Молдинги (${MOLDING_LENGTH} м)`,
      quantity: molding,
      unit: "шт",
      withReserve: molding,
      purchaseQty: molding,
      category: "Профиль",
    },
    {
      name: "Герметик (тубы)",
      quantity: sealant,
      unit: "шт",
      withReserve: sealant,
      purchaseQty: sealant,
      category: "Монтаж",
    },
  );

  /* ─── warnings ─── */
  const warnings: string[] = [];
  if (area > 100) {
    warnings.push("Большая площадь — рассмотрите оптовую закупку панелей");
  }
  if (panelType === 2 && mountMethod === 0) {
    warnings.push("3D-панели на клей — убедитесь в ровности основания");
  }

  const practicalNotes: string[] = [];
  practicalNotes.push("Обрешётку проверяйте уровнем в двух плоскостях — кривая обрешётка = кривые панели");

  return {
    canonicalSpecId: spec.calculator_id,
    formulaVersion: spec.formula_version,
    materials,
    totals: {
      area,
      panelType,
      mountMethod,
      height,
      panelArea,
      battenSpacing,
      panels,
      perim: roundDisplay(perim, 4),
      glueBottles,
      primer,
      battenRows,
      wallLength: roundDisplay(wallLength, 4),
      battenM: roundDisplay(battenM, 4),
      battenPcs,
      dubels,
      klaimers,
      molding,
      sealant,
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
