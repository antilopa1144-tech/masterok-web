/**
 * Accuracy Mode System — practical calculation precision layer.
 *
 * Three modes:
 *  - basic:        normative estimate, minimal practical adjustments
 *  - realistic:    default mode, accounts for typical renovation conditions
 *  - professional: cautious mode for complex conditions and reliable procurement
 *
 * This layer applies material-specific practical modifiers BEFORE
 * the MIN/REC/MAX scenario factors. Each material category defines
 * its own coefficient set, so modifiers are contextual and explainable.
 */

import accuracyProfilesJson from "../configs/accuracy-profiles.json";

// ── Types ────────────────────────────────────────────────────────────────────

export type AccuracyMode = "basic" | "realistic" | "professional" | "custom";

export const ACCURACY_MODES: AccuracyMode[] = ["basic", "realistic", "professional"];

/** All modes including custom (for internal use) */
export const ALL_ACCURACY_MODES: AccuracyMode[] = ["basic", "realistic", "professional", "custom"];

export const DEFAULT_ACCURACY_MODE: AccuracyMode = "realistic";

/**
 * Per-category practical modifiers.
 * Each coefficient addresses a specific real-world concern:
 *
 *  - waste:        material lost to cutting, breakage, spills
 *  - cutting:      additional loss from trimming/fitting
 *  - unevenness:   extra consumption due to surface irregularities
 *  - overconsumption: typical overuse vs. theoretical norm
 *  - errorMargin:  buffer for mistakes and rework
 *  - topUp:        additional for procurement safety
 *  - accessories:  multiplier for consumables (crosses, tape, etc.)
 *  - packagingRound: rounding bias when converting to packages
 */
export interface AccuracyModifiers {
  waste: number;
  cutting: number;
  unevenness: number;
  overconsumption: number;
  errorMargin: number;
  topUp: number;
  accessories: number;
  packagingRound: number;
}

/** Reason code explaining why a modifier was applied */
export interface AppliedModifier {
  key: keyof AccuracyModifiers;
  label: string;
  value: number;
  reason: string;
}

/** Full explanation of how accuracy mode affected the result */
export interface AccuracyExplanation {
  mode: AccuracyMode;
  modeLabel: string;
  combinedMultiplier: number;
  appliedModifiers: AppliedModifier[];
  notes: string[];
}

// ── Material category modifier profiles ──────────────────────────────────────

/**
 * Material categories with tailored modifier profiles.
 * Each profile reflects real construction practice for that material type.
 */
export type MaterialCategory =
  | "tile"
  | "tile_adhesive"
  | "grout"
  | "primer"
  | "wallpaper"
  | "putty"
  | "paint"
  | "plaster"
  | "decorative_stone"
  | "drywall"
  | "fasteners"
  | "insulation"
  | "flooring"
  | "concrete"
  | "waterproofing"
  | "generic";

/**
 * Modifier labels in Russian for UI/explainability.
 */
const MODIFIER_LABELS: Record<keyof AccuracyModifiers, string> = {
  waste: "Отходы материала",
  cutting: "Подрезка и раскрой",
  unevenness: "Неровности основания",
  overconsumption: "Перерасход при нанесении",
  errorMargin: "Запас на ошибки",
  topUp: "Добор материала",
  accessories: "Расходники и комплектующие",
  packagingRound: "Округление до упаковки",
};

/**
 * Modifier reasons in Russian — explain why each mode applies this coefficient.
 */
const MODIFIER_REASONS: Record<AccuracyMode, Record<keyof AccuracyModifiers, string>> = {
  basic: {
    waste: "минимальные потери по паспортной норме",
    cutting: "прямой рез, без подгонки",
    unevenness: "ровное основание (по норме)",
    overconsumption: "нанесение строго по инструкции",
    errorMargin: "без запаса на ошибки",
    topUp: "без запаса на добор",
    accessories: "минимум расходников",
    packagingRound: "по точному расчёту",
  },
  realistic: {
    waste: "типичные потери при обычном ремонте",
    cutting: "стандартная подрезка у стен и углов",
    unevenness: "обычные неровности (±2-3 мм)",
    overconsumption: "реальный расход мастера среднего уровня",
    errorMargin: "небольшой запас на типичные ошибки",
    topUp: "разумный резерв на добор",
    accessories: "обычный комплект расходников",
    packagingRound: "округление с минимальным остатком",
  },
  professional: {
    waste: "учёт потерь при сложных условиях и большом формате",
    cutting: "подрезка с учётом рисунка, углов и радиусов",
    unevenness: "неровное или проблемное основание (±5-8 мм)",
    overconsumption: "запас на двойное нанесение и сложный монтаж",
    errorMargin: "резерв на переделку и непредвиденные потери",
    topUp: "запас чтобы не останавливать работу",
    accessories: "полный комплект с резервом",
    packagingRound: "округление вверх с запасом на возврат",
  },
  custom: {
    waste: "пользовательская настройка отходов",
    cutting: "пользовательская настройка подрезки",
    unevenness: "пользовательская настройка неровностей",
    overconsumption: "пользовательская настройка перерасхода",
    errorMargin: "пользовательская настройка запаса на ошибки",
    topUp: "пользовательская настройка добора",
    accessories: "пользовательская настройка расходников",
    packagingRound: "пользовательская настройка округления",
  },
};

// ── Modifier profiles loaded from shared JSON config ─────────────────────────

/**
 * Profiles loaded from configs/accuracy-profiles.json.
 * This JSON file is the single source of truth for accuracy modifiers,
 * shared with Flutter via the sync:specs pipeline.
 */
const MODIFIER_PROFILES: Record<MaterialCategory, Record<AccuracyMode, AccuracyModifiers>> =
  accuracyProfilesJson.profiles as Record<MaterialCategory, Record<AccuracyMode, AccuracyModifiers>>;

// ── Core API ─────────────────────────────────────────────────────────────────

/** Custom overrides for "custom" mode */
let customModifierOverrides: Partial<AccuracyModifiers> | null = null;

/**
 * Set custom modifier overrides. Used when mode is "custom".
 * Pass null to reset to defaults.
 */
export function setCustomModifiers(overrides: Partial<AccuracyModifiers> | null): void {
  customModifierOverrides = overrides;
}

/**
 * Get the current custom modifier overrides.
 */
export function getCustomModifiers(): Partial<AccuracyModifiers> | null {
  return customModifierOverrides;
}

/**
 * Get modifiers for a given material category and accuracy mode.
 * In "custom" mode, starts from "professional" profile and applies overrides.
 */
export function getAccuracyModifiers(
  category: MaterialCategory,
  mode: AccuracyMode,
): AccuracyModifiers {
  if (mode === "custom") {
    const base = MODIFIER_PROFILES[category]?.professional ?? MODIFIER_PROFILES.generic.professional;
    if (!customModifierOverrides) return base;
    return { ...base, ...customModifierOverrides };
  }
  return MODIFIER_PROFILES[category]?.[mode] ?? MODIFIER_PROFILES.generic[mode];
}

/**
 * Compute the combined multiplier from accuracy modifiers.
 * Only coefficients that differ from 1.0 are included.
 */
export function computeAccuracyMultiplier(modifiers: AccuracyModifiers): number {
  return (
    modifiers.waste *
    modifiers.cutting *
    modifiers.unevenness *
    modifiers.overconsumption *
    modifiers.errorMargin *
    modifiers.topUp *
    modifiers.accessories *
    modifiers.packagingRound
  );
}

/**
 * Apply accuracy mode to a base value (e.g., exact_need).
 * Returns the adjusted value and explanation.
 */
export function applyAccuracyMode(
  baseValue: number,
  category: MaterialCategory,
  mode: AccuracyMode,
): { adjustedValue: number; explanation: AccuracyExplanation } {
  const modifiers = getAccuracyModifiers(category, mode);
  const multiplier = computeAccuracyMultiplier(modifiers);
  const adjustedValue = baseValue * multiplier;

  const appliedModifiers: AppliedModifier[] = [];
  for (const key of Object.keys(modifiers) as Array<keyof AccuracyModifiers>) {
    if (modifiers[key] !== 1.0) {
      appliedModifiers.push({
        key,
        label: MODIFIER_LABELS[key],
        value: modifiers[key],
        reason: MODIFIER_REASONS[mode][key],
      });
    }
  }

  const explanation: AccuracyExplanation = {
    mode,
    modeLabel: ACCURACY_MODE_LABELS[mode],
    combinedMultiplier: multiplier,
    appliedModifiers,
    notes: buildExplanationNotes(mode, appliedModifiers),
  };

  return { adjustedValue, explanation };
}

/**
 * Get the accessories multiplier only — for consumables that scale differently.
 */
export function getAccessoriesMultiplier(
  category: MaterialCategory,
  mode: AccuracyMode,
): number {
  return getAccuracyModifiers(category, mode).accessories;
}

/**
 * Get the primary material multiplier (all factors except accessories).
 * Use this when you need to apply the mode to the main material separately
 * from consumables.
 */
export function getPrimaryMultiplier(
  category: MaterialCategory,
  mode: AccuracyMode,
): number {
  const m = getAccuracyModifiers(category, mode);
  return (
    m.waste *
    m.cutting *
    m.unevenness *
    m.overconsumption *
    m.errorMargin *
    m.topUp *
    m.packagingRound
  );
}

// ── Labels ───────────────────────────────────────────────────────────────────

export const ACCURACY_MODE_LABELS: Record<AccuracyMode, string> = {
  basic: "Базовый",
  realistic: "Реальный",
  professional: "Профессиональный",
  custom: "Свой",
};

export const ACCURACY_MODE_DESCRIPTIONS: Record<AccuracyMode, string> = {
  basic: "Для быстрой оценки",
  realistic: "Для обычного ремонта",
  professional: "Для сложных условий и закупки с запасом",
  custom: "Свои коэффициенты",
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function buildExplanationNotes(mode: AccuracyMode, applied: AppliedModifier[]): string[] {
  if (mode === "basic") {
    return ["Расчёт по нормативной базе без практических поправок"];
  }

  const notes: string[] = [];

  if (mode === "realistic") {
    notes.push("Учтены типичные условия обычного ремонта");
  } else {
    notes.push("Учтены сложные условия и осторожная закупка");
  }

  if (applied.length > 0) {
    const top = applied
      .filter((m) => m.value >= 1.03)
      .sort((a, b) => b.value - a.value)
      .slice(0, 3);

    for (const m of top) {
      const pct = Math.round((m.value - 1) * 100);
      notes.push(`${m.label}: +${pct}% (${m.reason})`);
    }
  }

  return notes;
}

// ── Layer recommendations ────────────────────────────────────────────────────

export interface LayerRecommendation {
  primerExtraCoats: number;
  puttyExtraLayers: number;
  note: string | null;
}

/**
 * Recommend extra coats/layers based on accuracy mode.
 * - basic: no extra layers
 * - realistic: +0 extra (user-specified layers are sufficient)
 * - professional: +1 primer coat on absorbent surfaces,
 *   +1 putty layer for under-paint finish
 */
export function getLayerRecommendation(
  mode: AccuracyMode,
  context?: {
    surfaceAbsorbent?: boolean;
    finishForPaint?: boolean;
  },
): LayerRecommendation {
  if (mode === "basic" || mode === "realistic") {
    return { primerExtraCoats: 0, puttyExtraLayers: 0, note: null };
  }
  // professional
  let primerExtra = 0;
  let puttyExtra = 0;
  const notes: string[] = [];

  if (context?.surfaceAbsorbent) {
    primerExtra = 1;
    notes.push("Доп. слой грунтовки для впитывающего основания");
  }
  if (context?.finishForPaint) {
    puttyExtra = 1;
    notes.push("Доп. слой финишной шпаклёвки под покраску");
  }

  return {
    primerExtraCoats: primerExtra,
    puttyExtraLayers: puttyExtra,
    note: notes.length > 0 ? notes.join(". ") : null,
  };
}

// ── Invariant checks ─────────────────────────────────────────────────────────

/**
 * Sanity checks for accuracy mode results.
 * Returns warnings if invariants are violated.
 */
export function checkAccuracyInvariants(
  basicValue: number,
  realisticValue: number,
  professionalValue: number,
): string[] {
  const warnings: string[] = [];

  if (realisticValue < basicValue * 0.99) {
    warnings.push("Реальный режим дал результат ниже Базового — проверьте логику модификаторов");
  }
  if (professionalValue < realisticValue * 0.99) {
    warnings.push("Профессиональный режим дал результат ниже Реального — проверьте логику модификаторов");
  }
  if (basicValue < 0 || realisticValue < 0 || professionalValue < 0) {
    warnings.push("Отрицательное значение расчёта — проверьте входные данные");
  }

  return warnings;
}
