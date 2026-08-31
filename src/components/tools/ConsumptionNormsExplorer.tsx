"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { CONSUMPTION_NORMS, type NormCategory, type NormRow } from "@/lib/tools/norms-data";
import { calcHref } from "@/lib/tools/config";
import { CONSUMPTION_NORMS_TOOL_SLUG } from "@/lib/tools/consumption-norm-links";
import { trackToolModeChange, trackToolRelatedClick } from "@/lib/analytics";
import { useToolAnalytics } from "@/components/tools/useToolAnalytics";

function matchesQuery(row: NormRow, query: string) {
  if (!query) return true;
  const searchable = `${row.material} ${row.conditions} ${row.source}`.toLocaleLowerCase("ru-RU");
  return searchable.includes(query);
}

function NormTable({ category, rows }: { category: NormCategory; rows: NormRow[] }) {
  return (
    <div className="border-t border-slate-100 dark:border-slate-800">
      {category.calculator && (
        <div className="flex justify-end bg-slate-50/70 px-3 py-2 dark:bg-slate-800/30 sm:px-4">
          <Link
            href={calcHref(category.calculator)}
            onClick={() => trackToolRelatedClick(CONSUMPTION_NORMS_TOOL_SLUG, category.calculator!.slug)}
            className="inline-flex min-h-9 items-center text-xs font-semibold text-accent-700 hover:underline dark:text-accent-300"
          >
            Рассчитать количество и упаковки →
          </Link>
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-800/50">
              <th className="px-3 py-2 text-left font-medium text-slate-500 dark:text-slate-400 sm:px-4">Материал</th>
              <th className="px-3 py-2 text-right font-medium text-slate-500 dark:text-slate-400 sm:px-4">Расход</th>
              <th className="hidden px-4 py-2 text-left font-medium text-slate-500 dark:text-slate-400 sm:table-cell">Условия</th>
              <th className="hidden px-4 py-2 text-left font-medium text-slate-500 dark:text-slate-400 md:table-cell">Основание данных</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={`${row.material}-${row.consumption}`} className="border-t border-slate-100 align-top dark:border-slate-800">
                <td className="px-3 py-3 text-slate-700 dark:text-slate-200 sm:px-4">
                  <span className="font-medium sm:font-normal">{row.material}</span>
                  <span className="mt-1 block text-[11px] leading-snug text-slate-500 dark:text-slate-400 sm:hidden">
                    {row.conditions}
                  </span>
                  <a
                    href={row.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1.5 block text-[11px] font-medium text-accent-700 hover:underline dark:text-accent-300 md:hidden"
                  >
                    {row.source} ↗
                  </a>
                </td>
                <td className="whitespace-nowrap px-3 py-3 text-right font-bold text-slate-900 dark:text-slate-100 sm:px-4">
                  {row.consumption} <span className="font-normal text-slate-400">{row.unit}</span>
                </td>
                <td className="hidden px-4 py-3 text-xs leading-relaxed text-slate-500 dark:text-slate-400 sm:table-cell">{row.conditions}</td>
                <td className="hidden px-4 py-3 text-xs md:table-cell">
                  <a
                    href={row.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-accent-700 hover:underline dark:text-accent-300"
                    title={`Проверено ${row.verifiedAt}`}
                  >
                    {row.source} ↗
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function ConsumptionNormsExplorer() {
  const resultRef = useRef<HTMLElement>(null);
  const [query, setQuery] = useState("");
  const [openIds, setOpenIds] = useState<Set<string>>(
    () => new Set(CONSUMPTION_NORMS[0] ? [CONSUMPTION_NORMS[0].id] : []),
  );
  const [resultCategoryId, setResultCategoryId] = useState(
    () => CONSUMPTION_NORMS[0]?.id ?? "",
  );
  const normalizedQuery = query.trim().toLocaleLowerCase("ru-RU");

  useEffect(() => {
    const openHashCategory = () => {
      const prefix = "#norm-";
      if (!window.location.hash.startsWith(prefix)) return;

      const categoryId = decodeURIComponent(window.location.hash.slice(prefix.length));
      if (!CONSUMPTION_NORMS.some((category) => category.id === categoryId)) return;

      setOpenIds(new Set([categoryId]));
      requestAnimationFrame(() => {
        document.getElementById(`norm-${categoryId}`)?.scrollIntoView({ block: "start" });
      });
    };

    openHashCategory();
    window.addEventListener("hashchange", openHashCategory);
    return () => window.removeEventListener("hashchange", openHashCategory);
  }, []);

  const visibleCategories = useMemo(
    () =>
      CONSUMPTION_NORMS.map((category) => {
        const categoryMatches = category.title.toLocaleLowerCase("ru-RU").includes(normalizedQuery);
        return {
          category,
          rows: categoryMatches
            ? category.rows
            : category.rows.filter((row) => matchesQuery(row, normalizedQuery)),
        };
      }).filter(({ rows }) => !normalizedQuery || rows.length > 0),
    [normalizedQuery],
  );

  const totalRows = CONSUMPTION_NORMS.reduce((sum, category) => sum + category.rows.length, 0);
  const shownRows = visibleCategories.reduce((sum, item) => sum + item.rows.length, 0);
  const { markStarted } = useToolAnalytics(
    CONSUMPTION_NORMS_TOOL_SLUG,
    resultRef,
    shownRows > 0,
  );

  const trackCategoryOpen = (id: string) => {
    setResultCategoryId(id);
    markStarted("category");
    trackToolModeChange(CONSUMPTION_NORMS_TOOL_SLUG, `category:${id}`);
  };

  const handleQueryChange = (value: string) => {
    setQuery(value);
    if (value.trim()) markStarted("search");
  };

  const openCategory = (id: string) => {
    trackCategoryOpen(id);
    setQuery("");
    setOpenIds(new Set([id]));
    requestAnimationFrame(() => {
      document.getElementById(`norm-${id}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  return (
    <section aria-labelledby="norms-explorer-title" className="space-y-3">
      <div className="card p-4 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-cyan-700 dark:text-cyan-300">Быстрый поиск</p>
            <h2 id="norms-explorer-title" className="mt-0.5 text-lg font-bold text-slate-900 dark:text-slate-100">
              Найдите материал или работу
            </h2>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              {CONSUMPTION_NORMS.length} разделов · {totalRows} проверенных норм
            </p>
          </div>
          <label className="relative block w-full sm:max-w-sm">
            <span className="sr-only">Поиск по нормам расхода</span>
            <input
              type="search"
              value={query}
              onChange={(event) => handleQueryChange(event.target.value)}
              placeholder="Например, Ротбанд или грунтовка"
              className="input-field min-h-12 w-full pr-10"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="absolute right-1 top-1 flex h-10 w-10 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
                aria-label="Очистить поиск"
              >
                ×
              </button>
            )}
          </label>
        </div>

        <div className="-mx-1 mt-4 flex gap-2 overflow-x-auto px-1 pb-1 sm:flex-wrap sm:overflow-visible">
          {CONSUMPTION_NORMS.map((category) => (
            <button
              key={category.id}
              type="button"
              onClick={() => openCategory(category.id)}
              className={`flex min-h-10 shrink-0 items-center gap-1.5 rounded-full border px-3 text-xs font-semibold transition-colors ${
                openIds.has(category.id) && !normalizedQuery
                  ? "border-cyan-600 bg-cyan-600 text-white dark:border-cyan-500 dark:bg-cyan-500 dark:text-slate-950"
                  : "border-cyan-200 bg-cyan-50 text-cyan-800 hover:border-cyan-300 hover:bg-cyan-100 dark:border-cyan-900 dark:bg-cyan-950/30 dark:text-cyan-300"
              }`}
            >
              <span aria-hidden>{category.icon}</span>
              {category.title}
            </button>
          ))}
        </div>
      </div>

      {normalizedQuery && (
        <p className="px-1 text-sm text-slate-500 dark:text-slate-400" aria-live="polite">
          Найдено: {shownRows}
        </p>
      )}

      {visibleCategories.length > 0 ? (
        visibleCategories.map(({ category, rows }) => {
          const isOpen = normalizedQuery ? true : openIds.has(category.id);
          return (
            <details
              key={category.id}
              id={`norm-${category.id}`}
              open={isOpen}
              onToggle={(event) => {
                if (normalizedQuery) return;
                const shouldOpen = event.currentTarget.open;
                setOpenIds((current) => {
                  const next = new Set(current);
                  if (shouldOpen) next.add(category.id);
                  else next.delete(category.id);
                  return next;
                });
              }}
              className="card group scroll-mt-24 overflow-hidden"
            >
              <summary
                ref={
                  category.id ===
                  (normalizedQuery ? visibleCategories[0]?.category.id : resultCategoryId)
                    ? resultRef
                    : undefined
                }
                onClick={(event) => {
                  const details = event.currentTarget.closest("details");
                  if (!normalizedQuery && details && !details.open) {
                    trackCategoryOpen(category.id);
                  }
                }}
                className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 [&::-webkit-details-marker]:hidden"
              >
                <span className="flex min-w-0 items-center gap-2 font-semibold text-slate-900 dark:text-slate-100">
                  <span aria-hidden>{category.icon}</span>
                  <span className="truncate">{category.title}</span>
                  <span className="shrink-0 text-xs font-medium text-slate-400">{rows.length}</span>
                </span>
                <span aria-hidden className="text-lg text-slate-400 transition-transform group-open:rotate-180">⌄</span>
              </summary>
              <NormTable category={category} rows={rows} />
            </details>
          );
        })
      ) : (
        <div className="card p-8 text-center">
          <p className="font-semibold text-slate-800 dark:text-slate-100">Ничего не найдено</p>
          <p className="mt-1 text-sm text-slate-500">Попробуйте название материала или вида работ.</p>
          <button type="button" onClick={() => setQuery("")} className="btn-secondary mt-4 text-sm">
            Сбросить поиск
          </button>
        </div>
      )}
    </section>
  );
}
