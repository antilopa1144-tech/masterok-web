"use client";

import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { CalculatorMeta } from "@/lib/calculators/types";
import { CATEGORIES } from "@/lib/calculators/categories";
import CategoryIcon from "@/components/ui/CategoryIcon";

interface Props {
  calculators: CalculatorMeta[];
}

export default function CalculatorSearch({ calculators }: Props) {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return calculators
      .filter((c) => {
        const haystack = [c.title, c.description, ...c.tags].join(" ").toLowerCase();
        return haystack.includes(q);
      })
      .slice(0, 8);
  }, [query, calculators]);

  const showDropdown = isOpen && query.trim().length > 0;

  // Закрытие по клику вне области
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Сброс activeIndex при изменении результатов
  useEffect(() => {
    setActiveIndex(-1);
  }, [results]);

  const close = useCallback(() => {
    setQuery("");
    setIsOpen(false);
    setActiveIndex(-1);
  }, []);

  // Клавиатурная навигация
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!showDropdown || results.length === 0) return;

      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIndex((prev) => (prev < results.length - 1 ? prev + 1 : 0));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIndex((prev) => (prev > 0 ? prev - 1 : results.length - 1));
      } else if (e.key === "Enter" && activeIndex >= 0) {
        e.preventDefault();
        const calc = results[activeIndex];
        close();
        router.push(`/kalkulyatory/${calc.categorySlug}/${calc.slug}/`);
      } else if (e.key === "Escape") {
        setIsOpen(false);
      }
    },
    [showDropdown, results, activeIndex, close, router],
  );

  return (
    <div className="relative max-w-xl mx-auto" ref={containerRef}>
      <div className="relative">
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
          <CategoryIcon icon="search" size={18} color="#94a3b8" />
        </span>
        <input
          type="search"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder="Найти калькулятор: бетон, плитка, ламинат..."
          className="w-full pl-11 pr-4 py-3.5 rounded-2xl border border-slate-200 bg-white shadow-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-accent-500/30 focus:border-accent-500 transition-all text-sm"
          role="combobox"
          aria-controls="search-results"
          aria-expanded={showDropdown}
          aria-autocomplete="list"
          aria-activedescendant={activeIndex >= 0 ? `search-result-${activeIndex}` : undefined}
        />
        {query && (
          <button
            onClick={close}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors p-1"
          >
            <CategoryIcon icon="close" size={16} />
          </button>
        )}
      </div>

      {/* Результаты */}
      {showDropdown && (
        <div id="search-results" className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl border border-slate-200 shadow-xl z-50 overflow-hidden scale-in" role="listbox">
          {results.length > 0 ? (
            <ul>
              {results.map((calc, i) => {
                const cat = CATEGORIES.find((c) => c.id === calc.category);
                return (
                  <li
                    key={calc.id}
                    id={`search-result-${i}`}
                    role="option"
                    aria-selected={i === activeIndex}
                    className="border-b border-slate-50 last:border-0"
                  >
                    <Link
                      href={`/kalkulyatory/${calc.categorySlug}/${calc.slug}/`}
                      onClick={close}
                      className={`flex items-center gap-3 px-4 py-3 no-underline transition-colors ${
                        i === activeIndex ? "bg-accent-50" : "hover:bg-slate-50"
                      }`}
                    >
                      <span
                        className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                        style={{ backgroundColor: cat?.bgColor ?? "#f1f5f9" }}
                      >
                        <CategoryIcon icon={cat?.icon ?? "wrench"} size={16} color={cat?.color ?? "#64748b"} />
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-900 truncate">
                          {calc.title}
                        </p>
                        <p className="text-xs text-slate-400 truncate">{cat?.label}</p>
                      </div>
                      <span className="ml-auto text-slate-300 text-sm shrink-0">→</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="px-4 py-6 text-center">
              <p className="text-slate-400 text-sm">Ничего не найдено по запросу «{query}»</p>
              <Link
                href="/mikhalych/"
                className="text-sm text-accent-600 hover:text-accent-700 mt-2 inline-block no-underline"
              >
                Спросить Михалыча →
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
