import { combineScenarioFactors, type FactorTable } from "./factors";
import { optimizePackaging } from "./packaging";
import { SCENARIOS, type ScenarioBundle } from "./scenarios";
import type {
  FacadePanelsCanonicalSpec,
  CanonicalCalculatorResult,
  CanonicalMaterialResult,
} from "./canonical";
import { roundDisplay } from "./units";

/* ─── constants ─── */

const PANEL_AREAS: Record<number, number> = {
  0: 3.6,   // fibrocement
  1: 0.72,  // metal cassettes
  2: 2.928, // HPL
  3: 0.23,  // metal siding
};

const PANEL_RESERVE = 1.10;
const BRACKET_SPACING_M2 = 0.36; // 600×600
const BRACKET_RESERVE = 1.1;
const GUIDE_SPACING = 0.6;
const GUIDE_LENGTH = 3;
const GUIDE_RESERVE = 1.1;
const FASTENERS_PER_PANEL = 8;
const FASTENER_RESERVE = 1.05;
const ANCHOR_PER_BRACKET = 2;
const ANCHOR_RESERVE = 1.05;
const INSULATION_PLATE = 0.72;
const INSULATION_RESERVE = 1.05;
const INSULATION_DOWELS_PER_M2 = 6;
const WIND_MEMBRANE_ROLL = 50;
const MEMBRANE_RESERVE = 1.15;
const PRIMER_L_PER_M2 = 0.15;
const PRIMER_RESERVE = 1.15;
const PRIMER_CAN = 10;
const SEALANT_PER_PERIM = 10;

/* ─── labels ─── */

const PANEL_TYPE_LABELS: Record<number, string> = {
  0: "Фиброцементные панели (3.6 м²)",
  1: "Металлокассеты (0.72 м²)",
  2: "HPL-панели (2.928 м²)",
  3: "Металлический сайдинг (0.23 м²)",
};

const SUBSTRUCTURE_LABELS: Record<number, string> = {
  0: "Алюминиевая",
  1: "Оцинкованная",
  2: "Деревянная",
};

/* ─── inputs ─── */

interface FacadePanelsInputs {
  area?: number;
  panelType?: number;
  substructure?: number;
  insulationThickness?: number;
}

/* ─── helpers ─── */

function getInputDefault(spec: FacadePanelsCanonicalSpec, key: string, fallback: number): number {
  return spec.input_schema.find((field) => field.key === key)?.default_value ?? fallback;
}

/* ─── main ─── */

export function computeCanonicalFacadePanels(
  spec: FacadePanelsCanonicalSpec,
  inputs: FacadePanelsInputs,
  factorTable: FactorTable,
): CanonicalCalculatorResult {
  const area = Math.max(10, Math.min(2000, Math.round(inputs.area ?? getInputDefault(spec, "area", 100))));
  const panelType = Math.max(0, Math.min(3, Math.round(inputs.panelType ?? getInputDefault(spec, "panelType", 0))));
  const substructure = Math.max(0, Math.min(2, Math.round(inputs.substructure ?? getInputDefault(spec, "substructure", 0))));
  const insulationThickness = Math.max(0, Math.min(100, Math.round(inputs.insulationThickness ?? getInputDefault(spec, "insulationThickness", 0))));

  /* ─── panel area ─── */
  const panelArea = PANEL_AREAS[panelType] ?? PANEL_AREAS[0];

  /* ─── formulas ─── */
  const panels = Math.ceil(area * PANEL_RESERVE / panelArea);
  const brackets = Math.ceil(area / BRACKET_SPACING_M2 * BRACKET_RESERVE);
  const guides = Math.ceil(area / GUIDE_SPACING * GUIDE_RESERVE / GUIDE_LENGTH);
  const fasteners = Math.ceil(panels * FASTENERS_PER_PANEL * FASTENER_RESERVE);
  const anchors = Math.ceil(brackets * ANCHOR_PER_BRACKET * ANCHOR_RESERVE);
  const insPlates = insulationThickness > 0 ? Math.ceil(area * INSULATION_RESERVE / INSULATION_PLATE) : 0;
  const insDowels = insPlates > 0 ? Math.ceil(area * INSULATION_DOWELS_PER_M2 * INSULATION_RESERVE) : 0;
  const membrane = insPlates > 0 ? Math.ceil(area * MEMBRANE_RESERVE / WIND_MEMBRANE_ROLL) : 0;
  const primer = Math.ceil(area * PRIMER_L_PER_M2 * PRIMER_RESERVE / PRIMER_CAN);
  const sealant = Math.ceil(Math.sqrt(area) * 4 / SEALANT_PER_PERIM);

  /* ─── scenarios ─── */
  const packageOptions = [{
    size: 1,
    label: "facade-panel",
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
        `substructure:${substructure}`,
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
      name: PANEL_TYPE_LABELS[panelType],
      quantity: roundDisplay(recScenario.exact_need, 6),
      unit: "шт",
      withReserve: Math.ceil(recScenario.exact_need),
      purchaseQty: Math.ceil(recScenario.exact_need),
      category: "Облицовка",
    },
    {
      name: `Кронштейны (${SUBSTRUCTURE_LABELS[substructure]})`,
      quantity: brackets,
      unit: "шт",
      withReserve: brackets,
      purchaseQty: brackets,
      category: "Подсистема",
    },
    {
      name: `Направляющие (${GUIDE_LENGTH} м)`,
      quantity: guides,
      unit: "шт",
      withReserve: guides,
      purchaseQty: guides,
      category: "Подсистема",
    },
    {
      name: "Крепёж панелей",
      quantity: fasteners,
      unit: "шт",
      withReserve: fasteners,
      purchaseQty: fasteners,
      category: "Крепёж",
    },
    {
      name: "Анкеры для кронштейнов",
      quantity: anchors,
      unit: "шт",
      withReserve: anchors,
      purchaseQty: anchors,
      category: "Крепёж",
    },
  ];

  if (insPlates > 0) {
    materials.push(
      {
        name: "Утеплитель (плиты)",
        quantity: insPlates,
        unit: "шт",
        withReserve: insPlates,
        purchaseQty: insPlates,
        category: "Утепление",
      },
      {
        name: "Дюбели для утеплителя",
        quantity: insDowels,
        unit: "шт",
        withReserve: insDowels,
        purchaseQty: insDowels,
        category: "Крепёж",
      },
      {
        name: `Ветрозащитная мембрана (${WIND_MEMBRANE_ROLL} м²)`,
        quantity: membrane,
        unit: "рулонов",
        withReserve: membrane,
        purchaseQty: membrane,
        category: "Утепление",
      },
    );
  }

  materials.push(
    {
      name: `Грунтовка (канистра ${PRIMER_CAN} л)`,
      quantity: primer,
      unit: "канистр",
      withReserve: primer,
      purchaseQty: primer,
      category: "Грунтовка",
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
  if (area > 500) {
    warnings.push("Большая площадь фасада — рассмотрите оптовую закупку");
  }
  if (insulationThickness >= 100) {
    warnings.push("Толстый утеплитель — проверьте длину кронштейнов");
  }

  return {
    canonicalSpecId: spec.calculator_id,
    formulaVersion: spec.formula_version,
    materials,
    totals: {
      area,
      panelType,
      substructure,
      insulationThickness,
      panelArea,
      panels,
      brackets,
      guides,
      fasteners,
      anchors,
      insPlates,
      insDowels,
      membrane,
      primer,
      sealant,
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
