export function formatCost(value: number, fractionDigits = 0): string {
  return value.toLocaleString("ru-RU", {
    maximumFractionDigits: fractionDigits,
    minimumFractionDigits: fractionDigits,
  });
}

export function formatQuantity(value: number, unit: string): string {
  const isIntegerUnit = ["шт", "шт.", "упаковка", "упаковок", "рулон", "рулонов", "мешков", "мешок"].some(
    (u) => unit.toLowerCase().includes(u.replace(".", "")),
  );
  const digits = isIntegerUnit ? 0 : value % 1 === 0 ? 0 : 2;
  return `${formatCost(value, digits)} ${unit}`;
}

export function parsePriceInput(value: string): number {
  const normalized = value.replace(/\s/g, "").replace(",", ".");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}
