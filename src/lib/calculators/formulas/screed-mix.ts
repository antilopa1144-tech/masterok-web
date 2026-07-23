/**
 * Веб-надстройка над каноническим движком стяжки.
 *
 * Движок (engine/screed.ts) знает 3 базовых типа: ЦПС ручной (id 0),
 * готовая смесь (id 1), полусухая (id 2). Здесь мы НАД ним добавляем
 * пользовательский выбор, который движок не различает:
 *  - для ручного замеса: марка цемента (М400/М500) и пропорция (1:3 / 1:4);
 *  - для готовой смеси: реальная номенклатура мешков (пескобетон М300 и др.).
 *
 * Базовый канонический результат не трогаем (паритет с mobile сохраняется
 * для дефолтного сценария М400 1:3). Корректируем массу цемента/песка
 * множителями относительно базы и переименовываем позиции.
 *
 * Источники коэффициентов — справочная практика расхода цемента на 1 м³
 * раствора (kvartirnyj-remont.com, udarnik.spb.ru, rusean.ru, 2026):
 * М400 1:3 → раствор М150 (~490 кг/м³ цемента), М400 1:4 → М100,
 * М500 1:3 → М200, М500 1:4 → М150. Множители заданы ОТНОСИТЕЛЬНО
 * текущей базы движка (М400 1:3), поэтому дефолт даёт прежние цифры.
 */

import type { CalculatorResult, MaterialResult } from "../types";

/** Значения поля cementGrade. */
export const CEMENT_GRADE_M400 = 0;
export const CEMENT_GRADE_M500 = 1;

/** Значения поля mixProportion (только ручной замес). */
export const PROPORTION_1_3 = 0;
export const PROPORTION_1_4 = 1;

/** Значения поля readyMix (готовая смесь в мешках). */
export const READY_MIX_PESKOBETON_M300 = 0;
export const READY_MIX_UNIVERSAL_M200 = 1;

interface ManualMixVariant {
  /** Множитель массы цемента относительно базы (М400 1:3 = 1.0). */
  cementFactor: number;
  /** Множитель массы песка относительно базы. */
  sandFactor: number;
  /** Марка готового раствора (для подписи). */
  mortarGrade: string;
  cementLabel: string;
}

/**
 * Таблица ручного замеса. Ключ — `${cementGrade}-${proportion}`.
 * cementFactor 1.0 для М400 1:3 гарантирует совпадение с текущим расчётом.
 */
const MANUAL_MIX: Record<string, ManualMixVariant> = {
  // М400
  [`${CEMENT_GRADE_M400}-${PROPORTION_1_3}`]: { cementFactor: 1.0, sandFactor: 1.0, mortarGrade: "М150", cementLabel: "М400" },
  [`${CEMENT_GRADE_M400}-${PROPORTION_1_4}`]: { cementFactor: 0.82, sandFactor: 1.1, mortarGrade: "М100", cementLabel: "М400" },
  // М500 — крепче, на ту же марку раствора цемента нужно меньше
  [`${CEMENT_GRADE_M500}-${PROPORTION_1_3}`]: { cementFactor: 0.92, sandFactor: 1.0, mortarGrade: "М200", cementLabel: "М500" },
  [`${CEMENT_GRADE_M500}-${PROPORTION_1_4}`]: { cementFactor: 0.75, sandFactor: 1.1, mortarGrade: "М150", cementLabel: "М500" },
};

export function getManualMixVariant(cementGrade: number, proportion: number): ManualMixVariant {
  const g = cementGrade === CEMENT_GRADE_M500 ? CEMENT_GRADE_M500 : CEMENT_GRADE_M400;
  const p = proportion === PROPORTION_1_4 ? PROPORTION_1_4 : PROPORTION_1_3;
  return MANUAL_MIX[`${g}-${p}`];
}

interface ReadyMixVariant {
  /** Название позиции в списке материалов. */
  name: string;
  /** Доля массы относительно базовой готовой смеси (М300 = 1.0). */
  massFactor: number;
}

const READY_MIX: Record<number, ReadyMixVariant> = {
  [READY_MIX_PESKOBETON_M300]: {
    name: "Пескобетон М300 для стяжки",
    massFactor: 1.0,
  },
  [READY_MIX_UNIVERSAL_M200]: {
    name: "Готовая цементно-песчаная смесь М200 для стяжки",
    massFactor: 1.0,
  },
};

const CEMENT_BAG_WEIGHTS = [25, 40, 50] as const;
const READY_MIX_BAG_WEIGHTS = [20, 25, 30, 40, 50] as const;

function resolvePackageWeight(
  value: number | undefined,
  allowed: readonly number[],
  fallback: number,
): number {
  const rounded = Math.round(value ?? fallback);
  return allowed.includes(rounded) ? rounded : fallback;
}

/**
 * Применяет выбор марки цемента/пропорции (ручной замес) или номенклатуры
 * готовой смеси к каноническому результату.
 */
export function applyScreedMix(
  result: CalculatorResult,
  inputs: {
    screedType?: number;
    cementGrade?: number;
    mixProportion?: number;
    readyMix?: number;
    cementBagWeight?: number;
    readyBagWeight?: number;
  },
): CalculatorResult {
  const screedType = Math.round(inputs.screedType ?? 0);

  if (screedType === 0) {
    return applyManualMix(result, inputs);
  }
  if (screedType === 1) {
    return applyReadyMix(result, inputs);
  }
  return applySemiDry(result);
}

function applyManualMix(
  result: CalculatorResult,
  inputs: { cementGrade?: number; mixProportion?: number; cementBagWeight?: number },
): CalculatorResult {
  const variant = getManualMixVariant(
    Math.round(inputs.cementGrade ?? CEMENT_GRADE_M400),
    Math.round(inputs.mixProportion ?? PROPORTION_1_3),
  );

  const bagWeight = resolvePackageWeight(inputs.cementBagWeight, CEMENT_BAG_WEIGHTS, 50);
  const materials = result.materials.map((m): MaterialResult => {
    if (m.name.startsWith("Цемент")) {
      const baseKg = m.quantity;
      const adjustedKg = baseKg * variant.cementFactor;
      const bags = Math.ceil(adjustedKg / bagWeight);
      return {
        ...m,
        name: `Цемент ${variant.cementLabel} (мешки ${bagWeight} кг)`,
        quantity: round3(adjustedKg),
        withReserve: bags * bagWeight,
        purchaseQty: bags * bagWeight,
        packageInfo: { count: bags, size: bagWeight, packageUnit: "мешков" },
        subtitle: `Раствор ${variant.mortarGrade} · пропорция ${inputs.mixProportion === PROPORTION_1_4 ? "1:4" : "1:3"}`,
      };
    }
    if (m.name.startsWith("Песок")) {
      const adjustedTons = m.quantity * variant.sandFactor;
      return {
        ...m,
        quantity: round3(Math.ceil(adjustedTons * 10) / 10),
        withReserve: round3(Math.ceil(adjustedTons * 10) / 10),
        purchaseQty: round3(Math.ceil(adjustedTons * 10) / 10),
      };
    }
    return m;
  });

  return {
    ...result,
    materials,
    scenarios: repackageScenarios(result, bagWeight, variant.cementFactor, "cement"),
    totals: {
      ...result.totals,
      cementGrade: inputs.cementGrade ?? CEMENT_GRADE_M400,
      mixProportion: inputs.mixProportion ?? PROPORTION_1_3,
      cementBagWeight: bagWeight,
    },
  };
}

function applyReadyMix(
  result: CalculatorResult,
  inputs: { readyMix?: number; readyBagWeight?: number },
): CalculatorResult {
  const choice = Math.round(inputs.readyMix ?? READY_MIX_PESKOBETON_M300);
  const variant = READY_MIX[choice] ?? READY_MIX[READY_MIX_PESKOBETON_M300];
  const bagWeight = resolvePackageWeight(inputs.readyBagWeight, READY_MIX_BAG_WEIGHTS, 40);

  const materials = result.materials.map((m): MaterialResult => {
    if (m.name.startsWith("Готовая цементно-песчаная смесь") || m.name.startsWith("Пескобетон")) {
      const baseKg = m.quantity * variant.massFactor;
      const bags = Math.ceil(baseKg / bagWeight);
      return {
        ...m,
        name: `${variant.name} (мешки ${bagWeight} кг)`,
        subtitle:
          "Перед покупкой сверьте расход на 10 мм слоя и допустимую толщину нанесения на этикетке выбранной смеси",
        quantity: round3(baseKg),
        withReserve: bags * bagWeight,
        purchaseQty: bags * bagWeight,
        packageInfo: { count: bags, size: bagWeight, packageUnit: "мешков" },
      };
    }
    return m;
  });

  return {
    ...result,
    materials,
    scenarios: repackageScenarios(result, bagWeight, variant.massFactor, "ready-mix"),
    totals: { ...result.totals, readyMix: choice, readyBagWeight: bagWeight },
  };
}

function applySemiDry(result: CalculatorResult): CalculatorResult {
  const materials = result.materials.map((m): MaterialResult => {
    if (!m.name.includes("полусухой стяжки")) return m;
    const purchaseKg = Math.ceil(m.quantity / 10) * 10;
    const withoutPackage = { ...m };
    delete withoutPackage.packageInfo;
    return {
      ...withoutPackage,
      name: "Сухие компоненты для полусухой стяжки — ориентировочная масса",
      subtitle: "Обычно цемент, песок и фибру привозит и дозирует бригада; перед заказом согласуйте её рецептуру и подачу смеси",
      withReserve: purchaseKg,
      purchaseQty: purchaseKg,
    };
  });

  return {
    ...result,
    materials,
    scenarios: repackageScenarios(result, 1, 1, "semidry-estimate"),
    totals: {
      ...result.totals,
      semidryEstimatedKg: result.totals.cpsKg ?? 0,
    },
    practicalNotes: [
      ...(result.practicalNotes ?? []),
      "Для механизированной полусухой стяжки не покупайте условные мешки по расчёту: сначала получите от бригады состав смеси и условия поставки",
    ],
  };
}

function repackageScenarios(
  result: CalculatorResult,
  packageSize: number,
  exactFactor: number,
  label: string,
): CalculatorResult["scenarios"] {
  if (!result.scenarios) return undefined;
  return Object.fromEntries(
    Object.entries(result.scenarios).map(([scenario, value]) => {
      const exactNeed = round3(value.exact_need * exactFactor);
      const packages = Math.ceil(exactNeed / packageSize);
      const purchase = round3(packages * packageSize);
      return [scenario, {
        ...value,
        exact_need: exactNeed,
        purchase_quantity: purchase,
        leftover: round3(purchase - exactNeed),
        assumptions: [
          ...value.assumptions.filter((item) => !item.startsWith("packaging:")),
          `packaging:${label}-${packageSize}kg`,
        ],
        buy_plan: {
          package_label: `${label}-${packageSize}kg`,
          package_size: packageSize,
          packages_count: packages,
          unit: "кг",
        },
      }];
    }),
  ) as CalculatorResult["scenarios"];
}

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}
