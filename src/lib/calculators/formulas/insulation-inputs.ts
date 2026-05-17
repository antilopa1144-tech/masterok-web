/**
 * Нормализация входов калькулятора утеплителя: назначение → система монтажа,
 * плотность по умолчанию, предупреждения о несовместимости.
 */

export const INSULATION_APPLICATION = {
  FACADE: 0,
  INTERNAL: 1,
  ROOF: 2,
  FLOOR: 3,
  FOUNDATION: 4,
} as const;

/** mountSystem: 0 = СФТК, 1 = каркас / вентфасад */
export interface ApplicationProfile {
  readonly mountSystem: number;
  readonly defaultDensityMineral: number;
  /** Если true — мокрый фасад недопустим, mountSystem принудительно 1 */
  readonly forceFrameMount: boolean;
  /** СФТК-материалы (клей, сетка, штукатурка) допустимы */
  readonly allowWetFacadeMaterials: boolean;
  readonly recommendedInsulationType?: number;
}

export const APPLICATION_PROFILES: ApplicationProfile[] = [
  {
    mountSystem: 0,
    defaultDensityMineral: 80,
    forceFrameMount: false,
    allowWetFacadeMaterials: true,
  },
  {
    mountSystem: 1,
    defaultDensityMineral: 45,
    forceFrameMount: true,
    allowWetFacadeMaterials: false,
  },
  {
    mountSystem: 1,
    defaultDensityMineral: 35,
    forceFrameMount: true,
    allowWetFacadeMaterials: false,
  },
  {
    mountSystem: 1,
    defaultDensityMineral: 150,
    forceFrameMount: true,
    allowWetFacadeMaterials: false,
  },
  {
    mountSystem: 0,
    defaultDensityMineral: 80,
    forceFrameMount: false,
    allowWetFacadeMaterials: true,
    recommendedInsulationType: 1,
  },
];

export function getApplicationProfile(application: number): ApplicationProfile {
  return APPLICATION_PROFILES[Math.max(0, Math.min(4, application))] ?? APPLICATION_PROFILES[0];
}

const WET_FACADE_MIN_DENSITY = 80;
const WET_FACADE_MAX_DENSITY = 95;
const FRAME_OVERKILL_DENSITY = 80;

export interface EnrichInsulationInputsResult {
  enriched: Record<string, unknown>;
  warnings: string[];
}

/**
 * Подготавливает inputs перед вызовом движка: назначение, mountSystem, плотность.
 */
export function enrichInsulationInputs(
  inputs: Record<string, unknown>,
  hasManufacturer: boolean,
): EnrichInsulationInputsResult {
  const warnings: string[] = [];
  const enriched: Record<string, unknown> = { ...inputs };

  const application = Math.round(Number(inputs.application ?? INSULATION_APPLICATION.FACADE));
  const profile = getApplicationProfile(application);
  const userMount = Number(inputs.mountSystem ?? profile.mountSystem);

  if (profile.forceFrameMount && userMount === 0) {
    warnings.push(
      "Для выбранного назначения (внутренние стены, кровля, пол) мокрый штукатурный фасад не применяется. " +
        "Система монтажа переключена на каркасную — учтены пароизоляция и ветрозащита, без фасадного клея и сетки.",
    );
    enriched.mountSystem = 1;
  } else if (!profile.allowWetFacadeMaterials && userMount === 0) {
    enriched.mountSystem = 1;
  } else {
    enriched.mountSystem = userMount;
  }

  const insulationType = Number(enriched.insulationType ?? inputs.insulationType ?? 0);

  if (
    profile.recommendedInsulationType !== undefined &&
    insulationType === 0 &&
    application === INSULATION_APPLICATION.FOUNDATION
  ) {
    warnings.push(
      "Для цоколя и фундамента чаще берут ЭППС (пеноплекс): он не впитывает воду. " +
        "Минвата возможна, но нужна гидроизоляция и правильный пирог.",
    );
  }

  if (!hasManufacturer && insulationType === 0) {
    const userDensity = Number(inputs.density ?? 0);
    const schemaDefaultDensity = 80;
    if (userDensity === 0) {
      enriched.density = profile.defaultDensityMineral;
    } else if (
      userDensity === schemaDefaultDensity &&
      application !== INSULATION_APPLICATION.FACADE &&
      profile.defaultDensityMineral !== schemaDefaultDensity
    ) {
      // Поле плотности по умолчанию 80 кг/м³, но для каркаса/кровли/пола нужна другая.
      enriched.density = profile.defaultDensityMineral;
    }
  }

  return { enriched, warnings };
}

export interface DensityCheckResult {
  warnings: string[];
  practicalNotes: string[];
}

/** Проверка плотности минваты vs система монтажа (СП 293 / практика СФТК). */
export function checkMineralWoolDensity(
  effectiveDensity: number,
  mountSystem: number,
): DensityCheckResult {
  const warnings: string[] = [];
  const practicalNotes: string[] = [];

  if (effectiveDensity <= 0) {
    return { warnings, practicalNotes };
  }

  if (mountSystem === 0 && effectiveDensity < WET_FACADE_MIN_DENSITY) {
    warnings.push(
      `Плотность ${effectiveDensity} кг/м³ слишком низкая для мокрого штукатурного фасада (СФТК). ` +
        `Под штукатуркой плита просядет — нужна фасадная минвата минимум ${WET_FACADE_MIN_DENSITY} кг/м³ ` +
        `(Rockwool Фасад Баттс, Технониколь Технофас 80, Knauf Insulation FKD-S Thermal).`,
    );
  }

  if (mountSystem === 0 && effectiveDensity > WET_FACADE_MAX_DENSITY) {
    warnings.push(
      `Плотность ${effectiveDensity} кг/м³ — материал для вентилируемого фасада. ` +
        `Для мокрого штукатурного фасада оптимально ${WET_FACADE_MIN_DENSITY}–${WET_FACADE_MAX_DENSITY} кг/м³.`,
    );
  }

  if (mountSystem === 1 && effectiveDensity >= FRAME_OVERKILL_DENSITY) {
    practicalNotes.push(
      `Плотность ${effectiveDensity} кг/м³ избыточна для каркасной системы: ` +
        `для стен и кровли достаточно 35–45 кг/м³ — экономия до 30–40% без потери тепла.`,
    );
  }

  return { warnings, practicalNotes };
}

/** Длина тарельчатого дюбеля: толщина утепления + 50 мм в несущее основание (СП 293.1325800). */
export function dowelLengthMm(insulationThicknessMm: number): number {
  return Math.round(insulationThicknessMm + 50);
}
