import type { ProcurementLine } from "./procurement";
import type { ProjectEstimateTotals } from "./build-estimate";

function escapeCsv(value: string): string {
  if (/[",;\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

export function buildProcurementCsv(
  projectName: string,
  lines: ProcurementLine[],
  prices: Record<string, number>,
  totals: ProjectEstimateTotals,
): string {
  const sep = ";";
  const rows: string[] = [
    ["Смета", projectName].map(escapeCsv).join(sep),
    ["Дата", new Date().toLocaleDateString("ru-RU")].map(escapeCsv).join(sep),
    "",
    ["Категория", "Материал", "Спецификация", "Количество", "Ед.", "Цена", "Сумма"].map(escapeCsv).join(sep),
  ];

  for (const line of lines) {
    const price = prices[line.name] ?? 0;
    const sum = line.quantity * price;
    rows.push(
      [
        line.category,
        line.name,
        (line.subtitles ?? []).join(" | "),
        String(line.quantity).replace(".", ","),
        line.unit,
        price > 0 ? String(price).replace(".", ",") : "",
        sum > 0 ? String(Math.round(sum)).replace(".", ",") : "",
      ]
        .map(escapeCsv)
        .join(sep),
    );
  }

  rows.push("");
  rows.push(["", "", "", "", "", "Материалы", String(totals.materialsSubtotal)].map(escapeCsv).join(sep));
  if (totals.reserveAmount > 0) {
    rows.push(["", "", "", "", "", `Запас ${totals.reservePercent}%`, String(totals.reserveAmount)].map(escapeCsv).join(sep));
  }
  if (totals.deliveryRub > 0) {
    rows.push(["", "", "", "", "", "Доставка", String(totals.deliveryRub)].map(escapeCsv).join(sep));
  }
  rows.push(["", "", "", "", "", "ИТОГО", String(totals.grandTotal)].map(escapeCsv).join(sep));

  return `\uFEFF${rows.join("\n")}`;
}

export function downloadCsv(filename: string, content: string): void {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
