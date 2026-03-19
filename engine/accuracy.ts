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

// ── Types ────────────────────────────────────────────────────────────────────

export type AccuracyMode = "basic" | "realistic" | "professional";

export const ACCURACY_MODES: AccuracyMode[] = ["basic", "realistic", "professional"];

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
};

// ── Modifier profiles per material category ──────────────────────────────────

/**
 * Each profile: { basic, realistic, professional } modifiers.
 *
 * Values are multiplicative coefficients applied to the base calculation.
 * 1.0 = no adjustment. Values are chosen based on real construction practice.
 *
 * IMPORTANT: These are NOT arbitrary percentages. Each is justified by
 * material-specific behavior:
 *
 * - Tile: cutting waste depends on layout, format, complexity
 * - Adhesive: consumption depends heavily on surface quality and tile size
 * - Grout: depends on joint geometry and tooling skill
 * - Primer: absorption varies dramatically by surface type
 * - Wallpaper: rapport and width drive waste
 * - Putty: layer count and surface quality dominate
 * - Fasteners: step precision and material type matter
 */
const MODIFIER_PROFILES: Record<MaterialCategory, Record<AccuracyMode, AccuracyModifiers>> = {
  tile: {
    basic: {
      waste: 1.0,
      cutting: 1.0,
      unevenness: 1.0,
      overconsumption: 1.0,
      errorMargin: 1.0,
      topUp: 1.0,
      accessories: 1.0,
      packagingRound: 1.0,
    },
    realistic: {
      waste: 1.03,        // 3% типичный бой и отбраковка
      cutting: 1.02,       // 2% на подрезку у стен
      unevenness: 1.0,     // не влияет на количество плитки
      overconsumption: 1.0, // плитка — не расходный материал
      errorMargin: 1.01,   // 1% на мелкие ошибки
      topUp: 1.02,         // 2% добор на партию
      accessories: 1.05,   // 5% больше крестиков/СВП
      packagingRound: 1.0,
    },
    professional: {
      waste: 1.05,         // 5% бой, калибровка, дефекты
      cutting: 1.04,       // 4% подрезка с учётом рисунка
      unevenness: 1.0,
      overconsumption: 1.0,
      errorMargin: 1.02,   // 2% резерв на переделку
      topUp: 1.03,         // 3% чтобы не останавливаться
      accessories: 1.10,   // 10% полный комплект расходников
      packagingRound: 1.0,
    },
  },

  tile_adhesive: {
    basic: {
      waste: 1.0, cutting: 1.0, unevenness: 1.0, overconsumption: 1.0,
      errorMargin: 1.0, topUp: 1.0, accessories: 1.0, packagingRound: 1.0,
    },
    realistic: {
      waste: 1.02,         // 2% потери при замесе
      cutting: 1.0,
      unevenness: 1.05,    // 5% неровности основания
      overconsumption: 1.04, // 4% реальный расход выше нормы
      errorMargin: 1.0,
      topUp: 1.02,         // 2% добор
      accessories: 1.0,
      packagingRound: 1.0,
    },
    professional: {
      waste: 1.03,         // 3% потери + перезамесы
      cutting: 1.0,
      unevenness: 1.10,    // 10% проблемное основание
      overconsumption: 1.07, // 7% двойное нанесение на крупном формате
      errorMargin: 1.02,
      topUp: 1.03,
      accessories: 1.0,
      packagingRound: 1.0,
    },
  },

  grout: {
    basic: {
      waste: 1.0, cutting: 1.0, unevenness: 1.0, overconsumption: 1.0,
      errorMargin: 1.0, topUp: 1.0, accessories: 1.0, packagingRound: 1.0,
    },
    realistic: {
      waste: 1.03,         // 3% потери при затирке
      cutting: 1.0,
      unevenness: 1.0,
      overconsumption: 1.05, // 5% реальный расход выше формулы
      errorMargin: 1.0,
      topUp: 1.02,
      accessories: 1.0,
      packagingRound: 1.0,
    },
    professional: {
      waste: 1.05,
      cutting: 1.0,
      unevenness: 1.0,
      overconsumption: 1.08, // 8% широкие швы + фактурная плитка
      errorMargin: 1.02,
      topUp: 1.03,
      accessories: 1.0,
      packagingRound: 1.0,
    },
  },

  primer: {
    basic: {
      waste: 1.0, cutting: 1.0, unevenness: 1.0, overconsumption: 1.0,
      errorMargin: 1.0, topUp: 1.0, accessories: 1.0, packagingRound: 1.0,
    },
    realistic: {
      waste: 1.02,
      cutting: 1.0,
      unevenness: 1.03,    // 3% неравномерное впитывание
      overconsumption: 1.05, // 5% стекание, потёки
      errorMargin: 1.0,
      topUp: 1.02,
      accessories: 1.0,
      packagingRound: 1.0,
    },
    professional: {
      waste: 1.03,
      cutting: 1.0,
      unevenness: 1.08,    // 8% сильно впитывающие участки
      overconsumption: 1.08, // 8% неровные, пористые основания
      errorMargin: 1.02,
      topUp: 1.03,
      accessories: 1.0,
      packagingRound: 1.0,
    },
  },

  wallpaper: {
    basic: {
      waste: 1.0, cutting: 1.0, unevenness: 1.0, overconsumption: 1.0,
      errorMargin: 1.0, topUp: 1.0, accessories: 1.0, packagingRound: 1.0,
    },
    realistic: {
      waste: 1.02,         // 2% брак, повреждения
      cutting: 1.03,       // 3% подрезка с раппортом
      unevenness: 1.0,
      overconsumption: 1.0,
      errorMargin: 1.02,   // 2% ошибки при оклейке
      topUp: 1.02,         // 2% запасной рулон
      accessories: 1.05,   // 5% больше клея
      packagingRound: 1.0,
    },
    professional: {
      waste: 1.03,
      cutting: 1.06,       // 6% сложная подгонка, внутренние углы
      unevenness: 1.0,
      overconsumption: 1.0,
      errorMargin: 1.03,   // 3% переклейка полос
      topUp: 1.03,         // 3% партия + будущий ремонт
      accessories: 1.10,   // 10% клей + грунтовка с запасом
      packagingRound: 1.0,
    },
  },

  putty: {
    basic: {
      waste: 1.0, cutting: 1.0, unevenness: 1.0, overconsumption: 1.0,
      errorMargin: 1.0, topUp: 1.0, accessories: 1.0, packagingRound: 1.0,
    },
    realistic: {
      waste: 1.03,         // 3% потери в вёдрах и на шпателе
      cutting: 1.0,
      unevenness: 1.05,    // 5% неровности стены
      overconsumption: 1.04, // 4% перерасход при шпаклевании
      errorMargin: 1.02,   // 2% перешлифовка + доводка
      topUp: 1.02,
      accessories: 1.05,   // 5% серпянка, шкурка
      packagingRound: 1.0,
    },
    professional: {
      waste: 1.05,
      cutting: 1.0,
      unevenness: 1.10,    // 10% стены требуют серьёзного выведения
      overconsumption: 1.07, // 7% многослойная подготовка
      errorMargin: 1.03,
      topUp: 1.03,
      accessories: 1.10,
      packagingRound: 1.0,
    },
  },

  paint: {
    basic: {
      waste: 1.0, cutting: 1.0, unevenness: 1.0, overconsumption: 1.0,
      errorMargin: 1.0, topUp: 1.0, accessories: 1.0, packagingRound: 1.0,
    },
    realistic: {
      waste: 1.02,
      cutting: 1.0,
      unevenness: 1.03,    // 3% впитывание на пористых участках
      overconsumption: 1.05, // 5% перерасход при окраске
      errorMargin: 1.0,
      topUp: 1.02,
      accessories: 1.05,
      packagingRound: 1.0,
    },
    professional: {
      waste: 1.03,
      cutting: 1.0,
      unevenness: 1.07,
      overconsumption: 1.08,
      errorMargin: 1.02,
      topUp: 1.03,
      accessories: 1.10,
      packagingRound: 1.0,
    },
  },

  plaster: {
    basic: {
      waste: 1.0, cutting: 1.0, unevenness: 1.0, overconsumption: 1.0,
      errorMargin: 1.0, topUp: 1.0, accessories: 1.0, packagingRound: 1.0,
    },
    realistic: {
      waste: 1.03,
      cutting: 1.0,
      unevenness: 1.08,    // 8% неровности сильно влияют на расход штукатурки
      overconsumption: 1.05,
      errorMargin: 1.02,
      topUp: 1.02,
      accessories: 1.05,
      packagingRound: 1.0,
    },
    professional: {
      waste: 1.05,
      cutting: 1.0,
      unevenness: 1.15,    // 15% серьёзные перепады на старых стенах
      overconsumption: 1.08,
      errorMargin: 1.03,
      topUp: 1.03,
      accessories: 1.10,
      packagingRound: 1.0,
    },
  },

  decorative_stone: {
    basic: {
      waste: 1.0, cutting: 1.0, unevenness: 1.0, overconsumption: 1.0,
      errorMargin: 1.0, topUp: 1.0, accessories: 1.0, packagingRound: 1.0,
    },
    realistic: {
      waste: 1.03,         // 3% бой при транспортировке
      cutting: 1.04,       // 4% подгонка неровных торцов
      unevenness: 1.0,
      overconsumption: 1.03, // 3% перерасход клея
      errorMargin: 1.02,
      topUp: 1.02,
      accessories: 1.05,
      packagingRound: 1.0,
    },
    professional: {
      waste: 1.05,
      cutting: 1.07,       // 7% сложная подгонка угловых и оконных элементов
      unevenness: 1.0,
      overconsumption: 1.05,
      errorMargin: 1.03,
      topUp: 1.03,
      accessories: 1.10,
      packagingRound: 1.0,
    },
  },

  drywall: {
    basic: {
      waste: 1.0, cutting: 1.0, unevenness: 1.0, overconsumption: 1.0,
      errorMargin: 1.0, topUp: 1.0, accessories: 1.0, packagingRound: 1.0,
    },
    realistic: {
      waste: 1.02,
      cutting: 1.03,       // 3% подрезка под проёмы и короба
      unevenness: 1.0,
      overconsumption: 1.0,
      errorMargin: 1.02,
      topUp: 1.01,
      accessories: 1.05,   // 5% больше саморезов и профиля
      packagingRound: 1.0,
    },
    professional: {
      waste: 1.03,
      cutting: 1.06,       // 6% сложная геометрия, радиусы
      unevenness: 1.0,
      overconsumption: 1.0,
      errorMargin: 1.03,
      topUp: 1.02,
      accessories: 1.10,
      packagingRound: 1.0,
    },
  },

  fasteners: {
    basic: {
      waste: 1.0, cutting: 1.0, unevenness: 1.0, overconsumption: 1.0,
      errorMargin: 1.0, topUp: 1.0, accessories: 1.0, packagingRound: 1.0,
    },
    realistic: {
      waste: 1.02,         // 2% потери (соскальзывание, брак)
      cutting: 1.0,
      unevenness: 1.0,
      overconsumption: 1.03, // 3% лишние точки крепления
      errorMargin: 1.02,   // 2% сломанные биты, перезакручивание
      topUp: 1.03,         // 3% запас в пачке
      accessories: 1.05,   // 5% биты, насадки
      packagingRound: 1.0,
    },
    professional: {
      waste: 1.03,
      cutting: 1.0,
      unevenness: 1.0,
      overconsumption: 1.05,
      errorMargin: 1.03,
      topUp: 1.05,         // 5% закупка пачками с запасом
      accessories: 1.10,
      packagingRound: 1.0,
    },
  },

  insulation: {
    basic: {
      waste: 1.0, cutting: 1.0, unevenness: 1.0, overconsumption: 1.0,
      errorMargin: 1.0, topUp: 1.0, accessories: 1.0, packagingRound: 1.0,
    },
    realistic: {
      waste: 1.02,
      cutting: 1.05,       // 5% подрезка в каркас
      unevenness: 1.0,
      overconsumption: 1.0,
      errorMargin: 1.02,
      topUp: 1.02,
      accessories: 1.05,
      packagingRound: 1.0,
    },
    professional: {
      waste: 1.03,
      cutting: 1.08,       // 8% сложная геометрия, обход коммуникаций
      unevenness: 1.0,
      overconsumption: 1.0,
      errorMargin: 1.03,
      topUp: 1.03,
      accessories: 1.10,
      packagingRound: 1.0,
    },
  },

  flooring: {
    basic: {
      waste: 1.0, cutting: 1.0, unevenness: 1.0, overconsumption: 1.0,
      errorMargin: 1.0, topUp: 1.0, accessories: 1.0, packagingRound: 1.0,
    },
    realistic: {
      waste: 1.02,
      cutting: 1.04,       // 4% подрезка у стен и порогов
      unevenness: 1.0,
      overconsumption: 1.0,
      errorMargin: 1.02,
      topUp: 1.02,
      accessories: 1.05,
      packagingRound: 1.0,
    },
    professional: {
      waste: 1.03,
      cutting: 1.07,       // 7% диагональная укладка, сложные помещения
      unevenness: 1.0,
      overconsumption: 1.0,
      errorMargin: 1.03,
      topUp: 1.03,
      accessories: 1.10,
      packagingRound: 1.0,
    },
  },

  concrete: {
    basic: {
      waste: 1.0, cutting: 1.0, unevenness: 1.0, overconsumption: 1.0,
      errorMargin: 1.0, topUp: 1.0, accessories: 1.0, packagingRound: 1.0,
    },
    realistic: {
      waste: 1.02,
      cutting: 1.0,
      unevenness: 1.03,    // 3% неровности дна/стенок
      overconsumption: 1.03, // 3% утечки в грунт, потери при укладке
      errorMargin: 1.02,
      topUp: 1.02,
      accessories: 1.0,
      packagingRound: 1.0,
    },
    professional: {
      waste: 1.03,
      cutting: 1.0,
      unevenness: 1.05,
      overconsumption: 1.05,
      errorMargin: 1.03,
      topUp: 1.03,
      accessories: 1.0,
      packagingRound: 1.0,
    },
  },

  waterproofing: {
    basic: {
      waste: 1.0, cutting: 1.0, unevenness: 1.0, overconsumption: 1.0,
      errorMargin: 1.0, topUp: 1.0, accessories: 1.0, packagingRound: 1.0,
    },
    realistic: {
      waste: 1.02,
      cutting: 1.03,
      unevenness: 1.05,
      overconsumption: 1.05,
      errorMargin: 1.02,
      topUp: 1.02,
      accessories: 1.05,
      packagingRound: 1.0,
    },
    professional: {
      waste: 1.03,
      cutting: 1.05,
      unevenness: 1.10,
      overconsumption: 1.08,
      errorMargin: 1.03,
      topUp: 1.03,
      accessories: 1.10,
      packagingRound: 1.0,
    },
  },

  generic: {
    basic: {
      waste: 1.0, cutting: 1.0, unevenness: 1.0, overconsumption: 1.0,
      errorMargin: 1.0, topUp: 1.0, accessories: 1.0, packagingRound: 1.0,
    },
    realistic: {
      waste: 1.02,
      cutting: 1.02,
      unevenness: 1.03,
      overconsumption: 1.03,
      errorMargin: 1.02,
      topUp: 1.02,
      accessories: 1.03,
      packagingRound: 1.0,
    },
    professional: {
      waste: 1.04,
      cutting: 1.04,
      unevenness: 1.06,
      overconsumption: 1.05,
      errorMargin: 1.03,
      topUp: 1.03,
      accessories: 1.08,
      packagingRound: 1.0,
    },
  },
};

// ── Core API ─────────────────────────────────────────────────────────────────

/**
 * Get modifiers for a given material category and accuracy mode.
 */
export function getAccuracyModifiers(
  category: MaterialCategory,
  mode: AccuracyMode,
): AccuracyModifiers {
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
};

export const ACCURACY_MODE_DESCRIPTIONS: Record<AccuracyMode, string> = {
  basic: "Для быстрой оценки",
  realistic: "Для обычного ремонта",
  professional: "Для сложных условий и закупки с запасом",
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
