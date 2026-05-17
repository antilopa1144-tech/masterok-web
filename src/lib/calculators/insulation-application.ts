/**
 * Назначение утепления («Что утепляем») — единый источник правил для UI, движка и списка материалов.
 */

export const INSULATION_APPLICATION = {
  FACADE: 0,
  INTERNAL: 1,
  ROOF: 2,
  FLOOR: 3,
  FOUNDATION: 4,
} as const;

export type InsulationApplicationId =
  (typeof INSULATION_APPLICATION)[keyof typeof INSULATION_APPLICATION];

export interface ApplicationProfile {
  readonly id: InsulationApplicationId;
  readonly shortLabel: string;
  /** mountSystem в движке: 0 = СФТК, 1 = каркас/пирог без мокрого фасада */
  readonly defaultMountSystem: number;
  /** Если задано — пользователь не выбирает систему, всегда это значение */
  readonly fixedMountSystem?: number;
  readonly showMountSystemField: boolean;
  readonly defaultDensityMineral: number;
  readonly recommendedInsulationType?: number;
}

export const APPLICATION_PROFILES: readonly ApplicationProfile[] = [
  {
    id: INSULATION_APPLICATION.FACADE,
    shortLabel: "фасад",
    defaultMountSystem: 0,
    showMountSystemField: true,
    defaultDensityMineral: 80,
  },
  {
    id: INSULATION_APPLICATION.INTERNAL,
    shortLabel: "внутренняя стена",
    defaultMountSystem: 1,
    fixedMountSystem: 1,
    showMountSystemField: false,
    defaultDensityMineral: 45,
  },
  {
    id: INSULATION_APPLICATION.ROOF,
    shortLabel: "кровля",
    defaultMountSystem: 1,
    fixedMountSystem: 1,
    showMountSystemField: false,
    defaultDensityMineral: 35,
  },
  {
    id: INSULATION_APPLICATION.FLOOR,
    shortLabel: "пол",
    defaultMountSystem: 1,
    fixedMountSystem: 1,
    showMountSystemField: false,
    defaultDensityMineral: 150,
  },
  {
    id: INSULATION_APPLICATION.FOUNDATION,
    shortLabel: "цоколь",
    defaultMountSystem: 1,
    fixedMountSystem: 1,
    showMountSystemField: false,
    defaultDensityMineral: 80,
    recommendedInsulationType: 1,
  },
] as const;

export function getApplicationProfile(application: number): ApplicationProfile {
  return (
    APPLICATION_PROFILES.find((p) => p.id === application) ?? APPLICATION_PROFILES[0]
  );
}

export function shouldShowMountSystemField(application: number): boolean {
  return getApplicationProfile(application).showMountSystemField;
}

export function resolveMountSystemForApplication(
  application: number,
  userMount: number,
): { mountSystem: number; warning?: string } {
  const profile = getApplicationProfile(application);

  if (profile.fixedMountSystem !== undefined) {
    if (userMount === 0) {
      return {
        mountSystem: profile.fixedMountSystem,
        warning: mountOverrideWarning(application),
      };
    }
    return { mountSystem: profile.fixedMountSystem };
  }

  const mount = userMount === 0 || userMount === 1 ? userMount : profile.defaultMountSystem;
  return { mountSystem: mount };
}

function mountOverrideWarning(application: number): string {
  switch (application) {
    case INSULATION_APPLICATION.INTERNAL:
      return (
        "Для внутренних стен мокрый штукатурный фасад (СФТК) не применяется. " +
        "Расчёт выполнен для каркаса (стойки): утеплитель в проёме, пароизоляция с тёплой стороны, без фасадного клея и сетки."
      );
    case INSULATION_APPLICATION.ROOF:
      return (
        "Для кровли и мансарды СФТК не используется. " +
        "Укладка между стропилами/балками: пароизоляция снизу (из помещения), ветрозащита сверху — без штукатурного фасада."
      );
    case INSULATION_APPLICATION.FLOOR:
      return (
        "Для пола и перекрытий мокрый фасад и обрешётка «как на стене» не применяются. " +
        "Утеплитель между лагами или под стяжку: без бруса каркаса и ветрозащиты; для минваты — пароизоляция с тёплой стороны."
      );
    case INSULATION_APPLICATION.FOUNDATION:
      return (
        "Для цоколя и фундамента СФТК не применяется. " +
        "Обычно клеят или крепят плиты ЭППС/минваты к основанию — без фасадной сетки и каркаса из бруса."
      );
    default:
      return "Для выбранного назначения система монтажа скорректирована.";
  }
}

/** Подпись системы для баннера списка материалов */
export function applicationMountLabel(
  application: number,
  mountSystem: number,
  materialForm: number,
): string {
  const app = getApplicationProfile(application);
  if (application === INSULATION_APPLICATION.FLOOR) {
    return "между лагами / под стяжку";
  }
  if (application === INSULATION_APPLICATION.INTERNAL) {
    return "каркас (стойки), пароизоляция с тёплой стороны";
  }
  if (application === INSULATION_APPLICATION.ROOF) {
    return "между стропилами, мембраны";
  }
  if (application === INSULATION_APPLICATION.FOUNDATION) {
    return "цоколь: крепёж плит, без СФТК";
  }
  if (materialForm === 1) {
    return mountSystem === 0
      ? "для рулонов выберите каркас или кровлю/фасад (вентфасад)"
      : "вентфасад / каркас";
  }
  return mountSystem === 0 ? "СФТК (мокрый фасад)" : "каркас / вентфасад";
}
