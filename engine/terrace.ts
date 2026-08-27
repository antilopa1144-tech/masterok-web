import { optimizePackaging } from "./packaging";
import { SCENARIOS, type ScenarioBundle } from "./scenarios";
import type { TerraceCanonicalSpec, CanonicalCalculatorResult, CanonicalMaterialResult } from "./canonical";
import { roundDisplay } from "./units";
import { type AccuracyMode, DEFAULT_ACCURACY_MODE, ACCURACY_MODE_LABELS } from "./accuracy";
import { getInputDefault } from "./spec-helpers";
import type { FactorTable } from "./factors";

const BOARD_TYPE_LABELS: Record<number, string> = {
  0: "Террасная доска из ДПК",
  1: "Террасная доска из лиственницы",
  2: "Террасная доска из сосны",
  3: "Планкен для настила",
};

const TREATMENT_LABELS: Record<number, string> = {
  1: "Масло для дерева",
  2: "Антисептик для дерева",
};

interface TerraceInputs {
  length?: number;
  width?: number;
  boardType?: number;
  boardLength?: number;
  boardWidthMm?: number;
  gapMm?: number;
  offcutReuseMode?: number;
  boardReservePercent?: number;
  lagStep?: number;
  lagLengthM?: number;
  lagReservePercent?: number;
  clipsPerIntersection?: number;
  starterClipsPerRow?: number;
  clipPackCount?: number;
  fastenersPerClip?: number;
  fastenerPackCount?: number;
  fastenerReservePercent?: number;
  withTreatment?: number;
  treatmentRateLPerM2PerLayer?: number;
  treatmentLayers?: number;
  treatmentCanL?: number;
  treatmentReservePercent?: number;
  withGeotextile?: number;
  geotextileRollM2?: number;
  geotextileReservePercent?: number;
  accuracyMode?: AccuracyMode;
}

const percentMultiplier = (percent: number) => 1 + percent / 100;

export function computeCanonicalTerrace(
  spec: TerraceCanonicalSpec,
  inputs: TerraceInputs,
  _factorTable: FactorTable,
): CanonicalCalculatorResult {
  const length = Math.max(1, Math.min(30, inputs.length ?? getInputDefault(spec, "length", 5)));
  const width = Math.max(1, Math.min(15, inputs.width ?? getInputDefault(spec, "width", 3)));
  const boardType = Math.max(0, Math.min(3, Math.round(inputs.boardType ?? getInputDefault(spec, "boardType", 0))));
  const boardLengthMm = Math.max(1000, Math.min(12000, inputs.boardLength ?? getInputDefault(spec, "boardLength", 3000)));
  const boardLengthM = boardLengthMm / 1000;
  const boardWidthMm = Math.max(70, Math.min(300, inputs.boardWidthMm ?? getInputDefault(spec, "boardWidthMm", 150)));
  const gapMm = Math.max(0, Math.min(20, inputs.gapMm ?? getInputDefault(spec, "gapMm", 5)));
  const offcutReuseMode = Math.round(inputs.offcutReuseMode ?? getInputDefault(spec, "offcutReuseMode", 0)) === 1 ? 1 : 0;
  const boardReservePercent = Math.max(0, inputs.boardReservePercent ?? getInputDefault(spec, "boardReservePercent", 10));
  const lagStepMm = Math.max(200, Math.min(1000, inputs.lagStep ?? getInputDefault(spec, "lagStep", 400)));
  const lagLengthM = Math.max(1, inputs.lagLengthM ?? getInputDefault(spec, "lagLengthM", 3));
  const lagReservePercent = Math.max(0, inputs.lagReservePercent ?? getInputDefault(spec, "lagReservePercent", 5));
  const clipsPerIntersection = Math.max(0, inputs.clipsPerIntersection ?? getInputDefault(spec, "clipsPerIntersection", 1));
  const starterClipsPerRow = Math.max(0, inputs.starterClipsPerRow ?? getInputDefault(spec, "starterClipsPerRow", 2));
  const clipPackCount = Math.max(1, Math.round(inputs.clipPackCount ?? getInputDefault(spec, "clipPackCount", 100)));
  const fastenersPerClip = Math.max(0, inputs.fastenersPerClip ?? getInputDefault(spec, "fastenersPerClip", 1));
  const fastenerPackCount = Math.max(1, Math.round(inputs.fastenerPackCount ?? getInputDefault(spec, "fastenerPackCount", 100)));
  const fastenerReservePercent = Math.max(0, inputs.fastenerReservePercent ?? getInputDefault(spec, "fastenerReservePercent", 5));
  const withTreatment = Math.max(0, Math.min(2, Math.round(inputs.withTreatment ?? getInputDefault(spec, "withTreatment", 0))));
  const treatmentRate = Math.max(0.01, inputs.treatmentRateLPerM2PerLayer ?? getInputDefault(spec, "treatmentRateLPerM2PerLayer", 0.1));
  const treatmentLayers = Math.max(1, Math.round(inputs.treatmentLayers ?? getInputDefault(spec, "treatmentLayers", 2)));
  const treatmentCanL = Math.max(0.5, inputs.treatmentCanL ?? getInputDefault(spec, "treatmentCanL", 2.5));
  const treatmentReservePercent = Math.max(0, inputs.treatmentReservePercent ?? getInputDefault(spec, "treatmentReservePercent", 10));
  const withGeotextile = Math.round(inputs.withGeotextile ?? getInputDefault(spec, "withGeotextile", 1)) === 1 ? 1 : 0;
  const geotextileRollM2 = Math.max(5, inputs.geotextileRollM2 ?? getInputDefault(spec, "geotextileRollM2", 50));
  const geotextileReservePercent = Math.max(0, inputs.geotextileReservePercent ?? getInputDefault(spec, "geotextileReservePercent", 5));
  const accuracyMode = inputs.accuracyMode ?? DEFAULT_ACCURACY_MODE;

  const area = length * width;
  const boardPitchM = (boardWidthMm + gapMm) / 1000;
  const rowCount = Math.ceil((width + gapMm / 1000) / boardPitchM);
  const boardsPerRow = Math.ceil(length / boardLengthM);
  const safeBaseBoards = rowCount * boardsPerRow;
  const sharedCutBaseBoards = rowCount * length / boardLengthM;
  const baseBoardExact = offcutReuseMode === 1 ? sharedCutBaseBoards : safeBaseBoards;
  const baseBoardPurchase = Math.ceil(baseBoardExact);
  const totalBoardLinearM = rowCount * length;
  const baseCutWasteM = Math.max(0, baseBoardPurchase * boardLengthM - totalBoardLinearM);
  const jointCount = Math.max(0, baseBoardPurchase - rowCount);

  const packageOptions = [{ size: 1, label: "terrace-board", unit: "шт" }];
  const scenarios = SCENARIOS.reduce((acc, scenario) => {
    const reservePercent = scenario === "MIN"
      ? 0
      : scenario === "MAX"
        ? boardReservePercent + spec.material_rules.max_extra_board_percent
        : boardReservePercent;
    const exactNeed = roundDisplay(baseBoardExact * percentMultiplier(reservePercent), 6);
    const packaging = optimizePackaging(exactNeed, packageOptions);
    acc[scenario] = {
      exact_need: exactNeed,
      purchase_quantity: packaging.purchaseQuantity,
      leftover: roundDisplay(packaging.leftover, 6),
      assumptions: [
        `formula_version:${spec.formula_version}`,
        `board_type:${boardType}`,
        `offcut_reuse_mode:${offcutReuseMode}`,
        "scenario_policy:explicit_board_reserve",
      ],
      key_factors: {
        field_multiplier: roundDisplay(percentMultiplier(reservePercent), 6),
        reserve_percent: roundDisplay(reservePercent, 3),
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
  const lagRowCount = Math.ceil(length / (lagStepMm / 1000)) + 1;
  const lagBaseM = lagRowCount * width;
  const lagWithReserveM = lagBaseM * percentMultiplier(lagReservePercent);
  const lagPcs = Math.ceil(lagWithReserveM / lagLengthM);
  const clipBaseCount = rowCount * lagRowCount * clipsPerIntersection + rowCount * starterClipsPerRow;
  const clipWithReserveCount = clipBaseCount * percentMultiplier(fastenerReservePercent);
  const clipPacks = Math.ceil(clipWithReserveCount / clipPackCount);
  const fastenerBaseCount = clipBaseCount * fastenersPerClip;
  const fastenerWithReserveCount = fastenerBaseCount * percentMultiplier(fastenerReservePercent);
  const fastenerPacks = Math.ceil(fastenerWithReserveCount / fastenerPackCount);
  const treatmentBaseL = withTreatment > 0 ? area * treatmentRate * treatmentLayers : 0;
  const treatmentWithReserveL = treatmentBaseL * percentMultiplier(treatmentReservePercent);
  const treatmentCans = treatmentWithReserveL > 0 ? Math.ceil(treatmentWithReserveL / treatmentCanL) : 0;
  const geotextileBaseM2 = withGeotextile === 1 ? area : 0;
  const geotextileWithReserveM2 = geotextileBaseM2 * percentMultiplier(geotextileReservePercent);
  const geotextileRolls = geotextileWithReserveM2 > 0 ? Math.ceil(geotextileWithReserveM2 / geotextileRollM2) : 0;

  const materials: CanonicalMaterialResult[] = [
    {
      name: `${BOARD_TYPE_LABELS[boardType]} ${roundDisplay(boardWidthMm, 0)}×${roundDisplay(boardLengthMm, 0)} мм`,
      subtitle: offcutReuseMode === 0
        ? `Безопасный раскрой: каждый из ${rowCount} рядов начинается целой доской; пригодные обрезки не переносятся между рядами`
        : `Оптимистичный раскрой: пригодные обрезки переносятся между рядами; подтвердите схему в инструменте раскладки`,
      quantity: roundDisplay(baseBoardExact, 6),
      unit: "шт",
      withReserve: recScenario.exact_need,
      purchaseQty: recScenario.purchase_quantity,
      category: "Доска",
      packageInfo: { count: recScenario.buy_plan.packages_count, size: 1, packageUnit: "досок" },
    },
    {
      name: `Лаги выбранной системы (${roundDisplay(lagLengthM, 2)} м)`,
      subtitle: `Шаг ${roundDisplay(lagStepMm, 0)} мм взят из формы; сечение, материал, двойные лаги у стыков и опоры сверяйте с паспортом системы`,
      quantity: roundDisplay(lagBaseM / lagLengthM, 6),
      unit: "шт",
      withReserve: roundDisplay(lagWithReserveM / lagLengthM, 6),
      purchaseQty: lagPcs,
      category: "Каркас",
    },
    {
      name: boardType === 0 ? "Монтажные клипсы выбранной системы ДПК" : "Скрытый крепёж выбранной системы",
      subtitle: `${roundDisplay(clipsPerIntersection, 2)} на пересечение и ${roundDisplay(starterClipsPerRow, 2)} стартовых/финишных на ряд`,
      quantity: roundDisplay(clipBaseCount, 6),
      unit: "шт",
      withReserve: roundDisplay(clipWithReserveCount, 6),
      purchaseQty: clipPacks * clipPackCount,
      category: "Крепёж",
      packageInfo: { count: clipPacks, size: clipPackCount, packageUnit: "упаковок" },
    },
    {
      name: "Саморезы для выбранных клипс и лаг",
      subtitle: "Материал, диаметр и длину крепежа выбирают по клипсе и материалу лаг; калькулятор считает только штуки и упаковки",
      quantity: roundDisplay(fastenerBaseCount, 6),
      unit: "шт",
      withReserve: roundDisplay(fastenerWithReserveCount, 6),
      purchaseQty: fastenerPacks * fastenerPackCount,
      category: "Крепёж",
      packageInfo: { count: fastenerPacks, size: fastenerPackCount, packageUnit: "упаковок" },
    },
  ];

  if (withGeotextile === 1) {
    materials.push({
      name: `Геотекстиль (${roundDisplay(geotextileRollM2, 2)} м²)`,
      quantity: roundDisplay(geotextileBaseM2, 6),
      unit: "м²",
      withReserve: roundDisplay(geotextileWithReserveM2, 6),
      purchaseQty: geotextileRolls * geotextileRollM2,
      category: "Подготовка",
      packageInfo: { count: geotextileRolls, size: geotextileRollM2, packageUnit: "рулонов" },
    });
  }

  if (withTreatment > 0) {
    materials.push({
      name: TREATMENT_LABELS[withTreatment],
      subtitle: `Расход ${roundDisplay(treatmentRate, 3)} л/м² на слой, ${treatmentLayers} сл.; значения перенесите с этикетки`,
      quantity: roundDisplay(treatmentBaseL, 6),
      unit: "л",
      withReserve: roundDisplay(treatmentWithReserveL, 6),
      purchaseQty: treatmentCans * treatmentCanL,
      category: "Защита",
      packageInfo: { count: treatmentCans, size: treatmentCanL, packageUnit: "банок" },
    });
  }

  const warnings: string[] = [];
  if (jointCount > 0) {
    warnings.push(`В базовом раскрое получается ${jointCount} стыков досок: проверьте разбежку и дополнительные лаги под каждым стыком`);
  }
  if (boardType !== 0 && withTreatment === 0) {
    warnings.push("Для деревянной доски не выбрана обработка: проверьте заводскую защиту и требования производителя");
  }
  if (area > spec.warnings_rules.large_area_threshold_m2) {
    warnings.push("Для площади более 50 м² нужна отдельная схема раскладки, стыков и компенсационных зазоров");
  }

  return {
    canonicalSpecId: spec.calculator_id,
    formulaVersion: spec.formula_version,
    materials,
    totals: {
      length: roundDisplay(length, 3),
      width: roundDisplay(width, 3),
      area: roundDisplay(area, 3),
      boardType,
      boardLength: roundDisplay(boardLengthMm, 0),
      boardWidth: roundDisplay(boardWidthMm, 0),
      gap: roundDisplay(gapMm, 3),
      boardPitch: roundDisplay(boardPitchM, 6),
      offcutReuseMode,
      boardReservePercent: roundDisplay(boardReservePercent, 3),
      rowCount,
      boardsPerRow,
      safeBaseBoards,
      baseBoardExact: roundDisplay(baseBoardExact, 6),
      baseBoardPurchase,
      totalBoards: recScenario.purchase_quantity,
      totalBoardLinearM: roundDisplay(totalBoardLinearM, 6),
      baseCutWasteM: roundDisplay(baseCutWasteM, 6),
      jointCount,
      lagStep: roundDisplay(lagStepMm, 0),
      lagLengthM: roundDisplay(lagLengthM, 3),
      lagRowCount,
      lagBaseM: roundDisplay(lagBaseM, 6),
      lagTotalLen: roundDisplay(lagWithReserveM, 6),
      lagPcs,
      clipBaseCount: roundDisplay(clipBaseCount, 6),
      klaymerCount: clipPacks * clipPackCount,
      clipPacks,
      fastenerBaseCount: roundDisplay(fastenerBaseCount, 6),
      screwCount: fastenerPacks * fastenerPackCount,
      fastenerPacks,
      treatmentL: roundDisplay(treatmentWithReserveL, 6),
      treatmentCans,
      geotextileRolls,
      minExactNeed: scenarios.MIN.exact_need,
      recExactNeed: recScenario.exact_need,
      maxExactNeed: scenarios.MAX.exact_need,
      minPurchase: scenarios.MIN.purchase_quantity,
      recPurchase: recScenario.purchase_quantity,
      maxPurchase: scenarios.MAX.purchase_quantity,
    },
    warnings,
    practicalNotes: [
      offcutReuseMode === 0
        ? "Запас доски считается после безопасного раскроя каждого ряда; обрезки между рядами не переиспользуются"
        : "Переиспользование обрезков снижает покупку только при подтверждённой схеме раскладки и допустимой разбежке стыков",
      "Шаг и тип лаг, число клипс, крепёж и компенсационные зазоры должны соответствовать паспорту выбранной системы",
      "Все запасы и фасовки показаны отдельными полями и применяются по одному разу",
    ],
    scenarios,
    accuracyMode,
    accuracyExplanation: {
      mode: accuracyMode,
      modeLabel: ACCURACY_MODE_LABELS[accuracyMode],
      combinedMultiplier: 1,
      appliedModifiers: [],
      notes: ["Режим точности не добавляет скрытых коэффициентов: доска считается по выбранному раскрою и явному запасу"],
    },
  };
}
