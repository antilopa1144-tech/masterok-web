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

export const DOORS_PURCHASE_FORMULA_VERSION = "doors-web-purchase-v1";

export interface DoorsPurchaseInputs {
  positionType?: number;
  doorCount?: number;
  foamCanEquivalentPerBlock?: number;
  foamReservePercent?: number;
  linearMaterialType?: number;
  measuredLengthM?: number;
  linearReservePercent?: number;
  pieceLengthM?: number;
  fastenerCount?: number;
  extraFastenersPcs?: number;
  fastenersPerPack?: number;
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

export function computeDoorsPurchase(
  inputs: DoorsPurchaseInputs,
): CanonicalCalculatorResult {
  const positionType = clampInteger(
    readNumber(inputs.positionType, 0),
    0,
    2,
  );
  const doorCount = clampInteger(readNumber(inputs.doorCount, 3), 0, 100);
  const foamCanEquivalentPerBlock = clamp(
    readNumber(inputs.foamCanEquivalentPerBlock, 1),
    0,
    20,
  );
  const foamReservePercent = clamp(
    readNumber(inputs.foamReservePercent, 0),
    0,
    50,
  );
  const linearMaterialType = clampInteger(
    readNumber(inputs.linearMaterialType, 0),
    0,
    1,
  );
  const measuredLengthM = clamp(
    readNumber(inputs.measuredLengthM, 15),
    0,
    10000,
  );
  const linearReservePercent = clamp(
    readNumber(inputs.linearReservePercent, 0),
    0,
    50,
  );
  const pieceLengthM = clamp(
    readNumber(inputs.pieceLengthM, 2.2),
    0.1,
    20,
  );
  const fastenerCount = clampInteger(
    readNumber(inputs.fastenerCount, 24),
    0,
    1000000,
  );
  const extraFastenersPcs = clampInteger(
    readNumber(inputs.extraFastenersPcs, 0),
    0,
    1000000,
  );
  const fastenersPerPack = clampInteger(
    readNumber(inputs.fastenersPerPack, 20),
    1,
    1000000,
  );

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

  if (positionType === 0) {
    exactNeed = doorCount * foamCanEquivalentPerBlock;
    needWithReserve = exactNeed * (1 + foamReservePercent / 100);
    packageSize = 1;
    packagesCount = ceilPositive(needWithReserve);
    purchaseQuantity = packagesCount;
    unit = "баллонов";
    packageUnit = "баллонов";
    packageLabel = "doors-foam-user-can-equivalent";
    materialName = "Монтажная пена";
    materialSubtitle = `${round(foamCanEquivalentPerBlock, 3)} балл./блок по выбранному продукту или пробному монтажу; явный запас ${round(foamReservePercent, 3)}%`;
    category = "Монтажный шов";
  } else if (positionType === 1) {
    exactNeed = measuredLengthM;
    needWithReserve = exactNeed * (1 + linearReservePercent / 100);
    packageSize = pieceLengthM;
    packagesCount = ceilPositive(needWithReserve / packageSize);
    purchaseQuantity = packagesCount * packageSize;
    unit = "м";
    packageUnit = "планок";
    packageLabel = linearMaterialType === 0
      ? "doors-trim-user-length"
      : "doors-extension-user-length";
    materialName = linearMaterialType === 0 ? "Наличник" : "Добор";
    materialSubtitle = `обмер ${round(measuredLengthM, 3)} м; явный запас ${round(linearReservePercent, 3)}%; длина планки ${round(pieceLengthM, 3)} м`;
    category = "Погонаж";
  } else {
    exactNeed = fastenerCount;
    needWithReserve = exactNeed + extraFastenersPcs;
    packageSize = fastenersPerPack;
    packagesCount = ceilPositive(needWithReserve / packageSize);
    purchaseQuantity = packagesCount * packageSize;
    unit = "шт";
    packageUnit = "упаковок";
    packageLabel = "doors-fasteners-user-pack";
    materialName = "Крепёж по монтажной схеме";
    materialSubtitle = `${fastenerCount} шт по инструкции или проекту; дополнительно ${extraFastenersPcs} шт; ${fastenersPerPack} шт/уп.`;
    category = "Крепёж";
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
    ...(positionType === 0
      ? {}
      : {
          packageInfo: {
            count: packagesCount,
            size: round(packageSize, 6),
            packageUnit,
          },
        }),
    category,
  };

  const scenario = {
    exact_need: round(exactNeed, 6),
    purchase_quantity: round(purchaseQuantity, 6),
    leftover: round(totalSurplus, 6),
    assumptions: [
      `formula_version:${DOORS_PURCHASE_FORMULA_VERSION}`,
      `position_type:${positionType}`,
      `package_size:${round(packageSize, 6)}`,
      "single_door_installation_position",
      "no_hidden_scenario_multiplier",
    ],
    key_factors: {
      hidden_multiplier: 1,
      position_type: positionType,
      explicit_allowance: positionType === 0
        ? round(foamReservePercent, 6)
        : positionType === 1
          ? round(linearReservePercent, 6)
          : extraFastenersPcs,
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
      ? "Расход пены нельзя надёжно вывести только из габарита полотна: он зависит от фактического монтажного шва, выхода конкретного продукта, температуры, влажности и техники нанесения. Перенесите расход из инструкции, технологической карты или пробного монтажа."
      : positionType === 1
        ? "Расчёт делит суммарный обмер на длину планки, но не оптимизирует раскрой отдельных стоек и перемычек. Для точной закупки проверьте карту резов и пригодность каждого остатка."
        : "Количество и тип креплений принимает пользователь по инструкции изготовителя, технологической карте или проекту. Калькулятор не назначает крепёж по размеру двери и не проверяет основание, нагрузки и зоны крепления.",
    "Дверной блок, коробка, петли, замок, ручки, порог, уплотнения, пена, погонаж, крепёж и герметики автоматически не объединяются в комплект. Каждую принятую позицию считайте отдельно по её документации и фасовке.",
    "Калькулятор не подбирает размер блока по проёму, не проектирует монтажный узел и не подтверждает безопасность установки. Для входных, противопожарных, тяжёлых и специальных дверей следуйте проекту и инструкции изготовителя.",
  ];
  if (exactNeed === 0) {
    warnings.push(
      "Получен нулевой результат: укажите ненулевой расход, обмер или количество креплений для выбранной позиции.",
    );
  }

  const requestedAccuracyMode = inputs.accuracyMode;
  const accuracyMode =
    requestedAccuracyMode && requestedAccuracyMode in ACCURACY_MODE_LABELS
      ? requestedAccuracyMode
      : DEFAULT_ACCURACY_MODE;

  const practicalNotes = positionType === 0
    ? [
        `${doorCount} блоков × ${round(foamCanEquivalentPerBlock, 3)} балл./блок = ${round(exactNeed, 3)} баллона до отдельного запаса.`,
        `После явного запаса ${round(foamReservePercent, 3)}% требуется ${round(needWithReserve, 3)} баллона; к покупке ${packagesCount} целых баллонов.`,
      ]
    : positionType === 1
      ? [
          `По обмеру требуется ${round(exactNeed, 3)} м; после явного запаса ${round(linearReservePercent, 3)}% — ${round(needWithReserve, 3)} м.`,
          `${round(needWithReserve, 3)} / ${round(pieceLengthM, 3)} = ${round(needWithReserve / pieceLengthM, 3)}; к покупке ${packagesCount} целых планок, или ${round(purchaseQuantity, 3)} м.`,
        ]
      : [
          `По монтажной схеме требуется ${fastenerCount} шт; отдельно добавлено ${extraFastenersPcs} шт.`,
          `${needWithReserve} / ${fastenersPerPack} = ${round(needWithReserve / fastenersPerPack, 3)}; к покупке ${packagesCount} уп., или ${purchaseQuantity} шт.`,
        ];
  practicalNotes.push(
    `Излишек только от округления фасовки: ${round(packagingSurplus, 3)} ${unit}.`,
    "Перед оплатой сверьте артикул, совместимость, длину или фасовку и требования к монтажу в документации выбранной двери и расходного материала.",
  );

  return {
    canonicalSpecId: "doors-web-purchase",
    formulaVersion: DOORS_PURCHASE_FORMULA_VERSION,
    materials: exactNeed > 0 ? [material] : [],
    totals: {
      positionType,
      doorCount,
      foamCanEquivalentPerBlock: round(foamCanEquivalentPerBlock, 6),
      foamReservePercent: round(foamReservePercent, 6),
      linearMaterialType,
      measuredLengthM: round(measuredLengthM, 6),
      linearReservePercent: round(linearReservePercent, 6),
      pieceLengthM: round(pieceLengthM, 6),
      fastenerCount,
      extraFastenersPcs,
      fastenersPerPack,
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
        "Режим точности не добавляет скрытый коэффициент: исходная норма, запас и фасовка заданы в форме.",
      ],
    },
  };
}
