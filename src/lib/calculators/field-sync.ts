import type { CalculatorField } from "./types";
import { resolveFieldOptions } from "./field-options";
import {
  getDefaultProductIdForForm,
  getDefaultProductIdForApplication,
} from "./insulation-catalog";
import { syncFieldsForApplicationChange } from "./insulation-application";
import { fieldUsesDynamicOptions, thicknessForClimateAndProduct } from "./insulation-smart";

/**
 * Синхронизация зависимых полей после изменения одного поля формы.
 *
 * Мутирует `next` (черновик нового состояния значений) и возвращает его же.
 * Вынесено из useCalculator.handleChange: это доменные правила (каталог
 * утеплителя, толщина по климату, дефолтные линейки), а не UI-состояние.
 */
export function syncDependentFields(
  calculator: { id: string; fields: CalculatorField[] },
  key: string,
  value: number,
  next: Record<string, number>,
): Record<string, number> {
  // Авто-подстановка значений зависимых полей: если изменился бренд, то
  // у полей с `optionsFromBrand` текущие значения могут оказаться вне
  // допустимого набора (например, у Пеноплэкс Комфорт нет 80 мм). В этом
  // случае подменяем на ближайшее значение из новых опций.
  if (key === "manufacturer" || key === "materialForm" || key === "productId") {
    for (const f of calculator.fields) {
      if (!fieldUsesDynamicOptions(f)) continue;
      const opts = resolveFieldOptions(f, next);
      if (!opts || opts.length === 0) continue;
      const current = next[f.key];
      if (opts.some((o) => o.value === current)) continue;
      const closest = opts.reduce((best, o) =>
        Math.abs(o.value - current) < Math.abs(best.value - current) ? o : best,
      );
      next[f.key] = closest.value;
    }
  }

  if (calculator.id === "insulation") {
    const application = Math.round(next.application ?? 0);

    if (key === "application") {
      Object.assign(next, syncFieldsForApplicationChange(Math.round(value), next));
      next.productId = getDefaultProductIdForApplication(
        Math.round(next.application ?? 0),
        Math.round(next.materialForm ?? 0),
      );
    }

    if (key === "materialForm") {
      next.productId = getDefaultProductIdForApplication(
        application,
        Math.round(value),
      );
    }

    if (key === "application" || key === "climateZone" || key === "materialForm") {
      next.thickness = thicknessForClimateAndProduct(
        Math.round(next.climateZone ?? 1),
        Math.round(next.productId ?? 0),
        calculator.fields,
        Math.round(next.application ?? 0),
      );
    } else if (key === "productId") {
      const thicknessOpts = resolveFieldOptions(
        calculator.fields.find((f) => f.key === "thickness")!,
        next,
      );
      if (thicknessOpts?.length && !thicknessOpts.some((o) => o.value === next.thickness)) {
        next.thickness = thicknessForClimateAndProduct(
          Math.round(next.climateZone ?? 1),
          Math.round(next.productId ?? 0),
          calculator.fields,
          Math.round(next.application ?? 0),
        );
      }
    }
  } else if (key === "materialForm") {
    next.productId = getDefaultProductIdForForm(value);
  } else if (key === "productId" || key === "materialForm") {
    const thicknessOpts = resolveFieldOptions(
      calculator.fields.find((f) => f.key === "thickness")!,
      next,
    );
    if (thicknessOpts?.length) {
      const t = next.thickness;
      if (!thicknessOpts.some((o) => o.value === t)) {
        next.thickness = thicknessOpts[Math.floor(thicknessOpts.length / 2)]!.value;
      }
    }
  }

  return next;
}
