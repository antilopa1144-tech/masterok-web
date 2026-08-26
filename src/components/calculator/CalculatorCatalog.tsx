"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import CategoryIcon from "@/components/ui/CategoryIcon";
import type { CalculatorMeta, Category, CategoryId } from "@/lib/calculators/types";
import { filterCatalogCalculators, getCatalogTopIds } from "@/lib/calculators/catalog";

interface CalculatorCatalogProps {
  calculators: CalculatorMeta[];
  categories: Category[];
}

export default function CalculatorCatalog({ calculators, categories }: CalculatorCatalogProps) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<CategoryId | "all">("all");
  const topIds = useMemo(() => new Set(getCatalogTopIds(calculators)), [calculators]);
  const visibleCalculators = useMemo(
    () => filterCatalogCalculators(calculators, query, category),
    [calculators, category, query],
  );
  const sections = useMemo(
    () => categories
      .map((item) => ({
        category: item,
        calculators: visibleCalculators.filter((calculator) => calculator.category === item.id),
      }))
      .filter((section) => section.calculators.length > 0),
    [categories, visibleCalculators],
  );
  const hasFilters = query.trim().length > 0 || category !== "all";

  const reset = () => {
    setQuery("");
    setCategory("all");
  };

  return (
    <div className="space-y-8">
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800 sm:p-5">
        <label htmlFor="calculator-catalog-search" className="sr-only">Найти калькулятор</label>
        <div className="relative">
          <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden="true">
            <CategoryIcon icon="search" size={19} color="#94a3b8" />
          </span>
          <input
            id="calculator-catalog-search"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Найти: бетон, плитка, краска…"
            className="min-h-12 w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-12 text-base text-slate-900 outline-none transition focus:border-accent-500 focus:ring-2 focus:ring-accent-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="absolute right-2 top-1/2 flex min-h-10 min-w-10 -translate-y-1/2 items-center justify-center rounded-lg text-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-700 dark:hover:text-slate-100"
              aria-label="Очистить поиск"
            >
              ×
            </button>
          )}
        </div>

        <div className="mt-4 flex gap-2 overflow-x-auto pb-1" aria-label="Фильтр по категории">
          <button
            type="button"
            onClick={() => setCategory("all")}
            aria-pressed={category === "all"}
            className={`min-h-11 shrink-0 rounded-full border px-4 text-sm font-medium transition ${category === "all" ? "border-accent-600 bg-accent-600 text-white" : "border-slate-200 bg-white text-slate-600 hover:border-accent-300 hover:text-accent-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"}`}
          >
            Все
          </button>
          {categories.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setCategory(item.id)}
              aria-pressed={category === item.id}
              className={`min-h-11 shrink-0 rounded-full border px-4 text-sm font-medium transition ${category === item.id ? "border-accent-600 bg-accent-600 text-white" : "border-slate-200 bg-white text-slate-600 hover:border-accent-300 hover:text-accent-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"}`}
            >
              {item.label}
            </button>
          ))}
        </div>

        <p className="mt-3 text-sm text-slate-500 dark:text-slate-400" aria-live="polite">
          {hasFilters
            ? `Найдено ${visibleCalculators.length} из ${calculators.length}`
            : `${calculators.length} калькуляторов в 8 разделах`}
        </p>
      </div>

      {sections.length > 0 ? (
        <div className="space-y-10">
          {sections.map(({ category: item, calculators: categoryCalculators }) => (
            <section key={item.id}>
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ backgroundColor: item.bgColor }}>
                  <CategoryIcon icon={item.icon} size={20} color={item.color} />
                </div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">{item.label}</h2>
                <span className="text-sm text-slate-400">({categoryCalculators.length})</span>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {categoryCalculators.map((calculator) => (
                  <Link
                    key={calculator.id}
                    href={`/kalkulyatory/${calculator.categorySlug}/${calculator.slug}/`}
                    className="card-hover group block min-h-28 px-5 py-4 no-underline"
                  >
                    <div className="mb-1 flex items-start justify-between gap-2">
                      <h3 className="text-sm font-bold text-slate-900 transition-colors group-hover:text-accent-700 dark:text-slate-100">
                        {calculator.title}
                      </h3>
                      {topIds.has(calculator.id) && (
                        <span className="shrink-0 rounded-full bg-accent-50 px-1.5 py-0.5 text-[10px] font-medium text-accent-700 dark:bg-accent-900/20 dark:text-accent-400">
                          ТОП
                        </span>
                      )}
                    </div>
                    <p className="line-clamp-2 text-xs leading-relaxed text-slate-400">
                      {calculator.description}
                    </p>
                  </Link>
                ))}
              </div>
            </section>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-5 py-12 text-center dark:border-slate-700 dark:bg-slate-800">
          <p className="font-semibold text-slate-900 dark:text-slate-100">Подходящий калькулятор не найден</p>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Попробуйте название материала или сбросьте фильтры.</p>
          <button type="button" onClick={reset} className="btn-secondary mt-5 min-h-11 px-5">
            Показать все калькуляторы
          </button>
        </div>
      )}
    </div>
  );
}
