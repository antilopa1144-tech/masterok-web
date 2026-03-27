"use client";

import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { CalculatorMeta } from "@/lib/calculators/types";
import { CATEGORIES } from "@/lib/calculators/categories";
import CategoryIcon from "@/components/ui/CategoryIcon";
import { CALCULATOR_UI_TEXT } from "./uiText";

interface SearchResult {
  type: "calculator" | "blog" | "checklist";
  id: string;
  title: string;
  description: string;
  href: string;
  icon: string;
  color: string;
  bgColor: string;
  categoryLabel: string;
}

interface Props {
  calculators: CalculatorMeta[];
  blogPosts?: { slug: string; title: string; description: string; category: string }[];
  checklists?: { slug: string; title: string; description: string; category: string }[];
}

export default function CalculatorSearch({ calculators, blogPosts, checklists }: Props) {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const results = useMemo((): SearchResult[] => {
    const q = query.trim().toLowerCase();
    if (!q) return [];

    const calcResults: SearchResult[] = calculators
      .filter((c) => [c.title, c.description, ...c.tags].join(" ").toLowerCase().includes(q))
      .slice(0, 6)
      .map((c) => {
        const cat = CATEGORIES.find((ct) => ct.id === c.category);
        return {
          type: "calculator",
          id: c.id,
          title: c.title,
          description: cat?.label ?? "",
          href: `/kalkulyatory/${c.categorySlug}/${c.slug}/`,
          icon: cat?.icon ?? "wrench",
          color: cat?.color ?? "#64748b",
          bgColor: cat?.bgColor ?? "#f1f5f9",
          categoryLabel: "Калькулятор",
        };
      });

    const blogResults: SearchResult[] = (blogPosts ?? [])
      .filter((p) => [p.title, p.description, p.category].join(" ").toLowerCase().includes(q))
      .slice(0, 2)
      .map((p) => ({
        type: "blog",
        id: p.slug,
        title: p.title,
        description: p.category,
        href: `/blog/${p.slug}/`,
        icon: "book",
        color: "#6366F1",
        bgColor: "#EDE9FE",
        categoryLabel: "Статья",
      }));

    const checklistResults: SearchResult[] = (checklists ?? [])
      .filter((cl) => [cl.title, cl.description, cl.category].join(" ").toLowerCase().includes(q))
      .slice(0, 2)
      .map((cl) => ({
        type: "checklist",
        id: cl.slug,
        title: cl.title,
        description: cl.category,
        href: `/instrumenty/chek-listy/${cl.slug}/`,
        icon: "checklist",
        color: "#8B5CF6",
        bgColor: "#EDE9FE",
        categoryLabel: "Чек-лист",
      }));

    return [...calcResults, ...blogResults, ...checklistResults].slice(0, 8);
  }, [query, calculators, blogPosts, checklists]);

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
        const item = results[activeIndex];
        close();
        router.push(item.href);
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
          placeholder={CALCULATOR_UI_TEXT.searchPlaceholder}
          className="w-full pl-11 pr-4 py-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-accent-500/30 focus:border-accent-500 transition-all text-sm"
          role="combobox"
          aria-controls="search-results"
          aria-expanded={showDropdown}
          aria-autocomplete="list"
          aria-activedescendant={activeIndex >= 0 ? `search-result-${activeIndex}` : undefined}
        />
        {query && (
          <button
            onClick={close}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors p-1"
          >
            <CategoryIcon icon="close" size={16} />
          </button>
        )}
      </div>

      {/* Результаты */}
      {showDropdown && (
        <div id="search-results" className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xl z-50 overflow-hidden scale-in" role="listbox">
          {results.length > 0 ? (
            <ul>
              {results.map((item, i) => (
                  <li
                    key={`${item.type}-${item.id}`}
                    id={`search-result-${i}`}
                    role="option"
                    aria-selected={i === activeIndex}
                    className="border-b border-slate-50 dark:border-slate-700 last:border-0"
                  >
                    <Link
                      href={item.href}
                      onClick={close}
                      className={`flex items-center gap-3 px-4 py-3 no-underline transition-colors ${
                        i === activeIndex ? "bg-accent-50 dark:bg-accent-900/20" : "hover:bg-slate-50 dark:hover:bg-slate-700"
                      }`}
                    >
                      <span
                        className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                        style={{ backgroundColor: item.bgColor }}
                      >
                        <CategoryIcon icon={item.icon} size={16} color={item.color} />
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                          {item.title}
                        </p>
                        <p className="text-xs text-slate-400 dark:text-slate-500 truncate">{item.categoryLabel} · {item.description}</p>
                      </div>
                      <span className="ml-auto text-slate-300 dark:text-slate-500 text-sm shrink-0">→</span>
                    </Link>
                  </li>
              ))}
            </ul>
          ) : (
            <div className="px-4 py-6 text-center">
              <p className="text-slate-400 dark:text-slate-500 text-sm">{CALCULATOR_UI_TEXT.searchEmpty(query)}</p>
              <Link
                href="/mikhalych/"
                className="text-sm text-accent-600 hover:text-accent-700 mt-2 inline-block no-underline"
              >
                {CALCULATOR_UI_TEXT.askMikhalych}
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
