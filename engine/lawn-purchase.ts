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

export const LAWN_PURCHASE_FORMULA_VERSION = "lawn-web-purchase-v1";

export interface LawnPurchaseInputs {
  areaM2?: number;
  lawnType?: number;
  seedRateGm2?: number;
  seedReservePercent?: number;
  seedPackKg?: number;
  rollAreaM2?: number;
  rollReservePercent?: number;
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

export function computeLawnPurchase(
  inputs: LawnPurchaseInputs,
): CanonicalCalculatorResult {
  const areaM2 = clamp(readNumber(inputs.areaM2, 50), 0, 100000);
  const lawnType = clampInteger(readNumber(inputs.lawnType, 0), 0, 1);
  const seedRateGm2 = clamp(readNumber(inputs.seedRateGm2, 40), 1, 200);
  const seedReservePercent = clamp(
    readNumber(inputs.seedReservePercent, 0),
    0,
    50,
  );
  const seedPackKg = clamp(readNumber(inputs.seedPackKg, 1), 0.05, 100);
  const rollAreaM2 = clamp(readNumber(inputs.rollAreaM2, 0.8), 0.05, 10);
  const rollReservePercent = clamp(
    readNumber(inputs.rollReservePercent, 5),
    0,
    50,
  );

  const allowancePercent = lawnType === 0
    ? seedReservePercent
    : rollReservePercent;
  const packageSize = lawnType === 0 ? seedPackKg : rollAreaM2;
  const exactNeed = lawnType === 0
    ? areaM2 * seedRateGm2 / 1000
    : areaM2;
  const needWithReserve = exactNeed * (1 + allowancePercent / 100);
  const packagesCount = ceilPositive(needWithReserve / packageSize);
  const purchaseQuantity = packagesCount * packageSize;
  const totalSurplus = Math.max(0, purchaseQuantity - exactNeed);
  const packagingSurplus = Math.max(0, purchaseQuantity - needWithReserve);

  const material: CanonicalMaterialResult = lawnType === 0
    ? {
        name: `Семена газона (${round(seedPackKg, 3)} кг/уп.)`,
        subtitle: `${round(seedRateGm2, 3)} г/м² по маркировке; явный запас ${round(seedReservePercent, 3)}%`,
        quantity: round(exactNeed, 6),
        unit: "кг",
        withReserve: round(needWithReserve, 6),
        purchaseQty: round(purchaseQuantity, 6),
        packageInfo: {
          count: packagesCount,
          size: round(seedPackKg, 6),
          packageUnit: "упаковок",
        },
        category: "Газон",
      }
    : {
        name: `Рулонный газон (${round(rollAreaM2, 3)} м²/рулон)`,
        subtitle: `чистая площадь ${round(areaM2, 3)} м²; явный запас ${round(rollReservePercent, 3)}%`,
        quantity: round(exactNeed, 6),
        unit: "м²",
        withReserve: round(needWithReserve, 6),
        purchaseQty: round(purchaseQuantity, 6),
        packageInfo: {
          count: packagesCount,
          size: round(rollAreaM2, 6),
          packageUnit: "рулонов",
        },
        category: "Газон",
      };

  const packageLabel = lawnType === 0
    ? "lawn-seed-user-pack"
    : "lawn-roll-user-area";
  const scenario = {
    exact_need: round(exactNeed, 6),
    purchase_quantity: round(purchaseQuantity, 6),
    leftover: round(totalSurplus, 6),
    assumptions: [
      `formula_version:${LAWN_PURCHASE_FORMULA_VERSION}`,
      `lawn_type:${lawnType}`,
      `allowance_percent:${round(allowancePercent, 6)}`,
      `package_size:${round(packageSize, 6)}`,
      "single_lawn_purchase_position",
      "no_hidden_scenario_multiplier",
    ],
    key_factors: {
      hidden_multiplier: 1,
      lawn_type: lawnType,
      allowance_percent: round(allowancePercent, 6),
    },
    buy_plan: {
      package_label: packageLabel,
      package_size: round(packageSize, 6),
      packages_count: packagesCount,
      unit: lawnType === 0 ? "кг" : "м²",
    },
  };
  const scenarios: ScenarioBundle = {
    MIN: { ...scenario },
    REC: { ...scenario },
    MAX: { ...scenario },
  };

  const warnings = [
    lawnType === 0
      ? "Норма высева не определяется названием «декоративный», «обычный» или «спортивный». Перенесите г/м² с упаковки конкретной травосмеси для нового посева; норма подсева может отличаться."
      : "Расчёт использует площадь одного рулона и выбранный запас, но не моделирует раскладку вокруг дорожек, деревьев, криволинейных границ и повторное использование обрезков.",
    "Плодородный грунт, песок, геотекстиль, удобрения, стимуляторы, полив и инструменты автоматически не добавляются. Их состав и количество определяют по обследованию участка, проекту и инструкциям выбранных материалов.",
    "Калькулятор не проверяет состав трав, всхожесть, климатическую пригодность, качество основания, дренаж, уклоны, освещённость и режим полива.",
  ];
  if (areaM2 === 0) {
    warnings.push(
      "Получен нулевой результат: укажите ненулевую чистую площадь будущего газона.",
    );
  }

  const requestedAccuracyMode = inputs.accuracyMode;
  const accuracyMode =
    requestedAccuracyMode && requestedAccuracyMode in ACCURACY_MODE_LABELS
      ? requestedAccuracyMode
      : DEFAULT_ACCURACY_MODE;

  return {
    canonicalSpecId: "lawn-web-purchase",
    formulaVersion: LAWN_PURCHASE_FORMULA_VERSION,
    materials: areaM2 > 0 ? [material] : [],
    totals: {
      lawnType,
      areaM2: round(areaM2, 6),
      seedRateGm2: round(seedRateGm2, 6),
      seedReservePercent: round(seedReservePercent, 6),
      seedPackKg: round(seedPackKg, 6),
      rollAreaM2: round(rollAreaM2, 6),
      rollReservePercent: round(rollReservePercent, 6),
      allowancePercent: round(allowancePercent, 6),
      exactNeed: round(exactNeed, 6),
      needWithReserve: round(needWithReserve, 6),
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
    practicalNotes: [
      lawnType === 0
        ? `Чистая потребность: ${round(areaM2, 3)} м² × ${round(seedRateGm2, 3)} г/м² = ${round(exactNeed, 3)} кг.`
        : `Площадь с запасом: ${round(areaM2, 3)} м² × (1 + ${round(rollReservePercent, 3)} / 100) = ${round(needWithReserve, 3)} м².`,
      lawnType === 0
        ? `После запаса требуется ${round(needWithReserve, 3)} кг; к покупке ${packagesCount} уп. × ${round(seedPackKg, 3)} кг = ${round(purchaseQuantity, 3)} кг.`
        : `К покупке ${packagesCount} рул. × ${round(rollAreaM2, 3)} м² = ${round(purchaseQuantity, 3)} м².`,
      `Излишек только от округления фасовки: ${round(packagingSurplus, 3)} ${lawnType === 0 ? "кг" : "м²"}.`,
    ],
    scenarios,
    accuracyMode,
    accuracyExplanation: {
      mode: accuracyMode,
      modeLabel: ACCURACY_MODE_LABELS[accuracyMode],
      combinedMultiplier: 1,
      appliedModifiers: [],
      notes: [
        "Режим точности не добавляет скрытый коэффициент: запас и фасовка заданы в форме.",
      ],
    },
  };
}
