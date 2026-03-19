import { combineScenarioFactors, type FactorTable } from "./factors";
import { optimizePackaging } from "./packaging";
import { SCENARIOS, type ScenarioBundle } from "./scenarios";
import type {
  AtticCanonicalSpec,
  CanonicalCalculatorResult,
  CanonicalMaterialResult,
} from "./canonical";
import { roundDisplay } from "./units";
import { type AccuracyMode, DEFAULT_ACCURACY_MODE, applyAccuracyMode, getPrimaryMultiplier } from "./accuracy";

/* ─── constants ─── */

const PLATE_THICKNESS: Record<number, number> = { 0: 100, 1: 150, 2: 100 };
const PLATE_AREA: Record<number, number> = { 0: 0.6, 1: 0.6, 2: 0.72 };
const WIND_MEMBRANE_ROLL = 70;
const VAPOR_ROLL = 70;
const TAPE_ROLL = 25;
const PLATE_RESERVE = 1.05;
const MEMBRANE_RESERVE = 1.15;
const TAPE_AREA_COEFF = 40;
const PANEL_AREA = 0.288;
const PANEL_RESERVE = 1.12;
const BATTEN_PITCH = 0.4;
const GKL_SHEET = 3.0;
const GKL_RESERVE = 1.1;
const PROFILE_STEP = 0.6;
const PUTTY_KG_PER_M2 = 0.5;
const PUTTY_BAG = 25;

/* ─── labels ─── */

const INSULATION_TYPE_LABELS: Record<number, string> = {
  0: "Минвата плиты",
  1: "Минвата рулоны",
  2: "ЭППС",
};

const FINISH_TYPE_LABELS: Record<number, string> = {
  0: "Деревянная вагонка",
  1: "ГКЛ",
  2: "Без отделки",
};

const VAPOUR_LABELS: Record<number, string> = {
  0: "Без пароизоляции",
  1: "Стандартная",
  2: "Армированная",
};

/* ─── inputs ─── */

interface AtticInputs {
  roofArea?: number;
  insulationThickness?: number;
  insulationType?: number;
  finishType?: number;
  withVapourBarrier?: number;
  accuracyMode?: AccuracyMode;
}

/* ─── helpers ─── */

function getInputDefault(spec: AtticCanonicalSpec, key: string, fallback: number): number {
  return spec.input_schema.find((field) => field.key === key)?.default_value ?? fallback;
}

/* ─── main ─── */

export function computeCanonicalAttic(
  spec: AtticCanonicalSpec,
  inputs: AtticInputs,
  factorTable: FactorTable,
): CanonicalCalculatorResult {
  const accuracyMode = inputs.accuracyMode ?? DEFAULT_ACCURACY_MODE;
  const accuracyMult = getPrimaryMultiplier("generic", accuracyMode);

  const roofArea = Math.max(10, Math.min(300, inputs.roofArea ?? getInputDefault(spec, "roofArea", 60)));
  const insulationThickness = Math.max(150, Math.min(250, inputs.insulationThickness ?? getInputDefault(spec, "insulationThickness", 200)));
  const insulationType = Math.max(0, Math.min(2, Math.round(inputs.insulationType ?? getInputDefault(spec, "insulationType", 0))));
  const finishType = Math.max(0, Math.min(2, Math.round(inputs.finishType ?? getInputDefault(spec, "finishType", 0))));
  const withVapourBarrier = Math.max(0, Math.min(2, Math.round(inputs.withVapourBarrier ?? getInputDefault(spec, "withVapourBarrier", 1))));

  /* ─── insulation ─── */
  const plateThickness = PLATE_THICKNESS[insulationType] ?? 100;
  const plateArea = PLATE_AREA[insulationType] ?? 0.6;
  const layerCount = Math.ceil(insulationThickness / plateThickness);
  const insPlates = Math.ceil(roofArea * PLATE_RESERVE / plateArea) * layerCount;
  const windRolls = Math.ceil(roofArea * MEMBRANE_RESERVE / WIND_MEMBRANE_ROLL);
  const vbRolls = withVapourBarrier > 0 ? Math.ceil(roofArea * MEMBRANE_RESERVE / VAPOR_ROLL) : 0;
  const tapeRolls = Math.ceil(roofArea / TAPE_AREA_COEFF);

  /* ─── finish: wood ─── */
  let panels = 0;
  let battenPcs = 0;
  let antisepticCans = 0;

  /* ─── finish: GKL ─── */
  let gklSheets = 0;
  let profilePcs = 0;
  let puttyBags = 0;

  if (finishType === 0) {
    panels = Math.ceil(roofArea * PANEL_RESERVE / PANEL_AREA);
    battenPcs = Math.ceil(roofArea / BATTEN_PITCH);
    antisepticCans = Math.ceil(roofArea * 0.15 * 1.1 / 5);
  } else if (finishType === 1) {
    gklSheets = Math.ceil(roofArea * GKL_RESERVE / GKL_SHEET);
    profilePcs = Math.ceil(roofArea / PROFILE_STEP / 3);
    puttyBags = Math.ceil(roofArea * PUTTY_KG_PER_M2 / PUTTY_BAG);
  }

  /* ─── scenarios ─── */
  const basePrimaryRaw = insPlates;
  const basePrimary = Math.ceil(basePrimaryRaw * accuracyMult);
  const packageOptions = [{
    size: 1,
    label: "insulation-plate",
    unit: "шт",
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
        `insulationThickness:${insulationThickness}`,
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
      name: `${INSULATION_TYPE_LABELS[insulationType]} (${insulationThickness} мм, ${layerCount} сл.)`,
      quantity: roundDisplay(recScenario.exact_need, 6),
      unit: "шт",
      withReserve: Math.ceil(recScenario.exact_need),
      purchaseQty: Math.ceil(recScenario.exact_need),
      category: "Утепление",
    },
    {
      name: "Ветрозащитная мембрана (70 м²)",
      quantity: windRolls,
      unit: "рулонов",
      withReserve: windRolls,
      purchaseQty: windRolls,
      category: "Мембраны",
    },
  ];

  if (withVapourBarrier > 0) {
    materials.push({
      name: `Пароизоляция ${VAPOUR_LABELS[withVapourBarrier]} (70 м²)`,
      quantity: vbRolls,
      unit: "рулонов",
      withReserve: vbRolls,
      purchaseQty: vbRolls,
      category: "Мембраны",
    });
  }

  materials.push({
    name: "Скотч соединительный (25 м)",
    quantity: tapeRolls,
    unit: "рулонов",
    withReserve: tapeRolls,
    purchaseQty: tapeRolls,
    category: "Расходные",
  });

  if (finishType === 0) {
    materials.push(
      {
        name: "Вагонка деревянная",
        quantity: panels,
        unit: "шт",
        withReserve: panels,
        purchaseQty: panels,
        category: "Отделка",
      },
      {
        name: "Обрешётка (рейки)",
        quantity: battenPcs,
        unit: "шт",
        withReserve: battenPcs,
        purchaseQty: battenPcs,
        category: "Каркас",
      },
      {
        name: "Антисептик (5 л)",
        quantity: antisepticCans,
        unit: "канистр",
        withReserve: antisepticCans,
        purchaseQty: antisepticCans,
        category: "Защита",
      },
    );
  } else if (finishType === 1) {
    materials.push(
      {
        name: "ГКЛ (3 м²)",
        quantity: gklSheets,
        unit: "листов",
        withReserve: gklSheets,
        purchaseQty: gklSheets,
        category: "Отделка",
      },
      {
        name: "Профиль направляющий",
        quantity: profilePcs,
        unit: "шт",
        withReserve: profilePcs,
        purchaseQty: profilePcs,
        category: "Каркас",
      },
      {
        name: "Шпаклёвка (25 кг)",
        quantity: puttyBags,
        unit: "мешков",
        withReserve: puttyBags,
        purchaseQty: puttyBags,
        category: "Отделка",
      },
    );
  }

  /* ─── warnings ─── */
  const warnings: string[] = [];
  if (insulationThickness < 200) {
    warnings.push("Толщина утеплителя менее 200 мм — рекомендуется увеличить для средней полосы России");
  }
  if (withVapourBarrier === 0) {
    warnings.push("Без пароизоляции утеплитель подвержен намоканию и потере свойств");
  }


  const practicalNotes: string[] = [];
  if (insulationThickness < 200) {
    practicalNotes.push(`Утеплитель ${insulationThickness} мм — для мансарды маловато, рекомендую минимум 200 мм`);
  }
  practicalNotes.push("Пароизоляция мансарды — со стороны помещения, не путайте с ветрозащитой");

  return {
    canonicalSpecId: spec.calculator_id,
    formulaVersion: spec.formula_version,
    materials,
    totals: {
      roofArea: roundDisplay(roofArea, 3),
      insulationThickness,
      insulationType,
      finishType,
      withVapourBarrier,
      layerCount,
      insPlates,
      windRolls,
      vbRolls,
      tapeRolls,
      panels,
      battenPcs,
      antisepticCans,
      gklSheets,
      profilePcs,
      puttyBags,
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
