/**
 * Нормализация входов калькулятора утеплителя: назначение → система монтажа,
 * плотность по умолчанию, предупреждения о несовместимости.
 */

import {
  getApplicationProfile,
  INSULATION_APPLICATION,
  resolveMountSystemForApplication,
} from "../insulation-application";

export { INSULATION_APPLICATION } from "../insulation-application";

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
  const userMount = Number(inputs.mountSystem ?? profile.defaultMountSystem);

  const { mountSystem, warning } = resolveMountSystemForApplication(application, userMount);
  enriched.mountSystem = mountSystem;
  if (warning) warnings.push(warning);

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

  if (application === INSULATION_APPLICATION.FLOOR && insulationType === 0) {
    warnings.push(
      "Для пола под стяжку минвата обычно 100–150 кг/м³; лёгкая 35–45 кг/м³ — только между лагами без нагрузки сверху.",
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
  application: number = INSULATION_APPLICATION.FACADE,
): DensityCheckResult {
  const warnings: string[] = [];
  const practicalNotes: string[] = [];

  if (effectiveDensity <= 0) {
    return { warnings, practicalNotes };
  }

  const isWetFacadeContext =
    application === INSULATION_APPLICATION.FACADE && mountSystem === 0;

  if (isWetFacadeContext && effectiveDensity < WET_FACADE_MIN_DENSITY) {
    warnings.push(
      `Плотность ${effectiveDensity} кг/м³ слишком низкая для мокрого штукатурного фасада (СФТК). ` +
        `Под штукатуркой плита просядет — нужна фасадная минвата минимум ${WET_FACADE_MIN_DENSITY} кг/м³ ` +
        `(Rockwool Фасад Баттс, Технониколь Технофас 80, Knauf Insulation FKD-S Thermal).`,
    );
  }

  if (isWetFacadeContext && effectiveDensity > WET_FACADE_MAX_DENSITY) {
    warnings.push(
      `Плотность ${effectiveDensity} кг/м³ — материал для вентилируемого фасада. ` +
        `Для мокрого штукатурного фасада оптимально ${WET_FACADE_MIN_DENSITY}–${WET_FACADE_MAX_DENSITY} кг/м³.`,
    );
  }

  if (
    mountSystem === 1 &&
    application !== INSULATION_APPLICATION.FLOOR &&
    effectiveDensity >= FRAME_OVERKILL_DENSITY &&
    application !== INSULATION_APPLICATION.FOUNDATION
  ) {
    practicalNotes.push(
      `Плотность ${effectiveDensity} кг/м³ избыточна для каркасной стены/кровли: ` +
        `для стоек и стропил достаточно 35–45 кг/м³. Для пола под стяжку — 100–150 кг/м³.`,
    );
  }

  return { warnings, practicalNotes };
}

/** Длина тарельчатого дюбеля: толщина утепления + 50 мм в несущее основание (СП 293.1325800). */
export function dowelLengthMm(insulationThicknessMm: number): number {
  return Math.round(insulationThicknessMm + 50);
}
