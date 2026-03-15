import { combineScenarioFactors, type FactorTable } from "./factors";
import { optimizePackaging } from "./packaging";
import { SCENARIOS, type ScenarioBundle } from "./scenarios";
import type {
  DecorStoneCanonicalSpec,
  CanonicalCalculatorResult,
  CanonicalMaterialResult,
} from "./canonical";
import { roundDisplay } from "./units";

/* ─── constants ─── */

const STONE_RESERVE = 1.10;
const GLUE_KG_PER_M2: Record<number, number> = { 0: 3.0, 1: 5.0, 2: 7.0 };
const GLUE_RESERVE = 1.10;
const GLUE_BAG = 25;
const PRIMER_L_PER_M2 = 0.15;
const PRIMER_RESERVE = 1.10;
const PRIMER_CAN = 10;
const GROUT_BASE_FACTOR = 0.2;
const GROUT_RESERVE = 1.10;
const GROUT_BAG = 5;

/* ─── inputs ─── */

interface DecorStoneInputs {
  inputMode?: number;
  area?: number;
  wallWidth?: number;
  wallHeight?: number;
  stoneType?: number;
  jointWidth?: number;
  needGrout?: number;
  needPrimer?: number;
}

/* ─── helpers ─── */

function getInputDefault(spec: DecorStoneCanonicalSpec, key: string, fallback: number): number {
  return spec.input_schema.find((field) => field.key === key)?.default_value ?? fallback;
}

/* ─── main ─── */

export function computeCanonicalDecorStone(
  spec: DecorStoneCanonicalSpec,
  inputs: DecorStoneInputs,
  factorTable: FactorTable,
): CanonicalCalculatorResult {
  const inputMode = Math.max(0, Math.min(1, Math.round(inputs.inputMode ?? getInputDefault(spec, "inputMode", 0))));
  const areaInput = Math.max(1, Math.min(500, inputs.area ?? getInputDefault(spec, "area", 15)));
  const wallWidth = Math.max(0.5, Math.min(30, inputs.wallWidth ?? getInputDefault(spec, "wallWidth", 4)));
  const wallHeight = Math.max(0.5, Math.min(10, inputs.wallHeight ?? getInputDefault(spec, "wallHeight", 2.7)));
  const stoneType = Math.max(0, Math.min(2, Math.round(inputs.stoneType ?? getInputDefault(spec, "stoneType", 0))));
  const jointWidth = Math.max(0, Math.min(20, inputs.jointWidth ?? getInputDefault(spec, "jointWidth", 10)));
  const needGrout = Math.round(inputs.needGrout ?? getInputDefault(spec, "needGrout", 1)) === 1 ? 1 : 0;
  const needPrimer = Math.round(inputs.needPrimer ?? getInputDefault(spec, "needPrimer", 1)) === 1 ? 1 : 0;

  /* ─── area ─── */
  const area = inputMode === 1 ? roundDisplay(wallWidth * wallHeight, 3) : areaInput;

  /* ─── stone ─── */
  const stoneM2 = area * STONE_RESERVE;

  /* ─── glue ─── */
  const glueRate = GLUE_KG_PER_M2[stoneType] ?? GLUE_KG_PER_M2[0];
  const glueKg = area * glueRate * GLUE_RESERVE;
  const glueBags = Math.ceil(glueKg / GLUE_BAG);

  /* ─── grout (conditional) ─── */
  const groutKg = needGrout ? area * (jointWidth / 5) * GROUT_BASE_FACTOR * GROUT_RESERVE : 0;
  const groutBags = Math.ceil(groutKg / GROUT_BAG);

  /* ─── primer (conditional) ─── */
  const primerL = needPrimer ? area * PRIMER_L_PER_M2 * PRIMER_RESERVE : 0;
  const primerCans = Math.ceil(primerL / PRIMER_CAN);

  /* ─── scenarios ─── */
  const packageOptions = [{
    size: 1,
    label: "decor-stone-m2",
    unit: "м²",
  }];

  const scenarios = SCENARIOS.reduce((acc, scenario) => {
    const { multiplier, keyFactors } = combineScenarioFactors(factorTable, spec.field_factors.enabled, scenario);
    const exactNeed = roundDisplay(stoneM2 * multiplier, 6);
    const packaging = optimizePackaging(exactNeed, packageOptions);

    acc[scenario] = {
      exact_need: exactNeed,
      purchase_quantity: roundDisplay(packaging.purchaseQuantity, 6),
      leftover: roundDisplay(packaging.leftover, 6),
      assumptions: [
        `formula_version:${spec.formula_version}`,
        `inputMode:${inputMode}`,
        `stoneType:${stoneType}`,
        `jointWidth:${jointWidth}`,
        `needGrout:${needGrout}`,
        `needPrimer:${needPrimer}`,
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
  if (stoneType === 2) {
    warnings.push("Натуральный камень тяжёлый — убедитесь в несущей способности стены");
  }
  if (area > 50) {
    warnings.push("Большая площадь — рассмотрите оптовую закупку камня");
  }
  if (jointWidth === 0 && needGrout) {
    warnings.push("Шов 0 мм — затирка не требуется при бесшовной укладке");
  }

  /* ─── materials ─── */
  const materials: CanonicalMaterialResult[] = [
    {
      name: "Декоративный камень",
      quantity: roundDisplay(recScenario.exact_need, 3),
      unit: "м²",
      withReserve: roundDisplay(recScenario.exact_need, 3),
      purchaseQty: Math.ceil(recScenario.exact_need),
      category: "Облицовка",
    },
    {
      name: `Клей (${GLUE_BAG} кг)`,
      quantity: glueBags,
      unit: "мешков",
      withReserve: glueBags,
      purchaseQty: glueBags,
      category: "Монтаж",
    },
  ];

  if (needGrout && groutBags > 0) {
    materials.push({
      name: `Затирка (${GROUT_BAG} кг)`,
      quantity: groutBags,
      unit: "мешков",
      withReserve: groutBags,
      purchaseQty: groutBags,
      category: "Отделка",
    });
  }

  if (needPrimer && primerCans > 0) {
    materials.push({
      name: `Грунтовка (${PRIMER_CAN} л)`,
      quantity: primerCans,
      unit: "канистр",
      withReserve: primerCans,
      purchaseQty: primerCans,
      category: "Грунтовка",
    });
  }

  const practicalNotes: string[] = [];
  if (stoneType === 2) {
    practicalNotes.push("Натуральный камень тяжёлый — убедитесь что стена выдержит нагрузку");
  }
  practicalNotes.push("Клей наносите и на стену, и на камень — так называемый двойной промаз");

  return {
    canonicalSpecId: spec.calculator_id,
    formulaVersion: spec.formula_version,
    materials,
    totals: {
      area,
      inputMode,
      wallWidth: roundDisplay(wallWidth, 3),
      wallHeight: roundDisplay(wallHeight, 3),
      stoneType,
      jointWidth,
      needGrout,
      needPrimer,
      stoneM2: roundDisplay(stoneM2, 3),
      glueKg: roundDisplay(glueKg, 3),
      glueBags,
      groutKg: roundDisplay(groutKg, 3),
      groutBags,
      primerL: roundDisplay(primerL, 3),
      primerCans,
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
