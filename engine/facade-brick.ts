import { combineScenarioFactors, type FactorTable } from "./factors";
import { optimizePackaging } from "./packaging";
import { SCENARIOS, type ScenarioBundle } from "./scenarios";
import type {
  FacadeBrickCanonicalSpec,
  CanonicalCalculatorResult,
  CanonicalMaterialResult,
} from "./canonical";
import { roundDisplay } from "./units";
import { type AccuracyMode, DEFAULT_ACCURACY_MODE, applyAccuracyMode, getPrimaryMultiplier } from "./accuracy";
import { getInputDefault } from "./spec-helpers";

/* ─── constants ─── */

const BRICK_DIMS: Record<number, { l: number; h: number }> = {
  0: { l: 250, h: 65 },
  1: { l: 250, h: 88 },
  2: { l: 250, h: 138 },
  3: { l: 250, h: 65 },
};

const BRICK_RESERVE = 1.10;
const MASONRY_THICKNESS = 0.12; // 120mm, half-brick
const MORTAR_VOLUME_COEFF = 0.23; // m³ mortar per m³ masonry
const CEMENT_KG_PER_M3_MORTAR = 430;
const CEMENT_BAG_KG = 50;
const SAND_COEFF = 1.4;
const TIES_PER_SQM = 5;
const TIES_RESERVE = 1.05;
const HYDRO_COEFF = 0.3; // m height for hydro isolation at base
const HYDRO_RESERVE = 1.15;
const HYDRO_ROLL_M2 = 10;
const VENT_BOX_STEP_M = 2;
const GROUT_KG_PER_M2 = 0.35;
const GROUT_BAG_KG = 25;
const HYDROPHOB_L_PER_M2 = 0.2;
const HYDROPHOB_RESERVE = 1.1;
const HYDROPHOB_CAN_L = 5;

/* ─── labels ─── */

const BRICK_TYPE_LABELS: Record<number, string> = {
  0: "Кирпич облицовочный одинарный (65 мм)",
  1: "Кирпич облицовочный полуторный (88 мм)",
  2: "Кирпич облицовочный двойной (138 мм)",
  3: "Клинкерный кирпич (65 мм)",
};

const TIE_TYPE_LABELS: Record<number, string> = {
  1: "Связи стеклопластиковые",
  2: "Связи нержавеющие",
};

/* ─── inputs ─── */

interface FacadeBrickInputs {
  area?: number;
  brickType?: number;
  jointThickness?: number;
  withTie?: number;
  /** Количество оконных проёмов на фасаде. Над каждым требуется горизонтальная
   *  полоса гидроизоляции (СП 15.13330.2020). Если 0 — backward-compat. */
  windowCount?: number;
  /** Средняя ширина оконного проёма, м. Default 1.5 — типовое окно. */
  avgWindowWidth?: number;
  accuracyMode?: AccuracyMode;
}

/* ─── helpers ─── */

/* ─── main ─── */

export function computeCanonicalFacadeBrick(
  spec: FacadeBrickCanonicalSpec,
  inputs: FacadeBrickInputs,
  factorTable: FactorTable,
): CanonicalCalculatorResult {
  const accuracyMode = inputs.accuracyMode ?? DEFAULT_ACCURACY_MODE;
  const accuracyMult = getPrimaryMultiplier("generic", accuracyMode);

  const area = Math.max(5, Math.min(1000, inputs.area ?? getInputDefault(spec, "area", 80)));
  const brickType = Math.max(0, Math.min(3, Math.round(inputs.brickType ?? getInputDefault(spec, "brickType", 0))));
  const jointThickness = Math.max(8, Math.min(12, inputs.jointThickness ?? getInputDefault(spec, "jointThickness", 10)));
  const withTie = Math.max(0, Math.min(2, Math.round(inputs.withTie ?? getInputDefault(spec, "withTie", 0))));
  const windowCount = Math.max(0, Math.min(50, Math.round(inputs.windowCount ?? getInputDefault(spec, "windowCount", 0))));
  const avgWindowWidth = Math.max(0.5, Math.min(5, inputs.avgWindowWidth ?? getInputDefault(spec, "avgWindowWidth", 1.5)));

  /* ─── bricks ─── */
  const dim = BRICK_DIMS[brickType] ?? BRICK_DIMS[0];
  const jointMm = jointThickness;
  const l = (dim.l + jointMm) / 1000;
  const h = (dim.h + jointMm) / 1000;
  const bricksPerM2 = roundDisplay(1 / (l * h), 3);
  const totalBricks = roundDisplay(area * bricksPerM2, 3);
  const bricksWithReserve = Math.ceil(totalBricks * BRICK_RESERVE * accuracyMult);

  /* ─── mortar / cement / sand ─── */
  const masonryVolume = roundDisplay(area * MASONRY_THICKNESS, 6);
  const mortarVolume = roundDisplay(masonryVolume * MORTAR_VOLUME_COEFF, 6);
  const cementBags = Math.ceil(mortarVolume * CEMENT_KG_PER_M3_MORTAR / CEMENT_BAG_KG);
  const sandM3 = roundDisplay(Math.ceil(mortarVolume * SAND_COEFF * 10) / 10, 1);

  /* ─── ties ─── */
  const tiesCount = withTie > 0 ? Math.ceil(area * TIES_PER_SQM * TIES_RESERVE) : 0;

  /* ─── hydro isolation ─── */
  // Базовая полоса по цоколю — горизонтальная отсечка от грунтовой влаги.
  const perimeterEst = roundDisplay(Math.sqrt(area) * 4, 3);
  const baseHydroArea = perimeterEst * HYDRO_COEFF;

  // Дополнительная гидроизоляция над оконными проёмами (СП 15.13330.2020).
  // Каждое окно требует горизонтальной полосы поверх перемычки шириной
  // = ширина проёма + 2 × боковой запас, и высотой lintel_band_height_m.
  // Без неё дождь по швам кладки попадает в проём.
  const lintelBandHeight = spec.material_rules.lintel_band_height_m ?? 0.3;
  const lintelSideExt = spec.material_rules.lintel_band_side_extension_m ?? 0.3;
  const windowHydroArea = windowCount > 0
    ? windowCount * (avgWindowWidth + 2 * lintelSideExt) * lintelBandHeight
    : 0;

  const hydroArea = roundDisplay((baseHydroArea + windowHydroArea) * HYDRO_RESERVE, 3);
  const hydroRolls = Math.ceil(hydroArea / HYDRO_ROLL_M2);

  /* ─── vent boxes ─── */
  const ventBoxes = Math.ceil(perimeterEst / VENT_BOX_STEP_M);

  /* ─── grout ─── */
  const groutBags = Math.ceil(area * GROUT_KG_PER_M2 / GROUT_BAG_KG);

  /* ─── hydrophobizer ─── */
  const hydrophobCans = Math.ceil(area * HYDROPHOB_L_PER_M2 * HYDROPHOB_RESERVE / HYDROPHOB_CAN_L);

  /* ─── scenarios ─── */
  const packageOptions = [{
    size: 1,
    label: "facade-brick-piece",
    unit: "шт",
  }];

  const scenarios = SCENARIOS.reduce((acc, scenario) => {
    const { multiplier, keyFactors } = combineScenarioFactors(factorTable, spec.field_factors.enabled, scenario);
    const exactNeed = roundDisplay(bricksWithReserve * multiplier, 6);
    const packaging = optimizePackaging(exactNeed, packageOptions);

    acc[scenario] = {
      exact_need: exactNeed,
      purchase_quantity: roundDisplay(packaging.purchaseQuantity, 6),
      leftover: roundDisplay(packaging.leftover, 6),
      assumptions: [
        `formula_version:${spec.formula_version}`,
        `brickType:${brickType}`,
        `jointThickness:${jointThickness}`,
        `withTie:${withTie}`,
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
      name: BRICK_TYPE_LABELS[brickType] ?? "Кирпич облицовочный",
      quantity: roundDisplay(totalBricks, 3),
      unit: "шт",
      withReserve: bricksWithReserve,
      purchaseQty: Math.ceil(recScenario.exact_need),
      category: "Основное",
    },
    {
      name: `Цемент М400 (${CEMENT_BAG_KG} кг)`,
      quantity: cementBags,
      unit: "мешков",
      withReserve: cementBags,
      purchaseQty: cementBags,
      category: "Раствор",
    },
    {
      name: "Песок строительный",
      quantity: sandM3,
      unit: "м³",
      withReserve: sandM3,
      purchaseQty: Math.ceil(sandM3),
      category: "Раствор",
    },
  ];

  if (withTie > 0) {
    materials.push({
      name: TIE_TYPE_LABELS[withTie] ?? "Связи гибкие",
      quantity: tiesCount,
      unit: "шт",
      withReserve: tiesCount,
      purchaseQty: tiesCount,
      category: "Крепёж",
    });
  }

  materials.push(
    {
      name: "Гидроизоляция рулонная",
      quantity: roundDisplay(hydroArea, 3),
      unit: "м²",
      withReserve: hydroRolls * HYDRO_ROLL_M2,
      purchaseQty: hydroRolls * HYDRO_ROLL_M2,
      packageInfo: { count: hydroRolls, size: HYDRO_ROLL_M2, packageUnit: "рулонов" },
      category: "Изоляция",
    },
    {
      name: "Вентиляционные коробки",
      quantity: ventBoxes,
      unit: "шт",
      withReserve: ventBoxes,
      purchaseQty: ventBoxes,
      category: "Вентиляция",
    },
    {
      name: `Затирка для швов (${GROUT_BAG_KG} кг)`,
      quantity: groutBags,
      unit: "мешков",
      withReserve: groutBags,
      purchaseQty: groutBags,
      category: "Финишная",
    },
    {
      name: `Гидрофобизатор (${HYDROPHOB_CAN_L} л)`,
      quantity: hydrophobCans,
      unit: "канистр",
      withReserve: hydrophobCans,
      purchaseQty: hydrophobCans,
      category: "Защита",
    },
  );

  /* ─── warnings ─── */
  const warnings: string[] = [];
  if (brickType === 3 && jointThickness > 10) {
    warnings.push("Клинкерный кирпич обычно кладётся с швом 8–10 мм");
  }
  if (withTie === 0) {
    warnings.push("Облицовочная кладка должна иметь конструктивное крепление к основной стене (гибкие связи)");
  }
  if (windowCount === 0 && area > 30) {
    warnings.push(
      "На фасадах с окнами над каждой перемычкой нужна гидроизоляция (СП 15.13330.2020). " +
        "Укажите windowCount, чтобы расчёт учёл дополнительную полосу.",
    );
  }
  warnings.push("Необходим вентиляционный зазор 20–40 мм между облицовкой и несущей стеной (СП 15.13330)");

  const practicalNotes: string[] = [];
  if (withTie === 0) {
    practicalNotes.push("Без гибких связей облицовка со временем отойдёт от несущей стены");
  }
  if (windowCount > 0) {
    practicalNotes.push(
      `Гидроизоляция над ${windowCount} оконными проёмами добавлена (~${roundDisplay(windowHydroArea, 1)} м² поверх цоколя). ` +
        `Без неё вода по швам идёт в проём — ремонт откосов через 1-2 сезона.`,
    );
  }
  practicalNotes.push("Вентзазор 20-40 мм между облицовкой и стеной — иначе влага разрушит утеплитель");

  return {
    canonicalSpecId: spec.calculator_id,
    formulaVersion: spec.formula_version,
    materials,
    totals: {
      area: roundDisplay(area, 3),
      brickType,
      jointThickness,
      withTie,
      brickLengthM: roundDisplay(l, 4),
      brickHeightM: roundDisplay(h, 4),
      bricksPerM2,
      totalBricks,
      bricksWithReserve,
      masonryVolume,
      mortarVolume,
      cementBags,
      sandM3,
      tiesCount,
      perimeterEst,
      windowCount,
      avgWindowWidth: roundDisplay(avgWindowWidth, 3),
      windowHydroArea: roundDisplay(windowHydroArea, 3),
      hydroArea,
      hydroRolls,
      ventBoxes,
      groutBags,
      hydrophobCans,
      minExactNeedBricks: scenarios.MIN.exact_need,
      recExactNeedBricks: recScenario.exact_need,
      maxExactNeedBricks: scenarios.MAX.exact_need,
      minPurchaseBricks: scenarios.MIN.purchase_quantity,
      recPurchaseBricks: recScenario.purchase_quantity,
      maxPurchaseBricks: scenarios.MAX.purchase_quantity,
    },
    accuracyMode,
    accuracyExplanation: applyAccuracyMode(Math.ceil(totalBricks * BRICK_RESERVE), "generic", accuracyMode).explanation,
    warnings,
    practicalNotes,
    scenarios,
  };
}
