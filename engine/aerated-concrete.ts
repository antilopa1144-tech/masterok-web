import { combineScenarioFactors, type FactorTable } from "./factors";
import { optimizePackaging } from "./packaging";
import { SCENARIOS, type ScenarioBundle } from "./scenarios";
import type {
  AeratedConcreteCanonicalSpec,
  CanonicalCalculatorResult,
  CanonicalMaterialResult,
} from "./canonical";
import { roundDisplay } from "./units";

interface AeratedConcreteInputs {
  inputMode?: number;
  wallWidth?: number;
  wallHeight?: number;
  area?: number;
  openingsArea?: number;
  blockThickness?: number;
  blockHeight?: number;
  blockLength?: number;
}

function getInputDefault(spec: AeratedConcreteCanonicalSpec, key: string, fallback: number): number {
  return spec.input_schema.find((field) => field.key === key)?.default_value ?? fallback;
}

function resolveArea(
  spec: AeratedConcreteCanonicalSpec,
  inputs: AeratedConcreteInputs,
): { inputMode: number; wallArea: number; wallWidth: number; wallHeight: number } {
  const inputMode = Math.round(inputs.inputMode ?? getInputDefault(spec, "inputMode", 0));
  if (inputMode === 0) {
    const wallWidth = Math.max(1, inputs.wallWidth ?? getInputDefault(spec, "wallWidth", 10));
    const wallHeight = Math.max(1, inputs.wallHeight ?? getInputDefault(spec, "wallHeight", 2.7));
    return { inputMode: 0, wallArea: roundDisplay(wallWidth * wallHeight, 3), wallWidth, wallHeight };
  }
  const area = Math.max(1, inputs.area ?? getInputDefault(spec, "area", 27));
  const wallWidth = inputs.wallWidth ?? getInputDefault(spec, "wallWidth", 10);
  const wallHeight = inputs.wallHeight ?? getInputDefault(spec, "wallHeight", 2.7);
  return { inputMode: 1, wallArea: roundDisplay(area, 3), wallWidth, wallHeight };
}

const BLOCK_THICKNESS_OPTIONS = [100, 150, 200, 250, 300, 375, 400];
const BLOCK_HEIGHT_OPTIONS = [200, 250];
const BLOCK_LENGTH_OPTIONS = [600, 625];

function resolveBlockThickness(spec: AeratedConcreteCanonicalSpec, inputs: AeratedConcreteInputs): number {
  const raw = inputs.blockThickness ?? getInputDefault(spec, "blockThickness", 200);
  const closest = BLOCK_THICKNESS_OPTIONS.reduce((prev, curr) =>
    Math.abs(curr - raw) < Math.abs(prev - raw) ? curr : prev,
  );
  return closest;
}

function resolveBlockHeight(spec: AeratedConcreteCanonicalSpec, inputs: AeratedConcreteInputs): number {
  const raw = inputs.blockHeight ?? getInputDefault(spec, "blockHeight", 200);
  const closest = BLOCK_HEIGHT_OPTIONS.reduce((prev, curr) =>
    Math.abs(curr - raw) < Math.abs(prev - raw) ? curr : prev,
  );
  return closest;
}

function resolveBlockLength(spec: AeratedConcreteCanonicalSpec, inputs: AeratedConcreteInputs): number {
  const raw = inputs.blockLength ?? getInputDefault(spec, "blockLength", 600);
  const closest = BLOCK_LENGTH_OPTIONS.reduce((prev, curr) =>
    Math.abs(curr - raw) < Math.abs(prev - raw) ? curr : prev,
  );
  return closest;
}

export function computeCanonicalAeratedConcrete(
  spec: AeratedConcreteCanonicalSpec,
  inputs: AeratedConcreteInputs,
  factorTable: FactorTable,
): CanonicalCalculatorResult {
  const areaInfo = resolveArea(spec, inputs);
  const openingsArea = Math.max(0, inputs.openingsArea ?? getInputDefault(spec, "openingsArea", 5));
  const blockThickness = resolveBlockThickness(spec, inputs);
  const blockHeight = resolveBlockHeight(spec, inputs);
  const blockLength = resolveBlockLength(spec, inputs);

  const wallArea = areaInfo.wallArea;
  const netArea = Math.max(0, wallArea - openingsArea);

  const blockFaceArea = (blockHeight / 1000) * (blockLength / 1000);
  const blocksPerSqm = 1 / blockFaceArea;
  const blocksNet = netArea * blocksPerSqm;
  const blocksWithReserve = Math.ceil(blocksNet * spec.material_rules.block_reserve);

  const volume = roundDisplay(netArea * (blockThickness / 1000), 6);

  const glueKg = roundDisplay(volume * spec.material_rules.glue_kg_per_m3, 3);
  const glueBags = Math.ceil(glueKg / spec.material_rules.glue_bag_kg);

  const rows = Math.ceil(areaInfo.wallHeight / (blockHeight / 1000));
  const rebarRows = Math.ceil(rows / spec.material_rules.rebar_armoring_interval);

  const perimeter = areaInfo.inputMode === 0
    ? areaInfo.wallWidth
    : Math.sqrt(netArea) * 2;
  const rebarLength = Math.ceil(perimeter * rebarRows * spec.material_rules.rebar_reserve);

  const primerCans = Math.ceil(
    netArea * spec.material_rules.primer_l_per_m2 * spec.material_rules.primer_reserve / spec.material_rules.primer_can_l,
  );

  const openingsCount = Math.ceil(openingsArea / 2);
  const uBlocks = Math.ceil(openingsCount * 2 * spec.material_rules.rebar_reserve);

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
        `blockThickness:${blockThickness}`,
        `blockHeight:${blockHeight}`,
        `blockLength:${blockLength}`,
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
  if (blockThickness <= spec.warnings_rules.non_load_bearing_thickness_mm) {
    warnings.push("Толщина блока ≤150 мм — только для ненесущих перегородок");
  }
  if (blockThickness >= spec.warnings_rules.thermal_check_thickness_mm) {
    warnings.push("Толщина блока ≥300 мм — проверьте теплоизоляцию по СП 50.13330");
  }

  const cornerProfiles = Math.ceil(areaInfo.wallHeight / spec.material_rules.corner_profile_length_m) * spec.material_rules.corner_profile_count;

  const materials: CanonicalMaterialResult[] = [
    {
      name: `Газоблок ${blockLength}×${blockHeight}×${blockThickness} мм`,
      quantity: roundDisplay(blocksNet, 3),
      unit: "шт",
      withReserve: blocksWithReserve,
      purchaseQty: Math.ceil(recScenario.exact_need),
      category: "Основное",
    },
    {
      name: `Клей для газобетона (${spec.material_rules.glue_bag_kg} кг)`,
      quantity: glueBags,
      unit: "мешков",
      withReserve: glueBags,
      purchaseQty: glueBags,
      category: "Кладка",
    },
    {
      name: "Арматура Ø8",
      quantity: rebarLength,
      unit: "п.м",
      withReserve: rebarLength,
      purchaseQty: rebarLength,
      category: "Армирование",
    },
    {
      name: `Грунтовка (${spec.material_rules.primer_can_l} л)`,
      quantity: primerCans,
      unit: "канистр",
      withReserve: primerCans,
      purchaseQty: primerCans,
      category: "Отделка",
    },
    {
      name: "U-блоки (перемычки)",
      quantity: uBlocks,
      unit: "шт",
      withReserve: uBlocks,
      purchaseQty: uBlocks,
      category: "Проёмы",
    },
    {
      name: "Угловые профили",
      quantity: cornerProfiles,
      unit: "шт",
      withReserve: cornerProfiles,
      purchaseQty: cornerProfiles,
      category: "Проёмы",
    },
  ];

  return {
    canonicalSpecId: spec.calculator_id,
    formulaVersion: spec.formula_version,
    materials,
    totals: {
      inputMode: areaInfo.inputMode,
      wallWidth: roundDisplay(areaInfo.wallWidth, 3),
      wallHeight: roundDisplay(areaInfo.wallHeight, 3),
      wallArea: roundDisplay(wallArea, 3),
      openingsArea: roundDisplay(openingsArea, 3),
      netArea: roundDisplay(netArea, 3),
      blockThickness: blockThickness,
      blockHeight: blockHeight,
      blockLength: blockLength,
      blockFaceArea: roundDisplay(blockFaceArea, 6),
      blocksPerSqm: roundDisplay(blocksPerSqm, 3),
      blocksNet: roundDisplay(blocksNet, 3),
      blocksWithReserve: blocksWithReserve,
      volume: volume,
      glueKg: glueKg,
      glueBags: glueBags,
      rows: rows,
      rebarRows: rebarRows,
      perimeter: roundDisplay(perimeter, 3),
      rebarLength: rebarLength,
      primerCans: primerCans,
      openingsCount: openingsCount,
      uBlocks: uBlocks,
      cornerProfiles: cornerProfiles,
      minExactNeedBlocks: scenarios.MIN.exact_need,
      recExactNeedBlocks: recScenario.exact_need,
      maxExactNeedBlocks: scenarios.MAX.exact_need,
      minPurchaseBlocks: scenarios.MIN.purchase_quantity,
      recPurchaseBlocks: recScenario.purchase_quantity,
      maxPurchaseBlocks: scenarios.MAX.purchase_quantity,
    },
    warnings,
    scenarios,
  };
}
