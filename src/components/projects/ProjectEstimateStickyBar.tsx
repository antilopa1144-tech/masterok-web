"use client";

import { formatCost } from "@/lib/projects/format";
import type { ProcurementPurchaseStats } from "@/lib/projects/procurement-stats";
import type { ProjectEstimateTotals } from "@/lib/projects/build-estimate";
import { IconCopy } from "./ProjectEstimateIcons";

interface Props {
  totals: ProjectEstimateTotals;
  purchaseStats: ProcurementPurchaseStats;
  onCopy: () => void;
  copied: boolean;
}

export default function ProjectEstimateStickyBar({
  totals,
  purchaseStats,
  onCopy,
  copied,
}: Props) {
  const showRemaining =
    purchaseStats.remainingSubtotal > 0 && purchaseStats.purchasedCount > 0;

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-40 print:hidden pointer-events-none"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      <div className="pointer-events-auto mx-auto max-w-5xl px-3 pb-3 sm:px-4">
        <div
          className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200/90 bg-white/95 px-4 py-3 shadow-lg shadow-slate-900/10 backdrop-blur-md dark:border-slate-600/80 dark:bg-slate-900/95 dark:shadow-black/40"
          role="status"
          aria-live="polite"
        >
          <div className="flex flex-col min-w-0 flex-1">
            {purchaseStats.pendingCount > 0 && purchaseStats.purchasedCount > 0 && (
              <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                Осталось закупить:{" "}
                <span className="font-semibold text-slate-700 dark:text-slate-200">
                  {purchaseStats.pendingCount}{" "}
                  {purchaseStats.pendingCount === 1
                    ? "позиция"
                    : purchaseStats.pendingCount < 5
                      ? "позиции"
                      : "позиций"}
                </span>
                {showRemaining && (
                  <>
                    {" · "}
                    <span className="tabular-nums">{formatCost(purchaseStats.remainingSubtotal)} ₽</span>
                  </>
                )}
              </p>
            )}
            <p className="text-[10px] uppercase tracking-wide text-slate-400">Итого к оплате</p>
            <p className="text-xl font-black tabular-nums text-accent-700 dark:text-accent-300 leading-tight">
              {totals.grandTotal > 0 ? `${formatCost(totals.grandTotal)} ₽` : "— ₽"}
            </p>
          </div>

          <button
            type="button"
            onClick={onCopy}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 transition-colors shrink-0"
          >
            <IconCopy className="w-3.5 h-3.5" />
            {copied ? "Скопировано" : "Копировать"}
          </button>
        </div>
      </div>
    </div>
  );
}
