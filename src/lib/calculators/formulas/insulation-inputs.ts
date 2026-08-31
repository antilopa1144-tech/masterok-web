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

const WET_FACADE_REFERENCE_DENSITY = 80;
const FRAME_REFERENCE_DENSITY = 80;

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
  catalogDensityKgM3?: number,
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
      "Для цоколя и фундамента выбран ручной расчёт минваты. Калькулятор не проверяет воздействие воды, нагрузки, гидроизоляцию, пожарные ограничения и совместимость слоёв — материал задают проектом и документацией системы.",
    );
  }

  if (application === INSULATION_APPLICATION.FLOOR && insulationType === 0) {
    const d = catalogDensityKgM3 ?? Number(enriched.density ?? inputs.density ?? 0);
    if (d > 0 && d < 100) {
      warnings.push(
        `Для пола выбрана минвата ${d} кг/м³. Одной плотности недостаточно, чтобы подтвердить работу под нагрузкой или стяжкой: ` +
          "проверьте назначение, прочность и схему пола по документации материала и проекту.",
      );
    } else {
      warnings.push(
        "Для пола калькулятор считает только количество. Схему по лагам или под стяжку, воздействие влаги и допустимую нагрузку нужно подтвердить проектом и характеристиками выбранного материала.",
      );
    }
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

/** Справочный флаг плотности: не заменяет проверку назначения продукта и системы. */
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

  if (isWetFacadeContext && effectiveDensity < WET_FACADE_REFERENCE_DENSITY) {
    warnings.push(
      `Плотность ${effectiveDensity} кг/м³ ниже встроенного справочного порога ${WET_FACADE_REFERENCE_DENSITY} кг/м³ для штукатурного фасада. ` +
        "Пригодность нельзя определять только по плотности: выберите плиту, прямо разрешённую документацией конкретной СФТК.",
    );
  }

  if (
    mountSystem === 1 &&
    application === INSULATION_APPLICATION.FLOOR &&
    effectiveDensity > 0 &&
    effectiveDensity < 100
  ) {
    warnings.push(
      `Для пола выбрана минвата ${effectiveDensity} кг/м³. Калькулятор не проверяет прочность на сжатие и расчётную нагрузку; ` +
        "допустимость материала под стяжкой или между лагами подтвердите по документации и проекту.",
    );
  }

  if (
    mountSystem === 1 &&
    application !== INSULATION_APPLICATION.FLOOR &&
    effectiveDensity >= FRAME_REFERENCE_DENSITY &&
    application !== INSULATION_APPLICATION.FOUNDATION
  ) {
    practicalNotes.push(
      `Для каркасной конструкции выбрана минвата ${effectiveDensity} кг/м³. Плотность показана справочно и сама по себе не подтверждает удержание в каркасе, прочность, теплотехнику или пригодность изделия; проверьте назначение продукта.`,
    );
  }

  return { warnings, practicalNotes };
}

/** Предварительная длина для ведомости: толщина утепления + 50 мм. Не проектный подбор анкера. */
export function dowelLengthMm(insulationThicknessMm: number): number {
  return Math.round(insulationThicknessMm + 50);
}
