import { combineScenarioFactors, type FactorTable } from "./factors";
import { optimizePackaging } from "./packaging";
import { SCENARIOS, type ScenarioBundle } from "./scenarios";
import { buildPrimerMaterial } from "./smart-packaging";
import type {
  FoamBlocksCanonicalSpec,
  CanonicalCalculatorResult,
  CanonicalMaterialResult,
} from "./canonical";
import { roundDisplay } from "./units";
import { type AccuracyMode, DEFAULT_ACCURACY_MODE, applyAccuracyMode, getPrimaryMultiplier } from "./accuracy";
import { getInputDefault } from "./spec-helpers";

interface FoamBlocksInputs {
  inputMode?: number;
  wallLength?: number;
  wallHeight?: number;
  area?: number;
  openingsArea?: number;
  blockSize?: number;
  mortarType?: number;
  accuracyMode?: AccuracyMode;
}

function resolveArea(
  spec: FoamBlocksCanonicalSpec,
  inputs: FoamBlocksInputs,
): { inputMode: number; wallArea: number; wallLength: number; wallHeight: number } {
  const inputMode = Math.round(inputs.inputMode ?? getInputDefault(spec, "inputMode", 0));
  if (inputMode === 0) {
    const wallLength = Math.max(1, inputs.wallLength ?? getInputDefault(spec, "wallLength", 10));
    const wallHeight = Math.max(1, inputs.wallHeight ?? getInputDefault(spec, "wallHeight", 2.7));
    return { inputMode: 0, wallArea: roundDisplay(wallLength * wallHeight, 3), wallLength, wallHeight };
  }
  const area = Math.max(1, inputs.area ?? getInputDefault(spec, "area", 27));
  const wallLength = inputs.wallLength ?? getInputDefault(spec, "wallLength", 10);
  const wallHeight = inputs.wallHeight ?? getInputDefault(spec, "wallHeight", 2.7);
  return { inputMode: 1, wallArea: roundDisplay(area, 3), wallLength, wallHeight };
}

function resolveBlockSize(spec: FoamBlocksCanonicalSpec, inputs: FoamBlocksInputs): number {
  return Math.max(0, Math.min(3, Math.round(inputs.blockSize ?? getInputDefault(spec, "blockSize", 0))));
}

function resolveMortarType(spec: FoamBlocksCanonicalSpec, inputs: FoamBlocksInputs): number {
  return Math.max(0, Math.min(1, Math.round(inputs.mortarType ?? getInputDefault(spec, "mortarType", 0))));
}

export function computeCanonicalFoamBlocks(
  spec: FoamBlocksCanonicalSpec,
  inputs: FoamBlocksInputs,
  factorTable: FactorTable,
): CanonicalCalculatorResult {
  const accuracyMode = inputs.accuracyMode ?? DEFAULT_ACCURACY_MODE;
  const accuracyMult = getPrimaryMultiplier("generic", accuracyMode);

  const areaInfo = resolveArea(spec, inputs);
  const openingsArea = Math.max(0, inputs.openingsArea ?? getInputDefault(spec, "openingsArea", 5));
  const blockSize = resolveBlockSize(spec, inputs);
  const mortarType = resolveMortarType(spec, inputs);

  const blockDef = spec.normative_formula.block_sizes[String(blockSize)];
  const l = blockDef?.l ?? 600;
  const h = blockDef?.h ?? 300;
  const t = blockDef?.t ?? 200;
  const blockLabel = blockDef?.label ?? "Блок";

  const isKeramzit = blockSize >= 2;

  const wallArea = areaInfo.wallArea;
  const netArea = Math.max(0, wallArea - openingsArea);

  const blockFaceArea = (l / 1000) * (h / 1000);
  const blocksNet = netArea / blockFaceArea;
  const blocksWithReserve = Math.ceil(blocksNet * spec.material_rules.block_reserve * accuracyMult);

  const volume = roundDisplay(netArea * (t / 1000), 6);

  let mortarBags: number;
  let mortarLabel: string;
  let mortarUnit: string;
  if (mortarType === 0) {
    const glueKg = roundDisplay(volume * spec.material_rules.glue_kg_per_m3, 3);
    mortarBags = Math.ceil(glueKg / spec.material_rules.glue_bag_kg);
    mortarLabel = `Клей для кладки (${spec.material_rules.glue_bag_kg} кг)`;
    mortarUnit = "мешков";
  } else {
    const cpsM3 = roundDisplay(volume * spec.material_rules.cps_volume_per_m3, 6);
    const cpsKg = roundDisplay(cpsM3 * spec.material_rules.cps_kg_per_m3, 3);
    mortarBags = Math.ceil(cpsKg / spec.material_rules.cps_bag_kg);
    mortarLabel = `ЦПС (${spec.material_rules.cps_bag_kg} кг)`;
    mortarUnit = "мешков";
  }

  const rows = Math.ceil(areaInfo.wallHeight / (h / 1000));

  let meshArea = 0;
  let rebarLength = 0;
  let reinforcementMaterial: CanonicalMaterialResult;

  if (isKeramzit) {
    const meshRows = Math.ceil(rows / spec.material_rules.mesh_interval);
    meshArea = roundDisplay(areaInfo.wallLength * (t / 1000) * meshRows, 3);
    reinforcementMaterial = {
      name: "Кладочная сетка",
      quantity: roundDisplay(meshArea, 3),
      unit: "м²",
      withReserve: Math.ceil(meshArea),
      purchaseQty: Math.ceil(meshArea),
      category: "Армирование",
    };
  } else {
    const rebarRows = Math.ceil(rows / spec.material_rules.rebar_interval);
    rebarLength = Math.ceil(areaInfo.wallLength * rebarRows * 2 * spec.material_rules.rebar_reserve);
    reinforcementMaterial = {
      name: "Арматура Ø8",
      quantity: rebarLength,
      unit: "п.м",
      withReserve: rebarLength,
      purchaseQty: rebarLength,
      category: "Армирование",
    };
  }

  const openingsCount = Math.ceil(openingsArea / 2);
  const uBlocks = Math.ceil(openingsCount * 2 * spec.material_rules.rebar_reserve);

  const primerCans = Math.ceil(
    netArea * spec.material_rules.primer_l_per_m2 * spec.material_rules.primer_reserve / spec.material_rules.primer_can_l,
  );

  const packageOptions = [{
    size: spec.packaging_rules.package_size,
    label: `block-piece-${spec.packaging_rules.package_size}`,
    unit: spec.packaging_rules.unit,
  }];

  const scenarios = SCENARIOS.reduce((acc, scenario) => {
    const { multiplier, keyFactors } = combineScenarioFactors(factorTable, spec.field_factors.enabled, scenario);
    const exactNeed = roundDisplay(blocksWithReserve * multiplier, 6);
    const packaging = optimizePackaging(exactNeed, packageOptions);

    acc[scenario] = {
      exact_need: exactNeed,
      purchase_quantity: roundDisplay(packaging.purchaseQuantity, 6),
      leftover: roundDisplay(packaging.leftover, 6),
      assumptions: [
        `formula_version:${spec.formula_version}`,
        `blockSize:${blockSize}`,
        `mortarType:${mortarType}`,
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

  const warnings: string[] = [];
  if (t <= spec.warnings_rules.non_load_bearing_thickness_mm) {
    warnings.push("Толщина блока ≤100 мм — только для ненесущих перегородок");
  }
  if (isKeramzit) {
    warnings.push("Керамзитоблок при наружной кладке — требуется утепление от 100 мм");
  }
  if (mortarType === 1 && !isKeramzit) {
    warnings.push("Для пеноблоков рекомендуется клеевой раствор вместо ЦПС — более тонкий шов, лучшая теплоизоляция");
  }

  const materials: CanonicalMaterialResult[] = [
    {
      name: blockLabel,
      quantity: roundDisplay(blocksNet, 3),
      unit: "шт",
      withReserve: blocksWithReserve,
      purchaseQty: Math.ceil(recScenario.exact_need),
      category: "Основное",
    },
    {
      name: mortarLabel,
      quantity: mortarBags,
      unit: mortarUnit,
      withReserve: mortarBags,
      purchaseQty: mortarBags,
      category: "Кладка",
    },
    reinforcementMaterial,
    {
      name: "У-блоки (перемычки)",
      quantity: uBlocks,
      unit: "шт",
      withReserve: uBlocks,
      purchaseQty: uBlocks,
      category: "Проёмы",
    },
    buildPrimerMaterial(netArea * spec.material_rules.primer_l_per_m2, { reserveFactor: spec.material_rules.primer_reserve, category: "Отделка" }),
  ];

  const practicalNotes: string[] = [];
  if (t <= 100) {
    practicalNotes.push(`Толщина ${t} мм — только перегородки, для несущих стен минимум 200 мм`);
  }
  practicalNotes.push("Первый ряд — на раствор по уровню, остальное на клей. Первый ряд — самый важный");

  return {
    canonicalSpecId: spec.calculator_id,
    formulaVersion: spec.formula_version,
    materials,
    totals: {
      inputMode: areaInfo.inputMode,
      wallLength: roundDisplay(areaInfo.wallLength, 3),
      wallHeight: roundDisplay(areaInfo.wallHeight, 3),
      wallArea: roundDisplay(wallArea, 3),
      openingsArea: roundDisplay(openingsArea, 3),
      netArea: roundDisplay(netArea, 3),
      blockSize: blockSize,
      blockL: l,
      blockH: h,
      blockT: t,
      mortarType: mortarType,
      blockFaceArea: roundDisplay(blockFaceArea, 6),
      blocksNet: roundDisplay(blocksNet, 3),
      blocksWithReserve: blocksWithReserve,
      volume: volume,
      mortarBags: mortarBags,
      rows: rows,
      meshArea: roundDisplay(meshArea, 3),
      rebarLength: rebarLength,
      openingsCount: openingsCount,
      uBlocks: uBlocks,
      primerCans: primerCans,
      minExactNeedBlocks: scenarios.MIN.exact_need,
      recExactNeedBlocks: recScenario.exact_need,
      maxExactNeedBlocks: scenarios.MAX.exact_need,
      minPurchaseBlocks: scenarios.MIN.purchase_quantity,
      recPurchaseBlocks: recScenario.purchase_quantity,
      maxPurchaseBlocks: scenarios.MAX.purchase_quantity,
    },
    accuracyMode,
    accuracyExplanation: applyAccuracyMode(Math.ceil(blocksNet * spec.material_rules.block_reserve), "generic", accuracyMode).explanation,
    warnings,
    practicalNotes,
    scenarios,
  };
}
