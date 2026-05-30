import { SITE_NAME, SITE_URL } from "@/lib/site";
import { formatCost, formatQuantity } from "@/lib/projects/format";
import { groupProcurementByCategory, type ProcurementLine } from "@/lib/projects/procurement";
import type { ProjectEstimateTotals } from "@/lib/projects/build-estimate";

interface Props {
  projectName: string;
  objectName?: string;
  customerName?: string;
  lines: ProcurementLine[];
  prices: Record<string, number>;
  totals: ProjectEstimateTotals;
}

export default function ProjectEstimatePrint({
  projectName,
  objectName,
  customerName,
  lines,
  prices,
  totals,
}: Props) {
  const siteHost = SITE_URL.replace(/^https?:\/\//, "").replace(/\/$/, "");
  const groups = groupProcurementByCategory(lines);
  const dateStr = new Date().toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="project-estimate-print estimate-print-sheet hidden print:block text-black">
      <header className="mb-3 border-b border-neutral-400 pb-2">
        <p className="mb-0.5 text-[9pt] text-neutral-600">
          {SITE_NAME} — {siteHost}
        </p>
        <h1 className="m-0 text-[13pt] font-bold leading-tight">Смета: {projectName}</h1>
        {objectName && (
          <p className="mt-1 mb-0 text-[9pt] text-neutral-700">Объект: {objectName}</p>
        )}
        {customerName && (
          <p className="mt-0.5 mb-0 text-[9pt] text-neutral-700">Заказчик: {customerName}</p>
        )}
        <p className="mt-1 mb-0 text-[9pt] text-neutral-600">Дата: {dateStr}</p>
      </header>

      <table className="ep-materials w-full border-collapse text-[9pt]">
        <thead>
          <tr className="border-b-2 border-black">
            <th className="py-1 pr-2 text-left font-semibold">Материал</th>
            <th className="w-[18%] py-1 text-right font-semibold">Кол-во</th>
            <th className="w-[14%] py-1 text-right font-semibold">₽/ед.</th>
            <th className="w-[16%] py-1 pl-2 text-right font-semibold">Сумма</th>
          </tr>
        </thead>
        <tbody>
          {groups.flatMap(({ category, lines: catLines }) => [
            <tr key={`h-${category}`}>
              <td
                colSpan={4}
                className="ep-print-cat pt-2 pb-0.5 text-[8pt] font-bold uppercase tracking-wide text-neutral-700"
              >
                {category}
              </td>
            </tr>,
            ...catLines.map((line) => {
              const price = prices[line.name] ?? 0;
              const sum = line.quantity * price;
              return (
                <tr key={line.key} className="border-b border-neutral-300">
                  <td className="py-1 pr-2 align-top font-medium">{line.name}</td>
                  <td className="py-1 text-right tabular-nums whitespace-nowrap">
                    {formatQuantity(line.quantity, line.unit)}
                  </td>
                  <td className="py-1 text-right tabular-nums">
                    {price > 0 ? formatCost(price) : "—"}
                  </td>
                  <td className="py-1 pl-2 text-right tabular-nums font-semibold">
                    {sum > 0 ? `${formatCost(sum)} ₽` : "—"}
                  </td>
                </tr>
              );
            }),
          ])}
        </tbody>
      </table>

      <table className="ep-totals mt-4 ml-auto w-[55%] border-collapse text-[9pt]">
        <tbody>
          <tr>
            <td className="py-0.5 pr-3 text-neutral-700">Материалы</td>
            <td className="py-0.5 text-right tabular-nums font-medium">
              {totals.materialsSubtotal > 0 ? `${formatCost(totals.materialsSubtotal)} ₽` : "—"}
            </td>
          </tr>
          {totals.reserveAmount > 0 && (
            <tr>
              <td className="py-0.5 pr-3 text-neutral-700">Запас {totals.reservePercent}%</td>
              <td className="py-0.5 text-right tabular-nums">{formatCost(totals.reserveAmount)} ₽</td>
            </tr>
          )}
          {totals.deliveryRub > 0 && (
            <tr>
              <td className="py-0.5 pr-3 text-neutral-700">Доставка</td>
              <td className="py-0.5 text-right tabular-nums">{formatCost(totals.deliveryRub)} ₽</td>
            </tr>
          )}
          <tr className="border-t-2 border-black">
            <td className="py-1 pr-3 font-bold">Итого</td>
            <td className="py-1 text-right tabular-nums text-[11pt] font-bold">
              {totals.grandTotal > 0 ? `${formatCost(totals.grandTotal)} ₽` : "—"}
            </td>
          </tr>
        </tbody>
      </table>

      <footer className="mt-4 border-t border-neutral-400 pt-2 text-[8pt] text-neutral-600">
        Смета сформирована в калькуляторах {SITE_NAME}. Цены введены пользователем.
      </footer>
    </div>
  );
}
