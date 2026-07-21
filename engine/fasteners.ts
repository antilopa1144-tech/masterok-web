import { combineScenarioFactors, type FactorTable } from "./factors";
import { optimizePackaging } from "./packaging";
import { SCENARIOS, type ScenarioBundle } from "./scenarios";
import type {
  FastenersCanonicalSpec,
  CanonicalCalculatorResult,
  CanonicalMaterialResult,
} from "./canonical";
import { roundDisplay } from "./units";
import {
  type AccuracyMode,
  DEFAULT_ACCURACY_MODE,
  applyAccuracyMode,
  getPrimaryMultiplier,
  getAccessoriesMultiplier,
} from "./accuracy";
import { getInputDefault } from "./spec-helpers";

/* ─── constants ─── */

const SCREWS_PER_UNIT: Record<number, number> = {
  0: 24,  // GKL
  1: 28,  // OSB
  2: 8,   // corrugated metal
  3: 20,  // wood paneling
};

const BASE_STEP: Record<number, number> = {
  0: 250,  // mm
  1: 200,
  2: 200,
  3: 200,
};

const FASTENER_SPECS: Record<number, { name: string; subtitle: string }> = {
  0: {
    name: "Чёрные саморезы для гипсокартона по металлу 3,5×25 мм, под крестовую биту PH2",
    subtitle: "Фосфатированные, с мелкой резьбой — для крепления одного слоя гипсокартона к металлическому профилю",
  },
  1: {
    name: "Саморезы по дереву 3,5×35 мм, под крестовую биту PH2",
    subtitle: "Для крепления ориентированно-стружечной плиты (ОСП) или фанеры к деревянному каркасу; для металла нужен другой саморез",
  },
  2: {
    name: "Кровельные саморезы 4,8×35 мм с уплотнительной шайбой из EPDM-резины",
    subtitle: "Для крепления профлиста к деревянной обрешётке; цвет покрытия подберите по листу",
  },
  3: {
    name: "Кляймеры для вагонки №3–№5",
    subtitle: "Точный номер выбирают по толщине задней стенки паза конкретной вагонки",
  },
};

const PER_KG: Record<number, number> = {
  0: 1000,
  1: 600,
  2: 250,
  3: 0,
};

const UNIT_AREA: Record<number, number> = {
  0: 3.0,    // m²
  1: 3.125,
  2: 1,
  3: 1,
};

const SCREW_RESERVE = 1.05;
const KLAYMER_MULTIPLIER = 1.5;
const FRAME_SCREWS_PER_UNIT = 4;
const FRAME_SCREW_RESERVE = 1.05;
const DUBEL_STEP = 0.5;
const DUBEL_RESERVE = 1.05;
const BITS_PER_SCREWS = 500;

/* ─── inputs ─── */

interface FastenersInputs {
  materialType?: number;
  sheetCount?: number;
  fastenerStep?: number;
  withFrameScrews?: number;
  withDubels?: number;
  accuracyMode?: AccuracyMode;
}

/* ─── helpers ─── */

/* ─── main ─── */

export function computeCanonicalFasteners(
  spec: FastenersCanonicalSpec,
  inputs: FastenersInputs,
  factorTable: FactorTable,
): CanonicalCalculatorResult {
  const accuracyMode = inputs.accuracyMode ?? DEFAULT_ACCURACY_MODE;
  const materialType = Math.max(0, Math.min(3, Math.round(inputs.materialType ?? getInputDefault(spec, "materialType", 0))));
  const sheetCount = Math.max(1, Math.min(200, Math.round(inputs.sheetCount ?? getInputDefault(spec, "sheetCount", 10))));
  const fastenerStep = Math.max(150, Math.min(300, Math.round(inputs.fastenerStep ?? getInputDefault(spec, "fastenerStep", 200))));
  const withFrameScrews = Math.round(inputs.withFrameScrews ?? getInputDefault(spec, "withFrameScrews", 0)) === 1 ? 1 : 0;
  const withDubels = Math.round(inputs.withDubels ?? getInputDefault(spec, "withDubels", 0)) === 1 ? 1 : 0;

  /* ─── formulas ─── */
  const primaryMult = getPrimaryMultiplier("fasteners", accuracyMode);
  const accessoriesMult = getAccessoriesMultiplier("fasteners", accuracyMode);
  const baseStep = BASE_STEP[materialType] ?? BASE_STEP[0];
  const stepCoeff = baseStep / fastenerStep;
  const baseScrews = SCREWS_PER_UNIT[materialType] ?? SCREWS_PER_UNIT[0];
  const screwsPerUnit = Math.ceil(baseScrews * stepCoeff);
  let totalScrews = Math.ceil(sheetCount * screwsPerUnit * SCREW_RESERVE * primaryMult);

  // For paneling: klaimers
  const klaimers = materialType === 3 ? Math.ceil(totalScrews * KLAYMER_MULTIPLIER) : 0;
  if (materialType === 3) {
    totalScrews = klaimers;
  }

  // Frame screws
  const frameScrews = withFrameScrews === 1
    ? Math.ceil(sheetCount * FRAME_SCREWS_PER_UNIT * FRAME_SCREW_RESERVE)
    : 0;

  // Dubels
  const dubels = withDubels === 1
    ? Math.ceil(sheetCount * 2 / DUBEL_STEP * DUBEL_RESERVE)
    : 0;

  // Bits (accessories-driven)
  const bits = Math.ceil(totalScrews / BITS_PER_SCREWS * accessoriesMult);

  /* ─── scenarios ─── */
  const packageOptions = [{
    size: 1,
    label: "fastener-unit",
    unit: "шт",
  }];

  const scenarios = SCENARIOS.reduce((acc, scenario) => {
    const { multiplier, keyFactors } = combineScenarioFactors(factorTable, spec.field_factors.enabled, scenario);
    const exactNeed = roundDisplay(totalScrews * multiplier, 6);
    const packaging = optimizePackaging(exactNeed, packageOptions);

    acc[scenario] = {
      exact_need: exactNeed,
      purchase_quantity: roundDisplay(packaging.purchaseQuantity, 6),
      leftover: roundDisplay(packaging.leftover, 6),
      assumptions: [
        `formula_version:${spec.formula_version}`,
        `materialType:${materialType}`,
        `fastenerStep:${fastenerStep}`,
        `accuracy_mode:${accuracyMode}`,
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
  const perKg = PER_KG[materialType] ?? 0;
  const useKg = perKg > 0;
  const fastenerSpec = FASTENER_SPECS[materialType] ?? FASTENER_SPECS[0]!;

  const screwQtyKg = useKg ? Math.ceil(recScenario.exact_need / perKg * 10) / 10 : 0;

  const materials: CanonicalMaterialResult[] = [
    {
      name: fastenerSpec.name,
      subtitle: `${fastenerSpec.subtitle}; расчётная потребность — около ${Math.ceil(recScenario.exact_need)} шт.`,
      quantity: useKg ? screwQtyKg : roundDisplay(recScenario.exact_need, 6),
      unit: useKg ? "кг" : "шт",
      withReserve: useKg ? screwQtyKg : Math.ceil(recScenario.exact_need),
      purchaseQty: useKg ? Math.ceil(screwQtyKg) : Math.ceil(recScenario.exact_need),
      category: "Крепёж",
    },
  ];

  if (frameScrews > 0) {
    const frameScrewsKg = Math.ceil(frameScrews / (PER_KG[0] ?? 1000) * 10) / 10;
    materials.push({
      name: "Саморезы-клопы по металлу 3,5×9,5 мм, под крестовую биту PH2",
      subtitle: `Для соединения металлических профилей — около ${frameScrews} шт.; не использовать для крепления лицевого листа`,
      quantity: frameScrewsKg,
      unit: "кг",
      withReserve: frameScrewsKg,
      purchaseQty: Math.ceil(frameScrewsKg),
      category: "Крепёж",
    });
  }

  if (dubels > 0) {
    materials.push({
      name: "Дюбель-гвозди 6×40 мм",
      subtitle: `Для направляющего профиля по бетону или полнотелому кирпичу — около ${dubels} шт.; для газобетона и пустотелого кирпича нужен специальный крепёж`,
      quantity: dubels,
      unit: "шт",
      withReserve: dubels,
      purchaseQty: dubels,
      category: "Крепёж",
    });
  }

  const driverName = materialType === 2
    ? "Магнитная торцевая насадка 8 мм"
    : materialType === 3
      ? "Крестовая бита PH2 для крепежа кляймеров"
      : "Крестовая бита PH2 для шуруповёрта";
  materials.push({
    name: driverName,
    subtitle: materialType === 3
      ? "Нужна только при фиксации кляймеров саморезами; при монтаже гвоздями используйте рекомендованный производителем крепёж"
      : `Ориентир — одна рабочая насадка примерно на ${BITS_PER_SCREWS} точек крепления`,
    quantity: bits,
    unit: "шт",
    withReserve: bits,
    purchaseQty: bits,
    category: "Инструмент",
  });

  /* ─── warnings ─── */
  const warnings: string[] = [];
  if (sheetCount > 100) {
    warnings.push("Большой объём — рассмотрите оптовую упаковку");
  }
  if (materialType === 3) {
    warnings.push("Для вагонки используются кляймеры вместо саморезов");
  }


  const practicalNotes: string[] = [];
  practicalNotes.push("Саморезы для гипсокартона — фосфатированные (чёрные). Оцинкованные предназначены для дерева, не путайте");

  return {
    canonicalSpecId: spec.calculator_id,
    formulaVersion: spec.formula_version,
    materials,
    totals: {
      materialType,
      sheetCount,
      fastenerStep,
      withFrameScrews,
      withDubels,
      stepCoeff: roundDisplay(stepCoeff, 3),
      screwsPerUnit,
      totalScrews,
      klaimers,
      frameScrews,
      dubels,
      bits,
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
    accuracyExplanation: applyAccuracyMode(totalScrews / primaryMult, "fasteners", accuracyMode).explanation,
  };
}
