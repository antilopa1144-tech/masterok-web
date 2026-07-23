import { combineScenarioFactors, type FactorTable } from "./factors";
import { optimizePackaging } from "./packaging";
import { SCENARIOS, type ScenarioBundle } from "./scenarios";
import type {
  AeratedConcreteCanonicalSpec,
  CanonicalCalculatorResult,
  CanonicalMaterialResult,
} from "./canonical";
import { roundDisplay } from "./units";
import { type AccuracyMode, DEFAULT_ACCURACY_MODE, applyAccuracyMode, getPrimaryMultiplier } from "./accuracy";
import { getInputDefault } from "./spec-helpers";

interface AeratedConcreteInputs {
  inputMode?: number;
  wallWidth?: number;
  wallHeight?: number;
  area?: number;
  openingsArea?: number;
  blockThickness?: number;
  blockHeight?: number;
  blockLength?: number;
  accuracyMode?: AccuracyMode;
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
  const accuracyMode = inputs.accuracyMode ?? DEFAULT_ACCURACY_MODE;
  const accuracyMult = getPrimaryMultiplier("generic", accuracyMode);

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
  const blocksWithReserve = Math.ceil(blocksNet * spec.material_rules.block_reserve * accuracyMult);

  const volume = roundDisplay(netArea * (blockThickness / 1000), 6);

  const glueKg = roundDisplay(volume * spec.material_rules.glue_kg_per_m3, 3);
  const glueBags = Math.ceil(glueKg / spec.material_rules.glue_bag_kg);

  const rows = Math.ceil(areaInfo.wallHeight / (blockHeight / 1000));
  const rebarRows = Math.ceil(rows / spec.material_rules.rebar_armoring_interval);

  const estimatedWallLength = areaInfo.inputMode === 0
    ? areaInfo.wallWidth
    : netArea / areaInfo.wallHeight;
  const rebarLength = Math.ceil(estimatedWallLength * rebarRows * spec.material_rules.rebar_reserve);

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
    warnings.push("Блоки толщиной до 150 мм обычно применяют для ненесущих перегородок. Назначение стены подтверждают проектом");
  }
  if (blockThickness >= spec.warnings_rules.thermal_check_thickness_mm) {
    warnings.push("Для наружной стены проверьте сопротивление теплопередаче всей конструкции по СП 50.13330 — одной толщины блока недостаточно");
  }
  if (openingsArea > 0) {
    warnings.push("Площадь проёмов вычтена из блоков, но перемычки и U-блоки не посчитаны: нужны количество и ширина каждого проёма, опирание и проектная схема");
  }

  const materials: CanonicalMaterialResult[] = [
    {
      name: `Автоклавный газобетонный блок ${blockLength}×${blockHeight}×${blockThickness} мм`,
      subtitle: "Плотность, класс прочности и морозостойкость выбирайте по проекту и назначению стены.",
      quantity: roundDisplay(blocksNet, 3),
      unit: "шт",
      withReserve: blocksWithReserve,
      purchaseQty: Math.ceil(recScenario.exact_need),
      category: "Основное",
    },
    {
      name: `Клей для тонкошовной кладки газобетона, мешок ${spec.material_rules.glue_bag_kg} кг`,
      subtitle: "Расчёт для минерального клея и шва 2–3 мм. Первый ряд на выравнивающем растворе сюда не входит.",
      quantity: glueBags,
      unit: "мешков",
      withReserve: glueBags,
      purchaseQty: glueBags,
      category: "Кладка",
    },
    {
      name: "Арматура класса А500С Ø8 мм для штроб",
      subtitle: `Предварительный расход одной продольной линии через каждые ${spec.material_rules.rebar_armoring_interval} ряда. Число стержней, зоны усиления и диаметр задаёт проект или альбом решений производителя блоков.`,
      quantity: rebarLength,
      unit: "п.м",
      withReserve: rebarLength,
      purchaseQty: rebarLength,
      category: "Армирование",
    },
  ];

  const practicalNotes: string[] = [];
  if (blockThickness <= 150) {
    practicalNotes.push(`Блок ${blockThickness} мм обычно используют для перегородок; несущую способность нельзя определять только по толщине`);
  }
  practicalNotes.push("Перемычки, армопояс и усиление под окнами заказывайте только после проверки проекта или технического решения производителя");
  practicalNotes.push("Газобетон любит влагу — защитите кладку плёнкой в дождь и зимой");

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
      perimeter: roundDisplay(estimatedWallLength, 3),
      estimatedWallLength: roundDisplay(estimatedWallLength, 3),
      rebarLength: rebarLength,
      lintelsCalculated: 0,
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
