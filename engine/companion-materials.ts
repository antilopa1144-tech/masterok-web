/**
 * Движок сопутствующих материалов.
 *
 * Принимает декларации из конфига калькулятора (CompanionMaterialSpec[]),
 * входы пользователя и computed totals, возвращает CanonicalMaterialResult[]
 * готовый для отображения.
 *
 * Архитектурные принципы (по CLAUDE.md):
 *  - Источник истины — конфиг. Эта функция ничего не знает о доменах.
 *  - Каждый материал — отдельная декларация; никаких if/else по типам.
 *  - Формулы и упаковки — отдельные слои.
 *  - Округление — только финальный шаг (Math.ceil к упаковке или штуке).
 *  - Условия скипа — explicit (skip_when / only_when), не зашиты в коде.
 */

import type {
  CanonicalMaterialResult,
  CompanionCondition,
  CompanionFormula,
  CompanionMaterialSpec,
} from "./canonical";
import { roundDisplay } from "./units";

/** Входы и totals для оценки формул и условий. */
export interface CompanionContext {
  inputs: Record<string, number>;
  totals: Record<string, number>;
}

/* ── Условия ──────────────────────────────────────────────────────────────── */

function readInput(ctx: CompanionContext, key: string): number | undefined {
  return ctx.inputs[key];
}

function readTotals(ctx: CompanionContext, key: string): number | undefined {
  return ctx.totals[key];
}

export function evaluateCondition(
  cond: CompanionCondition,
  ctx: CompanionContext,
): boolean {
  switch (cond.type) {
    case "never":
      return false;
    case "input_eq": {
      const v = readInput(ctx, cond.input_key);
      return v !== undefined && v === cond.value;
    }
    case "input_neq": {
      const v = readInput(ctx, cond.input_key);
      // Если значение не задано — считаем что условие НЕ выполнено
      // (т.е. неравенство к неизвестному = ложь). Это безопасный дефолт.
      return v !== undefined && v !== cond.value;
    }
    case "input_in": {
      const v = readInput(ctx, cond.input_key);
      return v !== undefined && cond.values.includes(v);
    }
    case "input_gte": {
      const v = readInput(ctx, cond.input_key);
      return v !== undefined && v >= cond.value;
    }
    case "input_lte": {
      const v = readInput(ctx, cond.input_key);
      return v !== undefined && v <= cond.value;
    }
    case "totals_gt": {
      const v = readTotals(ctx, cond.totals_key);
      return v !== undefined && v > cond.value;
    }
    case "totals_lt": {
      const v = readTotals(ctx, cond.totals_key);
      return v !== undefined && v < cond.value;
    }
    case "and":
      return cond.all.every((c) => evaluateCondition(c, ctx));
    case "or":
      return cond.any.some((c) => evaluateCondition(c, ctx));
  }
}

/* ── Формулы ──────────────────────────────────────────────────────────────── */

/**
 * Точная физическая потребность в материале (без округления к упаковке).
 * Возвращает 0 если базовое значение не найдено — это не ошибка, а сигнал
 * что материал в данном контексте не нужен (например, периметр=0 в bulk-режиме).
 */
export function computeFormula(
  formula: CompanionFormula,
  ctx: CompanionContext,
): number {
  switch (formula.type) {
    case "fixed":
      return Math.max(0, formula.value);

    case "per_input": {
      const base = readInput(ctx, formula.input_key) ?? 0;
      return Math.max(0, base * formula.per_unit);
    }

    case "per_total": {
      const base = readTotals(ctx, formula.totals_key) ?? 0;
      return Math.max(0, base * formula.per_unit);
    }

    case "area_consumption": {
      const area = readTotals(ctx, formula.totals_key) ?? 0;
      const reserve = formula.reserve_factor ?? 1.0;
      return Math.max(0, area * formula.consumption_per_m2 * reserve);
    }

    case "perimeter_consumption": {
      const perimeter = readTotals(ctx, formula.totals_key) ?? 0;
      const reserve = formula.reserve_factor ?? 1.0;
      return Math.max(0, perimeter * formula.consumption_per_m * reserve);
    }

    case "volume_consumption": {
      const volume = readTotals(ctx, formula.totals_key) ?? 0;
      const reserve = formula.reserve_factor ?? 1.0;
      return Math.max(0, volume * formula.consumption_per_m3 * reserve);
    }

    case "per_count_step": {
      const base = readTotals(ctx, formula.totals_key) ?? 0;
      if (base <= 0) return 0;
      const extra = Math.max(0, Math.ceil(base / formula.step) - 1);
      const total = formula.fixed + extra;
      return formula.max !== undefined ? Math.min(total, formula.max) : total;
    }

    case "linear_overlap": {
      const base = readTotals(ctx, formula.totals_key) ?? 0;
      return Math.max(0, base * formula.overlap_factor);
    }
  }
}

/* ── Упаковка ─────────────────────────────────────────────────────────────── */

interface AppliedPackaging {
  withReserve: number;
  purchaseQty: number;
  packageInfo?: { count: number; size: number; packageUnit: string };
}

function applyPackaging(
  exactNeed: number,
  spec: CompanionMaterialSpec,
): AppliedPackaging {
  if (spec.package && spec.package.size > 0) {
    const count = exactNeed > 0 ? Math.ceil(exactNeed / spec.package.size) : 0;
    const total = count * spec.package.size;
    return {
      withReserve: total,
      purchaseQty: total,
      packageInfo:
        count > 0
          ? { count, size: spec.package.size, packageUnit: spec.package.unit }
          : undefined,
    };
  }
  // Без упаковки: округляем до целого числа единиц вверх.
  const purchaseQty = exactNeed > 0 ? Math.ceil(exactNeed) : 0;
  return { withReserve: purchaseQty, purchaseQty };
}

/* ── Основной API ─────────────────────────────────────────────────────────── */

/**
 * Оценить весь список деклараций и собрать CanonicalMaterialResult[].
 *
 * Поведение:
 *  1. Для каждой декларации проверяем skip_when (если истинно — пропускаем).
 *  2. Затем only_when (если задано и ложно — пропускаем).
 *  3. Затем alternative_group: если в этой группе уже включён материал —
 *     пропускаем. Иначе включаем и помечаем группу как занятую.
 *  4. Вычисляем exact_need по формуле.
 *  5. Если exact_need == 0 — материал в этот раз не нужен, пропускаем.
 *  6. Применяем упаковку (если задана) и собираем результат.
 *
 * Порядок результата — порядок деклараций в конфиге (UI-категоризация
 * остаётся ответственностью UI-слоя).
 */
export function evaluateCompanionMaterials(
  specs: CompanionMaterialSpec[],
  ctx: CompanionContext,
): CanonicalMaterialResult[] {
  const result: CanonicalMaterialResult[] = [];
  const usedGroups = new Set<string>();

  for (const spec of specs) {
    if (spec.skip_when && evaluateCondition(spec.skip_when, ctx)) continue;
    if (spec.only_when && !evaluateCondition(spec.only_when, ctx)) continue;

    if (spec.alternative_group) {
      if (usedGroups.has(spec.alternative_group)) continue;
      usedGroups.add(spec.alternative_group);
    }

    const exactNeed = computeFormula(spec.formula, ctx);
    if (exactNeed <= 0) continue;

    const packaging = applyPackaging(exactNeed, spec);

    result.push({
      name: spec.label,
      quantity: roundDisplay(exactNeed, 3),
      unit: spec.unit,
      withReserve: roundDisplay(packaging.withReserve, 3),
      purchaseQty: packaging.purchaseQty,
      packageInfo: packaging.packageInfo,
      category: spec.category,
    });
  }

  return result;
}
