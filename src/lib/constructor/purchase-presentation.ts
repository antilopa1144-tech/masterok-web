import type { PurchaseLine } from "./core";
import type { FinishComparison } from "./comparison";
import { formatMoney, formatNumber } from "./presentation";

/** Display the engine's final values without recalculating reserve or packaging. */
export function purchaseFacts(line: PurchaseLine): Array<{ label: string; value: string }> {
  const base = line.baseBoards ?? line.baseTiles ?? line.exactNeedKg;
  const reserve = line.reserveBoards ?? line.reserveTiles ?? line.reserveKg;
  const rounded = line.roundedBoards ?? line.roundedTiles ?? line.neededKg;
  const purchased = line.purchasedBoards ?? line.purchasedTiles ?? line.purchasedKg;
  const surplus = line.packSurplusBoards ?? line.packSurplusTiles ?? line.packSurplusKg;
  const unit = line.exactNeedKg !== undefined ? "кг" : "шт.";
  const facts: Array<{ label: string; value: string }> = [];
  if (base !== undefined) facts.push({ label: "По раскладке", value: `${formatNumber(base, 3)} ${unit}` });
  if (line.exactNeedKg !== undefined) facts[0].label = "По расходу товара";
  if (reserve !== undefined) facts.push({ label: "Резерв", value: `${formatNumber(reserve, 3)} ${unit}` });
  if (rounded !== undefined) facts.push({ label: "Нужно с резервом", value: `${formatNumber(rounded, 3)} ${unit}` });
  if (purchased !== undefined) facts.push({ label: "В упаковках", value: `${formatNumber(purchased, 3)} ${unit}${line.purchasedAreaM2 !== undefined ? ` · ${formatNumber(line.purchasedAreaM2, 3)} м²` : ""}` });
  if (surplus !== undefined) facts.push({ label: "Сверх потребности", value: `${formatNumber(surplus, 3)} ${unit}` });
  return facts;
}

export function purchaseCostText(cost: FinishComparison["cost"]): { label: string; value: string } {
  if (!cost.hasPrices) return { label: "Стоимость материалов", value: "Цены не заданы" };
  return {
    label: cost.missingLines || cost.unconfiguredMixtures ? "Сумма позиций с заданной ценой" : cost.estimated ? "Оценка стоимости материалов" : "Стоимость по введённым ценам",
    value: formatMoney(cost.knownRub),
  };
}
