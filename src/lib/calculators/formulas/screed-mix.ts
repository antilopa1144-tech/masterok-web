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
  [READY_MIX_PESKOBETON_M300]: { name: "Пескобетон М300 (мешки 40 кг)", massFactor: 1.0 },
  [READY_MIX_UNIVERSAL_M200]: { name: "Готовая ЦПС М200 (мешки 40 кг)", massFactor: 1.0 },
};

const BAG_40 = 40;

/**
 * Применяет выбор марки цемента/пропорции (ручной замес) или номенклатуры
 * готовой смеси к каноническому результату.
 */
export function applyScreedMix(
  result: CalculatorResult,
  inputs: { screedType?: number; cementGrade?: number; mixProportion?: number; readyMix?: number },
): CalculatorResult {
  const screedType = Math.round(inputs.screedType ?? 0);

  if (screedType === 0) {
    return applyManualMix(result, inputs);
  }
  if (screedType === 1) {
    return applyReadyMix(result, inputs);
  }
  return result; // полусухая — без доп. параметров
}

function applyManualMix(
  result: CalculatorResult,
  inputs: { cementGrade?: number; mixProportion?: number },
): CalculatorResult {
  const variant = getManualMixVariant(
    Math.round(inputs.cementGrade ?? CEMENT_GRADE_M400),
    Math.round(inputs.mixProportion ?? PROPORTION_1_3),
  );

  const materials = result.materials.map((m): MaterialResult => {
    if (m.name.startsWith("Цемент")) {
      const baseKg = m.quantity;
      const adjustedKg = baseKg * variant.cementFactor;
      const bags = Math.ceil(adjustedKg / 50);
      return {
        ...m,
        name: `Цемент ${variant.cementLabel} (мешки 50 кг)`,
        quantity: round3(adjustedKg),
        withReserve: bags * 50,
        purchaseQty: bags * 50,
        packageInfo: { count: bags, size: 50, packageUnit: "мешков" },
        subtitle: `Раствор ${variant.mortarGrade} · пропорция ${inputs.mixProportion === PROPORTION_1_4 ? "1:4" : "1:3"}`,
      };
    }
    if (m.name.startsWith("Песок")) {
      const adjustedTons = m.quantity * variant.sandFactor;
      return {
        ...m,
        quantity: round3(Math.ceil(adjustedTons * 10) / 10),
        withReserve: round3(Math.ceil(adjustedTons * 10) / 10),
        purchaseQty: Math.ceil(adjustedTons),
      };
    }
    return m;
  });

  return {
    ...result,
    materials,
    totals: {
      ...result.totals,
      cementGrade: inputs.cementGrade ?? CEMENT_GRADE_M400,
      mixProportion: inputs.mixProportion ?? PROPORTION_1_3,
    },
  };
}

function applyReadyMix(
  result: CalculatorResult,
  inputs: { readyMix?: number },
): CalculatorResult {
  const choice = Math.round(inputs.readyMix ?? READY_MIX_PESKOBETON_M300);
  const variant = READY_MIX[choice] ?? READY_MIX[READY_MIX_PESKOBETON_M300];

  const materials = result.materials.map((m): MaterialResult => {
    if (m.name.startsWith("Готовая ЦПС") || m.name.startsWith("Пескобетон")) {
      const baseKg = m.quantity * variant.massFactor;
      const bags = Math.ceil(baseKg / BAG_40);
      return {
        ...m,
        name: variant.name,
        quantity: round3(baseKg),
        withReserve: bags * BAG_40,
        purchaseQty: bags * BAG_40,
        packageInfo: { count: bags, size: BAG_40, packageUnit: "мешков" },
      };
    }
    return m;
  });

  return {
    ...result,
    materials,
    totals: { ...result.totals, readyMix: choice },
  };
}

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}
