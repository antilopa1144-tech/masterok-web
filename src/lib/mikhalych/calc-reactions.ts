import type { CalculatorResult } from "@/lib/calculators/types";

const OPENERS = [
  "Посмотрел твой расчёт.",
  "Так, пробежался по цифрам.",
  "Ну, глянул что насчитал.",
  "Смотрю список — в целом живая картина.",
];

const OK_CLOSERS = [
  "Для закупки можно идти, но мелочи ниже проверь.",
  "В магазин с таким списком уже можно, если не жмёшь на запас.",
  "По объёмам похоже на правду — не забудь довезти мелочёвку.",
];

function pick<T>(arr: T[], seed: number): T {
  return arr[Math.abs(seed) % arr.length]!;
}

/** Мгновенная «реакция» без AI — по warnings и эвристикам. */
export function buildInstantCalcReaction(
  result: CalculatorResult,
  seed = 0,
): string {
  const parts: string[] = [pick(OPENERS, seed)];

  if (result.warnings.length > 0) {
    parts.push(`Калькулятор уже орёт: ${result.warnings[0]}`);
    if (result.warnings.length > 1) {
      parts.push(`И ещё ${result.warnings.length - 1} ${result.warnings.length === 2 ? "замечание" : "замечания"} в жёлтом блоке выше.`);
    }
  } else if (result.materials.length > 25) {
    parts.push("Позиций много — на объекте без списка потеряешься, сохрани в проект или распечатай.");
  } else if (result.materials.length <= 2) {
    parts.push("Список короткий — зато закупка простая.");
  } else {
    parts.push(pick(OK_CLOSERS, seed + 1));
  }

  const main = result.materials.find((m) => m.highlight) ?? result.materials[0];
  if (main) {
    const qty = main.purchaseQty ?? main.withReserve ?? main.quantity;
    parts.push(`Главное по объёму — ${main.name.toLowerCase()}, ориентир ${qty} ${main.unit}.`);
  }

  return parts.join(" ");
}
