"use client";

import Link from "next/link";
import { formatCost, formatQuantity } from "@/lib/projects/format";
import { groupMaterialsForEntry } from "@/lib/projects/procurement-stats";
import type { ProjectEstimateLine } from "@/lib/projects/build-estimate";

interface Props {
  line: ProjectEstimateLine;
  onDelete: () => void;
}

export default function CalculationEntryCard({ line, onDelete }: Props) {
  const groups = groupMaterialsForEntry(line.materials);

  return (
    <article className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 overflow-hidden shadow-sm">
      <header className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 px-4 py-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
        <div className="min-w-0">
          <Link
            href={`/kalkulyatory/${line.categorySlug}/${line.slug}/`}
            className="text-sm font-bold text-slate-900 dark:text-slate-100 hover:text-accent-600 no-underline"
          >
            {line.calcTitle}
          </Link>
          <p className="text-[11px] text-slate-400 mt-0.5">
            {line.pricedItems}/{line.pricedItems + line.missingPriceItems} позиций с ценой
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <p className="text-base font-black tabular-nums text-accent-700 dark:text-accent-300">
            {line.estimatedCost > 0 ? `${formatCost(line.estimatedCost)} ₽` : "— ₽"}
          </p>
          <button
            type="button"
            onClick={onDelete}
            className="text-[11px] text-red-400 hover:text-red-600 px-2 py-1 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30"
          >
            Удалить
          </button>
        </div>
      </header>

      <div className="divide-y divide-slate-100 dark:divide-slate-800">
        {groups.map(({ category, items }) => (
          <div key={category}>
            <p className="px-4 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-slate-50/80 dark:bg-slate-800/40">
              {category}
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <tbody>
                  {items.map((m) => (
                    <tr
                      key={`${m.name}-${m.unit}`}
                      className="border-b border-slate-50 dark:border-slate-800/60 last:border-0"
                    >
                      <td className="px-4 py-2 text-slate-700 dark:text-slate-300">
                        <span>{m.name}</span>
                        {m.subtitle ? (
                          <span className="mt-0.5 block text-[11px] leading-snug text-slate-500 dark:text-slate-400">
                            {m.subtitle}
                          </span>
                        ) : null}
                      </td>
                      <td className="px-4 py-2 text-right tabular-nums whitespace-nowrap text-slate-600 dark:text-slate-400">
                        {formatQuantity(m.quantity, m.unit)}
                      </td>
                      <td className="px-4 py-2 text-right tabular-nums w-20">
                        {m.unitPrice > 0 ? formatCost(m.unitPrice) : "—"}
                      </td>
                      <td className="px-4 py-2 text-right tabular-nums font-medium w-24">
                        {m.lineTotal > 0 ? `${formatCost(m.lineTotal)} ₽` : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>

      {line.missingPriceItems > 0 && (
        <div className="px-4 py-2.5 bg-amber-50 dark:bg-amber-950/30 border-t border-amber-100 dark:border-amber-900/40">
          <Link
            href={`/kalkulyatory/${line.categorySlug}/${line.slug}/`}
            className="text-xs font-medium text-amber-800 dark:text-amber-300 hover:underline"
          >
            Ввести недостающие цены в калькуляторе →
          </Link>
        </div>
      )}
    </article>
  );
}
