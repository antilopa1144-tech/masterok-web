import { combineScenarioFactors, type FactorTable } from "./factors";
import { optimizePackaging } from "./packaging";
import { SCENARIOS, type ScenarioBundle } from "./scenarios";
import { buildPrimerMaterial } from "./smart-packaging";
import type {
  DecorPlasterCanonicalSpec,
  CanonicalCalculatorResult,
  CanonicalMaterialResult,
} from "./canonical";
import { roundDisplay } from "./units";
import { type AccuracyMode, DEFAULT_ACCURACY_MODE, applyAccuracyMode, getPrimaryMultiplier, getAccessoriesMultiplier } from "./accuracy";

/* ─── constants ─── */

const CONSUMPTION_KG_PER_M2: Record<number, number> = {
  0: 2.5,  // korod 2mm
  1: 3.5,  // korod 3mm
  2: 3.0,  // pebble
  3: 4.0,  // shuba
  4: 1.2,  // venetian
};

const PLASTER_RESERVE = 1.05;
const PRIMER_DEEP_L_PER_M2 = 0.2;
const PRIMER_DEEP_RESERVE = 1.15;
const PRIMER_CAN = 10;
const TINTED_PRIMER_L_PER_M2 = 0.15;
const TINTED_CAN = 5;
const PIGMENT_PER_25KG = 1;
const WAX_L_PER_M2 = 0.1; // venetian only
const WAX_CAN = 1;

/* ─── labels ─── */

const TEXTURE_LABELS: Record<number, string> = {
  0: "Короед 2 мм",
  1: "Короед 3 мм",
  2: "Камешковая",
  3: "Шуба",
  4: "Венецианская",
};

const SURFACE_LABELS: Record<number, string> = {
  0: "Фасад",
  1: "Интерьер",
};

/* ─── inputs ─── */

interface DecorPlasterInputs {
  area?: number;
  texture?: number;
  surface?: number;
  bagWeight?: number;
  accuracyMode?: AccuracyMode;
}

/* ─── helpers ─── */

function getInputDefault(spec: DecorPlasterCanonicalSpec, key: string, fallback: number): number {
  return spec.input_schema.find((field) => field.key === key)?.default_value ?? fallback;
}

/* ─── main ─── */

export function computeCanonicalDecorPlaster(
  spec: DecorPlasterCanonicalSpec,
  inputs: DecorPlasterInputs,
  factorTable: FactorTable,
): CanonicalCalculatorResult {
  const accuracyMode = inputs.accuracyMode ?? DEFAULT_ACCURACY_MODE;

  const area = Math.max(1, Math.min(1000, Math.round(inputs.area ?? getInputDefault(spec, "area", 50))));
  const texture = Math.max(0, Math.min(4, Math.round(inputs.texture ?? getInputDefault(spec, "texture", 0))));
  const surface = Math.max(0, Math.min(1, Math.round(inputs.surface ?? getInputDefault(spec, "surface", 0))));
  const bagWeight = inputs.bagWeight === 15 ? 15 : 25;

  /* ─── consumption ─── */
  const consumption = CONSUMPTION_KG_PER_M2[texture] ?? CONSUMPTION_KG_PER_M2[0];

  /* ─── formulas ─── */
  const totalKg = area * consumption * PLASTER_RESERVE;
  const bagsRaw = Math.ceil(totalKg / bagWeight);
  const accuracyMult = getPrimaryMultiplier("plaster", accuracyMode);
  const bags = bagsRaw * accuracyMult;
  const primerCans = Math.ceil(area * PRIMER_DEEP_L_PER_M2 * PRIMER_DEEP_RESERVE / PRIMER_CAN);
  const tintedPrimer = Math.ceil(area * TINTED_PRIMER_L_PER_M2 / TINTED_CAN);
  const pigmentBanks = Math.ceil(totalKg / 25);
  const waxCans = texture === 4 ? Math.ceil(area * WAX_L_PER_M2 / WAX_CAN) : 0;

  /* ─── scenarios ─── */
  const packageOptions = [{
    size: 1,
    label: `decor-plaster-bag-${bagWeight}kg`,
    unit: "мешков",
  }];

  const scenarios = SCENARIOS.reduce((acc, scenario) => {
    const { multiplier, keyFactors } = combineScenarioFactors(factorTable, spec.field_factors.enabled, scenario);
    const exactNeed = roundDisplay(bags * multiplier, 6);
    const packaging = optimizePackaging(exactNeed, packageOptions);

    acc[scenario] = {
      exact_need: exactNeed,
      purchase_quantity: roundDisplay(packaging.purchaseQuantity, 6),
      leftover: roundDisplay(packaging.leftover, 6),
      assumptions: [
        `formula_version:${spec.formula_version}`,
        `texture:${texture}`,
        `surface:${surface}`,
        `bagWeight:${bagWeight}`,
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
      name: `${TEXTURE_LABELS[texture]} (мешки ${bagWeight} кг)`,
      quantity: roundDisplay(recScenario.exact_need, 6),
      unit: "мешков",
      withReserve: Math.ceil(recScenario.exact_need),
      purchaseQty: Math.ceil(recScenario.exact_need),
      category: "Штукатурка",
    },
    buildPrimerMaterial(area * PRIMER_DEEP_L_PER_M2, { reserveFactor: PRIMER_DEEP_RESERVE, category: "Грунтовка" }),
    {
      name: `Тонированная грунтовка (${TINTED_CAN} л)`,
      quantity: tintedPrimer,
      unit: "канистр",
      withReserve: tintedPrimer,
      purchaseQty: tintedPrimer,
      category: "Грунтовка",
    },
    {
      name: "Пигмент / колер (банки)",
      quantity: pigmentBanks,
      unit: "шт",
      withReserve: pigmentBanks,
      purchaseQty: pigmentBanks,
      category: "Отделка",
    },
  ];

  if (waxCans > 0) {
    materials.push({
      name: `Воск для венецианской штукатурки (${WAX_CAN} л)`,
      quantity: waxCans,
      unit: "банок",
      withReserve: waxCans,
      purchaseQty: waxCans,
      category: "Отделка",
    });
  }

  /* ─── warnings ─── */
  const warnings: string[] = [];
  if (area > 200) {
    warnings.push("Большая площадь — рассмотрите оптовую закупку");
  }
  if (texture === 4 && surface === 0) {
    warnings.push("Венецианская штукатурка на фасаде — требуется защитный лак");
  }

  const practicalNotes: string[] = [];
  practicalNotes.push("Декоративная штукатурка наносится только на подготовленную поверхность — грунт + шпаклёвка обязательны");

  return {
    canonicalSpecId: spec.calculator_id,
    formulaVersion: spec.formula_version,
    materials,
    totals: {
      area,
      texture,
      surface,
      bagWeight,
      consumption,
      totalKg: roundDisplay(totalKg, 4),
      bags,
      primerCans,
      tintedPrimer,
      pigmentBanks,
      waxCans,
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
    accuracyExplanation: applyAccuracyMode(bagsRaw, "plaster", accuracyMode).explanation,
  };
}
