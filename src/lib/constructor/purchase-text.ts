import type { ConstructorProject, ProjectCalculation } from "./core";
import { summarizeFinish } from "./comparison";
import { purchaseCostText } from "./purchase-presentation";
import { formatMoney } from "./presentation";

/** A full-project shopping list using the engine's quantities, without new rounding. */
export function purchaseText(project: ConstructorProject, result: ProjectCalculation): string {
  const { cost } = summarizeFinish(project, result);
  const total = purchaseCostText(cost);
  const rooms = new Map(project.rooms.map(room => [room.id, room.name]));
  const lines = result.purchases.map((line, index) => [
    `${index + 1}. ${line.name} — ${String(line.quantity).replace(".", ",")} ${line.unit}`,
    line.detail,
    `Помещения: ${line.roomIds.map(id => rooms.get(id) ?? id).join(", ")}`,
    line.unitPriceRub > 0
      ? `Цена: ${formatMoney(line.unitPriceRub)} / ${line.unit}; сумма: ${formatMoney(line.totalPriceRub)}`
      : line.priceNote || "Цена не задана",
    line.unitPriceRub > 0 ? line.priceNote : "",
  ].filter(Boolean).join("\n"));
  return [
    `Мастерок · ${project.name}`,
    "Список материалов всего проекта. К покупке: запас учтён, упаковки округлены.",
    ...lines,
    `${total.label}: ${total.value}`,
    cost.hasPrices && cost.missingLines ? `Позиций без цены: ${cost.missingLines}. Стоимость проекта неполная.` : "",
    cost.unconfiguredMixtures ? `Смесей без заданного расхода: ${cost.unconfiguredMixtures}. Они не включены в список; уточните расход в разделе «Клей и затирка».` : "",
    "Это ведомость выбранных материалов отделки, не полная смета ремонта. Перед покупкой сверьте товар, фасовку, цены и размеры помещения. Для схем и подробного расчёта скачайте PDF или XLSX.",
  ].filter(Boolean).join("\n\n");
}
