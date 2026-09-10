import type { CanonicalMaterialResult } from "./canonical";
import { roundDisplay } from "./units";

// Web extension: values are seller parameters, not construction consumption norms.
export const UNDERLAY_CUT = {
  width: { min: 0.1, max: 5, step: 0.1, defaultValue: 1 },
  saleStep: { min: 0.1, max: 10, step: 0.1, defaultValue: 1 },
};

export function underlayCutMaterial(area: number, widthInput?: number, stepInput?: number): CanonicalMaterialResult {
  const normalize = (value: number | undefined, rule: typeof UNDERLAY_CUT.width) =>
    Number.isFinite(value) ? Math.max(rule.min, Math.min(rule.max, value!)) : rule.defaultValue;
  const width = normalize(widthInput, UNDERLAY_CUT.width);
  const step = normalize(stepInput, UNDERLAY_CUT.saleStep);
  const exactLength = area / width;
  const increments = exactLength / step;
  // Suppress floating-point noise at an exact sale increment, not real shortfalls.
  const purchase = Math.max(0, roundDisplay(Math.ceil(increments - Number.EPSILON * Math.max(1, increments) * 4) * step, 6));
  const text = (value: number) => roundDisplay(value, 3).toLocaleString("ru-RU");
  return {
    name: "Подложка под ламинат — на отрез",
    quantity: roundDisplay(exactLength, 6),
    purchaseQty: purchase,
    unit: "пог. м",
    category: "Подложка",
    subtitle: `Ширина: ${text(width)} м; шаг продажи: ${text(step)} пог. м. Потребность с запасом: ${text(area)} м². Всего к покупке: ${text(purchase * width)} м². Остаток сверх потребности: ${text(Math.max(0, purchase * width - area))} м². Оценка по площади, не схема раскроя: проверьте длины полос и пригодность обрезков.`,
  };
}
