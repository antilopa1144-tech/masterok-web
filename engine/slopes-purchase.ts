import {
  ACCURACY_MODE_LABELS,
  DEFAULT_ACCURACY_MODE,
  type AccuracyMode,
} from "./accuracy";
import type {
  CanonicalCalculatorResult,
  CanonicalMaterialResult,
} from "./canonical";
import type { ScenarioBundle } from "./scenarios";

export const SLOPES_PURCHASE_FORMULA_VERSION = "slopes-web-purchase-v1";

export interface SlopesPurchaseInputs {
  positionType?: number;
  areaMode?: number;
  measuredAreaM2?: number;
  openingCount?: number;
  openingWidthM?: number;
  openingHeightM?: number;
  leftDepthMm?: number;
  rightDepthMm?: number;
  includeTop?: number;
  topDepthMm?: number;
  coveragePerUnitM2?: number;
  sheetReservePercent?: number;
  consumptionKgPerM2?: number;
  mixtureReservePercent?: number;
  packageMassKg?: number;
  measuredLinearM?: number;
  linearReservePercent?: number;
  pieceLengthM?: number;
  accuracyMode?: AccuracyMode;
}

const clamp = (value: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, value));

const clampInteger = (value: number, min: number, max: number): number =>
  Math.round(clamp(value, min, max));

const readNumber = (value: unknown, fallback: number): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const round = (value: number, digits = 6): number => {
  const factor = 10 ** digits;
  return Math.round((value + Number.EPSILON) * factor) / factor;
};

const ceilPositive = (value: number): number =>
  value > 0 ? Math.ceil(value - 1e-9) : 0;

export function computeSlopesPurchase(
  inputs: SlopesPurchaseInputs,
): CanonicalCalculatorResult {
  const positionType = clampInteger(readNumber(inputs.positionType, 0), 0, 2);
  const areaMode = clampInteger(readNumber(inputs.areaMode, 1), 0, 1);
  const measuredAreaM2 = clamp(
    readNumber(inputs.measuredAreaM2, 1.4),
    0,
    100000,
  );
  const openingCount = clampInteger(
    readNumber(inputs.openingCount, 1),
    0,
    1000,
  );
  const openingWidthM = clamp(
    readNumber(inputs.openingWidthM, 1.2),
    0,
    100,
  );
  const openingHeightM = clamp(
    readNumber(inputs.openingHeightM, 1.4),
    0,
    100,
  );
  const leftDepthMm = clamp(
    readNumber(inputs.leftDepthMm, 350),
    0,
    5000,
  );
  const rightDepthMm = clamp(
    readNumber(inputs.rightDepthMm, 350),
    0,
    5000,
  );
  const includeTop = clampInteger(readNumber(inputs.includeTop, 1), 0, 1);
  const topDepthMm = clamp(
    readNumber(inputs.topDepthMm, 350),
    0,
    5000,
  );
  const coveragePerUnitM2 = clamp(
    readNumber(inputs.coveragePerUnitM2, 3.6),
    0.01,
    10000,
  );
  const sheetReservePercent = clamp(
    readNumber(inputs.sheetReservePercent, 0),
    0,
    50,
  );
  const consumptionKgPerM2 = clamp(
    readNumber(inputs.consumptionKgPerM2, 8.5),
    0,
    10000,
  );
  const mixtureReservePercent = clamp(
    readNumber(inputs.mixtureReservePercent, 0),
    0,
    50,
  );
  const packageMassKg = clamp(
    readNumber(inputs.packageMassKg, 30),
    0.01,
    10000,
  );
  const measuredLinearM = clamp(
    readNumber(inputs.measuredLinearM, 10),
    0,
    100000,
  );
  const linearReservePercent = clamp(
    readNumber(inputs.linearReservePercent, 0),
    0,
    50,
  );
  const pieceLengthM = clamp(
    readNumber(inputs.pieceLengthM, 3),
    0.01,
    1000,
  );

  const sideAreaPerOpening =
    openingHeightM * ((leftDepthMm + rightDepthMm) / 1000);
  const topAreaPerOpening = includeTop === 1
    ? openingWidthM * (topDepthMm / 1000)
    : 0;
  const geometryAreaM2 = openingCount * (
    sideAreaPerOpening + topAreaPerOpening
  );
  const areaM2 = areaMode === 0 ? measuredAreaM2 : geometryAreaM2;

  let exactNeed: number;
  let needWithReserve: number;
  let packageSize: number;
  let packagesCount: number;
  let purchaseQuantity: number;
  let unit: string;
  let packageUnit: string;
  let packageLabel: string;
  let materialName: string;
  let materialSubtitle: string;
  let category: string;
  let explicitReservePercent: number;

  if (positionType === 0) {
    exactNeed = areaM2;
    explicitReservePercent = sheetReservePercent;
    needWithReserve = exactNeed * (1 + explicitReservePercent / 100);
    packageSize = coveragePerUnitM2;
    packagesCount = ceilPositive(needWithReserve / packageSize);
    purchaseQuantity = packagesCount * packageSize;
    unit = "м²";
    packageUnit = "единиц";
    packageLabel = "slopes-sheet-user-coverage";
    materialName = "Листовой или панельный материал для откосов";
    materialSubtitle = `полезная площадь единицы ${round(coveragePerUnitM2, 3)} м²; явный запас ${round(sheetReservePercent, 3)}%`;
    category = "Листы и панели";
  } else if (positionType === 1) {
    exactNeed = areaM2 * consumptionKgPerM2;
    explicitReservePercent = mixtureReservePercent;
    needWithReserve = exactNeed * (1 + explicitReservePercent / 100);
    packageSize = packageMassKg;
    packagesCount = ceilPositive(needWithReserve / packageSize);
    purchaseQuantity = packagesCount * packageSize;
    unit = "кг";
    packageUnit = "упаковок";
    packageLabel = "slopes-mixture-user-package";
    materialName = "Смесь для откосов по паспорту";
    materialSubtitle = `расход ${round(consumptionKgPerM2, 3)} кг/м² для выбранной толщины или системы; явный запас ${round(mixtureReservePercent, 3)}%; фасовка ${round(packageMassKg, 3)} кг`;
    category = "Составы";
  } else {
    exactNeed = measuredLinearM;
    explicitReservePercent = linearReservePercent;
    needWithReserve = exactNeed * (1 + explicitReservePercent / 100);
    packageSize = pieceLengthM;
    packagesCount = ceilPositive(needWithReserve / packageSize);
    purchaseQuantity = packagesCount * packageSize;
    unit = "м";
    packageUnit = "планок";
    packageLabel = "slopes-linear-user-length";
    materialName = "Профиль или уголок для откосов";
    materialSubtitle = `обмер ${round(measuredLinearM, 3)} м; явный запас ${round(linearReservePercent, 3)}%; длина планки ${round(pieceLengthM, 3)} м`;
    category = "Погонаж";
  }

  const totalSurplus = Math.max(0, purchaseQuantity - exactNeed);
  const packagingSurplus = Math.max(0, purchaseQuantity - needWithReserve);
  const material: CanonicalMaterialResult = {
    name: materialName,
    subtitle: materialSubtitle,
    quantity: round(exactNeed, 6),
    unit,
    withReserve: round(needWithReserve, 6),
    purchaseQty: round(purchaseQuantity, 6),
    packageInfo: {
      count: packagesCount,
      size: round(packageSize, 6),
      packageUnit,
    },
    category,
  };

  const scenario = {
    exact_need: round(exactNeed, 6),
    purchase_quantity: round(purchaseQuantity, 6),
    leftover: round(totalSurplus, 6),
    assumptions: [
      `formula_version:${SLOPES_PURCHASE_FORMULA_VERSION}`,
      `position_type:${positionType}`,
      `area_mode:${areaMode}`,
      `package_size:${round(packageSize, 6)}`,
      "single_slopes_position",
      "no_hidden_scenario_multiplier",
    ],
    key_factors: {
      hidden_multiplier: 1,
      position_type: positionType,
      explicit_reserve_percent: round(explicitReservePercent, 6),
    },
    buy_plan: {
      package_label: packageLabel,
      package_size: round(packageSize, 6),
      packages_count: packagesCount,
      unit,
    },
  };
  const scenarios: ScenarioBundle = {
    MIN: { ...scenario },
    REC: { ...scenario },
    MAX: { ...scenario },
  };

  const warnings = [
    positionType === 0
      ? "Перевод площади в целые листы или панели не заменяет раскладку отдельных боковых и верхних деталей. Проверьте размеры заготовок, направление, стыки и пригодность остатков на карте резов."
      : positionType === 1
        ? "Расход смеси должен соответствовать выбранному продукту, основанию и полной проектной толщине или системе слоёв. Калькулятор не назначает универсальные 12 кг/м² и не добавляет грунтовку, шпаклёвку или краску автоматически."
        : "Профиль или уголок считается только по введённой длине. Места установки, число контуров, углы и тип погонажа определяются выбранной системой отделки, а не периметром проёма автоматически.",
    "Ведомость содержит одну выбранную позицию. Панели, листы, смеси, профили, грунтовка, шпаклёвка, краска, клей, пена, герметики, крепёж и утепление нужно считать отдельно по совместимой системе.",
    "Калькулятор считает закупочную геометрию, но не проверяет монтажный шов, влажностный режим, конденсат, промерзание, основание и безопасность узла. Для наружных и проблемных откосов требуется проектное решение.",
  ];
  if (areaMode === 1 && positionType !== 2) {
    warnings.push(
      "Геометрический режим моделирует прямоугольные грани. Если глубина меняется по высоте, есть разворот, четверть, разрушения или непрямые углы, используйте готовую площадь по детальному обмеру.",
    );
  }
  if (exactNeed === 0) {
    warnings.push(
      "Получен нулевой результат: укажите ненулевую площадь, размеры проёма, паспортный расход или длину выбранной позиции.",
    );
  }

  const requestedAccuracyMode = inputs.accuracyMode;
  const accuracyMode =
    requestedAccuracyMode && requestedAccuracyMode in ACCURACY_MODE_LABELS
      ? requestedAccuracyMode
      : DEFAULT_ACCURACY_MODE;

  const practicalNotes = positionType === 0
    ? [
        `Площадь отделки ${round(areaM2, 3)} м²; после явного запаса ${round(sheetReservePercent, 3)}% — ${round(needWithReserve, 3)} м².`,
        `${round(needWithReserve, 3)} / ${round(coveragePerUnitM2, 3)} = ${round(needWithReserve / coveragePerUnitM2, 3)}; к покупке ${packagesCount} целых единиц, или ${round(purchaseQuantity, 3)} м².`,
      ]
    : positionType === 1
      ? [
          `${round(areaM2, 3)} м² × ${round(consumptionKgPerM2, 3)} кг/м² = ${round(exactNeed, 3)} кг по паспортному расходу.`,
          `После явного запаса ${round(mixtureReservePercent, 3)}% требуется ${round(needWithReserve, 3)} кг; к покупке ${packagesCount} уп., или ${round(purchaseQuantity, 3)} кг.`,
        ]
      : [
          `По обмеру требуется ${round(measuredLinearM, 3)} м; после явного запаса ${round(linearReservePercent, 3)}% — ${round(needWithReserve, 3)} м.`,
          `${round(needWithReserve, 3)} / ${round(pieceLengthM, 3)} = ${round(needWithReserve / pieceLengthM, 3)}; к покупке ${packagesCount} целых планок, или ${round(purchaseQuantity, 3)} м.`,
        ];
  practicalNotes.push(
    `Излишек только от округления фасовки: ${round(packagingSurplus, 3)} ${unit}.`,
    "Перед оплатой сверьте артикул, полезную площадь или длину, фасовку, допустимое основание и технологию монтажа по документации производителя.",
  );

  return {
    canonicalSpecId: "slopes-web-purchase",
    formulaVersion: SLOPES_PURCHASE_FORMULA_VERSION,
    materials: exactNeed > 0 ? [material] : [],
    totals: {
      positionType,
      areaMode,
      measuredAreaM2: round(measuredAreaM2, 6),
      openingCount,
      openingWidthM: round(openingWidthM, 6),
      openingHeightM: round(openingHeightM, 6),
      leftDepthMm: round(leftDepthMm, 6),
      rightDepthMm: round(rightDepthMm, 6),
      includeTop,
      topDepthMm: round(topDepthMm, 6),
      sideAreaPerOpening: round(sideAreaPerOpening, 6),
      topAreaPerOpening: round(topAreaPerOpening, 6),
      geometryAreaM2: round(geometryAreaM2, 6),
      areaM2: round(areaM2, 6),
      coveragePerUnitM2: round(coveragePerUnitM2, 6),
      sheetReservePercent: round(sheetReservePercent, 6),
      consumptionKgPerM2: round(consumptionKgPerM2, 6),
      mixtureReservePercent: round(mixtureReservePercent, 6),
      packageMassKg: round(packageMassKg, 6),
      measuredLinearM: round(measuredLinearM, 6),
      linearReservePercent: round(linearReservePercent, 6),
      pieceLengthM: round(pieceLengthM, 6),
      exactNeed: round(exactNeed, 6),
      needWithReserve: round(needWithReserve, 6),
      packageSize: round(packageSize, 6),
      packagesCount,
      purchaseQuantity: round(purchaseQuantity, 6),
      totalSurplus: round(totalSurplus, 6),
      packagingSurplus: round(packagingSurplus, 6),
      minExactNeed: round(exactNeed, 6),
      recExactNeed: round(exactNeed, 6),
      maxExactNeed: round(exactNeed, 6),
      minPurchase: round(purchaseQuantity, 6),
      recPurchase: round(purchaseQuantity, 6),
      maxPurchase: round(purchaseQuantity, 6),
    },
    warnings,
    practicalNotes,
    scenarios,
    accuracyMode,
    accuracyExplanation: {
      mode: accuracyMode,
      modeLabel: ACCURACY_MODE_LABELS[accuracyMode],
      combinedMultiplier: 1,
      appliedModifiers: [],
      notes: [
        "Режим точности не добавляет скрытый коэффициент: геометрия, паспортный расход, запас и фасовка заданы пользователем.",
      ],
    },
  };
}
