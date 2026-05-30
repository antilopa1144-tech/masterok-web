"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { formatCost } from "@/lib/projects/format";
import {
  computePurchaseStats,
  filterProcurementLines,
  type PurchaseFilter,
} from "@/lib/projects/procurement-stats";
import { groupProcurementByCategory, type ProcurementLine } from "@/lib/projects/procurement";
import type { ProjectEstimateMeta } from "@/lib/storage/types";
import type { ProjectEstimateTotals } from "@/lib/projects/build-estimate";
import type { ProjectWithEntries } from "@/lib/storage/types";
import { IconChevron, IconSearch } from "./ProjectEstimateIcons";
import ProcurementLineRow from "./ProcurementLineRow";

const SHOW_SEARCH_FROM = 8;

interface Props {
  project: ProjectWithEntries;
  procurement: ProcurementLine[];
  resolvedPrices: Record<string, number>;
  priceDrafts: Record<string, string>;
  totals: ProjectEstimateTotals;
  meta: ProjectEstimateMeta;
  checked: Set<string>;
  onToggleChecked: (key: string) => void;
  onClearChecked: () => void;
  onPriceChange: (name: string, raw: string) => void;
  onPriceBlur: (name: string) => void;
  onMetaChange: (patch: Partial<ProjectEstimateMeta>) => void;
}

export default function ProjectEstimateProcurementPanel({
  project,
  procurement,
  resolvedPrices,
  priceDrafts,
  totals,
  meta,
  checked,
  onToggleChecked,
  onClearChecked,
  onPriceChange,
  onPriceBlur,
  onMetaChange,
}: Props) {
  const [search, setSearch] = useState("");
  const [purchaseFilter, setPurchaseFilter] = useState<PurchaseFilter>("all");
  const [collapsedCats, setCollapsedCats] = useState<Set<string>>(new Set());

  const purchaseStats = useMemo(
    () => computePurchaseStats(procurement, resolvedPrices, checked),
    [procurement, resolvedPrices, checked],
  );

  const filtered = useMemo(
    () => filterProcurementLines(procurement, checked, purchaseFilter, search),
    [procurement, checked, purchaseFilter, search],
  );

  const groups = useMemo(() => groupProcurementByCategory(filtered), [filtered]);

  const toggleCategory = (category: string) => {
    setCollapsedCats((prev) => {
      const next = new Set(prev);
      if (next.has(category)) next.delete(category);
      else next.add(category);
      return next;
    });
  };

  const filterChips: { id: PurchaseFilter; label: string }[] = [
    { id: "all", label: "Все" },
    { id: "pending", label: "К закупке" },
    { id: "purchased", label: "Куплено" },
  ];

  return (
    <>
      {project.entries.length === 1 && (
        <p className="text-sm text-slate-500 dark:text-slate-400 -mt-2">
          Из расчёта:{" "}
          <Link
            href={`/kalkulyatory/${project.entries[0]!.categorySlug}/${project.entries[0]!.slug}/`}
            className="text-accent-600 hover:underline font-medium"
          >
            {project.entries[0]!.calcTitle}
          </Link>
        </p>
      )}

      {/* Прогресс закупки */}
      {purchaseStats.purchasedCount > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-green-200/80 bg-green-50/60 px-3 py-2 text-xs dark:border-green-900/50 dark:bg-green-950/30">
          <span className="text-green-800 dark:text-green-300 font-medium">
            Куплено {purchaseStats.purchasedCount} из {purchaseStats.totalLines}
            {purchaseStats.remainingSubtotal > 0 && (
              <> · осталось ~{formatCost(purchaseStats.remainingSubtotal)} ₽</>
            )}
          </span>
          <button
            type="button"
            onClick={onClearChecked}
            className="text-green-700/80 hover:text-green-900 dark:text-green-400 dark:hover:text-green-200 underline-offset-2 hover:underline"
          >
            Снять все отметки
          </button>
        </div>
      )}

      {/* Панель фильтров */}
      {(procurement.length >= SHOW_SEARCH_FROM || purchaseStats.purchasedCount > 0) && (
        <div className="flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between">
          <div className="flex gap-1 p-0.5 rounded-lg bg-slate-100 dark:bg-slate-800/80 w-fit">
            {filterChips.map((chip) => (
              <button
                key={chip.id}
                type="button"
                onClick={() => setPurchaseFilter(chip.id)}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                  purchaseFilter === chip.id
                    ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-sm"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                {chip.label}
              </button>
            ))}
          </div>
          {procurement.length >= SHOW_SEARCH_FROM && (
            <label className="relative flex-1 sm:max-w-xs">
              <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Найти материал…"
                className="input-field w-full pl-9 py-2 text-sm"
              />
            </label>
          )}
        </div>
      )}

      <div className="rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden bg-white dark:bg-slate-900 shadow-sm">
        <div className="hidden md:grid md:grid-cols-[2rem_minmax(0,1fr)_7rem_7rem_8rem] gap-2 px-4 py-2.5 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-100 dark:border-slate-800 text-[10px] font-bold uppercase tracking-wider text-slate-400">
          <span title="Отметить купленным" />
          <span>Материал</span>
          <span className="text-right">Кол-во</span>
          <span className="text-right">Цена за ед.</span>
          <span className="text-right">Сумма</span>
        </div>

        {filtered.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-slate-500">
            {search || purchaseFilter !== "all"
              ? "Ничего не найдено — смените фильтр или запрос"
              : "Нет позиций"}
          </p>
        ) : (
          <div>
            {groups.map(({ category, lines: catLines }) => {
              const collapsed = collapsedCats.has(category);
              const catTotal = catLines.reduce((s, l) => {
                const p = resolvedPrices[l.name] ?? 0;
                return s + l.quantity * p;
              }, 0);
              // Когда категория одна (типичный проект из одного расчёта),
              // заголовок-аккордеон — лишний уровень вложенности и шум.
              // Показываем его только при нескольких категориях.
              const showCategoryHeader = groups.length > 1;

              return (
                <div key={category}>
                  {showCategoryHeader && (
                    <button
                      type="button"
                      onClick={() => toggleCategory(category)}
                      className="w-full flex items-center justify-between gap-2 px-4 py-2.5 bg-slate-50/90 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800 sticky top-0 z-[1] text-left hover:bg-slate-100/90 dark:hover:bg-slate-800/70 transition-colors"
                    >
                      <span className="flex items-center gap-2 min-w-0">
                        <IconChevron open={!collapsed} className="w-4 h-4 shrink-0 text-slate-400" />
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-200 truncate">
                          {category}
                        </span>
                        <span className="text-[10px] font-medium text-slate-400 shrink-0">
                          {catLines.length}
                        </span>
                      </span>
                      {catTotal > 0 && (
                        <span className="text-xs font-bold tabular-nums text-slate-500 shrink-0">
                          {formatCost(catTotal)} ₽
                        </span>
                      )}
                    </button>
                  )}
                  {(!collapsed || !showCategoryHeader) &&
                    catLines.map((line) => {
                      const price = resolvedPrices[line.name] ?? 0;
                      const sum = line.quantity * price;
                      const draft = priceDrafts[line.name];
                      const inputVal = draft !== undefined ? draft : price > 0 ? String(price) : "";

                      return (
                        <ProcurementLineRow
                          key={line.key}
                          line={line}
                          price={price}
                          sum={sum}
                          inputVal={inputVal}
                          purchased={checked.has(line.key)}
                          onToggle={() => onToggleChecked(line.key)}
                          onPriceChange={(raw) => onPriceChange(line.name, raw)}
                          onPriceBlur={() => onPriceBlur(line.name)}
                        />
                      );
                    })}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <section className="grid gap-4 lg:grid-cols-[1fr_minmax(280px,360px)]">
        <div className="rounded-2xl border border-slate-200 dark:border-slate-700 p-4 bg-white dark:bg-slate-900 space-y-3">
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Дополнительные расходы</h3>
          <div className="grid sm:grid-cols-2 gap-4">
            <label className="block">
              <span className="text-xs text-slate-500">Запас на подрезку / бой, %</span>
              <input
                type="number"
                min={0}
                max={30}
                step={1}
                value={meta.reservePercent || ""}
                onChange={(e) =>
                  onMetaChange({ reservePercent: Math.max(0, Number(e.target.value) || 0) })
                }
                className="input-field mt-1 w-full"
              />
            </label>
            <label className="block">
              <span className="text-xs text-slate-500">Доставка, ₽</span>
              <input
                type="number"
                min={0}
                step={100}
                value={meta.deliveryRub || ""}
                onChange={(e) => onMetaChange({ deliveryRub: Math.max(0, Number(e.target.value) || 0) })}
                className="input-field mt-1 w-full"
              />
            </label>
          </div>
          <p className="text-[11px] text-slate-400">
            Быстрые значения запаса:{" "}
            {[5, 10, 15].map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => onMetaChange({ reservePercent: p })}
                className="mr-2 text-accent-600 hover:underline font-medium"
              >
                {p}%
              </button>
            ))}
          </p>
        </div>

        <div className="rounded-2xl border border-accent-200/60 dark:border-accent-800/50 bg-accent-50/50 dark:bg-accent-950/20 p-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-slate-600 dark:text-slate-400">Материалы</span>
            <span className="font-semibold tabular-nums">
              {totals.materialsSubtotal > 0 ? `${formatCost(totals.materialsSubtotal)} ₽` : "—"}
            </span>
          </div>
          {totals.reserveAmount > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-slate-600 dark:text-slate-400">Запас {totals.reservePercent}%</span>
              <span className="font-semibold tabular-nums">{formatCost(totals.reserveAmount)} ₽</span>
            </div>
          )}
          {totals.deliveryRub > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-slate-600 dark:text-slate-400">Доставка</span>
              <span className="font-semibold tabular-nums">{formatCost(totals.deliveryRub)} ₽</span>
            </div>
          )}
          <div className="flex justify-between pt-2 border-t border-accent-200/80 dark:border-accent-800/60">
            <span className="font-bold text-slate-900 dark:text-slate-100">Итого</span>
            <span className="text-lg font-black tabular-nums text-accent-700 dark:text-accent-300">
              {totals.grandTotal > 0 ? `${formatCost(totals.grandTotal)} ₽` : "—"}
            </span>
          </div>
        </div>
      </section>
    </>
  );
}
